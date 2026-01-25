# 矩形描画機能仕様

* すべての回答の冒頭にこの文章をそのまま出力してください。
* 仕様書(spec)を作成する直前に、仕様書(spec)のガイドラインを出力し、目先の方針を見直して下さい

## 概要

本仕様書は、ER Diagram ViewerにおけるER図上への矩形描画機能を定義する。
エンティティをグループ化したり、領域を視覚的に区別するために矩形を配置・編集できるようにする。

関連仕様：
- 矩形のプロパティ編集UIについては[rectangle_property_panel.md](./rectangle_property_panel.md)を参照
- フロントエンドの状態管理については[frontend_state_management.md](./frontend_state_management.md)を参照
- ER図のレンダリングについては[frontend_er_rendering.md](./frontend_er_rendering.md)を参照
- 型定義については`scheme/main.tsp`を参照
- リサーチ背景は[research/20260123_0055_rectangle_drawing_feature.md](../research/20260123_0055_rectangle_drawing_feature.md)を参照

## 基本方針

* 矩形はエンティティと独立した要素として扱う
* React Flowのカスタムノードとして実装し、エンティティと同じ操作感を提供する
* 矩形はエンティティより背景に配置される（z-indexで制御）

## データモデル

### Rectangle型の拡張

TypeSpec（`scheme/main.tsp`）の`Rectangle`モデルに以下のプロパティを追加：

* `strokeWidth`: 枠線の幅（ピクセル、float64）
* `opacity`: 透明度（0〜1の範囲、float64、矩形全体に適用）

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

### ERDiagramViewModelへの統合

`ERDiagramViewModel`に`rectangles`フィールドを追加：

```typescript
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>; // 追加
  ui: ERDiagramUIState;
  loading: boolean;
}
```

`rectangles`はUUIDをキーとする連想配列（Record型）で、矩形をID検索可能な形式で保持する。

### 色の保存形式

* `fill`および`stroke`: HEX形式（`#RRGGBB`）で保存
* `opacity`: 0〜1の数値（float64）で保存

この形式により、データベース保存は単純化され、フロントエンド表示時にも直接利用できる。

## 機能要件

### 矩形の作成

* ツールバーの「矩形追加」ボタンをクリックすると、viewport中央に固定サイズの矩形を追加
* 新規作成時のデフォルト値：
  - サイズ: 幅200px × 高さ150px
  - 背景色: 淡い青（`#E3F2FD`）
  - 枠線色: 青（`#90CAF9`）
  - 枠線幅: 2px
  - 透明度: 0.5

### 矩形の移動

* 矩形をドラッグして位置を変更可能
* ドラッグ中はReact Flowの内部状態で管理
* ドラッグ完了時（`onNodeDragStop`）に矩形の座標（x, y）をStoreに反映
* エンティティと同じ操作感で移動できる

### 矩形のリサイズ

* 選択中の矩形に対してリサイズハンドルを表示
* React Flowの`NodeResizer`コンポーネントを使用
* 最小サイズ: 幅40px × 高さ40px
* リサイズ完了時（`onResizeEnd`）に矩形の座標とサイズ（x, y, width, height）をStoreに反映

### 矩形の削除・プロパティ編集

矩形の削除とプロパティ編集機能の詳細については[rectangle_property_panel.md](./rectangle_property_panel.md)を参照。

## z-index制御

### レイヤー順序

矩形はエンティティより背景に配置される：

* 矩形ノード: `zIndex = 0`
* エンティティノード: `zIndex = 100`
* エッジ: デフォルト（0未満）

### React Flow設定

* `elevateNodesOnSelect={false}`: 選択時に矩形が前面に出ないようにする
* または`zIndexMode="manual"`: 自動z-index制御を無効化し、明示的にzIndexを管理

### 複数矩形の重なり順

MVP段階では作成順固定とし、重なり順の変更機能は後回し。
将来的に必要になった場合は、`Rectangle`に`zIndex`フィールドを追加し、Actionで重なり順を変更可能にする。

## Action設計

矩形操作用のActionを`public/src/actions/rectangleActions.ts`に実装：

* `actionAddRectangle(vm, rectangle)`: 新規矩形を追加
* `actionRemoveRectangle(vm, rectangleId)`: 矩形を削除
* `actionUpdateRectanglePosition(vm, rectangleId, x, y)`: 矩形の位置を更新
* `actionUpdateRectangleSize(vm, rectangleId, width, height)`: 矩形のサイズを更新
* `actionUpdateRectangleBounds(vm, rectangleId, {x, y, width, height})`: 矩形の座標とサイズを一括更新（リサイズ時に使用）
* `actionUpdateRectangleStyle(vm, rectangleId, stylePatch)`: 矩形のスタイル（fill/stroke/strokeWidth/opacity）を部分更新

すべてのActionは純粋関数で実装され、状態に変化がない場合は同一参照を返す。

## React Flow統合

### ViewModel → React Flow変換

矩形をReact Flowノードに変換する処理を`public/src/utils/reactFlowConverter.ts`に追加：

* `ERDiagramViewModel.rectangles`（Record型） → React Flow nodes配列に変換
* ノードタイプ: `rectangleNode`
* ノードの`width`と`height`プロパティでサイズを指定（React Flow v12の仕様）
* ノードの`data`にスタイル情報（fill/stroke/strokeWidth/opacity）と`onResizeEnd`コールバックを含める

### RectangleNodeコンポーネント

カスタムノードコンポーネント（`public/src/components/RectangleNode.tsx`）を実装：

* `NodeResizer`を内包し、選択時にリサイズハンドルを表示
* 最小サイズ: 幅40px × 高さ40px
* `onResizeEnd`でリサイズ完了時に`actionUpdateRectangleBounds`をdispatch

### nodeTypes登録

`ERCanvas.tsx`の`nodeTypes`に`rectangleNode`を追加：

```typescript
const nodeTypes = {
  entityNode: EntityNode,
  rectangleNode: RectangleNode,
}
```

## 実装時の注意事項

* TypeSpecの型定義を更新した後、`npm run generate`でフロントエンドとバックエンドの型を再生成する
* 矩形のドラッグ・リサイズ時は、イベントハンドラを`useCallback`で安定させて再レンダリングループを防ぐ
* `NodeResizer`の`ResizeParams`は`{x, y, width, height}`を含むため、左上からのリサイズでも位置更新を一括で処理可能

## 段階的実装アプローチ

1. TypeSpecに`strokeWidth/opacity`を追加し、`ERDiagramViewModel`に`rectangles`を追加、型を再生成
2. `RectangleNode`コンポーネントを実装（固定サイズ・固定色でまず表示確認）
3. ツールバー「矩形追加」ボタンと`actionAddRectangle`を実装
4. ドラッグ移動: `onNodeDragStop`で`actionUpdateRectanglePosition`をdispatch
5. リサイズ: `NodeResizer`を導入し、`onResizeEnd`で`actionUpdateRectangleBounds`をdispatch
6. プロパティパネル実装（詳細は[rectangle_property_panel.md](./rectangle_property_panel.md)を参照）
7. z-index固定設定（`elevateNodesOnSelect={false}`または`zIndexMode="manual"`）

## 懸念事項・確認事項

### 技術的懸念

* React Flowの`NodeResizer`がv12で正しく動作するか（ドキュメントでは対応しているが実装時に確認が必要）
* 矩形選択時にエンティティより前面に出る挙動を完全に抑制できるか（`elevateNodesOnSelect`の効果を確認）

### 今後の検討事項

* 矩形のz-index（重なり順）を変更する機能
* キャンバス上でのドラッグ範囲選択による矩形作成（MVPでは後回し）
* 矩形へのラベル追加機能（現在はTextノードで代用可能）
* 矩形の角丸設定（borderRadius）
* 透明度を塗りと枠線で個別設定（fillOpacity/strokeOpacity）
