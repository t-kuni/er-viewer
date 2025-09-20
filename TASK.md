# ER Viewer TypeScriptビルドツール移行タスク一覧

## 概要

仕様書（`spec/rearchitecture_overview.md`）の更新により、TypeScriptビルドツールを以下のように変更する必要があります：
- `ts-node-dev` → `tsx`（開発時実行）
- 新規追加：`tsup`（本番ビルド）
- 新規追加：`concurrently`（並列実行）
- TypeScript設定の分離（`tsconfig.base.json`、`tsconfig.server.json`）

## 1. 依存関係の更新

### 1.1 新しい依存関係の追加
- [ ] **tsx、tsup、concurrentlyのインストール**
  - `npm install -D tsx tsup concurrently`の実行
  - 参照: `spec/rearchitecture_overview.md` L261

### 1.2 古い依存関係の削除
- [ ] **ts-node、ts-node-dev、nodemonの削除**
  - `npm uninstall ts-node ts-node-dev nodemon`の実行
  - package.jsonからの依存関係削除確認
  - 参照: `spec/rearchitecture_overview.md` L265

## 2. package.json（ルート）の更新

### 2.1 スクリプトの更新
- [ ] **devスクリプトの変更**
  - 現在: `NODE_ENV=development node --loader ts-node/esm server.ts`
  - 変更後: `concurrently "tsx watch --clear-screen=false server.ts" "npm run --prefix public dev"`
  - 参照: `spec/rearchitecture_overview.md` L274

- [ ] **buildスクリプトの変更**
  - 現在: `node scripts/generate-build-info.js && echo 'Build completed'`
  - 変更後: `tsup server.ts --format esm,cjs && npm run --prefix public build`
  - 参照: `spec/rearchitecture_overview.md` L275

- [ ] **startスクリプトの変更**
  - 現在: `node --loader ts-node/esm server.ts`
  - 変更後: `node dist/server.js`
  - 参照: `spec/rearchitecture_overview.md` L276

- [ ] **typecheckスクリプトの追加**
  - `tsc -p tsconfig.server.json --noEmit && tsc -p public/tsconfig.json --noEmit`の追加
  - 参照: `spec/rearchitecture_overview.md` L277

## 3. TypeScript設定の分離・最適化

### 3.1 tsconfig.base.json（新規作成）
- [ ] **共通TypeScript設定ファイルの作成**
  - ES2022、ESNext、bundlerモジュール解決の設定
  - 厳密な型チェック設定
  - パスエイリアス設定（`@/*`）
  - 参照: `spec/rearchitecture_overview.md` L290-305

### 3.2 tsconfig.server.json（新規作成）
- [ ] **バックエンド用TypeScript設定の作成**
  - `tsconfig.base.json`を継承
  - サーバー専用の設定（outDir、rootDir、types）
  - include/excludeの適切な設定
  - 参照: `spec/rearchitecture_overview.md` L307-318

### 3.3 既存tsconfig.jsonの調整
- [ ] **ルートtsconfig.jsonの削除または調整**
  - 現在の統合設定から分離設定への移行
  - 必要に応じて削除または簡素化

### 3.4 public/tsconfig.jsonの更新
- [ ] **フロントエンド用TypeScript設定の更新**
  - `../tsconfig.base.json`を継承
  - フロントエンド専用設定の追加
  - パスエイリアス設定の調整
  - 参照: `spec/rearchitecture_overview.md` L320-336

## 4. Vite設定の更新

### 4.1 public/vite.config.tsの更新
- [ ] **Docker環境対応設定の追加**
  - `server.watch.usePolling: true`の設定
  - `host: '0.0.0.0'`の設定
  - ポート5173の明示的設定
  - 参照: `spec/rearchitecture_overview.md` L338-350

## 5. Docker設定の更新

### 5.1 docker-compose.ymlの更新
- [ ] **コマンドの変更**
  - 現在: デフォルト（CMD指定）
  - 変更後: `["npm", "run", "dev"]`の明示的指定
  - 参照: `spec/rearchitecture_overview.md` L367

- [ ] **develop.watchセクションの追加**
  - Docker Compose v2.22+対応のwatch機能設定
  - ファイル同期とignore設定
  - 参照: `spec/rearchitecture_overview.md` L368-376

### 5.2 Dockerfile.devの調整確認
- [ ] **開発環境Dockerfileの確認**
  - 新しいnpmスクリプトとの互換性確認
  - 必要に応じて調整

## 6. 実装・テスト

### 6.1 TypeScript型チェックの実行
- [ ] **全ファイルの型エラー修正**
  - `npm run typecheck`の実行
  - 型エラーの修正
  - 新しい設定での型チェック確認

### 6.2 開発環境ビルド確認
- [ ] **開発環境での動作確認**
  - `docker compose up`でのコンテナ起動確認
  - フロントエンド・バックエンド並列起動の確認
  - ホットリロード動作確認（tsx watch、vite）

### 6.3 本番ビルド確認
- [ ] **本番ビルドの確認**
  - `npm run build`の実行確認
  - tsupによるesbuildベースビルドの確認
  - dist/ディレクトリの出力確認
  - `npm start`での起動確認

## 7. オプション機能（統合オプション）

### 7.1 vite-plugin-node導入の検討
- [ ] **vite-plugin-nodeの評価**
  - より統一的な開発環境の検討
  - `vite-plugin-node`の依存関係追加
  - プロジェクト直下vite.config.tsの作成
  - 参照: `spec/rearchitecture_overview.md` L378-402

## 注意事項

- 現在のES Modules（`"type": "module"`）設定を維持
- 既存の機能（API、DB接続等）に影響を与えないよう注意
- 段階的な移行を行い、各ステップで動作確認を実施
- 移行完了後、不要なファイル・設定の削除を実施

## 参照

- 仕様書: `spec/rearchitecture_overview.md`（L251-402: 移行手順）
- 現在の設定: `package.json`, `tsconfig.json`, `public/tsconfig.json`
- Docker設定: `docker-compose.yml`, `Dockerfile.dev`
