# レイヤー管理機能仕様

* すべての回答の冒頭にこの文章をそのまま出力してください。
* 仕様書(spec)を作成する直前に、仕様書(spec)のガイドラインを出力し、目先の方針を見直して下さい

## 概要

本仕様書は、ER Diagram Viewerにおけるレイヤー管理（z-index編集）機能を定義する。
矩形とテキストをER図の前面または背面に配置し、レイヤーパネルでドラッグ&ドロップにより順序を編集できるようにする。

関連仕様：
- フロントエンドの状態管理については[frontend_state_management.md](./frontend_state_management.md)を参照
- 矩形描画機能については[rectangle_drawing_feature.md](./rectangle_drawing_feature.md)を参照
- 型定義については`scheme/main.tsp`を参照
- リサーチ背景は[research/20260124_2242_zindex_editing_ui_design.md](../research/20260124_2242_zindex_editing_ui_design.md)を参照

## 基本方針

### 技術的アプローチ

* React FlowのViewportPortalを使用して前面・背面レイヤーを実現
* ER図（エンティティとリレーション）は通常のReact Flowノード・エッジとして描画
* 矩形とテキストはViewportPortal内にレンダリングし、z-indexで前面・背面を制御
* レイヤーパネルはdnd-kitを使用してドラッグ&ドロップで順序を編集

### レイヤー構成

3つのレイヤーで構成：

1. **背面レイヤー（Background Layer）**: ER図より下に表示される矩形・テキスト
2. **ER図レイヤー（ER Diagram Layer）**: エンティティとリレーション（固定）
3. **前面レイヤー（Foreground Layer）**: ER図より上に表示される矩形・テキスト

## データモデル

レイヤー管理に必要なデータ型は`scheme/main.tsp`で定義されている：

* `LayerItemKind`: アイテムの種類（entity/relation/rectangle/text）
* `LayerItemRef`: アイテムへの参照（kind + id）
* `LayerPosition`: 配置位置（background/foreground）
* `LayerOrder`: 前面・背面の配列で順序を管理（backgroundItems/foregroundItems）
* `ERDiagramUIState.layerOrder`: レイヤー順序
* `GlobalUIState.selectedItem`: 選択中のアイテム（`selectedRectangleId`を置き換え）
* `GlobalUIState.showLayerPanel`: レイヤーパネル表示フラグ

## レイヤー順序の初期化

リバースエンジニア実行時、`layerOrder`は以下のルールで初期化：

* `backgroundItems`: 空配列（背面アイテムなし）
* `foregroundItems`: 空配列（前面アイテムなし）

## レイヤーパネルUI

### 配置

右サイドバーとして実装。矩形プロパティパネル（`RectanglePropertyPanel`）と同じ配置。

### 表示内容

レイヤーパネルには以下の3つのセクションを表示（上から順に）：

1. **前面セクション**: `foregroundItems`の要素をリスト表示（上が前面）
2. **ER図セクション**: 「ER Diagram」という固定アイテムを1つ表示（ドラッグ不可、選択不可）
3. **背面セクション**: `backgroundItems`の要素をリスト表示（上が前面）

各アイテムの表示形式：

* **矩形**: アイコン + "Rectangle" + 短縮ID（例: "Rectangle a1b2c3"）
* **テキスト**: アイコン + テキスト内容の一部（最大20文字、例: "Hello World"）
* **ER図**: 「ER Diagram」という固定ラベル

### 視覚的表現

* 選択中のアイテムは背景色でハイライト
* ドラッグ中のアイテムは透明度を下げる
* 各セクション間には区切り線を表示

## 操作仕様

### レイヤー順序の変更（同一セクション内）

* 前面セクション内、または背面セクション内でアイテムをドラッグして順序を入れ替え可能
* ドラッグ完了時（`onDragEnd`）に`actionReorderLayerItems`をdispatch

### レイヤー間の移動（前面↔背面）

* 前面セクションのアイテムを背面セクションへドラッグ、またはその逆が可能
* ER図セクションはドロップ禁止エリアとして扱う
* ドロップ先のセクションと位置に応じて`actionMoveLayerItem`をdispatch

### アイテムの選択

* レイヤーパネルのアイテムをクリックすると選択状態になる
* 選択時に`actionSelectItem`をdispatch
* キャンバス上の選択状態と連動（React Flowのノード選択と同期）

### レイヤーパネルの表示/非表示

* ツールバーに「レイヤー」ボタンを追加
* クリックで`actionToggleLayerPanel`をdispatch
* 表示状態は`GlobalUIState.showLayerPanel`で管理

## 選択状態の統一

### 選択可能な要素

以下の要素が選択可能：

* 矩形（Rectangle）
* テキスト（Text）
* エンティティ（Entity）

リレーション（エッジ）は選択対象外。

### 選択状態の管理

* `GlobalUIState.selectedItem`で一元管理
* レイヤーパネルでアイテムをクリック → `actionSelectItem`をdispatch
* キャンバスでノードをクリック → React Flowの`onNodeClick`から`actionSelectItem`をdispatch
* Portal要素（矩形・テキスト）をクリック → クリックハンドラで`actionSelectItem`をdispatch

### React Flowとの同期

* `selectedItem`に基づいてReact FlowのノードにXML`selected`プロパティを設定
* React Flowの`onSelectionChange`では、選択解除のみ反映（選択は各要素のクリックハンドラで処理）

## z-index計算

### 計算ルール

各レイヤーのz-indexベース値：

* 背面レイヤー: `-10000` ベース
* ER図レイヤー（エッジ）: `-100` ベース（React Flowのデフォルト）
* ER図レイヤー（ノード）: `0` ベース
* 前面レイヤー: `10000` ベース

配列内の順序は以下のように変換：

* `backgroundItems[i]` → z-index = `-10000 + i`
* `foregroundItems[i]` → z-index = `10000 + i`

これにより、配列の後ろほど前面に表示される。

### ViewportPortalでの適用

* 背面Portal: `style={{ position: 'absolute', zIndex: [計算値] }}`
* 前面Portal: `style={{ position: 'absolute', zIndex: [計算値] }}`

## Action設計

レイヤー管理用のActionを`public/src/actions/layerActions.ts`に実装：

* `actionReorderLayerItems(vm, position, activeIndex, overIndex)`: 同一セクション内でアイテムを並べ替え
  - `position`: `'foreground' | 'background'`
  - `activeIndex`, `overIndex`: 配列内のインデックス
* `actionMoveLayerItem(vm, itemRef, toPosition, toIndex)`: アイテムを別のセクションへ移動
  - `itemRef`: 移動する要素の参照
  - `toPosition`: 移動先（`'foreground' | 'background'`）
  - `toIndex`: 移動先の配列内インデックス
* `actionAddLayerItem(vm, itemRef, position)`: 新規アイテムをレイヤーに追加
  - 矩形・テキスト作成時に自動的に呼ばれる
  - `position`のデフォルトは`'background'`（矩形）、`'foreground'`（テキスト）
* `actionRemoveLayerItem(vm, itemRef)`: アイテムを削除時にレイヤーからも除去
* `actionSelectItem(vm, itemRef)`: アイテムを選択
* `actionDeselectItem(vm)`: 選択を解除
* `actionToggleLayerPanel(vm)`: レイヤーパネルの表示/非表示を切り替え

すべてのActionは純粋関数で実装され、状態に変化がない場合は同一参照を返す。

## ViewportPortalでのレンダリング

### 背面矩形・テキストのレンダリング

`backgroundItems`の各要素に対して：

* 矩形: `<div>`要素で描画、スタイルは`Rectangle`データから取得
* テキスト: `<div>`要素で描画、スタイルは`Text`データから取得
* 座標: `transform: translate(${x}px, ${y}px)` で配置
* z-index: 計算されたz-index値を適用
* クリックイベント: `onClick`で`actionSelectItem`をdispatch

### 前面矩形・テキストのレンダリング

`foregroundItems`の各要素に対して背面と同様の方法でレンダリング。

### Portal要素の操作

* ドラッグ移動: Portal要素に独自のドラッグハンドラを実装
* リサイズ: 選択中の要素にリサイズハンドルを表示（独自実装）
* 座標変換: React Flowの`useViewport()`でviewport座標を取得し、要素の位置を同期

## React Flow統合

### React Flow設定

* `elevateNodesOnSelect={false}`: 選択時に要素が前面に出ないようにする
* `elevateEdgesOnSelect={false}`: エッジも同様
* `zIndexMode="manual"`: 自動z-index制御を無効化

### ノード・エッジのz-index

エンティティノードとリレーションエッジは固定のz-indexを設定：

* エンティティノード: `zIndex = 0`
* リレーションエッジ: `zIndex = -100`

## 実装時の注意事項

### dnd-kit導入

* `@dnd-kit/core`と`@dnd-kit/sortable`をインストール
* `SortableContext`と`useSortable`を使用してドラッグ&ドロップを実装
* セクション間のドラッグは`DndContext`の`onDragEnd`で判定

### Portal要素のクリック判定

* Portal要素は通常のReact Flowノードではないため、独自のクリックハンドラを実装
* クリック時に`stopPropagation()`でReact Flowのパン操作と干渉しないようにする

### viewport同期

* `useViewport()`でviewportの変化を監視
* Portal要素の座標計算にviewportの`x`, `y`, `zoom`を反映

### パフォーマンス

* `layerOrder`の配列操作は新しい配列を返す（イミュータブル）
* `useMemo`でz-index計算をキャッシュ
* Portal要素のレンダリングは`React.memo`で最適化

### 既存機能との整合性

* 矩形プロパティパネルは`selectedItem.kind === 'rectangle'`の場合に表示
* 矩形削除時（`actionRemoveRectangle`）に`actionRemoveLayerItem`も呼び出す
* テキスト追加時（将来実装）に`actionAddLayerItem`を呼び出す

## 段階的実装アプローチ

1. `npm run generate`で型を再生成（`LayerItemKind`, `LayerItemRef`, `LayerPosition`, `LayerOrder`が追加済み）
2. `GlobalUIState`を`selectedItem`に移行（`selectedRectangleId`を置き換え）
3. レイヤーパネルコンポーネントを実装（固定データで表示確認）
4. dnd-kitを導入し、ドラッグ&ドロップ機能を実装
5. `layerActions.ts`を実装
6. ViewportPortalで背面・前面要素をレンダリング
7. Portal要素のクリック・ドラッグ・リサイズを実装
8. z-index計算ロジックを実装
9. 既存の矩形・テキスト操作との統合
10. 選択状態の同期を実装

## 懸念事項・確認事項

### 技術的懸念

* ViewportPortalでのレンダリングパフォーマンス（要素数が多い場合）
* Portal要素のドラッグ・リサイズの実装コスト
* viewport同期の正確性（ズーム・パン時の座標ずれ）

### 今後の検討事項

* エンティティをレイヤーパネルに表示するか（現在は非表示の方針）
* リレーションのz-index編集の必要性
* レイヤーのグループ化・ロック機能
* レイヤーの表示/非表示切り替え機能
* キーボードショートカットによるレイヤー操作
