# 複数データベース対応仕様

## 概要

MySQL以外のデータベース（PostgreSQL等）からもリバースエンジニアリングできるようにする。

## 対応データベース

### 初期対応

- MySQL 8.x（既存）
- PostgreSQL 14.x以降（新規追加）

### 将来の拡張候補

- Oracle Database
- Microsoft SQL Server
- SQLite

## アーキテクチャ設計

### 基本方針

- DB固有部分（接続・メタ情報取得SQL）と共通部分（ERData生成）を分離
- 既存DatabaseManagerを"オーケストレータ（Facade）"に寄せ、DBごとの実装はAdapterに逃がす
- DatabaseType（TypeSpec既存enum）でFactory生成する

参考: [research/20260207_1310_postgresql_support.md](/research/20260207_1310_postgresql_support.md)

### DatabaseAdapter インターフェース

DB固有の処理を抽象化するインターフェース。

```typescript
interface DatabaseAdapter {
  readonly type: "mysql" | "postgresql";
  
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  
  // スキーマ情報取得
  getTables(params?: { schema?: string }): Promise<Array<{ name: string; schema?: string }>>;
  getTableColumns(table: TableRef): Promise<Column[]>;
  getForeignKeys(table: TableRef): Promise<ForeignKey[]>;
  getTableDDL(table: TableRef): Promise<string>;
}
```

※ `Column`、`ForeignKey`などの型定義は [scheme/main.tsp](/scheme/main.tsp) を参照。

### ディレクトリ構成

```
lib/
  database/
    DatabaseManager.ts         # Facade（既存を改修）
    DatabaseAdapterFactory.ts  # Factory
    ERDataBuilder.ts          # 共通のERData生成ロジック
    adapters/
      DatabaseAdapter.ts       # インターフェース定義
      mysql/
        MySqlAdapter.ts        # MySQL実装
      postgres/
        PostgresAdapter.ts     # PostgreSQL実装
        PgDumpExecutor.ts      # pg_dump実行モジュール（テスト用にモック化可能）
```

## PostgreSQL対応の詳細

### スキーマ情報取得

PostgreSQLのスキーマ情報取得には`information_schema`を使用する。

- テーブル一覧: `information_schema.tables`
- カラム情報: `information_schema.columns`
- 主キー/ユニーク制約: `information_schema.table_constraints` + `key_column_usage`
- 外部キー: `information_schema.referential_constraints` + `key_column_usage`

詳細なクエリは [research/20260207_1310_postgresql_support.md](/research/20260207_1310_postgresql_support.md) の3章を参照。

### DDL取得

PostgreSQLのDDL取得には`pg_dump`コマンドを使用する。

- `pg_dump --schema-only --table=<schema>.<table>`で特定テーブルのDDLを取得
- `PgDumpExecutor`モジュールとして独立させ、テストではモック化する
- 環境にpg_dumpが存在しない場合はエラーを返す

### schema概念の扱い

- PostgreSQLは`database`の中に`schema`（例: public）を持つ
- 接続情報として`schema`を指定可能にする（デフォルト: `public`）
- MySQLの場合は`schema`フィールドを無視する

## データ構造の変更

### 変更方針

参考: [research/20260207_1358_data_structure_redesign.md](/research/20260207_1358_data_structure_redesign.md)

- 現状のER図表示に必要な最小限の情報のみを保持
- UIに表示しない情報（型、nullable等）は削除
- 差分検出（増分リバースエンジニアリング）は継続してサポート

### 変更内容

**Column型の簡素化**
- `type`, `nullable`, `default`, `extra`を削除
- UI表示に必要な`id`, `name`, `key`, `isForeignKey`のみを保持

**Entity.foreignKeysの廃止**
- `Entity.foreignKeys`を削除
- `Relationship`のみで外部キー情報を管理

**ColumnSnapshotの簡素化**
- 差分検出対象を`key`と`isForeignKey`のみに限定

型定義の詳細は [scheme/main.tsp](/scheme/main.tsp) を参照。

### ERData型の拡張

データソース情報（`DataSourceRef`）を追加する。詳細は [scheme/main.tsp](/scheme/main.tsp) を参照。

## フロントエンド対応

### データベース接続モーダル

変更箇所: `public/src/components/DatabaseConnectionModal.tsx`

**Database Type選択**
- 固定テキスト「MySQL」を`<select>`に変更
- 選択肢: `mysql`, `postgresql`

**schema入力欄（PostgreSQLのみ）**
- Database Typeが`postgresql`の場合のみ表示
- デフォルト値: `public`

**ポートのデフォルト値変更**
- Database Type選択に応じて自動調整
  - MySQL: `3306`
  - PostgreSQL: `5432`

**警告メッセージ追加**
- 「information_schemaを参照するためルートユーザでの実行を推奨します」
- MySQLとPostgreSQLの両方に表示

## テスト方針

詳細は [spec/backend_test_strategy.md](/spec/backend_test_strategy.md) を参照。

### 基本方針

- Docker Composeで起動したMySQL/PostgreSQLに接続してテスト
- 既存のテスト方法を踏襲（参照専用、書き込みなし）

### テスト対象

**Usecaseレベルのテスト**
- `ReverseEngineerUsecase.test.ts`にPostgreSQL用のテストケースを追加
- MySQLとPostgreSQLで同じ構造のテーブルをテスト

**PgDumpExecutorのモック化**
- Usecaseテストでは`PgDumpExecutor`をモック化
- モックは正常系のDDL文字列を返す

### テストデータ

- MySQL: `init.sql`（既存）
- PostgreSQL: `init-postgres.sql`（既存）

## 接続設定

詳細は [spec/database_connection_settings.md](/spec/database_connection_settings.md) を参照。

### データ型の拡張

PostgreSQL対応のため、以下の型に`schema`フィールドを追加：
- `ReverseEngineerRequest`
- `DatabaseConnectionState`

型定義の詳細は [scheme/main.tsp](/scheme/main.tsp) を参照。

## 移行手順

### 段階的な実装

1. **抽象インターフェース導入**
   - `DatabaseAdapter`インターフェース作成
   - 既存MySQL実装を`MySqlAdapter`に移植

2. **共通ERData生成を`ERDataBuilder`に移動**
   - 既存`DatabaseManager.generateERData()`の中身を移動

3. **`DatabaseManager`をFacade化**
   - `connect(config)`で`createAdapter(config.type)`を呼び出し
   - `generateERData()`は`ERDataBuilder`に委譲

4. **PostgresAdapter追加**
   - スキーマ取得SQLを実装
   - PgDumpExecutor実装

5. **Usecase/Route更新**
   - `ReverseEngineerRequest`の`schema`を`DatabaseManager`に渡す

6. **フロントエンド更新**
   - モーダルにDatabase Type選択とschema入力を追加

## 関連仕様書

- [scheme/main.tsp](/scheme/main.tsp) - 型定義
- [spec/database_connection_settings.md](/spec/database_connection_settings.md) - データベース接続設定
- [spec/reverse_engineering.md](/spec/reverse_engineering.md) - リバースエンジニアリング機能
- [spec/backend_test_strategy.md](/spec/backend_test_strategy.md) - テスト戦略
- [research/20260207_1310_postgresql_support.md](/research/20260207_1310_postgresql_support.md) - PostgreSQL対応のリサーチ結果
- [research/20260207_1358_data_structure_redesign.md](/research/20260207_1358_data_structure_redesign.md) - データ構造再設計のリサーチ結果
