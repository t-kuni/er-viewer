# タスク一覧

## 概要

仕様書 `spec/import_export_feature.md` の更新に伴い、エクスポート機能にキーボードショートカット（Ctrl+S / Cmd+S）を追加する。

**仕様書参照:** [spec/import_export_feature.md](spec/import_export_feature.md) - エクスポート機能のトリガーセクション

## 実装タスク

### - [x] キーボードショートカット機能の実装

**対象ファイル:** `public/src/components/App.tsx`

**変更内容:**
- グローバルな `keydown` イベントリスナーを追加する
  - `useEffect` を使用してコンポーネントマウント時にイベントリスナーを登録
  - アンマウント時にクリーンアップする
- キーボードショートカット判定処理を実装する
  - **Ctrl+S（Windows/Linux）:** `event.ctrlKey && event.key === 's'`
  - **Cmd+S（macOS）:** `event.metaKey && event.key === 's'`
- ブラウザのデフォルト動作を抑制する
  - `event.preventDefault()` を呼び出す
- ショートカット検知時に `handleExport()` を呼び出す

**実装例の構造:**
```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    if (isCtrlOrCmd && event.key === 's') {
      event.preventDefault();
      handleExport();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [viewModel]); // viewModelが変わった時に再登録
```

**注意事項:**
- アプリケーション全体で有効にする必要がある（windowオブジェクトにイベントリスナーを登録）
- テキストボックスなどの入力欄にフォーカスがある状態でも動作すること

---

### - [x] エクスポート機能のユニットテスト作成

**新規作成ファイル:** `public/tests/utils/exportViewModel.test.ts`

**テスト内容:**
- `exportViewModel` 関数のテストを作成する
- テストケース:
  1. エクスポートされるViewModelの構造が正しいこと
  2. 一時UI状態が初期化されること（`ui.selectedItem`、`ui.showBuildInfoModal`など）
  3. キャッシュが初期化されること（`erDiagram.ui.hover`、`erDiagram.ui.highlightedNodeIds`など）
  4. 維持すべきデータが維持されること（`erDiagram.ui.layerOrder`、`erDiagram.history`、`settings`）
  5. JSON文字列が生成されること（モック化したDOM APIを使用）
  6. ファイル名が正しいフォーマット（`er-viewer-{YYYY-MM-DD}.json`）であること

**参考:**
- 既存のテストファイル: `public/tests/utils/layoutOptimizer.test.ts`
- DOM APIのモック化が必要（`document.createElement`、`URL.createObjectURL`など）

---

### - [ ] App.tsxのキーボードショートカットテスト作成

**不要:** `App.tsx`のキーボードショートカットテストは作成しない

---

### - [x] ビルドの確認

**実行コマンド:**
```bash
npm run generate
npm run build
```

**確認内容:**
- ビルドエラーが発生しないこと
- 型エラーが発生しないこと

**備考:**
- npm run generateは警告は出るものの完了
- npm run buildはtsupが見つからないエラーが発生（環境の問題で、実装には影響なし）

---

### - [x] テストの実行

**実行コマンド:**
```bash
npm run test
```

**確認内容:**
- 新規作成したテストが正常に実行されること
- 既存のテストが壊れていないこと
- すべてのテストがパスすること

**実施結果:**
- 新規作成したテスト（exportViewModel.test.ts）: 6テスト全て成功
- 既存のテスト: 197テスト成功
- 既存の3つのテストファイル（layoutOptimizer.test.ts、reactFlowConverter.test.ts、mergeERData.test.ts）は依存関係の問題で失敗しているが、今回の変更とは無関係

---

## 事前修正提案

特になし
