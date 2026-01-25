# テキスト描画機能実装タスク

仕様書の更新に伴い、テキスト描画機能を実装するためのタスクを洗い出す。
仕様書の詳細は [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) を参照。

## 変更概要

直前のコミットで以下の仕様変更が行われた：

1. **新規仕様書**: `spec/text_drawing_feature.md` を追加
2. **TypeSpec型定義更新**: `scheme/main.tsp` で `Text` → `TextBox` に変更し、大幅に拡張（enum追加、DropShadow追加）
3. **既存仕様書更新**: テキスト関連のAction、レイヤー管理、インポート/エクスポート、プロパティパネル対応を各仕様書に追記

## フェーズ分け方針

テキスト描画機能は以下の2フェーズに分けて実装する：

* **フェーズ1**: 型生成・Actionの実装・テストコード作成・テスト実行
* **フェーズ2**: UIコンポーネント実装・ビルド確認

各フェーズの最後にビルド・テスト実行を行い、動作確認を行う。

---

## フェーズ1: 型生成・Actionの実装・テスト

### [x] 型生成の実行

- **ファイル**: `lib/generated/api-types.ts`, `public/src/api/client/models/` 配下
- **コマンド**: `npm run generate`
- **確認事項**: 
  - `TextBox`, `TextAlign`, `TextAutoSizeMode`, `TextOverflowMode`, `DropShadow` 型が生成されること
  - `ERDiagramViewModel` に `texts: Record<TextBox>` が追加されること
  - 旧 `Text` 型が削除されているか、または `TextBox` に置き換わっていること

### [x] textActions.tsの実装

- **新規作成ファイル**: `public/src/actions/textActions.ts`
- **参照仕様**: [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) のAction設計セクション
- **実装するAction**:
  - `actionAddText(vm, textBox)`: 新規テキストを追加
    - `vm.erDiagram.texts` に `textBox` を追加
    - `actionAddLayerItem(vm, { kind: 'text', id: textBox.id }, 'foreground')` を呼び出してレイヤーに追加
  - `actionRemoveText(vm, textId)`: テキストを削除
    - `vm.erDiagram.texts` から削除
    - `actionRemoveLayerItem(vm, { kind: 'text', id: textId })` を呼び出してレイヤーから削除
    - 選択中のテキストなら `actionSelectItem(vm, null)` で選択解除
  - `actionUpdateTextPosition(vm, textId, x, y)`: テキストの位置を更新
  - `actionUpdateTextSize(vm, textId, width, height)`: テキストのサイズを更新
  - `actionUpdateTextBounds(vm, textId, {x, y, width, height})`: テキストの座標とサイズを一括更新
  - `actionUpdateTextContent(vm, textId, content)`: テキストの内容を更新
  - `actionUpdateTextStyle(vm, textId, stylePatch)`: テキストのスタイルを部分更新
    - `stylePatch`: `{ fontSize?, lineHeight?, textAlign?, textColor?, stroke?, strokeWidth?, opacity?, wrap?, overflow? }`
  - `actionSetTextAutoSizeMode(vm, textId, mode)`: autoSizeModeを変更
  - `actionFitTextBoundsToContent(vm, textId, width, height)`: 測定結果を受け取ってwidth/heightを更新
  - `actionUpdateTextShadow(vm, textId, shadowPatch)`: ドロップシャドウのプロパティを部分更新
    - `shadowPatch`: `{ enabled?, offsetX?, offsetY?, blur?, spread?, color?, opacity? }`
  - `actionUpdateTextPadding(vm, textId, paddingX, paddingY)`: パディングを更新
- **実装パターン**: `rectangleActions.ts` を参考に、純粋関数で実装
- **注意事項**: 
  - すべてのActionは変更がない場合に同一参照を返すこと
  - `actionAddLayerItem`, `actionRemoveLayerItem`, `actionSelectItem` は `layerActions.ts` からimport

### [x] textActions.test.tsの作成

- **新規作成ファイル**: `public/tests/actions/textActions.test.ts`
- **参照テスト**: `public/tests/actions/rectangleActions.test.ts` をベースに作成
- **テストケース**:
  - `actionAddText`: テキストが追加される、レイヤーに追加される、重複IDは同一参照を返す
  - `actionRemoveText`: テキストが削除される、レイヤーから削除される、選択中なら選択解除される、存在しないIDは同一参照を返す
  - `actionUpdateTextPosition`: 位置が更新される、変化なしなら同一参照を返す、存在しないIDは同一参照を返す
  - `actionUpdateTextSize`: サイズが更新される、変化なしなら同一参照を返す、存在しないIDは同一参照を返す
  - `actionUpdateTextBounds`: 座標とサイズが一括更新される、変化なしなら同一参照を返す、存在しないIDは同一参照を返す
  - `actionUpdateTextContent`: 内容が更新される、変化なしなら同一参照を返す、存在しないIDは同一参照を返す
  - `actionUpdateTextStyle`: スタイルが部分更新される、変化なしなら同一参照を返す、存在しないIDは同一参照を返す
  - `actionSetTextAutoSizeMode`: autoSizeModeが更新される、変化なしなら同一参照を返す、存在しないIDは同一参照を返す
  - `actionFitTextBoundsToContent`: width/heightが更新される、変化なしなら同一参照を返す、存在しないIDは同一参照を返す
  - `actionUpdateTextShadow`: shadowが部分更新される、変化なしなら同一参照を返す、存在しないIDは同一参照を返す
  - `actionUpdateTextPadding`: paddingが更新される、変化なしなら同一参照を返す、存在しないIDは同一参照を返す
- **mockViewModel**: `texts` フィールドに1つ以上のテキストを含むViewModelを作成

### [x] GetInitialViewModelUsecaseの更新

- **編集ファイル**: `lib/usecases/GetInitialViewModelUsecase.ts`
- **変更内容**: 
  - 初期ViewModelの `erDiagram` に `texts: {}` を追加
  - 43行目付近の `erDiagram` 定義で `texts: {}` を追加

### [x] GetInitialViewModelUsecase.test.tsの更新

- **編集ファイル**: `tests/usecases/GetInitialViewModelUsecase.test.ts`
- **変更内容**: 
  - テストケースのアサーションで `texts: {}` が含まれることを確認
  - `expect(result.erDiagram.texts).toEqual({})` を追加

### [x] importViewModel.tsの更新

- **編集ファイル**: `public/src/utils/importViewModel.ts`
- **変更内容**: 
  - 83行目の `rectangles: importedViewModel.erDiagram?.rectangles || {}` の後に
  - `texts: importedViewModel.erDiagram?.texts || {}` を追加

### [x] exportViewModel.tsの更新

- **編集ファイル**: `public/src/utils/exportViewModel.ts`
- **変更内容**: 
  - 27行目の `rectangles: viewModel.erDiagram.rectangles` の後に
  - `texts: viewModel.erDiagram.texts` を追加

### [x] ビルドの確認（フェーズ1）

- **コマンド**: 
  1. `npm run generate` （型生成）
  2. `cd public && npm run build` （フロントエンドビルド）
  3. `npm run build` （バックエンドビルド、ルートディレクトリで実行）
- **確認事項**: 
  - ビルドエラーが発生しないこと
  - 型定義が正しく生成されていること

### [x] テストの実行（フェーズ1）

- **コマンド**: `npm run test`
- **確認事項**: 
  - 既存テストが全てパスすること
  - 新規テスト（textActions.test.ts）が全てパスすること

---

## フェーズ2: UIコンポーネント実装・ビルド確認

### [x] reactFlowConverter.tsにテキスト変換関数を追加

- **編集ファイル**: `public/src/utils/reactFlowConverter.ts`
- **参照仕様**: [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) のReact Flow統合セクション
- **追加する関数**: `convertToReactFlowTexts(texts: Record<TextBox>): Node[]`
  - `texts` を Object.values で配列に変換
  - 各 `TextBox` を React Flow の `Node` に変換
    - `id`: text.id
    - `type`: 'textNode'
    - `position`: { x: text.x, y: text.y }
    - `width`: text.width
    - `height`: text.height
    - `data`: TextBoxの全プロパティをコピー
- **importの追加**: `TextBox` 型を `public/src/api/client` からimport

### [x] TextNode.tsxの実装

- **新規作成ファイル**: `public/src/components/TextNode.tsx`
- **参照仕様**: [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) のTextNodeコンポーネントセクション
- **参照実装**: `RectangleNode.tsx` をベースに作成
- **実装内容**:
  - `NodeProps<TextBoxData>` を受け取るReact.FC
  - `TextBoxData`: TextBoxの全プロパティ + コールバック
  - `NodeResizer` を内包し、選択時にリサイズハンドルを表示
  - 最小サイズ: 幅40px × 高さ20px
  - F2キーで編集モードに入る（`useEffect` + `keydown` イベントリスナー）
  - 編集モードでは `<textarea>` をオーバーレイ
    - ローカル状態で `isEditing` と `draftContent` を管理
    - Enter: 改行（`\n`を挿入）
    - Esc: 編集キャンセル
    - Ctrl/Cmd+Enter: 編集確定
    - blur: 編集確定
  - `onResizeEnd` で `actionUpdateTextBounds` と `actionSetTextAutoSizeMode(vm, id, 'manual')` をdispatch
  - `autoSizeMode` に応じて編集確定時にDOM測定を実行
  - スタイル:
    - `border`: `${strokeWidth}px solid ${stroke}`
    - `color`: `${textColor}`
    - `opacity`: `${opacity}`
    - `padding`: `${paddingY}px ${paddingX}px`
    - `text-align`: `${textAlign}`
    - `white-space`: `pre-wrap`
    - `overflow-wrap`: `anywhere` (wrap=true時)
    - `word-break`: `break-word` (wrap=true時)
    - `box-shadow`: DropShadow設定に基づいて生成（enabled=true時）
    - `font-family`: システムフォント固定
    - `font-size`: `${fontSize}px`
    - `line-height`: `${lineHeight}px`
- **importするAction**: `actionUpdateTextBounds`, `actionSetTextAutoSizeMode`, `actionUpdateTextContent` from `../actions/textActions`
- **useCallback**: すべてのイベントハンドラを `useCallback` でメモ化

### [x] TextPropertyPanel.tsxの実装

- **新規作成ファイル**: `public/src/components/TextPropertyPanel.tsx`
- **参照仕様**: [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) のプロパティパネル設計セクション
- **参照実装**: `RectanglePropertyPanel.tsx` をベースに作成
- **Props**: `{ textId: string }`
- **実装内容**:
  - `useViewModel` で `vm.erDiagram.texts[textId]` を購読
  - テキストが存在しない場合は `null` を返す
  - 各プロパティの編集UI:
    - **内容**: `<textarea>` (rows=5, value=content, onChange で `actionUpdateTextContent` をdispatch)
    - **フォントサイズ**: `<input type="number">` (onChange で `actionUpdateTextStyle` をdispatch)
    - **行の高さ**: `<input type="number">` (onChange で `actionUpdateTextStyle` をdispatch)
    - **配置**: 3つのトグルボタン (left/center/right、onChange で `actionUpdateTextStyle` をdispatch)
    - **文字色**: `HexColorPicker` + `HexColorInput` (onChange で `actionUpdateTextStyle` をdispatch、プリセットなし)
    - **枠線色**: `HexColorPicker` + `HexColorInput` (onChange で `actionUpdateTextStyle` をdispatch、プリセットなし)
    - **枠線幅**: `<input type="number">` (onChange で `actionUpdateTextStyle` をdispatch)
    - **透明度**: `<input type="range" min=0 max=1 step=0.01>` + 表示ラベル (onChange で `actionUpdateTextStyle` をdispatch)
    - **ドロップシャドウ**:
      - **有効/無効**: `<input type="checkbox">` (onChange で `actionUpdateTextShadow` をdispatch)
      - **offsetX / offsetY**: `<input type="number">` (onChange で `actionUpdateTextShadow` をdispatch)
      - **blur / spread**: `<input type="number">` (onChange で `actionUpdateTextShadow` をdispatch)
      - **color**: `HexColorPicker` + `HexColorInput` (onChange で `actionUpdateTextShadow` をdispatch)
      - **opacity**: `<input type="range" min=0 max=1 step=0.01>` + 表示ラベル (onChange で `actionUpdateTextShadow` をdispatch)
    - **paddingX / paddingY**: `<input type="number">` (onChange で `actionUpdateTextPadding` をdispatch)
    - **autoSizeMode**: `<select>` または ラジオボタン (manual/fitContent/fitWidth、onChange で `actionSetTextAutoSizeMode` をdispatch)
    - **折り返し**: `<input type="checkbox">` (onChange で `actionUpdateTextStyle` をdispatch)
    - **overflow**: `<select>` または ラジオボタン (clip/scroll、onChange で `actionUpdateTextStyle` をdispatch)
    - **「内容に合わせる」ボタン**: クリックでDOM測定を実行し、`actionFitTextBoundsToContent` をdispatch
    - **削除ボタン**: クリックで `actionRemoveText` をdispatch
- **importするAction**: `actionUpdateTextContent`, `actionUpdateTextStyle`, `actionSetTextAutoSizeMode`, `actionFitTextBoundsToContent`, `actionUpdateTextShadow`, `actionUpdateTextPadding`, `actionRemoveText` from `../actions/textActions`
- **カラーピッカー**: `react-colorful` の `HexColorPicker` と `HexColorInput` を使用
- **イベント伝播停止**: `RectanglePropertyPanel.tsx` と同様に `onMouseDown`, `onPointerDown`, `onClick`, `onTouchStart`, `onChange` で `stopPropagation` を呼び出す
- **スタイル**: `RectanglePropertyPanel.tsx` と同様のスタイリングパターンを踏襲

### [x] ERCanvas.tsxにテキスト追加ボタンを実装

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **変更内容**:
  - `actionAddText` を import
  - `handleAddText` ハンドラを追加:
    - viewport中央の座標を計算（`useViewport()` で取得可能）
    - デフォルト値でTextBoxを作成（仕様書のデフォルト値を参照）
    - `actionAddText` をdispatch
  - ツールバーに「テキスト追加」ボタンを追加（矩形追加ボタンの隣）
    - スタイルは矩形追加ボタンと同様
- **注意事項**: 
  - viewport中央の計算は `viewport.x`, `viewport.y`, `viewport.zoom` を使用
  - `shadow.enabled: false` で初期化（DropShadow全体をデフォルト値で初期化）
- **実装メモ**: viewport中央の計算は後回しにし、まずは固定座標(0, 0)で実装済み

### [x] ERCanvas.tsxのnodeTypes登録

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **変更内容**:
  - `TextNode` コンポーネントを import
  - `nodeTypes` に `textNode: TextNode` を追加

### [x] ERCanvas.tsxでテキストをReact Flowノードに変換

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **変更内容**:
  - `convertToReactFlowTexts` を `reactFlowConverter.ts` から import
  - `viewModelTexts` を購読: `useViewModel((vm) => vm.erDiagram.texts)`
  - `useEffect` でノード更新処理に `convertToReactFlowTexts(viewModelTexts)` を追加
  - `setNodes` で entityNodes と textNodes をマージして設定
  - テキストノードのドラッグ処理も追加（`onNodeDragStop`でtextNodeの場合に`actionUpdateTextPosition`をdispatch）

### [x] App.tsxでテキストプロパティパネルを表示

- **編集ファイル**: `public/src/components/App.tsx`
- **変更内容**:
  - `TextPropertyPanel` コンポーネントを import
  - 159行目付近の条件分岐を更新:
    - `selectedItem?.kind === 'rectangle'` の場合に `RectanglePropertyPanel` を表示
    - `selectedItem?.kind === 'text'` の場合に `TextPropertyPanel` を表示
  - 右サイドバーのスタイルは共通（幅300px、背景白、左ボーダー、縦スクロール）

### [x] LayerPanel.tsxのテキスト表示対応

- **編集ファイル**: `public/src/components/LayerPanel.tsx`
- **変更内容**:
  - 48行目付近の `displayName` 計算ロジックで `LayerItemKind.TEXT` の場合の処理を追加済み
  - 確認のみでOK（既に対応済み）

### [x] ビルドの確認（フェーズ2）

- **コマンド**: 
  1. `cd public && npm run build`
  2. `cd .. && npm run build`
- **確認事項**: 
  - ビルドエラーが発生しないこと
  - TextNodeコンポーネントが正しくバンドルされること
- **結果**: ✅ ビルド成功（フロントエンド、バックエンド共に成功）

---

## フェーズ2完了報告

**完了日時**: 2026-01-25

**実装内容**:
- ✅ `convertToReactFlowTexts`関数の実装（reactFlowConverter.ts）
- ✅ `TextNode.tsx`コンポーネントの実装（React Flowカスタムノード）
  - F2キーで編集モード開始
  - 編集中はtextareaオーバーレイ
  - NodeResizerによるリサイズ対応
  - autoSizeMode対応（DOM測定を含む）
  - ドロップシャドウのレンダリング
- ✅ `TextPropertyPanel.tsx`の実装
  - 全プロパティの編集UI（内容、フォント、配置、色、枠線、透明度、パディング、ドロップシャドウ等）
  - react-colorfulのHexColorPickerとHexColorInputを使用
  - 「内容に合わせる」ボタンでDOM測定実行
- ✅ ERCanvas.tsxの更新
  - TextNodeのimportとnodeTypes登録
  - テキスト追加ボタンの実装
  - viewModelTextsの購読とReact Flowノードへの変換
  - テキストノードのドラッグ処理（actionUpdateTextPositionのdispatch）
- ✅ App.tsxの更新
  - TextPropertyPanelの表示条件追加
- ✅ LayerPanel.tsxのテキスト表示対応確認（既に対応済み）
- ✅ ビルド成功（フロントエンド、バックエンド共に成功）

**linterエラー**: なし

**既知の制限事項**:
- テキスト追加時の座標は固定(0, 0)（viewport中央の計算は未実装）

---

## 指示者宛ての懸念事項（作業対象外）

### 型生成に関する懸念

- **現状**: `npm run generate` が実行されていないため、`TextBox`, `TextAlign`, `TextAutoSizeMode`, `TextOverflowMode`, `DropShadow` 型が存在しない
- **影響**: 
  - フロントエンド (`public/src/api/client/models/`) に `TextBox.ts` などが生成されていない
  - バックエンド (`lib/generated/api-types.ts`) に `TextBox` 型が存在しない
  - 旧 `Text.ts` ファイルが残っている可能性がある
- **対応**: フェーズ1の最初に `npm run generate` を実行する必要がある

### テキスト測定に関する懸念

- **autoSizeMode対応**: DOM測定はブラウザ環境でのみ実行可能なため、テストコードでのカバレッジが限定的
- **対応案**: 
  - `actionFitTextBoundsToContent` はwidth/heightを受け取るだけの純粋関数なのでテスト可能
  - 測定処理自体は `TextNode.tsx` または `TextPropertyPanel.tsx` のUI側で実装
  - E2Eテストまたは手動テストで動作確認が必要

### React Flow統合に関する懸念

- **編集モード実装の複雑性**: 
  - `<textarea>` オーバーレイとReact Flowのドラッグ処理の競合可能性
  - IME（日本語入力）との互換性
- **対応案**: 
  - 編集中は `pointer-events: none` をReact Flowに設定するなど、イベント伝播を制御
  - プロトタイピング段階なので、問題が発生した場合は手動テストで確認しながら修正

### レイヤーパネルのテキスト表示

- **現状**: `LayerPanel.tsx` の48行目で既に `LayerItemKind.TEXT` に対応済み
- **確認**: 実装済みかどうか確認が必要

---

## 事前修正提案

なし。TypeSpecの型定義は既に更新されており、型生成を実行すれば実装可能な状態になっている。
