# 矩形プロパティパネル仕様

* すべての回答の冒頭にこの文章をそのまま出力してください。
* 仕様書(spec)を作成する直前に、仕様書(spec)のガイドラインを出力し、目先の方針を見直して下さい

## 概要

本仕様書は、ER Diagram Viewerにおける矩形のプロパティ編集機能を定義する。
矩形選択時に右サイドバーにプロパティパネルを表示し、スタイルや削除を操作できるようにする。

関連仕様：
- 矩形描画機能の全体仕様については[rectangle_drawing_feature.md](./rectangle_drawing_feature.md)を参照
- フロントエンドの状態管理については[frontend_state_management.md](./frontend_state_management.md)を参照
- 型定義については`scheme/main.tsp`を参照
- リサーチ背景は[research/20260124_1849_rectangle_property_panel_ui_design.md](../research/20260124_1849_rectangle_property_panel_ui_design.md)を参照

## 基本方針

* 右サイドバーにプロパティパネルを配置する
* 矩形が選択されている場合のみパネルを表示する
* プロパティ変更は即座にキャンバスに反映する（リアルタイム更新）
* コンテキストメニューは採用しない
* 素のReactとreact-colorfulのみで実装する（追加のUIライブラリは導入しない）

## UIレイアウト

### 全体構成

画面構成を以下のように変更する：

* ヘッダー（固定高さ）
* メインコンテンツエリア（残りの高さ）
  - ERCanvasエリア（左側、可変幅）
  - 右サイドバー（固定幅: 300px）

### 右サイドバーの表示条件

* 矩形が1つだけ選択されている場合: プロパティパネルを表示
* 矩形が選択されていない場合: サイドバーを非表示
* 複数の矩形が選択されている場合: 「複数選択中」メッセージを表示（プロパティは編集不可）
* エンティティノードが選択されている場合: サイドバーを非表示

### サイドバーのスタイル

* 背景色: 白（`#ffffff`）
* ボーダー: 左側に1px灰色のボーダー（`#ddd`）
* パディング: 1rem
* オーバーフロー: 縦方向スクロール可能

## 選択状態の管理

### 選択状態の取得

React Flowの`onSelectionChange`イベントを使用して選択状態を監視する：

* `onSelectionChange`コールバックで`nodes`配列を受け取る
* 選択されたノードのうち`type === 'rectangleNode'`のものだけを抽出
* 選択された矩形が1つの場合、その矩形IDをローカルステート（`useState`）に保存
* 選択された矩形が0個または2個以上の場合、ローカルステートをクリア

### 選択された矩形データの取得

* `useERViewModel`で`vm.rectangles[selectedRectangleId]`を取得
* 選択された矩形が存在しない場合（削除された場合など）、サイドバーを非表示

## プロパティ編集項目

プロパティパネルで編集可能な項目と順序：

### 1. 背景色（fill）

* ラベル: 「背景色」
* コンポーネント: カラーピッカー（HexColorPicker） + HexColorInput
* プリセット色ボタン: 8色を横2列 × 縦4行でグリッド表示
* 変更時: `actionUpdateRectangleStyle(vm, rectangleId, { fill: newColor })`をdispatch

### 2. 枠線色（stroke）

* ラベル: 「枠線色」
* コンポーネント: カラーピッカー（HexColorPicker） + HexColorInput
* プリセット色ボタン: 8色を横2列 × 縦4行でグリッド表示
* 変更時: `actionUpdateRectangleStyle(vm, rectangleId, { stroke: newColor })`をdispatch

### 3. 透明度

* ラベル: 「透明度」
* コンポーネント: `<input type="range">`スライダー + 現在値表示
* 範囲: 0%〜100%（内部的には `opacity`（不透明度）の 0〜1 に対応）
* ステップ: 0.01
* 表示形式: パーセント表示（例: `透明度: 30%`）
* UI値と内部値の変換:
  - 表示値: `透明度% = (1 - opacity) × 100`
  - 入力値: `opacity = 1 - (透明度% / 100)`
* 意味: 0% = 完全不透明、100% = 完全透明
* 変更時: `actionUpdateRectangleStyle(vm, rectangleId, { opacity: newOpacity })`をdispatch（変換後の不透明度を渡す）

### 4. 枠線幅（strokeWidth）

* ラベル: 「枠線幅」
* コンポーネント: `<input type="number">` + 単位表示（px）
* 範囲: 0以上、ステップ1
* 変更時: `actionUpdateRectangleStyle(vm, rectangleId, { strokeWidth: newWidth })`をdispatch

### 5. 削除ボタン

* ラベル: 「削除」
* コンポーネント: ボタン
* スタイル: 赤背景（`#dc3545`）、白文字
* クリック時: `actionRemoveRectangle(vm, rectangleId)`をdispatch

## カラーピッカーの仕様

### ライブラリ

react-colorfulの以下のコンポーネントを使用：

* `HexColorPicker`: インタラクティブなカラーピッカー
* `HexColorInput`: HEX値の直接入力フィールド

### プリセット色

以下の8色をプリセット色として提供：

* 青: `#E3F2FD`
* シアン: `#E0F7FA`
* ティール: `#E0F2F1`
* 緑: `#E8F5E9`
* 黄: `#FFFDE7`
* オレンジ: `#FFF3E0`
* ピンク: `#FCE4EC`
* グレー: `#F5F5F5`

### プリセット色ボタンの表示

* 各色を正方形のボタンとして表示（32px × 32px）
* グリッドレイアウト: 横2列 × 縦4行
* ボーダー: 1px灰色（`#ccc`）
* クリック時: その色を即座に反映

### カラーピッカーの開閉

* デフォルト: カラーピッカーは常時表示
* 将来的な拡張: クリックで開閉できるアコーディオン形式に変更可能

## 削除機能

### 削除ボタン

* プロパティパネルの最下部に配置
* ボタンテキスト: 「削除」
* クリック時: 確認ダイアログなしで即座に削除

### Deleteキー対応

* React Flowの`deleteKeyCode`プロパティで設定（デフォルトは"Backspace"と"Delete"）
* `onNodesDelete`イベントで削除されたノードを検知
* 削除されたノードが矩形の場合、`actionRemoveRectangle`をdispatch

## 更新タイミング

### リアルタイム更新

すべてのプロパティ変更は入力と同時にキャンバスに反映する：

* カラーピッカーのドラッグ中も即座に反映
* スライダーのドラッグ中も即座に反映
* 数値入力フィールドの変更時（`onChange`）に即座に反映

### デバウンス処理

MVPでは実装しない。
パフォーマンス問題が発生した場合のみ、将来的にデバウンスを検討する。

## 複数選択時の挙動

* 複数の矩形が選択されている場合、サイドバーに「複数選択中（一括編集は未対応）」というメッセージを表示
* プロパティ編集UIは表示しない
* MVPでは一括編集機能は実装しない

## エンティティノード選択時の挙動

* エンティティノードが選択されている場合、右サイドバーは非表示
* 将来的にエンティティのプロパティパネルを実装する場合は、この仕様を変更する可能性がある

## コンポーネント構成

### RectanglePropertyPanel

プロパティパネル全体を管理するコンポーネント：

* Props: `rectangleId: string`
* 選択された矩形のデータを`useERViewModel`で取得
* 各プロパティ編集UIをレンダリング
* 削除ボタンをレンダリング

### ColorPickerWithPresets

カラーピッカーとプリセット色ボタンを含む再利用可能なコンポーネント：

* Props:
  - `value: string` (HEX形式の色)
  - `onChange: (color: string) => void`
  - `label: string`
* `HexColorPicker`と`HexColorInput`を内包
* プリセット色ボタンをグリッド表示

## Action連携

プロパティ変更時に以下のActionを使用：

* `actionUpdateRectangleStyle(vm, rectangleId, stylePatch)`
  - 背景色変更: `{ fill: newColor }`
  - 枠線色変更: `{ stroke: newColor }`
  - 透明度変更: `{ opacity: newOpacity }`
  - 枠線幅変更: `{ strokeWidth: newWidth }`

* `actionRemoveRectangle(vm, rectangleId)`
  - 削除ボタンクリック時またはDeleteキー押下時

すべてのActionは既に`public/src/actions/rectangleActions.ts`に実装済み。

## 実装時の注意事項

* カラーピッカーのローカルステート管理: ユーザーの入力中に親コンポーネントの再レンダリングで値がリセットされないよう、制御コンポーネントとして実装
* HEX値のバリデーション: react-colorfulが不正なHEX値を自動的に処理するため、追加のバリデーションは不要
* 透明度スライダーの精度: `step="0.01"`を指定して0.01刻みで調整可能にする
* 枠線幅の最小値: `min="0"`を指定して0px以上の値のみ許可
* サイドバーの開閉アニメーション: MVPでは実装しない
* レスポンシブ対応: MVPでは固定幅のサイドバーとし、レスポンシブ対応は後回し

## 将来的な拡張

* 一括編集機能（複数矩形選択時）
* カラーピッカーのアコーディオン開閉
* カスタムプリセット色の保存機能
* サイドバーの開閉・リサイズ機能
* エンティティノードのプロパティパネル
