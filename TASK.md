# テキスト描画機能 ViewportPortal方式への移行タスク

**✅ フェーズ2完了：すべてのタスクが完了しました。ビルドとテスト（100個）がすべてパスしました。**

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

### [✓] TypeSpecのTextBoxモデル修正

- **編集ファイル**: `scheme/main.tsp`
- **変更内容**: 
  - 122行目の`stroke: string;`を削除
  - 123行目の`strokeWidth: float64;`を削除
  - 121行目のコメントを`opacity: float64;     // テキスト全体の不透明度（0..1）`に変更（既に変更済みの可能性あり）
- **実施結果**: すでに削除済みでした。

### [✓] 型生成の実行

- **コマンド**: `npm run generate`
- **確認事項**: 
  - `lib/generated/api-types.ts`で`TextBox`に`stroke`と`strokeWidth`が存在しないこと
  - `public/src/api/client/models/TextBox.ts`で`stroke`と`strokeWidth`が存在しないこと
  - 他の型定義は正しく生成されていること
- **実施結果**: 型生成成功。TextBoxに`stroke`と`strokeWidth`が存在しないことを確認。

### [✓] textActions.tsの修正

- **編集ファイル**: `public/src/actions/textActions.ts`
- **変更内容**: 
  - `actionUpdateTextStyle`関数（227〜286行目）の修正：
    - `stylePatch`の型定義から`stroke?: string;`と`strokeWidth?: number;`を削除（235〜236行目付近）
    - `hasChanges`の判定から`stroke`と`strokeWidth`の比較を削除（255〜256行目）
    - スプレッド演算子での更新処理から`stroke`と`strokeWidth`を削除（277〜278行目）
- **実施結果**: 修正完了。

### [✓] textActions.test.tsの修正

- **編集ファイル**: `public/tests/actions/textActions.test.ts`
- **変更内容**: 
  - `createMockViewModel`のテキスト定義から`stroke`と`strokeWidth`を削除（39〜40行目）
  - `actionAddText`テストケースのnewText定義から`stroke`と`strokeWidth`を削除（97〜98行目、137〜138行目、174〜175行目）
  - `actionUpdateTextStyle`テストケースの全てのスタイルプロパティ更新テストから`stroke`と`strokeWidth`を削除（392〜404行目）
- **実施結果**: 修正完了。

### [✓] ビルドの確認（フェーズ1）

- **コマンド**: 
  1. `npm run generate` （型生成）
  2. `cd public && npm run build` （フロントエンドビルド）
  3. `cd .. && npm run build` （バックエンドビルド、ルートディレクトリで実行）
- **確認事項**: 
  - ビルドエラーが発生しないこと
  - 型定義が正しく生成されていること
- **実施結果**: ビルド成功。型定義も正しく生成されている。

### [✓] テストの実行（フェーズ1）

- **コマンド**: `npm run test`
- **確認事項**: 
  - 既存テストが全てパスすること
  - textActions.test.tsのテストが全てパスすること
- **実施結果**: 全てのテスト（100個）がパス。

---

## フェーズ2: ViewportPortal方式への移行・ビルド確認

### [✓] ERCanvas.tsxにテキスト描画関数を追加

- **実施結果**: `renderTexts`関数を追加。仕様書通りにすべてのスタイルを実装し、テキストをViewportPortal内で描画できるようにした。

### [✓] ERCanvas.tsxにテキストドラッグ処理を追加

- **実施結果**: `handleTextMouseDown`関数と`draggingText`状態を追加。マウスムーブ時にviewport.zoomを考慮した座標変換を行い、リアルタイムに位置を更新する実装を完成。

### [✓] ERCanvas.tsxにテキストリサイズハンドルを追加

- **実施結果**: `handleTextResize`関数を追加し、リサイズ完了時に`actionUpdateTextBounds`と`actionSetTextAutoSizeMode`を自動的にdispatchする実装を完成。

### [✓] ResizeHandlesコンポーネントの最小限の修正

- **実施結果**: propsに`x`と`y`を追加し、`rectangles`購読を削除。`renderRectangles`と`renderTexts`の両方で`x`と`y`を渡すように修正。

### [✓] ERCanvas.tsxのテキスト編集UI追加

- **実施結果**: `editingTextId`と`draftContent`のローカル状態を追加。F2キーで編集モード開始、Enter/Esc/Ctrl+Enterのキーボード操作、blur時の編集確定を実装。`autoSizeMode`に応じたDOM測定処理も実装。

### [✓] ERCanvas.tsxのhandleAddText修正

- **実施結果**: `stroke`と`strokeWidth`を削除。shadowのデフォルト値を仕様書通りに更新（offsetX: 2, offsetY: 2, blur: 4, opacity: 0.3）。

### [✓] ERCanvas.tsxのViewportPortal統合

- **実施結果**: 背面レイヤーと前面レイヤーの両方に`renderTexts`を追加。テキストと矩形が同じPortal内で正しくレンダリングされるようにした。

### [✓] ERCanvas.tsxからReact Flow関連のテキスト処理を削除

- **実施結果**: `TextNode`のimport、`nodeTypes`からの`textNode`、`convertToReactFlowTexts`のimport、`onNodeDragStop`内のテキストノード処理、`viewModelTexts`の購読とconvertToReactFlowTextsの呼び出しをすべて削除。

### [✓] TextNode.tsxコンポーネントの削除

- **実施結果**: `public/src/components/TextNode.tsx`を削除。ViewportPortal方式への移行により不要になった。

### [✓] reactFlowConverter.tsのconvertToReactFlowTexts関数を削除

- **実施結果**: `convertToReactFlowTexts`関数と`import type { TextBox }`を削除。

### [✓] TextPropertyPanel.tsxから枠線関連UIを削除

- **実施結果**: `showStrokePicker`状態、`handleStrokeChange`関数、`handleStrokeWidthChange`関数、枠線色セクション、枠線幅セクションを削除。

### [✓] TextPropertyPanel.tsxのDOM測定処理修正

- **実施結果**: `handleFitToContent`関数から`border`スタイル設定を削除。

### [✓] ビルドの確認（フェーズ2）

- **実施結果**: 
  - 型生成成功
  - フロントエンドビルド成功
  - バックエンドビルド成功
  - すべてのテスト（100個）がパス

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
