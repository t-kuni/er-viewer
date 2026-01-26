# ER図エンティティ配置最適化機能の実装方法検討

## リサーチ要件

以下について検討してほしい：

* 関連のあるエンティティ（リレーションでつながっている）を近くに配置したい
* クラスタリング的な最適化が必要な想定
* 一度リバースエンジニアしてER図が描画されている状態でのみ利用できる機能
    * 描画済みなのでエンティティの位置とサイズを取得できる
* 画面上に「配置最適化」ボタンを用意し、これをクリックすると最適化処理が実行される想定
* 最適化後は可能な限りエンティティ同士が被らないようにしたい
* リレーションの線は自動で描画する仕組みがすでにあるのでエンティティの配置だけ考えれば良い
* エンティティが被っている数、リレーションが交差している数を目的変数として最小化するようなアルゴリズムが良いかもしれない。他にもっといい方法があればこの限りではない。
* スコアリング時の仮想的なリレーション線の計算はエンティティの中心同士を直線で結ぶ方法で簡略してよい
* どういうアルゴリズムが良いか？

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite + React + React Flow
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec

### 現状のフェーズ

- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- AIが作業するため学習コストは考慮不要

## 現在のエンティティ配置の仕組み

### リバースエンジニアリング時のデフォルトレイアウト

エンティティの初期配置は`lib/usecases/ReverseEngineerUsecase.ts`で実装されている：

```typescript
// 新規作成モードの場合
nodes = {};
erData.entities.forEach((entity: Entity, index: number) => {
  const col = index % 4;
  const row = Math.floor(index / 4);
  
  nodes[entity.id] = {
    id: entity.id,
    name: entity.name,
    x: 50 + col * 300,        // 横方向に300pxずつ配置
    y: 50 + row * 200,         // 縦方向に200pxずつ配置
    columns: entity.columns,
    ddl: entity.ddl,
  };
});
```

**配置定数**：
- 横方向の間隔: 300px
- 縦方向の間隔: 200px
- 1行あたりのエンティティ数: 4
- 開始X座標: 50px
- 開始Y座標: 50px

### エンティティの移動

ユーザーはReact Flowの機能を使ってエンティティをドラッグ&ドロップで移動できる。

## ViewModelの構造

すべての型は`scheme/main.tsp`で定義されている。

### ViewModel（ルート型）

```typescript
model ViewModel {
  format: string; // データフォーマット識別子（固定値: "er-viewer"）
  version: int32; // データフォーマットのバージョン（現在は 1 固定）
  erDiagram: ERDiagramViewModel; // ER図の状態
  ui: GlobalUIState; // グローバルUI状態
  buildInfo: BuildInfoState; // ビルド情報のキャッシュ
  settings?: AppSettings; // アプリケーション設定
}
```

### ERDiagramViewModel

```typescript
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;       // エンティティノード（テーブル）
  edges: Record<RelationshipEdgeViewModel>; // リレーションシップ（外部キー）
  rectangles: Record<Rectangle>;            // 矩形（グループ化・領域区別用）
  texts: Record<TextBox>;                   // テキスト（注釈・説明用）
  ui: ERDiagramUIState;                     // ER図のUI状態
  loading: boolean;                         // リバースエンジニア処理中フラグ
}
```

### EntityNodeViewModel（エンティティノード）

```typescript
model EntityNodeViewModel {
  id: string; // UUID (エンティティID)
  name: string;
  x: float64;      // X座標（配置情報）
  y: float64;      // Y座標（配置情報）
  columns: Column[];
  ddl: string;
}
```

現時点では、エンティティの`width`と`height`は明示的に保存されていない。しかし、エンティティはReact Flowでレンダリングされており、実際には幅と高さを持っている。

### RelationshipEdgeViewModel（リレーション）

```typescript
model RelationshipEdgeViewModel {
  id: string; // UUID (リレーションシップID)
  sourceEntityId: string; // エンティティID (UUID)
  sourceColumnId: string; // カラムID (UUID)
  targetEntityId: string; // エンティティID (UUID)
  targetColumnId: string; // カラムID (UUID)
  constraintName: string;
}
```

リレーションは`sourceEntityId`と`targetEntityId`でエンティティ同士をつないでいる。

### Column（カラム）

```typescript
model Column {
  id: string; // UUID
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  extra: string;
}
```

エンティティには複数の`columns`が含まれており、カラム数によってエンティティのサイズが変わる。

## フロントエンドの実装

### ER図の描画

フロントエンドでは`public/src/components/ERCanvas.tsx`でReact Flowを使用してER図を描画している。

- `EntityNodeViewModel`はReact Flowの`Node`型にマッピングされる
- `RelationshipEdgeViewModel`はReact Flowの`Edge`型にマッピングされる
- エンティティノードは`EntityNode`コンポーネントでレンダリングされる（`public/src/components/EntityNode.tsx`）

### 状態管理

フロントエンドの状態はFluxアーキテクチャで管理されている：

- Storeは`public/src/store/erDiagramStore.ts`に実装
- Actionは`public/src/actions/`ディレクトリに実装
- CommandはActionを組み合わせて複雑な操作を実現（`public/src/commands/`）

## 関連する既存機能

### リバースエンジニアリング機能

現在、データベースからER図を生成する機能が実装されている。詳細は以下を参照：

- 仕様書: `spec/reverse_engineering.md`
- 実装: `lib/usecases/ReverseEngineerUsecase.ts`

### インポート・エクスポート機能

ER図データ（ViewModel）をJSON形式でエクスポート・インポートできる。詳細は以下を参照：

- 仕様書: `spec/import_export_feature.md`
- 実装: `public/src/utils/exportViewModel.ts`, `public/src/utils/importViewModel.ts`

## 期待する回答

以下について、具体的な見解と理由を提示してほしい：

### 1. アルゴリズムの選定

配置最適化に適したアルゴリズムを提案してほしい。

#### 考慮すべき点

- **目的関数**：
  - エンティティが被っている数を最小化
  - リレーションが交差している数を最小化
  - リレーションでつながっているエンティティ同士の距離を最小化
  - その他の評価指標があれば提案してほしい
- **アルゴリズムの種類**：
  - 力学モデル（Force-directed graph）
  - 遺伝的アルゴリズム
  - シミュレーテッドアニーリング
  - グラフレイアウトアルゴリズム（Sugiyama、Fruchterman-Reingold など）
  - その他の最適化手法
- **計算量**：
  - ブラウザ上で実行するため、計算量を考慮する必要がある
  - 数百エンティティ程度まで対応できることが望ましい
  - 処理時間の目安（数秒以内が理想）
- **クラスタリング**：
  - リレーションでつながっているエンティティをクラスタリングする方法
  - クラスター間の配置をどうするか

#### アルゴリズム比較

複数のアルゴリズムを比較し、それぞれのメリット・デメリットを示してほしい：

- 実装の複雑さ
- 計算コスト
- 結果の品質
- パラメータチューニングの必要性
- ブラウザ上での実行可能性

### 2. スコアリング関数の設計

目的関数（スコアリング関数）の設計を提案してほしい。

#### 考慮すべき点

- **エンティティの重なり検出**：
  - エンティティの幅と高さをどう扱うか？
  - 矩形の衝突判定をどう実装するか？
  - 重なりの程度をどうスコアに反映するか？
- **リレーション交差の検出**：
  - エンティティの中心同士を直線で結んで交差判定を行う（簡略計算でOK）
  - 線分の交差判定アルゴリズム
  - 交差の数をどうスコアに反映するか？
- **エンティティ間の距離**：
  - リレーションでつながっているエンティティ同士の距離を最小化
  - ユークリッド距離を使用するか？マンハッタン距離を使用するか？
- **重み付け**：
  - 重なり、交差、距離の各スコアをどう重み付けして総合スコアを算出するか？
  - 重み付けのパラメータ調整方法

### 3. エンティティのサイズの扱い

エンティティのサイズ（幅と高さ）をどう取得・管理するか？

#### 考慮すべき点

- **現状の課題**：
  - `EntityNodeViewModel`には`x`と`y`はあるが、`width`と`height`は保存されていない
  - エンティティのサイズはカラム数によって可変
- **解決策の選択肢**：
  - **パターン1**: `EntityNodeViewModel`に`width`と`height`フィールドを追加する
    - メリット: サイズが明示的に保存される、バックエンドでも計算可能
    - デメリット: TypeSpec定義の変更が必要、フロントエンドとの同期が必要
  - **パターン2**: フロントエンドでDOM要素から動的に取得する
    - メリット: TypeSpec変更不要、実際のレンダリングサイズを取得できる
    - デメリット: バックエンドでは利用不可、配置最適化処理はフロントエンド限定になる
  - **パターン3**: カラム数からサイズを推定する
    - メリット: 実装が簡単、バックエンドでも計算可能
    - デメリット: 実際のレンダリングサイズと異なる可能性
- **推奨案**：どのパターンが適切か、またはその他の方法があれば提案してほしい

### 4. 実装場所の検討

配置最適化処理をフロントエンドで実装するか、バックエンドで実装するか？

#### 考慮すべき点

- **フロントエンド実装の場合**：
  - メリット: エンティティの実際のサイズを取得できる、サーバーの負荷がかからない
  - デメリット: ブラウザのパフォーマンスに依存、計算量が大きいと遅くなる
  - 実装場所: `public/src/commands/`に新しいコマンドを追加
- **バックエンド実装の場合**：
  - メリット: 計算リソースが豊富、複雑なアルゴリズムも実行可能
  - デメリット: エンティティの実際のサイズを取得できない（推定が必要）、APIリクエストが必要
  - 実装場所: `lib/usecases/`に新しいUsecaseを追加、新しいAPIエンドポイントを追加
- **推奨案**：どちらが適切か、理由と根拠を示してほしい

### 5. UI/UX設計

配置最適化機能のUI/UXをどう設計するか？

#### 考慮すべき点

- **ボタンの配置**：
  - 画面上のどこに「配置最適化」ボタンを配置するか？
  - リバースエンジニアボタンの近くが適切か？
- **実行時の挙動**：
  - ボタンを押すと即座に最適化が実行されるか？
  - 確認ダイアログを表示するか？
  - 最適化中のローディング表示は必要か？
- **アニメーション**：
  - エンティティの移動をアニメーションで表示するか？
  - React Flowのアニメーション機能を利用できるか？
- **元に戻す機能**：
  - 最適化前の状態に戻す機能は必要か？
  - Undo/Redo機能を実装するか？
- **オプション設定**：
  - アルゴリズムのパラメータをUI上で調整できるようにするか？
  - MVP段階では固定値で良いか？

### 6. 段階的な実装計画

配置最適化機能を段階的に実装する場合の計画を提案してほしい。

#### 考慮すべき点

- **MVP（最小限の機能）**：
  - まず最低限動作する簡単なアルゴリズムで実装
  - シンプルなスコアリング関数（例: エンティティの重なりのみ考慮）
- **段階的な改善**：
  - ステップ1: 基本的な力学モデルで配置
  - ステップ2: リレーション交差の最小化を追加
  - ステップ3: クラスタリングの最適化を追加
  - ステップ4: パラメータチューニングとUI改善
- **優先順位**：
  - MVP段階で必須の機能
  - 後回しにできる機能

### 7. 既存ライブラリの活用

配置最適化に利用できる既存のJavaScript/TypeScriptライブラリがあれば提案してほしい。

#### 考慮すべき点

- **グラフレイアウトライブラリ**：
  - dagre（階層的グラフレイアウト）
  - cytoscape.js（ネットワークビジュアライゼーション）
  - d3-force（力学モデル）
  - ELK (Eclipse Layout Kernel)
  - その他
- **メリット・デメリット**：
  - ライブラリサイズ
  - React Flowとの統合の容易さ
  - カスタマイズ性
  - メンテナンス状況
- **推奨案**：どのライブラリを使うべきか、または自前で実装すべきか

### 8. パフォーマンスの考慮

大規模なER図（100〜200エンティティ）での配置最適化のパフォーマンスをどう確保するか？

#### 考慮すべき点

- **計算量の削減**：
  - アルゴリズムの計算量（O(n^2)、O(n log n)など）
  - 近似アルゴリズムの活用
  - 並列処理の可能性（Web Workers）
- **反復回数の制限**：
  - 最適化アルゴリズムの反復回数を制限
  - 収束条件の設定
- **ユーザー体験**：
  - 処理時間の目安（数秒以内が理想）
  - 処理が長い場合のプログレスバー表示
  - キャンセル機能の必要性

## 参考情報

### 関連仕様書

- `spec/rearchitecture_overview.md`: システム全体構成
- `spec/reverse_engineering.md`: リバースエンジニアリング機能仕様
- `spec/frontend_state_management.md`: フロントエンド状態管理仕様
- `spec/viewmodel_based_api.md`: ViewModelベースAPI仕様
- `scheme/main.tsp`: API型定義（TypeSpec）

### 関連する実装ファイル

- `lib/usecases/ReverseEngineerUsecase.ts`: リバースエンジニアリングのUsecase（現在のデフォルト配置ロジック）
- `public/src/components/ERCanvas.tsx`: ER図描画コンポーネント
- `public/src/components/EntityNode.tsx`: エンティティノードコンポーネント
- `public/src/store/erDiagramStore.ts`: フロントエンドの状態管理Store
- `public/src/actions/`: Actionの実装
- `public/src/commands/`: Commandの実装
