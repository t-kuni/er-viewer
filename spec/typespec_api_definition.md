# TypeSpec API定義仕様

## 概要

ER Viewer APIの型定義とスキーマ生成にTypeSpecを使用する。TypeSpecからOpenAPI仕様とTypeScriptクライアントコードを自動生成することで、フロントエンドとバックエンド間の型安全性を確保する。

**重要**: 型は `scheme/main.tsp` で包括的に管理している。フロントエンドとバックエンドで共通の型定義を使用することで、API通信の型安全性を保証する。

## ファイル構成

```
scheme/
├── main.tsp          # TypeSpec API定義（すべての型を包括的に管理）
├── tspconfig.yaml    # TypeSpec設定ファイル
```

## 設定ファイル

### tspconfig.yaml

- OpenAPI3形式での出力を設定

## ビルドプロセス

### 1. OpenAPI仕様生成

```bash
tsp compile scheme/main.tsp
```

このコマンドにより `scheme/openapi.yaml` が生成される。

### 2. TypeScriptクライアント生成

```bash
npx openapi-typescript-codegen --input scheme/openapi.yaml --output public/src/api/client
```

このコマンドにより `public/src/api/client/` 配下にTypeScriptクライアントコードが生成される。

## 生成されるファイル

### OpenAPI仕様ファイル
- `scheme/openapi.yaml` - OpenAPI 3.0仕様

### フロントエンド用TypeScriptクライアント
- `public/src/api/client/` - 自動生成されるクライアントコード（フロントエンドで使用）
  - 型定義
  - APIクライアント関数
  - リクエスト/レスポンス型

### バックエンド用TypeScript型定義
- `lib/generated/` - 自動生成される型定義（バックエンドで使用）
  - APIリクエスト/レスポンスの型定義
  - ビジネスロジックで使用する共通型

## 開発フロー

1. `scheme/main.tsp` でAPI仕様を定義・更新
2. `npm run generate` でコード生成（以下を実行）
   - `tsp compile` でOpenAPI仕様を生成
   - `openapi-typescript-codegen` でフロントエンド用TypeScriptクライアントを生成（`public/src/api/client/`）
   - バックエンド用TypeScript型定義を生成（`lib/generated/`）
3. フロントエンドで生成されたクライアントコード（`public/src/api/client/`）を使用
4. バックエンドで生成された型定義（`lib/generated/`）を使用

## 注意事項

- TypeSpec定義を変更した場合は必ずクライアントコードの再生成が必要
- 生成されたファイルは手動編集しない（次回生成時に上書きされるため）
- APIの破壊的変更を行う場合は、フロントエンドコードの対応も必要
