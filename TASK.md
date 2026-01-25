# テキスト描画機能 ViewportPortal方式への移行タスク

仕様書の更新（直前のコミット）に伴い、テキスト描画機能の実装方式を変更する。
仕様書の詳細は [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) を参照。

## 変更概要

直前のコミットで以下の仕様変更が行われた：

1. **TypeSpecモデル変更**: `TextBox`から`stroke`と`strokeWidth`を削除（枠線を持たないシンプルなテキストに変更）
2. **描画方式変更**: React FlowカスタムノードからViewportPortal方式へ変更（矩形と同じ実装パターン）
3. **デフォルト値追加**: shadowのoffsetX/offsetY/blur/spread等のデフォルト値を明示
4. **プロパティパネル簡素化**: 枠線色・枠線幅のUIを削除

## 現在の実装状況

既に以下のファイルが実装済み：

- ✅ `public/src/actions/textActions.ts` - テキスト操作用Action（ただし`stroke`/`strokeWidth`参照を削除する必要あり）
- ✅ `public/tests/actions/textActions.test.ts` - テストコード（ただし`stroke`/`strokeWidth`参照を削除する必要あり）
- ✅ `public/src/components/TextNode.tsx` - React Flowカスタムノード実装（**ViewportPortal方式に移行のため削除予定**）
- ✅ `public/src/components/TextPropertyPanel.tsx` - プロパティパネル（ただし枠線関連UIを削除する必要あり）
- ✅ `public/src/utils/reactFlowConverter.ts` - `convertToReactFlowTexts`関数（**ViewportPortal方式に移行のため削除予定**）
- ✅ `public/src/components/ERCanvas.tsx` - テキスト追加ボタン、React Flow統合（ViewportPortal方式に書き換える必要あり）

## フェーズ分け方針

以下の2フェーズに分けて実装する：

* **フェーズ1**: 型定義の修正・型生成・Actionとテストコードの修正・テスト実行
* **フェーズ2**: UIコンポーネントのViewportPortal方式への移行・ビルド確認

各フェーズの最後にビルド・テスト実行を行い、動作確認を行う。

---

## フェーズ1: 型定義の修正・型生成・Action修正・テスト

### [ ] TypeSpecのTextBoxモデル修正

- **編集ファイル**: `scheme/main.tsp`
- **変更内容**: 
  - 122行目の`stroke: string;`を削除
  - 123行目の`strokeWidth: float64;`を削除
  - 121行目のコメントを`opacity: float64;     // テキスト全体の不透明度（0..1）`に変更（既に変更済みの可能性あり）

### [ ] 型生成の実行

- **コマンド**: `npm run generate`
- **確認事項**: 
  - `lib/generated/api-types.ts`で`TextBox`に`stroke`と`strokeWidth`が存在しないこと
  - `public/src/api/client/models/TextBox.ts`で`stroke`と`strokeWidth`が存在しないこと
  - 他の型定義は正しく生成されていること

### [ ] textActions.tsの修正

- **編集ファイル**: `public/src/actions/textActions.ts`
- **変更内容**: 
  - `actionUpdateTextStyle`関数（227〜286行目）の修正：
    - `stylePatch`の型定義から`stroke?: string;`と`strokeWidth?: number;`を削除（235〜236行目付近）
    - `hasChanges`の判定から`stroke`と`strokeWidth`の比較を削除（255〜256行目）
    - スプレッド演算子での更新処理から`stroke`と`strokeWidth`を削除（277〜278行目）

### [ ] textActions.test.tsの修正

- **編集ファイル**: `public/tests/actions/textActions.test.ts`
- **変更内容**: 
  - `createMockViewModel`のテキスト定義から`stroke`と`strokeWidth`を削除（39〜40行目）
  - `actionAddText`テストケースのnewText定義から`stroke`と`strokeWidth`を削除（97〜98行目、137〜138行目、174〜175行目）
  - `actionUpdateTextStyle`テストケースの全てのスタイルプロパティ更新テストから`stroke`と`strokeWidth`を削除（392〜404行目）

### [ ] ビルドの確認（フェーズ1）

- **コマンド**: 
  1. `npm run generate` （型生成）
  2. `cd public && npm run build` （フロントエンドビルド）
  3. `cd .. && npm run build` （バックエンドビルド、ルートディレクトリで実行）
- **確認事項**: 
  - ビルドエラーが発生しないこと
  - 型定義が正しく生成されていること

### [ ] テストの実行（フェーズ1）

- **コマンド**: `npm run test`
- **確認事項**: 
  - 既存テストが全てパスすること
  - textActions.test.tsのテストが全てパスすること

---

## フェーズ2: ViewportPortal方式への移行・ビルド確認

### [ ] ERCanvas.tsxにテキスト描画関数を追加

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **参照仕様**: [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) のViewportPortal統合セクション
- **参照実装**: 330〜377行目の`renderRectangles`関数を参考に実装
- **追加する関数**: `renderTexts(items: readonly any[])`
  - `items`配列から`kind === 'text'`のアイテムを抽出
  - 各テキストに対して`<div>`要素を描画
  - スタイル:
    - `position: 'absolute'`
    - `left: text.x`, `top: text.y`
    - `width: text.width`, `height: text.height`
    - `color: text.textColor`
    - `opacity: text.opacity`
    - `padding: ${text.paddingY}px ${text.paddingX}px`
    - `text-align: text.textAlign`
    - `white-space: 'pre-wrap'`
    - `overflow-wrap: text.wrap ? 'anywhere' : 'normal'`
    - `word-break: text.wrap ? 'break-word' : 'normal'`
    - `font-family`: システムフォント固定（仕様書参照）
    - `font-size: ${text.fontSize}px`
    - `line-height: ${text.lineHeight}px`
    - `overflow: text.overflow === 'scroll' ? 'auto' : 'hidden'`
    - `cursor: 'move'`
    - `box-sizing: 'border-box'`
    - `outline: isSelected ? '2px solid #1976d2' : 'none'`
    - `outline-offset: '2px'`
    - `pointer-events: 'auto'`
    - `box-shadow`: shadowが有効な場合に生成（TextNode.tsxの152行目を参照）
    - `z-index`: `calculateZIndex(layerOrder, item)`で計算
  - `onMouseDown`: `handleTextMouseDown`を呼び出し（新規実装）
  - `onClick`: `actionSelectItem`をdispatchして選択状態を更新
  - 選択中の場合は`ResizeHandles`コンポーネントを表示（テキスト用に新規実装）

### [ ] ERCanvas.tsxにテキストドラッグ処理を追加

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **変更内容**:
  - `handleTextMouseDown`関数を追加（`handleRectangleMouseDown`と同様の実装パターン）
    - クリックされたテキストを選択（`actionSelectItem`）
    - ドラッグ状態を保持（`setDraggingText`）
  - `draggingText`状態の追加（187行目付近）
  - `useEffect`でテキストドラッグ処理を追加（299〜323行目の矩形ドラッグ処理と同様）
    - マウスムーブ時に`actionUpdateTextPosition`をdispatch
    - viewport.zoomを考慮した座標変換
    - マウスアップ時にドラッグ状態をクリア

### [ ] ERCanvas.tsxにテキストリサイズハンドルを追加

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **変更内容**:
  - `renderTexts`関数内で、選択中のテキストに対して`ResizeHandles`コンポーネントを表示
  - `ResizeHandles`に渡すprops: `rectangleId={text.id}`, `width={text.width}`, `height={text.height}`, `x={text.x}`, `y={text.y}`, `onResize={handleTextResize}`
  - `handleTextResize`関数を新規追加:
    - `actionUpdateTextBounds`をdispatch
    - `actionSetTextAutoSizeMode(vm, textId, 'manual')`をdispatchして手動モードに変更
  - **注意**: ResizeHandlesは矩形用だが、propsに`x`と`y`を追加すればテキストでも使用可能

### [ ] ResizeHandlesコンポーネントの最小限の修正

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **変更内容**:
  - 44〜158行目の`ResizeHandles`コンポーネントを修正
  - propsに`x`と`y`を追加: `{ rectangleId, width, height, x, y, onResize }`
  - 56〜57行目の`rectangles`購読と`rectangle`変数を削除
  - 67行目の`startRectX`と`startRectY`を、props経由で受け取った`x`と`y`に変更
  - 呼び出し側を修正:
    - `renderRectangles`の366〜373行目: `ResizeHandles`に`x={rectangle.x}`と`y={rectangle.y}`を追加
    - `renderTexts`でも同様に`x={text.x}`と`y={text.y}`を追加（新規実装時）
  - **注意**: 完全な汎用化は見送り。将来的にリファクタリングで共通化を検討

### [ ] ERCanvas.tsxのテキスト編集UI追加

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **参照仕様**: [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) の編集UIセクション
- **変更内容**:
  - `editingTextId`と`draftContent`のローカル状態を追加
  - F2キーのグローバルイベントリスナーを追加（選択中のテキストに対して）
  - `ViewportPortal`内に`<textarea>`オーバーレイを表示（編集中のみ）
  - `<textarea>`のスタイル:
    - `position: 'absolute'`
    - `left`, `top`, `width`, `height`: 編集中のテキストの座標・サイズ
    - `padding`, `font-size`, `line-height`, `color`, `text-align`: 編集中のテキストのスタイルを反映
    - `outline: '2px solid #3b82f6'`
    - `background-color: 'rgba(255, 255, 255, 0.95)'`
    - `resize: 'none'`
    - `overflow: 'auto'`
    - `box-sizing: 'border-box'`
    - `z-index`: 最前面（例: 10000）
  - 編集中の操作:
    - Enter: 改行（`\n`を挿入）
    - Esc: 編集キャンセル（`setEditingTextId(null)`）
    - Ctrl/Cmd+Enter: 編集確定
    - blur: 編集確定
  - 編集確定時に`actionUpdateTextContent`をdispatch
  - `autoSizeMode`に応じてDOM測定を実行し、`actionUpdateTextBounds`で結果を反映

### [ ] ERCanvas.tsxのhandleAddText修正

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **変更内容**: 
  - 454〜485行目の`handleAddText`関数を修正
  - `stroke`と`strokeWidth`を削除
  - shadowのデフォルト値を更新:
    - `offsetX: 2` (現在は0)
    - `offsetY: 2` (現在は0)
    - `blur: 4` (現在は0)
    - `spread: 0` (既に0)
    - `opacity: 0.3` (現在は0.5)

### [ ] ERCanvas.tsxのViewportPortal統合

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **変更内容**:
  - 394〜402行目の`ViewportPortal`ブロックを修正
  - 背面レイヤー（395〜397行目）に`renderTexts(layerOrder.backgroundItems)`を追加
  - 前面レイヤー（399〜402行目）に`renderTexts(layerOrder.foregroundItems)`を追加
  - テキストと矩形を同じPortal内で描画（それぞれ`renderRectangles`と`renderTexts`を呼び出し）

### [ ] ERCanvas.tsxからReact Flow関連のテキスト処理を削除

- **編集ファイル**: `public/src/components/ERCanvas.tsx`
- **変更内容**:
  - 36行目の`nodeTypes`から`textNode: TextNode`を削除
  - 22行目の`import TextNode`を削除
  - 23行目の`convertToReactFlowTexts`のimportを削除
  - 255〜258行目の`onNodeDragStop`内のテキストノード処理を削除
  - 422行目の`viewModelTexts`の購読を削除（既にtextsは別の場所で購読しているため不要）
  - 428行目の`convertToReactFlowTexts(viewModelTexts)`を削除
  - 431行目の`setNodes`から`...textNodes`を削除（entityNodesのみにする）

### [ ] TextNode.tsxコンポーネントの削除

- **削除ファイル**: `public/src/components/TextNode.tsx`
- **理由**: ViewportPortal方式への移行により、React Flowカスタムノードとしてのテキスト描画は不要になるため

### [ ] reactFlowConverter.tsのconvertToReactFlowTexts関数を削除

- **編集ファイル**: `public/src/utils/reactFlowConverter.ts`
- **変更内容**: 
  - 149〜165行目の`convertToReactFlowTexts`関数を削除
  - 4行目の`import type { TextBox }`を削除（使用されなくなるため）

### [ ] TextPropertyPanel.tsxから枠線関連UIを削除

- **編集ファイル**: `public/src/components/TextPropertyPanel.tsx`
- **変更内容**: 
  - 24行目の`showStrokePicker`状態を削除
  - 322〜359行目の「枠線色」セクションを削除
  - 361〜380行目の「枠線幅」セクションを削除
  - 57〜59行目の`handleStrokeChange`関数を削除
  - 61〜66行目の`handleStrokeWidthChange`関数を削除

### [ ] TextPropertyPanel.tsxのDOM測定処理修正

- **編集ファイル**: `public/src/components/TextPropertyPanel.tsx`
- **変更内容**: 
  - 140〜173行目の`handleFitToContent`関数を修正
    - 148行目の`border`スタイル設定を削除（borderは不要になるため）
  - **注意**: TextNode.tsxの74行目にも同様の`border`設定があるが、TextNode.tsx自体を削除するため修正不要

### [ ] ビルドの確認（フェーズ2）

- **コマンド**: 
  1. `cd public && npm run build`
  2. `cd .. && npm run build`
- **確認事項**: 
  - ビルドエラーが発生しないこと
  - `TextNode.tsx`が削除されているため、ビルド成果物に含まれないこと
  - ViewportPortalでテキストが正しくレンダリングされること（手動確認）

---

## 指示者宛ての懸念事項（作業対象外）

### ViewportPortal方式への移行の影響範囲

- **影響**: 
  - テキストの編集UI実装が複雑化（ViewportPortal内で`<textarea>`を表示するため、座標変換が必要）
  - F2キーのグローバルイベントリスナーと`<textarea>`のフォーカス管理が必要
  - IME（日本語入力）との互換性確認が必要
- **対応**: 承知済み。プロトタイピング段階なので、実装後に手動テストで動作確認

### DOM測定処理の重複

- **現状**: `TextPropertyPanel.tsx`の`handleFitToContent`とテキスト編集確定時のDOM測定処理が類似
- **影響**: コードの重複が発生する
- **対応**: 一旦共通化は見送り。将来的にリファクタリングで`utils`に共通関数を切り出す

### ResizeHandlesコンポーネントの汎用化

- **現状**: `ResizeHandles`コンポーネントは矩形専用の実装（rectangleIdとrectanglesを直接参照）
- **影響**: テキストでも使用するため、何らかの対応が必要
- **対応**: 一旦共通化は見送り。タスクでは最小限の修正（propsで必要な値を受け取る）で対応し、将来的にリファクタリング

### テキストのデフォルト値の不一致

- **現状**: 
  - 仕様書では`shadow.offsetX: 2px`, `shadow.offsetY: 2px`, `shadow.blur: 4px`, `shadow.opacity: 0.3`
  - ERCanvas.tsxの実装では全て0または0.5
- **影響**: デフォルト値が仕様と一致しない
- **対応**: 仕様書が正しいため、`handleAddText`のshadowデフォルト値を修正

---

## 事前修正提案

なし。仕様書の変更内容に沿って実装を修正すれば対応可能。
