# TypeSpec API定義仕様

## 概要

ER Viewer APIの型定義とスキーマ生成にTypeSpecを使用する。TypeSpecからOpenAPI仕様とTypeScriptクライアントコードを自動生成することで、フロントエンドとバックエンド間の型安全性を確保する。

## ファイル構成

```
scheme/
├── main.tsp          # TypeSpec API定義
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

### TypeScriptクライアント
- `public/src/api/client/` - 自動生成されるクライアントコード
  - 型定義
  - APIクライアント関数
  - リクエスト/レスポンス型

## 開発フロー

1. `scheme/main.tsp` でAPI仕様を定義・更新
2. `tsp compile` でOpenAPI仕様を生成
3. `openapi-typescript-codegen` でTypeScriptクライアントを生成
4. フロントエンドで生成されたクライアントコードを使用

## 注意事項

- TypeSpec定義を変更した場合は必ずクライアントコードの再生成が必要
- 生成されたファイルは手動編集しない（次回生成時に上書きされるため）
- APIの破壊的変更を行う場合は、フロントエンドコードの対応も必要
