# タスク一覧

## 概要

仕様書 [spec/rearchitecture_overview.md](spec/rearchitecture_overview.md) で定義されたアプリケーション名称「RelavueER」への変更を実装に反映させる。

### 名称使用規約（仕様書より）

* UIでの表示：「RelavueER」
* ドキュメント：「RelavueER」
* パッケージ名：`relavue-er`（ハイフン区切り）
* Dockerイメージ名：`tkuni83/relavue-er`
* リポジトリ名：`er-viewer`（互換性のため維持）
* コード内の識別子：`erDiagram`, `ERCanvas` など（技術用語として「ER」を使用）

## タスク

### パッケージ名の変更

- [ ] **package.json（ルート）の変更**
  - ファイル: `package.json`
  - 変更内容:
    - `name` フィールドを `"er-viewer"` から `"relavue-er"` に変更
    - `description` フィールドを `"ER Diagram Viewer for MySQL databases"` から `"RelavueER - Database ER diagram reverse engineering and visualization tool"` に変更

- [ ] **public/package.json の変更**
  - ファイル: `public/package.json`
  - 変更内容:
    - `name` フィールドを `"er-viewer-frontend"` から `"relavue-er-frontend"` に変更

### UIでの表示変更

- [ ] **public/index.html のタイトル変更**
  - ファイル: `public/index.html`
  - 変更内容:
    - `<title>` タグの内容を `"ER Diagram Viewer"` から `"RelavueER"` に変更

- [ ] **App.tsx のヘッダー表示変更**
  - ファイル: `public/src/components/App.tsx`
  - 変更内容:
    - 170行目付近の `<h1>` タグの内容を `"ER Diagram Viewer"` から `"RelavueER"` に変更

### エクスポート/インポート機能のフォーマット名変更

- [ ] **erDiagramStore.ts のフォーマット名変更**
  - ファイル: `public/src/store/erDiagramStore.ts`
  - 変更内容:
    - 24行目付近の `format` フィールドの値を `'er-viewer'` から `'relavue-er'` に変更

- [ ] **exportViewModel.ts のファイル名プレフィックス変更**
  - ファイル: `public/src/utils/exportViewModel.ts`
  - 変更内容:
    - 67行目付近のコメントを `// ファイル名を生成（フォーマット: er-viewer-{YYYY-MM-DD}.json）` から `// ファイル名を生成（フォーマット: relavue-er-{YYYY-MM-DD}.json）` に変更
    - 72行目付近のファイル名プレフィックスを `er-viewer` から `relavue-er` に変更
      - 修正例: `` const fileName = `relavue-er-${year}-${month}-${day}.json`; ``

- [ ] **importViewModel.ts のフォーマット検証変更**
  - ファイル: `public/src/utils/importViewModel.ts`
  - 変更内容:
    - 10行目付近のコメントを `* - format フィールドが "er-viewer" であること` から `* - format フィールドが "relavue-er" であること` に変更
    - 61, 63, 64行目付近のエラーメッセージとフォーマット値を `'er-viewer'` から `'relavue-er'` に変更
      - 修正例: `throw new Error("Invalid format: expected 'relavue-er'");`
      - 修正例: `if (parsedData.format !== "relavue-er") {`

### コメントの変更

- [ ] **public/src/api/index.ts のコメント変更**
  - ファイル: `public/src/api/index.ts`
  - 変更内容:
    - 1行目のコメントを `// ER Viewer API Client` から `// RelavueER API Client` に変更

### ドキュメントの変更

- [ ] **README.md の変更**
  - ファイル: `README.md`
  - 変更内容:
    - 1行目のタイトルを `# ER Diagram Viewer` から `# RelavueER` に変更
    - 3行目の説明を `MySQL データベースからER図をリバースエンジニアリングし、ブラウザ上で可視化・編集できるツールです。` から `RelavueER（レラビューアー）は、データベースからER図をリバースエンジニアリングし、ブラウザ上で可視化・編集できるツールです。` に変更
    - 45, 58, 112行目付近のDockerコマンドのイメージ名を `tkuni83/er-viewer` から `tkuni83/relavue-er` に変更（既に仕様書では変更済みだが、README.mdも同様に変更）

### ビルド確認

- [ ] **バックエンドのビルド確認**
  - 実行コマンド: `npm run build`
  - 確認内容: エラーなくビルドが完了すること

- [ ] **TypeSpecコード生成の確認**
  - 実行コマンド: `npm run generate`
  - 確認内容: エラーなく型生成が完了すること

### テスト実行

- [ ] **テストの実行**
  - 実行コマンド: `npm run test`
  - 確認内容: すべてのテストがパスすること
  - 注意: エクスポート/インポートのフォーマット名変更により、既存のテストファイルが `'er-viewer'` を期待している場合は、テストコードも `'relavue-er'` に修正する必要がある

## 注意事項

* **リポジトリ名は変更しない**: 仕様書によると、リポジトリ名 `er-viewer` は互換性のため維持される
* **コード内の技術用語は変更しない**: `erDiagram`, `ERCanvas` などの識別子は技術用語として「ER」を使用し続ける
* **既存データとの互換性**: エクスポートファイルのフォーマット名を `'er-viewer'` から `'relavue-er'` に変更するため、古い形式でエクスポートされたファイルはインポートできなくなる可能性がある。必要に応じて下位互換性の対応を検討すること。

## 事前修正提案

特になし
