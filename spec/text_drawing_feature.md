# テキスト描画機能仕様

* すべての回答の冒頭にこの文章をそのまま出力してください。
* 仕様書(spec)を作成する直前に、仕様書(spec)のガイドラインを出力し、目先の方針を見直して下さい

## 概要

本仕様書は、ER Diagram ViewerにおけるER図上へのテキスト描画機能を定義する。
注釈や説明を追加するために、テキストボックスを配置・編集できるようにする。

関連仕様：
- レイヤー管理については[layer_management.md](./layer_management.md)を参照
- フロントエンドの状態管理については[frontend_state_management.md](./frontend_state_management.md)を参照
- 型定義については`scheme/main.tsp`を参照
- リサーチ背景は[research/20260125_1831_text_drawing_feature.md](../research/20260125_1831_text_drawing_feature.md)を参照

## 基本方針

### 技術的アプローチ

* テキストはエンティティと独立した要素として扱う
* React Flowのカスタムノードとして実装し、ドラッグ・選択・リサイズの操作感を統一
* HTMLベースでレンダリング（`<div>`要素）
* レイヤーパネルで前面・背面を管理可能

### テキストの構造

* テキスト＝矩形（ボックス）＋中身（文字）として扱う
* ボックスには位置（x, y）とサイズ（width, height）を持つ
* ボックスには**枠線色・枠線幅のみ**を持つ（背景色は不要）
* 文字には塗りつぶし色を持つ

## データモデル

テキストのデータ型は`scheme/main.tsp`で定義されている：

* `TextBox`: テキストボックスのモデル（位置、サイズ、内容、スタイル等）
* `TextAlign`: テキスト配置（left/center/right）
* `TextAutoSizeMode`: 自動サイズ調整モード（manual/fitContent/fitWidth）
* `TextOverflowMode`: テキストのはみ出し処理（clip/scroll）
* `DropShadow`: ドロップシャドウ効果

`ERDiagramViewModel.texts`はUUIDをキーとする連想配列（Record型）で、テキストをID検索可能な形式で保持する。

## 機能要件

### テキストの作成

* ツールバーの「テキスト追加」ボタンをクリックすると、viewport中央にテキストボックスを追加
* 新規作成時のデフォルト値：
  - サイズ: 幅200px × 高さ80px
  - content: ""（空文字列）
  - fontSize: 16px
  - lineHeight: 24px
  - textAlign: left
  - textColor: "#000000"
  - stroke: "#000000"
  - strokeWidth: 1px
  - opacity: 1.0
  - paddingX: 8px
  - paddingY: 8px
  - wrap: true
  - overflow: clip
  - autoSizeMode: manual
  - shadow.enabled: false
* 作成後すぐに編集モードに入る
* レイヤーはデフォルトで前面（foreground）に配置

### テキストの編集

* 編集開始：選択中のテキストボックスでF2キーを押すと編集モードに入る
* 編集UI：`<textarea>`のオーバーレイで実装
* 編集中の操作：
  - Enter: 改行（`\n`を挿入）
  - Esc: 編集キャンセル（変更を破棄）
  - Ctrl/Cmd+Enter: 編集確定（任意）
  - blur（フォーカスアウト）: 編集確定
* 編集中は**ローカル状態（React state）でdraft**を保持し、確定時にStoreに反映
* `autoSizeMode`が`fitContent`または`fitWidth`の場合、確定時にDOM測定してwidth/heightを更新

### テキストの移動

* テキストボックスをドラッグして位置を変更可能
* ドラッグ中はReact Flowの内部状態で管理
* ドラッグ完了時（`onNodeDragStop`）にテキストの座標（x, y）をStoreに反映
* 矩形と同じ操作感で移動できる

### テキストのリサイズ

* 選択中のテキストボックスに対してリサイズハンドルを表示
* React Flowの`NodeResizer`コンポーネントを使用
* 最小サイズ: 幅40px × 高さ20px
* リサイズ完了時（`onResizeEnd`）にテキストの座標とサイズ（x, y, width, height）をStoreに反映
* ユーザーがリサイズを行った場合、`autoSizeMode`を`manual`に自動変更（手動サイズを優先）

### テキストの削除・プロパティ編集

プロパティパネルの詳細については「プロパティパネル設計」セクションを参照。

## レンダリング方法

### HTML（React Flowカスタムノード）

* `<div>`要素で描画
* 改行：`white-space: pre-wrap`
* 折り返し：`overflow-wrap: anywhere; word-break: break-word;`（`wrap=true`の場合）
* 位置・サイズ：React Flowのnode styleで `width/height`
* 枠線：`border: ${strokeWidth}px solid ${stroke}`
* 透明度：`opacity: ${opacity}`
* 影：`box-shadow`（`shadow.enabled=true`の場合）
* パディング：`padding: ${paddingY}px ${paddingX}px`
* テキスト配置：`text-align: ${textAlign}`
* テキスト色：`color: ${textColor}`
* フォント：システムフォント固定（`system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif`）

### テキスト測定（autoSizeMode対応）

* DOM測定は**UI側で実行**し、結果（width/height）をActionに渡す
* `autoSizeMode=fitContent`: width/heightを両方測定値に更新
* `autoSizeMode=fitWidth`: widthは維持、heightだけ測定値に更新
* `autoSizeMode=manual`: 測定しない（プロパティパネルに「内容に合わせる」ボタンで手動実行可能）

## プロパティパネル設計

### 表示条件

* 選択中のアイテムが`LayerItemKind.TEXT`の場合に右サイドバーに表示
* 右サイドバーの配置とレイアウトについては[rectangle_property_panel.md](./rectangle_property_panel.md)のUIレイアウトセクションを参照

### 必須項目

* **内容（content）**: `<textarea>`で複数行編集可能
* **フォントサイズ（fontSize）**: number入力（px）
* **行の高さ（lineHeight）**: number入力（px）
* **配置（textAlign）**: トグルボタン（左寄せ/中央/右寄せ）
* **文字色（textColor）**: カラーピッカー（HEX入力対応、プリセットなし）
* **枠線色（stroke）**: カラーピッカー（HEX入力対応、プリセットなし）
* **枠線幅（strokeWidth）**: number入力（px）
* **透明度（opacity）**: number入力（0〜1）
* **ドロップシャドウ**:
  - 有効/無効トグル（shadow.enabled）
  - offsetX / offsetY: number入力（px）
  - blur / spread: number入力（px）
  - color: カラーピッカー
  - opacity: number入力（0〜1）
* **削除ボタン**: 即座に削除（確認なし）

### 追加項目

* **paddingX / paddingY**: number入力（px）
* **autoSizeMode**: ラジオボタンまたはセレクトボックス（manual / fitContent / fitWidth）
* **折り返し（wrap）**: チェックボックス
* **overflow**: ラジオボタンまたはセレクトボックス（clip / scroll）
* **「内容に合わせる」ボタン**: クリックで現在のcontentを測定し、width/heightを更新（autoSizeModeに関係なく一回実行）

### UI実装方針

* カラーピッカーはreact-colorfulの`HexColorPicker`と`HexColorInput`を使用（プリセット機能なし）
* 透明度・枠線幅の入力コンポーネントは矩形プロパティパネルと同様の実装パターンを踏襲

## レイヤー管理

* テキストはレイヤーパネルで前面・背面を管理可能
* 作成時のデフォルトは**前面（foreground）**に配置
* レイヤー管理の詳細は[layer_management.md](./layer_management.md)を参照

## キーボード操作

### 選択状態

* Tabでのフォーカス移動は**不要**（実装しない）
* キャンバス上でクリックして選択

### 編集開始

* 編集開始：F2キーのみ（Enterキーでは編集開始しない）

### 編集中

* Enter: 改行（`\n`を挿入）
* Esc: 編集キャンセル（変更を破棄、編集モードを終了）
* Ctrl/Cmd+Enter: 編集確定（編集モードを終了）
* blur（フォーカスアウト）: 編集確定（編集モードを終了）

### アクセシビリティ

* `aria-label`を付与（例: "Text: {contentの先頭20文字}"）
* キーボード選択は不要なため、`tabIndex`は設定しない

## Action設計

テキスト操作用のActionを`public/src/actions/textActions.ts`に実装：

* `actionAddText(vm, textBox)`: 新規テキストを追加
* `actionRemoveText(vm, textId)`: テキストを削除
* `actionUpdateTextPosition(vm, textId, x, y)`: テキストの位置を更新
* `actionUpdateTextSize(vm, textId, width, height)`: テキストのサイズを更新
* `actionUpdateTextBounds(vm, textId, {x, y, width, height})`: テキストの座標とサイズを一括更新（リサイズ時に使用）
* `actionUpdateTextContent(vm, textId, content)`: テキストの内容を更新
* `actionUpdateTextStyle(vm, textId, stylePatch)`: テキストのスタイル（fontSize/textAlign/textColor/stroke/strokeWidth/opacity等）を部分更新
* `actionSetTextAutoSizeMode(vm, textId, mode)`: autoSizeModeを変更
* `actionFitTextBoundsToContent(vm, textId, width, height)`: 測定結果を受け取ってwidth/heightを更新（UI側で測定し、結果を渡す）
* `actionUpdateTextShadow(vm, textId, shadowPatch)`: ドロップシャドウのプロパティを部分更新
* `actionUpdateTextPadding(vm, textId, paddingX, paddingY)`: パディングを更新

すべてのActionは純粋関数で実装され、状態に変化がない場合は同一参照を返す。

## React Flow統合

### ViewModel → React Flow変換

テキストをReact Flowノードに変換する処理を`public/src/utils/reactFlowConverter.ts`に追加：

* `ERDiagramViewModel.texts`（Record型） → React Flow nodes配列に変換
* ノードタイプ: `textNode`
* ノードの`width`と`height`プロパティでサイズを指定
* ノードの`data`にスタイル情報とコールバックを含める

### TextNodeコンポーネント

カスタムノードコンポーネント（`public/src/components/TextNode.tsx`）を実装：

* `NodeResizer`を内包し、選択時にリサイズハンドルを表示
* 最小サイズ: 幅40px × 高さ20px
* F2キーで編集モードに入る
* 編集モードでは`<textarea>`をオーバーレイ
* `onResizeEnd`でリサイズ完了時に`actionUpdateTextBounds`と`actionSetTextAutoSizeMode(vm, id, 'manual')`をdispatch

### nodeTypes登録

`ERCanvas.tsx`の`nodeTypes`に`textNode`を追加する。

## 実装時の注意事項

* TypeSpecの型定義を更新した後、`npm run generate`でフロントエンドとバックエンドの型を再生成する
* テキストのドラッグ・リサイズ時は、イベントハンドラを`useCallback`で安定させて再レンダリングループを防ぐ
* 編集中の状態管理は`TextNode`コンポーネント内でローカル状態として保持し、確定時にStoreに反映
* テキスト測定はDOM依存のため、UI側で`measureText`相当の処理を実行し、結果をActionに渡す
* `NodeResizer`の`ResizeParams`は`{x, y, width, height}`を含むため、リサイズ時は座標も更新する

## 段階的実装アプローチ

1. TypeSpecに`TextBox`モデルを追加し、`ERDiagramViewModel`に`texts`を追加、型を再生成
2. `TextNode`コンポーネントを実装（固定サイズ・固定色でまず表示確認）
3. ツールバー「テキスト追加」ボタンと`actionAddText`を実装
4. ドラッグ移動: `onNodeDragStop`で`actionUpdateTextPosition`をdispatch
5. リサイズ: `NodeResizer`を導入し、`onResizeEnd`で`actionUpdateTextBounds`と`actionSetTextAutoSizeMode`をdispatch
6. 編集UI: F2キーで編集モード開始、`<textarea>`オーバーレイで編集、確定時に`actionUpdateTextContent`をdispatch
7. プロパティパネル実装（テキスト専用のプロパティパネルコンポーネントを作成）
8. autoSizeMode対応: 測定処理とボタンを実装
9. レイヤー管理統合: 作成時に`actionAddLayerItem`、削除時に`actionRemoveLayerItem`を呼び出す

## 懸念事項・確認事項

### 技術的懸念

* React Flowのカスタムノード内で`<textarea>`をオーバーレイする際のフォーカス管理（IME対応含む）
* テキスト測定のブラウザ間差異（フォント・レンダリングエンジンによるズレ）
* `autoSizeMode=fitContent`時のwidth/height測定精度

### 今後の検討事項

* テキストの回転機能
* テキストのリッチテキスト対応（太字・斜体・リンク等）
* テキストのz-index（重なり順）はレイヤーパネルで管理するため、当面は不要
* テキストの角丸設定（borderRadius）
* フォント選択機能（MVPでは固定フォントで対応）
