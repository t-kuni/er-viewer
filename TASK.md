# タスク一覧

## ステータス

**完了日時**: 2026-02-08

すべてのタスクが正常に完了しました。

## 概要

仕様書の更新内容に基づき、矩形とテキストの追加時の配置位置ロジックを変更するタスクを洗い出しました。

### 変更内容

- `spec/rectangle_drawing_feature.md`: 矩形追加時の配置位置を「viewport中央」から「マウスカーソル位置優先（フォールバック：viewport中央）」に変更
- `spec/text_drawing_feature.md`: テキスト追加時の配置位置を同様に変更
- 配置位置の決定ロジックは `spec/copy_paste_feature.md` の「ペースト位置の決定」と同じになります

### 関連仕様書

- [copy_paste_feature.md](./spec/copy_paste_feature.md)
- [rectangle_drawing_feature.md](./spec/rectangle_drawing_feature.md)
- [text_drawing_feature.md](./spec/text_drawing_feature.md)

## 実装タスク

### [x] 矩形追加機能の位置決定ロジック修正

**対象ファイル**: `public/src/components/ERCanvas.tsx`

**修正箇所**: `handleAddRectangle` 関数（964-979行目）

**変更内容**:
- 現状は固定座標 `x: 0, y: 0` を使用している（967-968行目にコメントあり）
- 以下のロジックに変更：
  1. マウス位置が記録されている場合（`lastMousePosition !== null`）：
     - `screenToFlowPosition` でスクリーン座標をキャンバス座標に変換
     - 変換後の座標を使用
  2. マウス位置が記録されていない場合（`lastMousePosition === null`）：
     - viewport中央を計算: `x = -viewport.x + (window.innerWidth / 2) / viewport.zoom`
     - viewport中央を計算: `y = -viewport.y + (window.innerHeight / 2) / viewport.zoom`

**参考実装**: 同ファイルの509-542行目のペースト処理に同様のロジックが実装済み

**必要な変数**:
- `lastMousePosition`: 既に使用可能（230行目で購読済み）
- `screenToFlowPosition`: 既に使用可能（190行目で取得済み）
- `viewport`: 既に使用可能（191行目で取得済み）

**実装結果**:
- `ERCanvasInner`内に`handleAddRectangleInner`を実装
- useRefを使用して`ERCanvas`のボタンクリックから呼び出せるように実装

### [x] テキスト追加機能の位置決定ロジック修正

**対象ファイル**: `public/src/components/ERCanvas.tsx`

**修正箇所**: `handleAddText` 関数（981-1024行目）

**変更内容**:
- 現状は固定座標 `x: 0, y: 0` を使用している（984-985行目にコメントあり）
- 矩形追加と同じロジックを実装：
  1. マウス位置が記録されている場合：`screenToFlowPosition` で変換
  2. マウス位置が記録されていない場合：viewport中央を計算

**参考実装**: 同ファイルの509-542行目のペースト処理

**実装結果**:
- `ERCanvasInner`内に`handleAddTextInner`を実装
- useRefを使用して`ERCanvas`のボタンクリックから呼び出せるように実装
- 矩形追加と同じ位置決定ロジックを使用

### [x] 実装方針の決定と修正

**選択肢1**: ハンドラーを `ERCanvasInner` に移動
- `handleAddRectangle` と `handleAddText` を `ERCanvasInner` 内に移動
- `onAddRectangle` と `onAddText` コールバックとして `ERCanvas` から `ERCanvasInner` に渡す
- ツールバーボタンのクリックイベントでコールバックを呼び出す

**選択肢2**: 位置計算ロジックを別関数で実装
- マウス位置と viewport を props として `ERCanvas` に渡す
- `handleAddRectangle` と `handleAddText` 内で位置を計算
- ただし、`screenToFlowPosition` は使用できないため、viewport変換ロジックを手動実装する必要がある

**推奨**: 選択肢1（ハンドラーを `ERCanvasInner` に移動）
- React Flow の API を直接使用できる
- コードの一貫性が保たれる（ペースト処理と同じ方法）
- viewport変換の手動実装が不要

**実装結果**:
1. `handleAddRectangleInner` と `handleAddTextInner` を `ERCanvasInner` 内にuseCallbackで実装
2. 位置決定ロジックを追加（ペースト処理と同じロジック）
3. useRefを使用して`ERCanvas`からこれらの関数を呼び出せるように実装
4. `ERCanvas`の`handleAddRectangle`と`handleAddText`でref経由で関数を呼び出し

### [x] ビルドの確認

**実行コマンド**: `npm run generate && npm run build`

**確認内容**:
- TypeScriptのコンパイルエラーがないこと
- 型エラーがないこと

**実行結果**:
- コード生成: 成功（npm run generate）
- ビルド: 成功（cd public && npm run build）
- TypeScriptコンパイルエラー: なし
- 型エラー: なし

### [x] テストの実行

**実行コマンド**: `npm run test`

**確認内容**:
- 既存のテストがすべてパスすること
- 特に `rectangleActions.test.ts`、`textActions.test.ts`、`clipboardActions.test.ts` が影響を受けないこと

**実行結果**:
- テスト結果: 264個のテスト全てパス
- rectangleActions.test.ts: 22テストパス
- textActions.test.ts: 44テストパス
- clipboardActions.test.ts: 17テストパス
- その他すべてのテストもパス

**注意**:
- 今回の変更はUI層のみのため、アクションのテストには影響しない
- UI層のテスト（`ERCanvas.tsx` のテスト）は現在存在しない可能性が高い
- 新規テストの追加は本タスクのスコープ外

## フェーズ分け

今回の変更は単一ファイル（`ERCanvas.tsx`）の修正のみで、ファイル数が少ないためフェーズ分けは不要です。

1フェーズで以下を実施：
- 実装
- ビルド確認
- テスト実行

## 補足事項

### 既存の実装との整合性

- ペースト機能（`actionPasteItem`）では既に同じロジックが実装されている
- 今回の変更により、矩形追加、テキスト追加、ペーストの3つの機能で同じ位置決定ロジックが使用される
- 仕様書の意図通り、一貫したユーザー体験を提供できる

### マウス位置の記録

- `GlobalUIState.lastMousePosition` は既に実装済み（`actionUpdateMousePosition`）
- キャンバスの `onMouseMove` イベントで更新される（264-266行目）
- ページ読み込み直後は `null`（マウス位置未記録）

### 座標変換

- `screenToFlowPosition`: スクリーン座標をキャンバス座標に変換する React Flow の API
- viewport の `x`, `y`, `zoom` を自動的に考慮

### デフォルト値

矩形のデフォルト値（変更なし）:
- サイズ: 幅200px × 高さ150px
- 背景色: `#E3F2FD`
- 枠線色: `#90CAF9`
- 枠線幅: 2px
- 不透明度: 1.0

テキストのデフォルト値（変更なし）:
- サイズ: 幅200px × 高さ80px
- content: "テキスト"
- fontSize: 16px
- lineHeight: 24px
- その他のプロパティは仕様書通り
