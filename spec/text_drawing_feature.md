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
* React FlowのViewportPortalを使用して描画（矩形と同じ方式）
* HTMLベースでレンダリング（`<div>`要素）
* レイヤーパネルで前面・背面を管理可能
* z-indexで描画順序を制御

### テキストの構造

* テキストはボックス（位置・サイズ）＋文字（内容・スタイル）として扱う
* ボックスには位置（x, y）とサイズ（width, height）を持つ
* 文字には塗りつぶし色（textColor）を持つ
* 枠線・背景色は持たない（シンプルなテキストとして機能）

## データモデル

テキストのデータ型は`scheme/main.tsp`で定義されている：

* `TextBox`: テキストボックスのモデル（位置、サイズ、内容、スタイル等）
  - **注意**: `stroke`と`strokeWidth`フィールドは不要のため削除すること
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
  - opacity: 1.0
  - paddingX: 8px
  - paddingY: 8px
  - wrap: true
  - overflow: clip
  - autoSizeMode: manual
  - shadow.enabled: false
  - shadow.offsetX: 2px
  - shadow.offsetY: 2px
  - shadow.blur: 4px
  - shadow.spread: 0px
  - shadow.color: "#000000"
  - shadow.opacity: 0.3
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
* マウスダウン時にドラッグ状態を保持（開始座標とテキストの初期座標）
* マウスムーブ中は`actionUpdateTextPosition`でリアルタイムに座標を更新
* マウスアップ時にドラッグ状態をクリア
* viewport座標変換を考慮（マウス移動量を`viewport.zoom`で除算）
* 矩形と同じ操作感で移動できる

### テキストのリサイズ

* 選択中のテキストボックスに対してリサイズハンドルを表示
* カスタムリサイズハンドルを実装（四隅・四辺の8つ）
* 最小サイズ: 幅40px × 高さ20px
* リサイズ中は`actionUpdateTextBounds`でリアルタイムに座標とサイズを更新
* ユーザーがリサイズを行った場合、`autoSizeMode`を`manual`に自動変更（手動サイズを優先）

### テキストの削除・プロパティ編集

プロパティパネルの詳細については「プロパティパネル設計」セクションを参照。

## レンダリング方法

### ViewportPortal描画

テキストは`ViewportPortal`を使用して描画する（矩形と同じ方式）：

* 背面レイヤー（`layerOrder.backgroundItems`）と前面レイヤー（`layerOrder.foregroundItems`）から、テキストアイテム（`kind === 'text'`）を抽出
* 各テキストに対して`<div>`要素を描画
* z-indexは`calculateZIndex`関数で計算し、レイヤーパネルの順序を反映

### HTML要素のスタイル

* `<div>`要素で描画
* 位置：`position: absolute; left: ${x}px; top: ${y}px;`
* サイズ：`width: ${width}px; height: ${height}px;`
* 改行：`white-space: pre-wrap`
* 折り返し：`overflow-wrap: anywhere; word-break: break-word;`（`wrap=true`の場合）
* 透明度：`opacity: ${opacity}`
* 影：`box-shadow`（`shadow.enabled=true`の場合）
* パディング：`padding: ${paddingY}px ${paddingX}px`
* テキスト配置：`text-align: ${textAlign}`
* テキスト色：`color: ${textColor}`
* z-index：レイヤー順序に基づいて計算
* cursor: `move`（ドラッグ可能を示す）
* pointerEvents: `auto`（クリック・ドラッグを受け付ける）
* フォント：システムフォント固定（`system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif`）

### 選択状態の表示

* 選択中のテキストは`outline: 2px solid #1976d2`で強調表示
* 選択中はリサイズハンドルを表示

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
* 透明度の入力コンポーネントは矩形プロパティパネルと同様の実装パターンを踏襲

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
* `actionUpdateTextStyle(vm, textId, stylePatch)`: テキストのスタイル（fontSize/textAlign/textColor/opacity等）を部分更新
* `actionSetTextAutoSizeMode(vm, textId, mode)`: autoSizeModeを変更
* `actionFitTextBoundsToContent(vm, textId, width, height)`: 測定結果を受け取ってwidth/heightを更新（UI側で測定し、結果を渡す）
* `actionUpdateTextShadow(vm, textId, shadowPatch)`: ドロップシャドウのプロパティを部分更新
* `actionUpdateTextPadding(vm, textId, paddingX, paddingY)`: パディングを更新

すべてのActionは純粋関数で実装され、状態に変化がない場合は同一参照を返す。

## ViewportPortal統合

### テキストの描画

`ERCanvas.tsx`の`ViewportPortal`内でテキストを描画する（矩形と同様の実装パターン）：

* `layerOrder.backgroundItems`と`layerOrder.foregroundItems`から`kind === 'text'`のアイテムを抽出
* 各テキストに対して`<div>`要素を描画
* z-indexは`calculateZIndex`関数で計算
* ドラッグ処理：マウスダウン時にドラッグ状態を保持し、マウスムーブで`actionUpdateTextPosition`をdispatch
* クリック処理：`actionSelectItem`をdispatchして選択状態を更新

### リサイズハンドル

選択中のテキストにリサイズハンドルを表示（矩形と同様の実装パターン）：

* 四隅のハンドル（8px × 8px）
* 四辺のハンドル（幅6px、高さ50%または幅50%、高さ6px）
* 最小サイズ: 幅40px × 高さ20px
* リサイズ完了時に`actionUpdateTextBounds`と`actionSetTextAutoSizeMode(vm, id, 'manual')`をdispatch

### 編集UI

* F2キーで編集モードに入る（選択中のテキストに対してグローバルキーボードイベントをリッスン）
* 編集モードでは`<textarea>`をオーバーレイ表示（選択中のテキストに対してのみ）
* 編集中のローカル状態（draft）はViewportPortalを描画するコンポーネント内で管理
* 編集確定時に`actionUpdateTextContent`をdispatch
* `autoSizeMode`に応じてDOM測定を実行し、`actionUpdateTextBounds`で結果を反映

## 実装時の注意事項

* TypeSpecの型定義（`TextBox`モデル）から`stroke`と`strokeWidth`を削除し、`npm run generate`で型を再生成する
* テキストのドラッグ・リサイズ時は、イベントハンドラを`useCallback`で安定させて再レンダリングループを防ぐ
* 編集中の状態管理はViewportPortalを描画するコンポーネント内でローカル状態として保持し、確定時にStoreに反映
* テキスト測定はDOM依存のため、UI側で`measureText`相当の処理を実行し、結果をActionに渡す
* リサイズハンドルは矩形と同じ実装パターンを踏襲（四隅・四辺のハンドル）
* リサイズ時は座標（x, y）とサイズ（width, height）を同時に更新
* ViewportPortalで描画するため、viewport座標変換（`useViewport`の`zoom`を考慮）が必要
* F2キーのグローバルイベントリスナーは、編集モード中は無効化すること（`removeEventListener`で適切にクリーンアップ）

## 段階的実装アプローチ

1. TypeSpecの`TextBox`モデルから`stroke`と`strokeWidth`を削除し、型を再生成
2. `ERCanvas.tsx`に`renderTexts`関数を追加（`renderRectangles`と同様の構造）
3. テキストを`ViewportPortal`内で描画（背面・前面の2つのPortalで分けて描画）
4. ツールバー「テキスト追加」ボタンと`actionAddText`を実装、デフォルト値にshadowのオフセット・ブラー等を設定
5. ドラッグ移動: マウスダウン→ムーブ→アップのイベントハンドリングで`actionUpdateTextPosition`をdispatch
6. リサイズ: カスタムリサイズハンドルを実装し、`actionUpdateTextBounds`と`actionSetTextAutoSizeMode`をdispatch
7. 編集UI: F2キーで編集モード開始、`<textarea>`をViewportPortal内に表示、確定時に`actionUpdateTextContent`をdispatch
8. プロパティパネル実装（テキスト専用のプロパティパネルコンポーネントを作成、枠線関連UIを削除）
9. autoSizeMode対応: 測定処理とボタンを実装
10. レイヤー管理統合: 作成時に`actionAddLayerItem`、削除時に`actionRemoveLayerItem`を呼び出す
11. `TextNode.tsx`コンポーネントと`convertToReactFlowTexts`関数を削除（不要になるため）

## 懸念事項・確認事項

### 技術的懸念

* ViewportPortal内で`<textarea>`を表示する際のフォーカス管理（IME対応含む）
* テキスト測定のブラウザ間差異（フォント・レンダリングエンジンによるズレ）
* `autoSizeMode=fitContent`時のwidth/height測定精度
* ViewportPortal内でのドラッグ・リサイズ時のviewport座標変換の正確性

### 今後の検討事項

* テキストの回転機能
* テキストのリッチテキスト対応（太字・斜体・リンク等）
* テキストのz-index（重なり順）はレイヤーパネルで管理するため、当面は不要
* テキストの角丸設定（borderRadius）
* フォント選択機能（MVPでは固定フォントで対応）
