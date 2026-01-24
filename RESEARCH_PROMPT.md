# z-index編集機能のUI・実装方法検討

## リサーチ要件

以下の観点から、z-index編集機能について調査・提案する：

* エンティティ、リレーション、矩形、テキスト（将来実装予定）のz-indexをユーザが編集できるUI、実装方法を検討する
* 要素がリストで表示されて、ドラッグで入れ替えるとz-indexが変わるような仕組みが良いのかなとか考えてるけどベストな方法があれば教えてほしい
* ライブラリを使ったほうがよければそれも教えてほしい。不要なら無しでもいい

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite + React + React Flow
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec

### 現状のフェーズ

- アプリケーションを丸ごと作り直そうとしているので不要なコードが残っているケースあり
- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- 後方互換も考慮しない
- 不要になったコードは捨てる
- AIが作業するため学習コストは考慮不要

## 関連する既存仕様・実装

### データモデル（scheme/main.tsp）

TypeSpecで以下の型が定義されている：

#### エンティティ（Entity）

```typescript
model EntityNodeViewModel {
  id: string; // UUID
  name: string;
  x: float64;
  y: float64;
  columns: Column[];
  ddl: string;
}
```

#### リレーションシップ（Relationship）

```typescript
model RelationshipEdgeViewModel {
  id: string; // UUID
  sourceEntityId: string;
  sourceColumnId: string;
  targetEntityId: string;
  targetColumnId: string;
  constraintName: string;
}
```

#### 矩形（Rectangle）

```typescript
model Rectangle {
  id: string; // UUID
  x: float64;
  y: float64;
  width: float64;
  height: float64;
  fill: string;       // 背景色（例: "#E3F2FD"）
  stroke: string;     // 枠線色（例: "#90CAF9"）
  strokeWidth: float64; // 枠線幅（px）
  opacity: float64;     // 透明度（0〜1）
}
```

#### テキスト（Text）（未実装）

```typescript
model Text {
  id: string; // UUID
  x: float64;
  y: float64;
  content: string;
  fontSize: float64;
  fill: string;
}
```

#### ERDiagramViewModel

```typescript
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>;
  ui: ERDiagramUIState;
  loading: boolean;
}
```

現状、`ERDiagramViewModel`には各要素のz-indexに関する情報は含まれていない。

### 現在のz-index制御（spec/rectangle_drawing_feature.md）

#### レイヤー順序（MVP段階）

矩形描画機能の仕様書では、以下のレイヤー順序が定義されている：

- 矩形ノード: `zIndex = 0`
- エンティティノード: `zIndex = 100`
- エッジ: デフォルト（0未満）

#### React Flow設定

- `elevateNodesOnSelect={false}`: 選択時に要素が前面に出ないようにする（ERCanvas.tsxで設定済み）
- または`zIndexMode="manual"`: 自動z-index制御を無効化し、明示的にzIndexを管理

#### 複数矩形の重なり順

仕様書より抜粋：

> MVP段階では作成順固定とし、重なり順の変更機能は後回し。
> 将来的に必要になった場合は、`Rectangle`に`zIndex`フィールドを追加し、Actionで重なり順を変更可能にする。

### React Flow統合

#### ERCanvasコンポーネント（public/src/components/ERCanvas.tsx）

現在の実装では以下のように動作している：

- エンティティ、矩形、リレーションシップをReact Flowノード・エッジとして描画
- `nodeTypes`に`entityNode`と`rectangleNode`が登録済み
- `edgeTypes`に`relationshipEdge`が登録済み
- `elevateNodesOnSelect={false}`を設定（選択時に要素が前面に出ない）

#### ノード・エッジの変換（public/src/utils/reactFlowConverter.ts）

- `ERDiagramViewModel`の各要素（nodes, edges, rectangles）をReact Flowの形式に変換
- 変換時に各要素のz-indexを指定する仕組みが考えられる

### フロントエンド状態管理（spec/frontend_state_management.md）

#### 設計原則

- **単一状態ツリー**: アプリケーション全体の状態を`ViewModel`で管理
- **純粋関数Action**: すべての状態更新は `action(viewModel, ...params) => newViewModel` の形式で実装
- **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）

#### Action層の設計

すべてのActionは以下の形式の純粋関数：

```typescript
type ActionFn<Args extends any[] = any[]> = (
  viewModel: ViewModel,
  ...args: Args
) => ViewModel;
```

例：
- `actionAddRectangle(vm, rectangle)`: 新規矩形を追加
- `actionUpdateRectangleStyle(vm, rectangleId, stylePatch)`: 矩形のスタイルを部分更新

z-index編集機能を実装する場合、同様のAction層で状態を更新することになる。

### 永続化

#### LayoutDataへの保存

現在、以下の情報が永続化されている：

```typescript
model LayoutData {
  entities: Record<EntityLayoutItem>;  // エンティティの座標
  rectangles: Record<Rectangle>;       // 矩形の情報
  texts: Record<Text>;                 // テキストの情報
}
```

保存API: `POST /api/layout`
読み込みAPI: `GET /api/layout`

z-indexを永続化する場合、`LayoutData`または`ERDiagramViewModel`に情報を追加する必要がある。

### 既存のUI構造

#### App.tsx

```typescript
function App() {
  return (
    <div className="app">
      <header style={{ /* ヘッダースタイル */ }}>
        <h1>ER Diagram Viewer</h1>
        <button onClick={/* ビルド情報 */}>ビルド情報</button>
      </header>
      <main style={{ height: 'calc(100vh - 70px)' }}>
        <ERCanvas />
      </main>
      {showBuildInfo && <BuildInfoModal onClose={...} />}
    </div>
  )
}
```

現在の画面構成：
- ヘッダー（固定高さ）
- メインコンテンツ（ERCanvas）が残りの高さを占める
- モーダルはポータルとして表示

z-index編集UIを追加する場合、以下のような配置が考えられる（限定しない）：
- サイドバー
- ツールバー
- モーダル
- フローティングパネル
- その他

#### ツールバー（ERCanvas.tsx）

現在のツールバーには以下のボタンがある：
- 「リバースエンジニア」ボタン
- 「矩形追加」ボタン

z-index編集を起動するボタンをツールバーに追加することも考えられる。

### 矩形プロパティパネル（実装済み）

#### RectanglePropertyPanel.tsx（public/src/components/RectanglePropertyPanel.tsx）

矩形のプロパティ編集UIとして、右サイドバー型のプロパティパネルが実装されている：

- 背景色の編集（カラーピッカー + プリセット8色）
- 枠線色の編集（カラーピッカー + プリセット8色）
- 透明度の編集（スライダー）
- 枠線幅の編集（数値入力）
- 削除ボタン

カラーピッカーライブラリ: **react-colorful**（`HexColorPicker`と`HexColorInput`）を使用

このパネルと同様の配置・スタイルでz-index編集UIを実装することも考えられる。

## 検討すべき事項

### 1. z-indexの管理方法

現状、各要素（エンティティ、リレーション、矩形、テキスト）にz-indexフィールドはない。

以下のような選択肢が考えられる（限定しない）：

- 各要素にz-indexフィールドを追加する
- 別途、要素のレイヤー順序を管理するデータ構造を用意する
- React Flowのノード配列の順序でz-indexを決定する（配列の後ろほど前面）
- その他

### 2. z-index編集UIの配置方法

以下のような選択肢が考えられる（限定しない）：

- 右サイドバー（矩形プロパティパネルと同じ配置）
- 左サイドバー
- フローティングパネル
- モーダルダイアログ
- ツールバー内のポップオーバー
- コンテキストメニュー（右クリック）
- その他

各選択肢のメリット・デメリット、実装の難易度、React Flowとの親和性について調査してほしい。

### 3. z-index編集UIの操作方法

以下のような選択肢が考えられる（限定しない）：

- 要素のリストを表示し、ドラッグ&ドロップで順序を入れ替える
- 各要素に「前面へ移動」「背面へ移動」ボタンを配置
- z-index値を直接数値入力で編集
- その他

各選択肢のメリット・デメリット、ユーザビリティについて調査してほしい。

### 4. ライブラリの必要性

リスト表示とドラッグ&ドロップ機能を実装する場合、以下のようなライブラリが考えられる（限定しない）：

- **react-beautiful-dnd**: リストのドラッグ&ドロップ
- **dnd-kit**: モダンなドラッグ&ドロップライブラリ
- **react-sortable-hoc**: リストのソート
- その他

各ライブラリの特徴、メリット・デメリット、React Flowとの互換性について調査してほしい。

また、ライブラリを使わずにブラウザ標準のDrag and Drop APIで実装する選択肢についても調査してほしい。

### 5. 要素の種類別の扱い

エンティティ、リレーション、矩形、テキストは異なる型であり、以下のような考慮が必要：

- すべての要素を統一的にリスト表示する方法
- 要素の種類ごとにアイコンや色を変える必要性
- リレーション（エッジ）のz-indexをどう扱うか（React Flowではノードとエッジは別扱い）
- テキストは未実装だが、将来の拡張性を考慮するべきか

### 6. 選択状態との連携

現在、矩形の選択状態は以下で管理されている：

- React Flowの選択機能（`onSelectionChange`）
- `GlobalUIState.selectedRectangleId`（矩形プロパティパネル表示制御用）

z-index編集UI上で要素を選択した場合、キャンバス上の選択状態と連動させるべきか？

### 7. リアルタイム更新 vs 確定時更新

z-indexをドラッグで入れ替えた際、以下のどちらが適切か：

- ドラッグ中もリアルタイムにキャンバスに反映する
- ドラッグ完了時（または「適用」ボタン押下時）に反映する

### 8. 永続化の仕様

z-index情報をどのように永続化するか：

- 各要素にz-indexフィールドを追加し、`LayoutData`に保存
- 別途、レイヤー順序を管理するデータ構造を追加
- サーバー側での保存形式

### 9. 他のダイアグラムツールのUI参考

以下のようなツールではz-index編集がどのように実装されているか（参考情報として）：

- Figma
- Miro
- draw.io / diagrams.net
- Lucidchart
- その他のダイアグラム作成ツール

### 10. React Flowとの統合

- React Flowでz-indexを動的に変更する方法
- ノードとエッジのz-indexを独立して管理する方法
- `zIndex`プロパティの更新がパフォーマンスに与える影響

## 既存の技術的制約

- **React Flow**: カスタムノードとして実装済み、React Flowの標準機能を活用すべき
- **状態管理**: 自前StoreとAction層を使用、純粋関数で実装する必要がある
- **TypeSpec**: 型定義は`scheme/main.tsp`で一元管理し、`npm run generate`で生成
- **レイアウト**: 現在はヘッダー+メインコンテンツの構成、右サイドバー（矩形プロパティパネル）が実装済み

## 重視する点

- **実装の容易さ**: MVPフェーズであり、シンプルで実装しやすい方法を優先
- **操作性**: ユーザーが直感的に操作できるUI
- **React Flowとの親和性**: React Flowの標準機能を活用し、無理のない統合
- **拡張性**: テキストノードなど将来追加される要素にも対応できる設計

## 重視しない点

- **パフォーマンスの極端な最適化**: MVPフェーズでは過度な最適化は不要
- **学習コストの低減**: AIが実装するため、複雑なライブラリでも問題ない
- **後方互換性**: 考慮不要
- **高度なUI/UX**: 基本的な機能が動作すれば十分

## 期待する回答

上記の検討すべき事項について、具体的なUI設計案、推奨ライブラリ（必要な場合）、実装方法、およびサンプルコードを提案してください。特に以下の点について詳しく説明してください：

1. **z-indexの管理方法**（データモデルの設計）
2. **最適なUI配置方法**とその理由
3. **最適な操作方法**（リストのドラッグ&ドロップなど）とその理由
4. **ライブラリの必要性**とその選定根拠
5. **実装の具体的な手順**とコード例
6. **React Flowとの統合方法**
7. **永続化の仕様**

可能であれば、複数の選択肢を比較し、それぞれのメリット・デメリットを示してください。
