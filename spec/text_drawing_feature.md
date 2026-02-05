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
* `TextAlign`: テキスト水平配置（left/center/right）
* `TextVerticalAlign`: テキスト垂直配置（top/middle/bottom）
* `TextAutoSizeMode`: 自動サイズ調整モード（manual/fitContent/fitWidth）
* `TextOverflowMode`: テキストのはみ出し処理（clip/scroll）
* `DropShadow`: ドロップシャドウ効果（文字用と背景用で個別に設定可能）

`ERDiagramViewModel.texts`はUUIDをキーとする連想配列（Record型）で、テキストをID検索可能な形式で保持する。

## 機能要件

### テキストの作成

* ツールバーの「テキスト追加」ボタンをクリックすると、viewport中央にテキストボックスを追加
* 新規作成時のデフォルト値：
  - サイズ: 幅200px × 高さ80px
  - content: "テキスト"
  - fontSize: 16px
  - lineHeight: 24px
  - textAlign: left
  - textVerticalAlign: top
  - textColor: "#000000"
  - opacity: 1.0（文字の不透明度、透明度0%）
  - backgroundColor: "#FFFFFF"
  - backgroundEnabled: false
  - backgroundOpacity: 1.0（背景の不透明度、透明度0%）
  - paddingX: 8px
  - paddingY: 8px
  - wrap: true
  - overflow: clip
  - autoSizeMode: manual
  - textShadow.enabled: false
  - textShadow.offsetX: 2px
  - textShadow.offsetY: 2px
  - textShadow.blur: 4px
  - textShadow.color: "#000000"
  - textShadow.opacity: 0.3
  - backgroundShadow.enabled: false
  - backgroundShadow.offsetX: 2px
  - backgroundShadow.offsetY: 2px
  - backgroundShadow.blur: 4px
  - backgroundShadow.spread: 0px
  - backgroundShadow.color: "#000000"
  - backgroundShadow.opacity: 0.3
* 作成後すぐに選択状態になる
* レイヤーはデフォルトで前面（foreground）に配置

### テキストの編集

* 編集開始：以下のいずれかの方法で編集モードに入る
  - 選択中のテキストボックスでF2キーを押す
  - テキストボックスをダブルクリックする
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

### 空テキストの自動削除

* テキストが選択状態から選択解除された時、そのテキストの`content`が空文字列（`""`）の場合、自動的に削除される
* 削除は確認ダイアログなしで即座に実行される
* `GlobalUIState.selectedItem`の変更を監視して実装する

## レンダリング方法

### ViewportPortal描画

テキストは`ViewportPortal`を使用して描画する（矩形と同じ方式）：

* 背面レイヤー（`layerOrder.backgroundItems`）と前面レイヤー（`layerOrder.foregroundItems`）から、テキストアイテム（`kind === 'text'`）を抽出
* 各テキストに対して`<div>`要素を描画
* z-indexは`calculateZIndex`関数で計算し、レイヤーパネルの順序を反映

### HTML要素のスタイル

**外側のコンテナ（`<div>`要素）**:
* 位置：`position: absolute; left: ${x}px; top: ${y}px;`
* サイズ：`width: ${width}px; height: ${height}px;`
* 背景色：`backgroundColor: rgba(r, g, b, ${backgroundOpacity})`（`backgroundEnabled=true`の場合）
* 背景のドロップシャドウ：`boxShadow`（`backgroundShadow.enabled=true`の場合、背景矩形全体に影を適用）
  - `offsetX offsetY blur spread rgba(r, g, b, opacity)` 形式
  - 例: `2px 2px 4px 0px rgba(0, 0, 0, 0.3)`
  - 背景が無効（`backgroundEnabled=false`）でも影の設定は可能だが、背景が表示されない限り影も表示されない
* z-index：レイヤー順序に基づいて計算
* cursor: `move`（ドラッグ可能を示す）
* pointerEvents: `auto`（クリック・ドラッグを受け付ける）
* 垂直配置用のフレックスボックス設定：
  - `display: flex`
  - `flexDirection: column`
  - `justifyContent: ${verticalAlignValue}`（垂直方向の配置）
    - `top`: `flex-start`
    - `middle`: `center`
    - `bottom`: `flex-end`

**内側のテキストコンテナ（`<div>`要素）**:
* パディング：`padding: ${paddingY}px ${paddingX}px`
* 改行：`white-space: pre-wrap`
* 折り返し：`overflow-wrap: anywhere; word-break: break-word;`（`wrap=true`の場合）
* テキスト色：`color: rgba(r, g, b, ${opacity})`
* 文字のドロップシャドウ：`textShadow`（`textShadow.enabled=true`の場合、文字にのみ影を適用）
  - `offsetX offsetY blur rgba(r, g, b, opacity)` 形式（spreadは使用しない）
  - 例: `2px 2px 4px rgba(0, 0, 0, 0.3)`
* 水平配置：`text-align: ${textAlign}`
* フォント：システムフォント固定（`system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif`）

**ドロップシャドウの2種類の独立適用**:
* 文字と背景のドロップシャドウは完全に独立して設定可能
* **文字のシャドウ（`textShadow`）**: 
  - `textShadow.enabled=true`の場合、内側のテキストコンテナに`text-shadow`を適用
  - `spread`パラメータは使用しない（CSS仕様上サポートされないため）
  - 背景の有無に関わらず適用可能
* **背景のシャドウ（`backgroundShadow`）**: 
  - `backgroundShadow.enabled=true`かつ`backgroundEnabled=true`の場合、外側のコンテナに`box-shadow`を適用
  - `spread`パラメータも適用される
  - 背景が無効の場合、影も表示されない
* 利用シーン例：
  - 文字のみにシャドウ: 背景透過のテキストで視認性を高める
  - 背景のみにシャドウ: カード風のデザイン、フローティング効果
  - 両方にシャドウ: 強調表示、異なるパラメータで立体感と浮遊感を演出

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
* **水平配置（textAlign）**: トグルボタン（左寄せ/中央/右寄せ）
* **垂直配置（textVerticalAlign）**: トグルボタン（上寄せ/中央/下寄せ）
* **文字色（textColor）**: カラーピッカー（HEX入力対応、プリセットなし）
* **文字の透明度**: スライダー（0%〜100%）
  - 内部的には `opacity`（不透明度、0〜1）として保存
  - UI表示: `透明度 = (1 - opacity) × 100`
  - 0%: 完全不透明、100%: 完全透明
* **背景色**:
  - 有効/無効トグル（backgroundEnabled）
  - 背景色（backgroundColor）: カラーピッカー（HEX入力対応、矩形と同じ8色プリセット）
  - 背景の透明度: スライダー（0%〜100%）
    - 内部的には `backgroundOpacity`（不透明度、0〜1）として保存
    - UI表示: `透明度 = (1 - backgroundOpacity) × 100`
    - 0%: 完全不透明、100%: 完全透明
* **文字のドロップシャドウ**:
  - 有効/無効トグル（textShadow.enabled）
  - 有効時、文字（テキストコンテンツ）にのみ影が適用される
  - offsetX / offsetY: number入力（px）
  - blur: number入力（px）
  - color: カラーピッカー（HEX入力対応、プリセットなし）
  - opacity: number入力（0〜1）
  - 注意: spreadパラメータは文字シャドウでは使用しない（CSS仕様上サポートされないため、UIからも除外）
* **背景のドロップシャドウ**:
  - 有効/無効トグル（backgroundShadow.enabled）
  - 有効時かつ背景色有効時、背景矩形に影が適用される
  - offsetX / offsetY: number入力（px）
  - blur / spread: number入力（px）
  - color: カラーピッカー（HEX入力対応、プリセットなし）
  - opacity: number入力（0〜1）
  - 注意: 背景色が無効（backgroundEnabled=false）の場合、影も表示されない
* **削除ボタン**: 即座に削除（確認なし）

### 追加項目

* **paddingX / paddingY**: number入力（px）
* **autoSizeMode**: ラジオボタンまたはセレクトボックス（manual / fitContent / fitWidth）
* **折り返し（wrap）**: チェックボックス
* **overflow**: ラジオボタンまたはセレクトボックス（clip / scroll）
* **「内容に合わせる」ボタン**: クリックで現在のcontentを測定し、width/heightを更新（autoSizeModeに関係なく一回実行）

### UI実装方針

* **文字色のカラーピッカー**: react-colorfulの`HexColorPicker`と`HexColorInput`を使用（プリセットなし）
* **背景色のカラーピッカー**: `ColorPickerWithPresets`コンポーネントを使用
  - 矩形と同じ8色プリセット（`#E3F2FD`, `#E0F7FA`, `#E0F2F1`, `#E8F5E9`, `#FFFDE7`, `#FFF3E0`, `#FCE4EC`, `#F5F5F5`）
  - HEX入力対応
  - カラーピッカー本体も表示
* **透明度の入力**: 
  - 矩形プロパティパネルと同様の実装パターン（スライダー）を踏襲
  - 文字と背景の透明度は、UIで値を反転（透明度 = 1 - 不透明度）
  - ドロップシャドウの透明度は反転しない（現状維持）
* **垂直配置ボタン**: 水平配置ボタンと同様のトグルボタン形式で実装
  - 「上」「中央」「下」の3つのボタン
  - 選択中のボタンは青色でハイライト表示

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
* `actionUpdateTextStyle(vm, textId, stylePatch)`: テキストのスタイル（fontSize/textAlign/textVerticalAlign/textColor/opacity等）を部分更新
* `actionUpdateTextBackground(vm, textId, backgroundPatch)`: 背景色のプロパティ（backgroundColor/backgroundEnabled/backgroundOpacity）を部分更新
* `actionSetTextAutoSizeMode(vm, textId, mode)`: autoSizeModeを変更
* `actionFitTextBoundsToContent(vm, textId, width, height)`: 測定結果を受け取ってwidth/heightを更新（UI側で測定し、結果を渡す）
* `actionUpdateTextShadow(vm, textId, shadowPatch)`: 文字のドロップシャドウのプロパティを部分更新
* `actionUpdateBackgroundShadow(vm, textId, shadowPatch)`: 背景のドロップシャドウのプロパティを部分更新
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

* 編集モード開始：以下のいずれかで開始
  - F2キー（選択中のテキストに対してグローバルキーボードイベントをリッスン）
  - ダブルクリック（テキスト要素の`onDoubleClick`イベント）
* 編集モードでは`<textarea>`をオーバーレイ表示（選択中のテキストに対してのみ）
* 編集中のローカル状態（draft）はViewportPortalを描画するコンポーネント内で管理
* 編集確定時に`actionUpdateTextContent`をdispatch
* `autoSizeMode`に応じてDOM測定を実行し、`actionUpdateTextBounds`で結果を反映

### 空テキストの自動削除

* `GlobalUIState.selectedItem`の変更を`useEffect`で監視
* テキストの選択が解除された時（`selectedItem`が変化した時）
* そのテキストの`content`が空文字列（`""`）の場合、`actionRemoveText`をdispatchして削除
* 削除は即座に実行（確認なし）

### テキスト追加時の自動選択

* テキスト追加ボタンクリック時：
  1. 新しいテキストボックスを作成（デフォルト値`content: "テキスト"`）
  2. `actionAddText`で追加
  3. `actionSelectItem`で追加したテキストを選択状態にする
* 選択状態になることで、プロパティパネルが自動的に表示される

## 実装時の注意事項

* TypeSpecの型定義に`TextVerticalAlign` enum、`TextBox`モデルに新フィールドを追加し、`npm run generate`で型を再生成する
* テキストのドラッグ・リサイズ時は、イベントハンドラを`useCallback`で安定させて再レンダリングループを防ぐ
* 編集中の状態管理はViewportPortalを描画するコンポーネント内でローカル状態として保持し、確定時にStoreに反映
* テキスト測定はDOM依存のため、UI側で`measureText`相当の処理を実行し、結果をActionに渡す
* リサイズハンドルは矩形と同じ実装パターンを踏襲（四隅・四辺のハンドル）
* リサイズ時は座標（x, y）とサイズ（width, height）を同時に更新
* ViewportPortalで描画するため、viewport座標変換（`useViewport`の`zoom`を考慮）が必要
* F2キーのグローバルイベントリスナーは、編集モード中は無効化すること（`removeEventListener`で適切にクリーンアップ）
* 背景色の透明度は、HEXカラーをRGBAに変換して`backgroundOpacity`と組み合わせて適用する
* **透明度UIの変換**: 文字と背景の透明度は、UIで「透明度」として表示・入力するため、値を反転（透明度 = 1 - 不透明度）。ドロップシャドウの透明度は反転しない（現状維持）
* **垂直配置の実装**:
  - 外側のコンテナを`display: flex; flexDirection: column`に設定
  - `justifyContent`プロパティで垂直方向の配置を制御（**`alignItems`ではない**）
    - `top` → `justifyContent: flex-start`
    - `middle` → `justifyContent: center`
    - `bottom` → `justifyContent: flex-end`
  - 注意: `flexDirection: column`の場合、`alignItems`は水平方向、`justifyContent`は垂直方向を制御する
* **ドロップシャドウの2種類の独立適用**:
  - 文字と背景のドロップシャドウは完全に独立して設定・適用される
  - **文字のシャドウ**: `textShadow.enabled=true`の場合、内側のテキストコンテナに適用
    - `textShadow: ${offsetX}px ${offsetY}px ${blur}px rgba(...)`（spreadは使用しない）
  - **背景のシャドウ**: `backgroundShadow.enabled=true`かつ`backgroundEnabled=true`の場合、外側のコンテナに適用
    - `boxShadow: ${offsetX}px ${offsetY}px ${blur}px ${spread}px rgba(...)`
  - HEXカラーをRGBAに変換するヘルパー関数（`hexToRgba`）を使用して透明度を適用する
  - 各シャドウは個別のパラメータを持ち、異なる値を設定可能
* **背景色のカラーピッカー**: 
  - `ColorPickerWithPresets`コンポーネントを使用（矩形と同じ8色プリセット）
  - `HexColorPicker`と`HexColorInput`を直接使用しない
* 空テキストの自動削除は`useEffect`で`selectedItem`の変化を監視し、前回選択されていたテキストのcontentをチェックする
* ダブルクリックイベントは編集開始のみに使用し、シングルクリックによる選択処理と競合しないように実装する

## 段階的実装アプローチ

1. TypeSpecの`TextBox`モデルで`shadow`を`textShadow`と`backgroundShadow`に分離し、型を再生成
2. `textActions.ts`に`actionUpdateBackgroundShadow`を追加、`actionAddText`のデフォルト値を更新
3. `ERCanvas.tsx`のレンダリング処理を更新
   - 背景色対応（外側のコンテナに`backgroundColor`と`boxShadow`）
   - 垂直配置対応（`display: flex; flexDirection: column; justifyContent`）
   - 文字色の透明度対応（`color: rgba(...)`）
   - 文字のドロップシャドウ対応（内側のテキストコンテナに`textShadow`）
   - 2種類のシャドウを独立して適用（`textShadow.enabled`と`backgroundShadow.enabled`を個別にチェック）
4. テキストを`ViewportPortal`内で描画（背面・前面の2つのPortalで分けて描画）
5. ツールバー「テキスト追加」ボタンと`actionAddText`を実装、デフォルト値に新フィールドを設定
6. テキスト追加時の自動選択を実装（`actionSelectItem`をdispatch）
7. ドラッグ移動: マウスダウン→ムーブ→アップのイベントハンドリングで`actionUpdateTextPosition`をdispatch
8. ダブルクリックイベント実装: `onDoubleClick`で編集モード開始
9. リサイズ: カスタムリサイズハンドルを実装し、`actionUpdateTextBounds`と`actionSetTextAutoSizeMode`をdispatch
10. 編集UI: F2キー・ダブルクリックで編集モード開始、`<textarea>`をViewportPortal内に表示
11. プロパティパネル実装
    - 垂直配置ボタン追加（「上」「中央」「下」のトグルボタン）
    - 背景色設定追加（`ColorPickerWithPresets`コンポーネントを使用、8色プリセット対応）
    - 透明度の分離（文字の透明度と背景の透明度）
    - ドロップシャドウを2つのセクションに分離（「文字のドロップシャドウ」「背景のドロップシャドウ」）
12. 空テキストの自動削除実装（`useEffect`で`selectedItem`を監視）
13. autoSizeMode対応: 測定処理とボタンを実装
14. レイヤー管理統合: 作成時に`actionAddLayerItem`、削除時に`actionRemoveLayerItem`を呼び出す

## 懸念事項・確認事項

### 技術的懸念

* ViewportPortal内で`<textarea>`を表示する際のフォーカス管理（IME対応含む）
* テキスト測定のブラウザ間差異（フォント・レンダリングエンジンによるズレ）
* `autoSizeMode=fitContent`時のwidth/height測定精度
* ViewportPortal内でのドラッグ・リサイズ時のviewport座標変換の正確性
* 背景色と垂直配置を追加することでレンダリングパフォーマンスへの影響（flexboxの使用）
* 空テキスト自動削除のタイミングで、ユーザーが意図せず削除してしまう可能性（Undo機能がないため）
* **`text-shadow`のspreadサポート**: CSSの`text-shadow`プロパティは`spread`をサポートしないため、文字のシャドウ（`textShadow`）では`spread`パラメータを使用しない（UIからも除外）。背景のシャドウ（`backgroundShadow`）の`boxShadow`のみ`spread`が適用される
* プロパティパネルが長くなる可能性: 2つのシャドウセクションで項目数が増加（スクロールで対応）
* **透明度UIの直感性**: UIでは「透明度」と表示するが、内部は「不透明度」（CSS標準）で保存するため、UI層で値の反転処理が必要

### 解決済みの懸念

* **透明度の分離**: 文字（opacity）と背景（backgroundOpacity）で別々に設定可能に変更済み
* **ダブルクリックの実装**: React FlowのonDoubleClickイベントで実装可能
* **プロパティパネルの長さ**: スクロールで対応可能
* **ドロップシャドウの独立設定**: 文字（textShadow）と背景（backgroundShadow）で別々に設定可能に変更済み

### 今後の検討事項

* テキストの回転機能
* テキストのリッチテキスト対応（太字・斜体・リンク等）
* テキストのz-index（重なり順）はレイヤーパネルで管理するため、当面は不要
* テキストの角丸設定（borderRadius）
* フォント選択機能（MVPでは固定フォントで対応）
* Undo/Redo機能（空テキスト自動削除の誤操作対策）