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

左サイドバーとして実装。矩形プロパティパネル（`RectanglePropertyPanel`）は右サイドバーに配置されるため、両者は共存可能。

### 表示内容

レイヤーパネルには以下の3つのセクションを表示（上から順に）：

1. **前面セクション**: `foregroundItems`の要素をリスト表示（配列順で表示：上が前面、下が背面寄り）
2. **ER図セクション**: 「ER Diagram」という固定アイテムを1つ表示（ドラッグ不可、選択不可）
3. **背面セクション**: `backgroundItems`の要素をリスト表示（配列順で表示：上が前面寄り、下が背面）

各アイテムの表示形式：

* **矩形**: アイコン + "Rectangle" + 短縮ID（例: "Rectangle a1b2c3"）
* **テキスト**: アイコン + "Text" + 短縮ID（例: "Text a1b2c3"）
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

レイヤーパネル機能においては、以下の要素が選択可能：

* 矩形（Rectangle）
* テキスト（TextBox）

エンティティ（Entity）およびリレーション（Relation）は、レイヤーパネル上では選択対象外。
レイヤーパネル上では全て「ER Diagram」という1つの固定要素として扱う。

**注**: エンティティはキャンバス上では選択可能。エンティティ選択の詳細は[entity_selection_and_ddl_panel.md](./entity_selection_and_ddl_panel.md)を参照。

### 選択状態の管理

* `GlobalUIState.selectedItem`で一元管理（矩形・テキスト・エンティティ）
* レイヤーパネルでアイテム（矩形・テキスト）をクリック → `actionSelectItem`をdispatch
* キャンバスでアイテム（矩形・テキスト・エンティティ）をクリック → クリックハンドラで`actionSelectItem`をdispatch
* エンティティ選択の詳細は[entity_selection_and_ddl_panel.md](./entity_selection_and_ddl_panel.md)を参照

### React Flowとの同期

* 矩形・テキストはカスタムノードとして実装されるため、React Flowの選択システムを利用
* React Flowの`onSelectionChange`または個別のクリックハンドラで`actionSelectItem`をdispatch

## z-index計算

### 計算ルール

各レイヤーのz-indexベース値：

* 背面レイヤー: `-10000` ベース
* ER図レイヤー（エッジ）: `-100` ベース（React Flowのデフォルト）
* ER図レイヤー（ノード）: `0` ベース
* 前面レイヤー: `10000` ベース

配列内の順序は以下のように変換：

* `backgroundItems[i]` → z-index = `-10000 + (length - 1 - i)`
* `foregroundItems[i]` → z-index = `10000 + (length - 1 - i)`

これにより、配列の先頭ほど前面に表示される（UI表示順序と一致）。

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
  - 矩形のデフォルト配置は`'background'`
  - テキストのデフォルト配置は`'foreground'`
* `actionRemoveLayerItem(vm, itemRef)`: アイテムを削除時にレイヤーからも除去
* `actionSelectItem(vm, itemRef)`: アイテムを選択
* `actionDeselectItem(vm)`: 選択を解除
* `actionToggleLayerPanel(vm)`: レイヤーパネルの表示/非表示を切り替え

すべてのActionは純粋関数で実装され、状態に変化がない場合は同一参照を返す。

## カスタムノードとしてのレンダリング

### 矩形・テキストの描画

矩形とテキストはReact Flowのカスタムノードとして実装：

* ノードタイプ: `rectangleNode` / `textNode`
* z-index: レイヤー順序に基づいて計算された値を適用
* クリックイベント: React Flowの選択システムまたは独自のクリックハンドラで`actionSelectItem`をdispatch

各カスタムノードの詳細仕様：

* 矩形: [rectangle_drawing_feature.md](./rectangle_drawing_feature.md)を参照
* テキスト: [text_drawing_feature.md](./text_drawing_feature.md)を参照

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

### 配列順序とUI表示の対応

* 配列の順序とUI表示順序は一致する（`foregroundItems[0]`が最前面でUI上も最上部）
* z-index計算では配列を逆順に計算する必要がある
* ドラッグ&ドロップ時のインデックス計算は配列インデックスをそのまま使用

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

* プロパティパネル（右サイドバー）は`selectedItem`の種類に応じて表示
  - `kind === 'rectangle'`: 矩形プロパティパネルを表示
  - `kind === 'text'`: テキストプロパティパネルを表示
  - `kind === 'entity'`: DDLパネルを表示（[entity_selection_and_ddl_panel.md](./entity_selection_and_ddl_panel.md)を参照）
* レイヤーパネル（左サイドバー）は`showLayerPanel === true`の場合に表示
* アイテム削除時に`actionRemoveLayerItem`も呼び出す
* アイテム追加時に`actionAddLayerItem`も呼び出す

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

## スコープ外の機能

以下の機能は本仕様の対象外：

* エンティティ・リレーションの個別選択（レイヤーパネル上では「ER Diagram」として一括扱い）
* レイヤーのグループ化・ロック機能
* レイヤーの表示/非表示切り替え機能
* キーボードショートカットによるレイヤー操作

これらの機能は、将来的に必要になった場合に追加する。
