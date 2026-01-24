# 矩形編集機能のUI設計検討

## リサーチ要件

以下の観点から、矩形編集機能のUIについて調査・提案する：

* 矩形編集機能のUIはどうするのが良いか？
    * 場合によっては右クリックのコンテキストメニューなどを活用したほうがよいか？
* 何かしらライブラリを導入した方がいいか？必要ないか？

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

### 矩形描画機能の要件（spec/rectangle_drawing_feature.md）

矩形描画機能の仕様は以下の通り定義されている：

#### データモデル

TypeSpec（`scheme/main.tsp`）で以下の型が定義されている：

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

model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>;
  ui: ERDiagramUIState;
  loading: boolean;
}
```

#### 機能要件

仕様書に定義されている機能要件：

**矩形の作成**
- ツールバーの「矩形追加」ボタンをクリックすると、viewport中央に固定サイズの矩形を追加
- デフォルト値: サイズ200×150px、背景色`#E3F2FD`、枠線色`#90CAF9`、枠線幅2px、透明度0.5

**矩形の移動（実装済み）**
- 矩形をドラッグして位置を変更可能
- ドラッグ完了時（`onNodeDragStop`）に矩形の座標をStoreに反映
- エンティティと同じ操作感で移動できる

**矩形のリサイズ（実装済み）**
- 選択中の矩形に対してリサイズハンドルを表示
- React Flowの`NodeResizer`コンポーネントを使用
- 最小サイズ: 幅40px × 高さ40px
- リサイズ完了時（`onResizeEnd`）に矩形の座標とサイズをStoreに反映

**矩形の削除**
- 矩形を選択して削除ボタンまたはDeleteキーで削除可能
- 削除時は`actionRemoveRectangle`をdispatchして状態から除外

**矩形のプロパティ編集（UIが未確定）**
- 仕様書では「右サイドのプロパティパネル」と記載されているが、これは確定ではない
- 編集可能なプロパティ:
  - **背景色（fill）**: カラーピッカー + プリセット8色
  - **枠線色（stroke）**: カラーピッカー + プリセット8色
  - **透明度（opacity）**: スライダー（0〜1、ステップ0.01）
  - **枠線幅（strokeWidth）**: 数値入力（0以上、ステップ1）

#### カラーピッカー仕様

- ライブラリ: **react-colorful**を使用することが決定済み
- コンポーネント: `HexColorPicker` + `HexColorInput`
- プリセット8色（淡い色）:
  - 青（`#E3F2FD`）
  - シアン（`#E0F7FA`）
  - ティール（`#E0F2F1`）
  - 緑（`#E8F5E9`）
  - 黄（`#FFFDE7`）
  - オレンジ（`#FFF3E0`）
  - ピンク（`#FCE4EC`）
  - グレー（`#F5F5F5`）

### フロントエンド技術スタック

#### React Flow

- **役割**: ER図のレンダリングとインタラクティブ機能（ドラッグ&ドロップ、ズーム、パンなど）
- **公式サイト**: https://reactflow.dev/
- **バージョン**: v12系を使用（推測）
- **特徴**:
  - ノードベースのエディタを構築するためのライブラリ
  - カスタムノード（Custom Node）を定義可能
  - ドラッグ&ドロップ、リサイズなどの機能を標準で提供
  - React Flowの`NodeResizer`コンポーネントでノードのリサイズが可能

#### 現在のノード実装状況

フロントエンドでは以下のノードタイプが使用されている：

1. **エンティティノード（entityNode）**: データベーステーブルを表示
2. **矩形ノード（rectangleNode）**: エンティティのグループ化用（実装済み）
3. **テキストノード（textNode）**: 注釈用（未実装）

### フロントエンド状態管理（spec/frontend_state_management.md）

アプリケーション全体の状態管理は以下の方針で実装されている：

- **単一状態ツリー**: ER図に関するすべての状態を`ERDiagramViewModel`で管理
- **純粋関数Action**: すべての状態更新は `action(viewModel, ...params) => newViewModel` の形式で実装
- **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）
- **React Flowとの統合**: ドラッグ中はReact Flow内部状態を使用、確定時のみストアに反映

### 矩形操作のAction（実装済み）

`public/src/actions/rectangleActions.ts`に以下のActionが実装されている：

- `actionAddRectangle(vm, rectangle)`: 新規矩形を追加
- `actionRemoveRectangle(vm, rectangleId)`: 矩形を削除
- `actionUpdateRectanglePosition(vm, rectangleId, x, y)`: 矩形の位置を更新
- `actionUpdateRectangleSize(vm, rectangleId, width, height)`: 矩形のサイズを更新
- `actionUpdateRectangleBounds(vm, rectangleId, {x, y, width, height})`: 矩形の座標とサイズを一括更新
- `actionUpdateRectangleStyle(vm, rectangleId, stylePatch)`: 矩形のスタイル（fill/stroke/strokeWidth/opacity）を部分更新

すべてのActionは純粋関数として実装されており、状態に変化がない場合は同一参照を返す設計となっている。

### RectangleNodeコンポーネント（実装済み）

`public/src/components/RectangleNode.tsx`が実装されている：

- `NodeResizer`を使用してリサイズハンドルを表示
- 最小サイズ: 40×40px
- `onResizeEnd`でリサイズ完了時に`actionUpdateRectangleBounds`をdispatch
- スタイルは`data`プロパティから取得（fill、stroke、strokeWidth、opacity）
- z-index制御: デフォルトでzIndex=0（エンティティより背景）

### ERCanvasコンポーネント（実装済み）

`public/src/components/ERCanvas.tsx`には以下が実装されている：

- ツールバーに「矩形追加」ボタンあり
- `nodeTypes`に`rectangleNode`が登録済み
- `onNodeDragStop`で矩形とエンティティの位置更新を処理
- `elevateNodesOnSelect={false}`を設定（選択時に矩形が前面に出ないように）

### 既存のUI構造

`public/src/components/App.tsx`:

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

### z-index制御とレイヤー管理

仕様書より、以下のレイヤー順序が定義されている：

- 矩形ノード: `zIndex = 0`
- エンティティノード: `zIndex = 100`
- エッジ: デフォルト（0未満）

MVP段階では作成順固定とし、重なり順の変更機能は後回し。

## 現在の実装状況のまとめ

**実装済み**:
- 矩形の追加（ツールバーボタン）
- 矩形の移動（ドラッグ）
- 矩形のリサイズ（NodeResizerによる）
- 矩形操作用のAction（すべて）
- RectangleNodeコンポーネント
- ERCanvasへの統合
- react-colorfulのインストール

**未実装**:
- 矩形のプロパティ編集UI（背景色、枠線色、透明度、枠線幅の編集）
- 矩形の削除機能（ボタンまたはDeleteキー）

## 検討すべき事項

### 1. プロパティ編集UIの配置方法

以下のような選択肢が考えられるが、どれが最適か？

**選択肢の例（限定しない）**:
- 右サイドバーのプロパティパネル
- 左サイドバーのプロパティパネル
- フローティングパネル
- モーダルダイアログ
- コンテキストメニュー（右クリック）
- ツールバー内のポップオーバー
- インラインエディタ（矩形の近くに表示）
- その他

各選択肢のメリット・デメリット、実装の難易度、React Flowとの親和性について調査してほしい。

### 2. コンテキストメニューの活用

- 右クリックのコンテキストメニューを使用する場合の利点・欠点は？
- React Flowでコンテキストメニューを実装する方法は？
- コンテキストメニュー専用のライブラリを使用すべきか？

### 3. ライブラリの必要性

プロパティ編集UIの実装にあたって、以下のようなライブラリが必要か？

**想定されるライブラリの例（限定しない）**:
- UIコンポーネントライブラリ（Material-UI、Ant Design、Chakra UIなど）
- コンテキストメニューライブラリ
- フォームライブラリ
- スライダー専用ライブラリ
- その他

それとも、素のReactとreact-colorfulだけで十分実装可能か？

### 4. 選択状態の管理

- 矩形が選択されているかどうかをどう判定するか？
- React Flowの`useReactFlow`フックから`getSelectedElements()`を使用すべきか？
- 選択変更の検知方法（`onSelectionChange`イベントなど）
- 複数選択時の挙動
- エンティティノードが選択されている場合の挙動

### 5. UIのレイアウト設計

プロパティ編集UIを実装する場合：

- カラーピッカーの開閉状態の管理（常時表示？クリックで開く？）
- プリセット色のクリック処理とレイアウト（グリッド？横並び？）
- 入力値のバリデーション
- 各入力フィールドのラベル表示
- 全体のスタイリング方法

### 6. 削除機能のUI

- 削除ボタンをどこに配置すべきか？
- Deleteキーのイベントハンドリング方法
- プロパティパネル内に配置？ツールバー？コンテキストメニュー？

### 7. 再利用可能なコンポーネント設計

- カラーピッカーコンポーネントを矩形以外（将来的にテキストノードの色など）でも使えるようにするには？
- プロパティ編集パネルの汎用的な設計方針は？

### 8. リアルタイム更新 vs 確定時更新

- 色や透明度を変更した際、即座にキャンバスに反映すべきか？
- 確定ボタンを押した時に反映すべきか？
- デバウンス処理の必要性

### 9. 他のダイアグラムツールのUI参考

以下のようなツールではどのようなUIが採用されているか？（参考情報として）:
- Figma
- Miro
- draw.io / diagrams.net
- Lucidchart
- その他のダイアグラム作成ツール

## 既存の技術的制約

- **React Flow**: カスタムノードとして実装済み、React Flowの標準機能を活用すべき
- **状態管理**: 自前StoreとAction層を使用、純粋関数で実装する必要がある
- **カラーピッカー**: react-colorful使用が確定（`HexColorPicker`と`HexColorInput`）
- **レイアウト**: 現在はヘッダー+メインコンテンツの構成、サイドバーは未実装

## 重視する点

- **実装の容易さ**: MVPフェーズであり、シンプルで実装しやすい方法を優先
- **操作性**: ユーザーが直感的に操作できるUI
- **React Flowとの親和性**: React Flowの標準機能を活用し、無理のない統合
- **再利用性**: カラーピッカーやプロパティ編集UIは他の機能でも使えるように設計

## 重視しない点

- **パフォーマンスの極端な最適化**: MVPフェーズでは過度な最適化は不要
- **学習コストの低減**: AIが実装するため、複雑なライブラリでも問題ない
- **後方互換性**: 考慮不要
- **高度なUI/UX**: 基本的な機能が動作すれば十分

## 期待する回答

上記の検討すべき事項について、具体的なUI設計案、推奨ライブラリ（必要な場合）、実装方法、およびサンプルコードを提案してください。特に以下の点について詳しく説明してください：

1. **最適なUI配置方法**（サイドバー、コンテキストメニュー、その他）とその理由
2. **ライブラリの必要性**とその選定根拠
3. **実装の具体的な手順**とコード例
4. **選択状態の管理方法**
5. **React Flowとの統合方法**

可能であれば、複数の選択肢を比較し、それぞれのメリット・デメリットを示してください。
