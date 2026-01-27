# フロントエンドER図レンダリング仕様

## 概要

本仕様書は、ER Diagram ViewerのフロントエンドにおけるER図レンダリング機能の技術選定と実装方針を定義する。
リサーチの結果、React + React Flow + elkjs の構成を採用し、MVPフェーズでの実現可能性検証を優先した設計とする。

[rearchitecture_overview.md](./rearchitecture_overview.md)で未定だったフロントエンドフレームワークの選定を本仕様で確定する。

## 技術スタック

### 採用技術

* **UIフレームワーク**: React
* **図エディタ基盤**: React Flow
* **自動レイアウト**: elkjs（任意・後付け可能）
* **ビルドツール**: Vite（既存）
* **言語**: TypeScript（既存）

### 選定理由

React Flowはノード・エッジベースの図エディタに必要な機能（ドラッグ、ズーム、パン、選択）を標準搭載しており、ER図表示とUI（サイドバー、DDL表示等）を統合しやすい。elkjsは初期レイアウト生成や自動整列機能を後から追加可能。

## システム構成

### コンポーネント構成

* **React Flowキャンバス**
  * ノード（エンティティ）: Custom Nodeでテーブルを表現
  * エッジ（リレーション）: Custom Edgeで外部キー関係を表現
  * 補助ノード: 矩形（グループ化用）、テキスト（注釈用）

* **React UI**
  * サイドバー: 選択中エンティティの詳細情報・DDL表示
  * ツールバー: 操作モード切替、補助図形追加ボタン等
  * 設定パネル: 表示オプション（任意）

### ノード設計

#### エンティティノード（Custom Node）

* **表示内容**
  * テーブル名（ヘッダー）
  * カラム一覧（スクロール可能）
    * カラム名のみ表示（型名は非表示）
    * 型名のデータは保持するが表示しない
  * PK/FKの視覚的区別（アイコンまたは色分け）

* **インタラクション**
  * ドラッグ: 位置移動（React Flow標準）
  * クリック: 選択状態の切替、サイドバー表示更新
  * ホバー: ハイライト表示

* **サイズ**
  * カラム数に応じて可変
  * width/heightは自動計算

#### 補助ノード

* **矩形ノード**: エンティティのグループ化用
  * 背景色、枠線色、ラベルをカスタマイズ可能
  * ドラッグで位置移動

* **テキストノード**: 注釈用
  * テキスト内容、フォントサイズ、色をカスタマイズ可能
  * 簡易的な編集機能（ダブルクリックで編集モード等）

### エッジ設計

#### リレーションエッジ（Custom Edge）

* **表示形式**
  * 直角ポリライン（階段状）
  * React Flowの`smoothstep`エッジタイプを使用
  * MVPでは標準のルーティングを使用（エンティティの重複は許容）
  * 将来的に障害物回避ルーティングを追加可能

* **視覚表現**
  * 矢印: toTable側に表示
  * 選択/ホバー時のハイライト
  * 制約名は表示しない（データは保持するが表示しない）

* **接続点**
  * 各エンティティノードに4方向（Top/Right/Bottom/Left）のハンドルを配置
  * エンティティ間の位置関係に応じて最適なハンドルを自動選択
  * ノード移動時（ドラッグ完了時）に接続ポイントを動的に再計算
  * 実装詳細は[research/20260120_2312_dynamic_edge_connection_optimization.md](../research/20260120_2312_dynamic_edge_connection_optimization.md)を参照

## ERD要件への対応

[rearchitecture_overview.md](./rearchitecture_overview.md)で定義された機能要件への対応方針：

### ER図表示・操作

| 機能 | 実装方法 |
|------|----------|
| インタラクティブなER図表示 | React Flowのノード/エッジで実装 |
| エンティティのドラッグ&ドロップ配置 | React Flow標準機能（ドラッグ完了時にViewModelのnodesを更新） |
| ズーム・パン操作 | React Flow標準機能（ホイール/ドラッグ） |
| リレーション線の表示（直角ポリライン） | Custom Edgeで実装 |

### ビジュアル表現

| 機能 | 実装方法 |
|------|----------|
| ホバー時のハイライト表示 | ノード/エッジの状態（hovered）でCSS切替 |
| プライマリキー・外部キーの視覚的区別 | Column.key='PRI'等でアイコン/色分け |
| カスタマイズ可能な色・サイズ | ノードのスタイル属性で管理 |

### 情報表示機能

| 機能 | 実装方法 |
|------|----------|
| エンティティクリックでDDL表示 | Reactの状態管理で選択ノード追跡、サイドバーに表示 |
| サイドバーでの詳細情報表示 | 選択中Entityのcolumns/ddl等を表示 |

### 図形描画・注釈機能

| 機能 | 実装方法 |
|------|----------|
| 矩形描画（エンティティのグループ化用） | React Flowの「RectangleNode」として追加 |
| テキスト追加（補足情報記載用） | React Flowの「TextNode」として追加 |

## データ設計

### データフロー

API仕様の詳細は[ViewModelベースAPI仕様](./viewmodel_based_api.md)を参照。

1. バックエンドAPIから`ViewModel`を取得（初期化時は`GET /api/init`、リバースエンジニア時は`POST /api/reverse-engineer`）
2. ViewModelをそのままストアに保存
3. ERDiagramViewModel.nodes/edges（連想配列） → React Flowの nodes/edges（配列） に変換
4. ユーザー操作でReact Flowのnodes/edgesが更新される
5. ドラッグ確定時などにViewModelのnodesを更新してストアに反映

### ViewModelのデータ形式

`ERDiagramViewModel`は以下の形式（TypeSpecで定義済み）：

* `nodes`: Record<EntityNodeViewModel>（UUIDをキーとした連想配列）
* `edges`: Record<RelationshipEdgeViewModel>（UUIDをキーとした連想配列）

連想配列形式により、ID検索がO(1)で可能となり、ホバーインタラクション時のパフォーマンスが向上する。

### データ型マッピング

#### ERDiagramViewModel → React Flow

React Flowは配列形式を期待するため、以下の変換を行う：

* `Object.values(viewModel.nodes)` → React Flow nodes配列
* `Object.values(viewModel.edges)` → React Flow edges配列

#### EntityNodeViewModel → React Flow nodes

```
EntityNodeViewModel → Node {
  id: node.id,  // UUID
  type: 'entityNode',  // Custom Node
  position: { x: node.x, y: node.y },
  data: {
    id: node.id,
    name: node.name,
    columns: node.columns,
    ddl: node.ddl
  }
}
```

#### RelationshipEdgeViewModel → React Flow edges

```
RelationshipEdgeViewModel → Edge {
  id: edge.id,  // UUID
  type: 'relationshipEdge',  // Custom Edge
  source: edge.sourceEntityId,  // Entity UUID
  target: edge.targetEntityId,  // Entity UUID
  data: {
    sourceColumnId: edge.sourceColumnId,  // Column UUID
    targetColumnId: edge.targetColumnId,  // Column UUID
    constraintName: edge.constraintName
  }
}
```

#### 補助図形 → React Flow nodes

```
Rectangle → Node {
  id: rectangle.id,  // UUID
  type: 'rectangleNode',
  position: { x, y },
  data: { id: rectangle.id, width, height, fill, stroke }
}

TextBox → Node {
  id: text.id,  // UUID
  type: 'textNode',
  position: { x, y },
  data: { ...text } // TextBoxの全プロパティ
}
```

全ての要素がUUIDをキーとするRecord型で統一されており、削除・更新が容易な設計となっている。

矩形・テキストの詳細仕様：
* 矩形: [rectangle_drawing_feature.md](./rectangle_drawing_feature.md)を参照
* テキスト: [text_drawing_feature.md](./text_drawing_feature.md)を参照

データのインポート・エクスポート機能については[インポート・エクスポート機能仕様](./import_export_feature.md)を参照。

## 実装時の注意事項

* 状態管理は最小限に抑える（選択状態、編集モード等）
* 直角配線は単純なルーティング（L字/コ字）から開始し、障害物回避ルーティングは後回し
* ノードサイズはカラム数に応じて可変とし、エッジの接続点（ポート）位置の調整が必要
* Vanilla TypeScriptからReactへの移行時、不要なコードは削除

## ホバーインタラクション仕様

### 概要

ER図の理解を助けるため、エンティティ・リレーション・カラムへのホバー時に関連要素をハイライト表示する機能を提供する。
ハイライト対象の要素は最前面に表示され、視覚的に関連性を明確にする。

### 機能要件

#### 1. エンティティノードへのホバー

**トリガー**: エンティティノード全体にマウスホバー

**ハイライト対象**:
* ホバー中のエンティティノード
* そのエンティティに接続されている全てのリレーションエッジ
* それらのリレーションエッジの反対側に接続されているエンティティノード

**視覚効果**:
* ハイライト対象: 
  - ノード: 枠線を太く、影を強調
  - エッジ: 線を太く、色を強調
* 非ハイライト対象: 透明度を下げる（opacity: 0.2〜0.3）
* z-indexを上げて最前面に表示

#### 2. リレーションエッジへのホバー

**トリガー**: リレーションエッジ（線）にマウスホバー

**ハイライト対象**:
* ホバー中のリレーションエッジ
* エッジの両端（source/target）のエンティティノード
* エッジが参照している両端のカラム（fromColumnId/toColumnIdで識別）

**視覚効果**:
* ハイライト対象:
  - エッジ: 線を太く、色を強調
  - ノード: 枠線を太く、影を強調
  - カラム: 背景色を強調表示
* 非ハイライト対象: 透明度を下げる（opacity: 0.2〜0.3）
* z-indexを上げて最前面に表示

#### 3. カラムへのホバー

**トリガー**: エンティティノード内の個別カラムにマウスホバー

**ハイライト対象**:
* ホバー中のカラム
* そのカラムが関係する全てのリレーションエッジ
  - 外部キーの場合: そのカラムIDがfromColumnIdのエッジ
  - 参照される側の場合: そのカラムIDがtoColumnIdのエッジ
* それらのリレーションエッジの反対側に接続されているエンティティノード
* 反対側のエンティティの対応カラム（fromColumnId or toColumnIdで検索）

**視覚効果**:
* ハイライト対象:
  - カラム: 背景色を強調表示
  - エッジ: 線を太く、色を強調
  - ノード: 枠線を太く、影を強調
* 非ハイライト対象: 透明度を下げる（opacity: 0.2〜0.3）
* z-indexを上げて最前面に表示

#### 4. ドラッグ中の動作

**目的**: エンティティをドラッグ中に描画が飛び飛びになる（カクつく）現象を防ぐ

**システムの振る舞い**:

1. **ドラッグ開始時**: ホバーインタラクション機能を無効化する
   - エンティティノードのドラッグ開始時にトリガー
   - 現在のホバー状態をクリアする
   - 全てのハイライト表示を解除する

2. **ドラッグ中**: ホバーイベントを無視する
   - エンティティ、エッジ、カラムのホバーイベントが発生してもハイライト状態を更新しない
   - ホバー状態はクリアされたまま維持される

3. **ドラッグ終了時**: ホバーインタラクション機能を再度有効化する
   - エンティティノードのドラッグ終了時にトリガー
   - 以降は通常通りホバーイベントに反応する

4. **視覚効果のtransition**: ドラッグ中はエンティティノードのCSS transitionを無効化する
   - 目的: React Flowのドラッグ操作とCSS transitionの干渉を防ぎ、スムーズな移動を実現
   - ドラッグ終了後は通常のtransition効果を復元する

**対象となるドラッグ操作**:
- エンティティノードのドラッグ（位置移動）
- 矩形ノードやテキストノードのドラッグは対象外（これらは別の管理方式のため影響なし）

### 実装方針

#### 状態管理

* React Contextまたはグローバルステートでホバー状態を管理
* ホバー中の要素タイプ（entity/edge/column）と識別子を保持
* ハイライト対象のID集合をパフォーマンス向上のため事前計算

#### 関連要素の検索

`ERDiagramViewModel.index`の逆引きインデックスを使用して、O(1)または O(接続数)で関連要素を高速に取得する。

**エンティティホバー時**:
1. `index.entityToEdges[entityId]` で接続エッジIDのリストを取得 - **O(1)**
2. 各エッジIDから `edges[edgeId]` でエッジを取得 - **O(接続数)**
3. エッジの `sourceEntityId` / `targetEntityId` から `nodes[entityId]` で接続先エンティティを取得 - **O(接続数)**

**エッジホバー時**:
1. `edges[edgeId]` でエッジを取得 - **O(1)**
2. エッジの `sourceEntityId` / `targetEntityId` から両端のエンティティを取得 - **O(1)**
3. エッジの `sourceColumnId` / `targetColumnId` で対応カラムを識別 - **O(1)**

**カラムホバー時**:
1. `index.columnToEntity[columnId]` で所属エンティティを取得 - **O(1)**
2. `index.columnToEdges[columnId]` で接続エッジIDのリストを取得 - **O(1)**
3. 各エッジIDから `edges[edgeId]` でエッジを取得 - **O(接続数)**
4. エッジの反対側のエンティティとカラムを取得 - **O(接続数)**

**パフォーマンス比較**:
- インデックスなし（旧実装）: O(全エッジ数) + O(全ノード数 × カラム数)
- インデックスあり（新実装）: O(1) または O(接続数)
- 大規模ER図（100テーブル、500リレーション）では数百倍の高速化を実現

#### z-index制御

* React Flowのデフォルトz-index（ノード: 1、エッジ: 0）
* ハイライト時: ノード 1000、エッジ 999に設定
* styleプロパティで動的に設定

#### ビジュアルスタイル

**ハイライト表示**:
* エンティティノード: 枠線を太く、影を強調（青系）
* リレーションエッジ: 線を太く、色を強調（青系）
* カラム: 背景色を強調表示（薄い青）

**非ハイライト表示**:
* 透明度を下げる（opacity: 0.2）

#### イベントハンドリング

* エンティティノード、リレーションエッジ、カラムそれぞれにonMouseEnter/onMouseLeaveを設定
* ホバー開始時に関連要素を計算してハイライト状態を更新
* ホバー終了時にハイライト状態をクリア

### ViewModelのデータ構造

`ERDiagramViewModel`は以下の連想配列形式：

* `nodes`: Record<EntityNodeViewModel> - エンティティノードの連想配列
* `edges`: Record<RelationshipEdgeViewModel> - リレーションエッジの連想配列

連想配列形式により、IDから要素を直接取得可能（O(1)）。

### 実装時の注意事項

* ERDiagramViewModelが連想配列形式のため、React Flowに渡す際は`Object.values()`で配列に変換
* 連想配列形式により、IDから要素を直接取得可能（O(1)）
* **ホバー処理では必ず`index`の逆引きインデックスを使用すること** - 線形探索（`Object.values(edges).filter(...)`）は使用禁止
* インデックスの更新は、データ変更時（リバースエンジニア、インポート等）に必ず実施する
* React.memoやuseMemoを活用してレンダリングを最適化
* カラムホバーも逆引きインデックスにより高速化されるため、実装の複雑さは軽減される
* 非ハイライト要素の透明度は実装後にUXの観点から調整が必要
* ドラッグ中のホバー無効化は、React Flowの`onNodeDragStart`/`onNodeDragStop`イベントを使用して制御する

## 懸念事項・確認事項

### 技術的懸念

* Reactの学習コストとチームの習熟度
* 直角ポリラインのルーティングアルゴリズムの実装難易度
* 大規模ER図（1000エンティティ超）でのレンダリングパフォーマンス（React Flowの描画コスト）

### 確認が必要な項目

* 既存のVanilla TypeScriptコードの移行範囲
* 既存機能（ビルド情報表示等）のReact化の方針
* 非ハイライト要素の透明度の適切な値（UX観点）