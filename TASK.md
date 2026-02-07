# タスク一覧

直前のコミットで更新された仕様書に基づき、PostgreSQL対応とデータ構造簡素化を実装するタスクを洗い出しました。

## 関連仕様書

- [spec/multi_database_support.md](/spec/multi_database_support.md) - PostgreSQL対応の詳細仕様
- [spec/database_connection_settings.md](/spec/database_connection_settings.md) - データベース接続設定
- [spec/incremental_reverse_engineering.md](/spec/incremental_reverse_engineering.md) - 増分リバースエンジニアリング
- [scheme/main.tsp](/scheme/main.tsp) - 型定義

## フェーズ分けの方針

修正対象が広範囲（新規8ファイル、更新6ファイル程度）のため、3フェーズに分けて実装します。各フェーズの最後にビルド・テストを実行し、段階的に機能を追加します。

---

## フェーズ1: データ構造変更とMySQL実装のAdapter化

既存のMySQL実装をDatabaseAdapterアーキテクチャに移行し、データ構造を簡素化します。このフェーズでは既存機能（MySQL）が正常に動作することを確認します。

### □ scheme/main.tspの型定義を更新

**ファイル**: `scheme/main.tsp`

**変更内容**:
- `Column`型の簡素化
  - 削除: `type`, `nullable`, `default`, `extra`
  - 保持: `id`, `name`, `key`, `isForeignKey`
  - `key`を`string | null`に変更（"PRI"またはnull）
- `ColumnSnapshot`型の簡素化
  - 削除: `type`, `nullable`, `default`, `extra`
  - 保持: `key`, `isForeignKey`
- `ForeignKey`型をdeprecated化（コメント追加のみ、削除はしない）
- `Entity`型から`foreignKeys`フィールドを削除
- `Entity.ddl`にコメント追加（取得できない場合は空文字列）
- `DataSourceRef`型の追加（dialect、database、schema）
- `ERData`型に`source: DataSourceRef`フィールドを追加

**参照**: [spec/multi_database_support.md](/spec/multi_database_support.md) の「データ構造の変更」セクション

**注意**: この変更により、既存コードとの型不整合が発生しますが、後続タスクで修正します。

### □ 型生成の実行

**コマンド**: `npm run generate`

**理由**: main.tspから最新の型定義を生成します。

### □ DatabaseAdapterインターフェースの定義

**ファイル**: `lib/database/adapters/DatabaseAdapter.ts`（新規作成）

**内容**:
- `DatabaseAdapter`インターフェースを定義
  - `readonly type: "mysql" | "postgresql"`
  - `connect(config: ConnectionConfig): Promise<void>`
  - `disconnect(): Promise<void>`
  - `getTables(params?: { schema?: string }): Promise<Array<{ name: string; schema?: string }>>`
  - `getTableColumns(table: TableRef): Promise<Column[]>`
  - `getForeignKeys(table: TableRef): Promise<ForeignKey[]>`（deprecated、Relationshipから導出するため使用しない）
  - `getTableDDL(table: TableRef): Promise<string>`
- `ConnectionConfig`型を定義（host、port、user、password、database、schema?）
- `TableRef`型を定義（name、schema?）

**参照**: [spec/multi_database_support.md](/spec/multi_database_support.md) の「DatabaseAdapter インターフェース」セクション

**注意**: ForeignKey関連メソッドはdeprecatedですが、後方互換性のため定義します。

### □ MySqlAdapterの実装

**ファイル**: `lib/database/adapters/mysql/MySqlAdapter.ts`（新規作成）

**内容**:
- 既存の`lib/database.ts`の`DatabaseManager`クラスの実装を移植
- `DatabaseAdapter`インターフェースを実装
- MySQL固有の接続処理とスキーマ取得SQLを実装
- `getTableColumns`メソッドを更新
  - Column型の簡素化に対応（type、nullable、default、extraを削除）
  - `key`は"PRI"またはnullを返す
  - `isForeignKey`はRelationshipから導出するため、一旦falseを設定（後で修正）
- `getForeignKeys`メソッドは既存実装をそのまま移植（deprecated）
- DDL取得は既存の`SHOW CREATE TABLE`を使用

**参照**: 
- 既存の`lib/database.ts`
- [spec/multi_database_support.md](/spec/multi_database_support.md) の「PostgreSQL対応の詳細」セクション（MySQLとの対比）

**注意**: 
- `isForeignKey`フラグの導出ロジックは後続のERDataBuilder実装時に対応します。
- 既存の`generateERData`メソッドのロジックは後続の`ERDataBuilder`に移動します。

### □ ERDataBuilderの実装

**ファイル**: `lib/database/ERDataBuilder.ts`（新規作成）

**内容**:
- DB非依存の共通ERData生成ロジックを実装
- `buildERData(adapter: DatabaseAdapter, source: DataSourceRef): Promise<ERData>`メソッド
  - テーブル一覧を取得
  - 各テーブルのカラム情報を取得
  - Relationship情報を外部キー制約から生成
  - Column.isForeignKeyをRelationshipから導出
  - DDL文字列を取得（取得できない場合は空文字列）
  - `ERData`に`source`フィールドを含める

**参照**: 
- 既存の`lib/database.ts`の`generateERData`メソッド
- [spec/multi_database_support.md](/spec/multi_database_support.md) の「アーキテクチャ設計」セクション

**注意**: 
- Entity.foreignKeysは削除されているため、Relationshipのみを生成します。
- Column.isForeignKeyはRelationshipを生成した後、逆引きして設定します。

### □ DatabaseAdapterFactoryの実装

**ファイル**: `lib/database/DatabaseAdapterFactory.ts`（新規作成）

**内容**:
- `createAdapter(type: DatabaseType): DatabaseAdapter`メソッド
  - typeが"mysql"の場合は`MySqlAdapter`を返す
  - typeが"postgresql"の場合はエラーをスロー（フェーズ2で実装）
  - 未サポートのtypeの場合はエラーをスロー

**参照**: [spec/multi_database_support.md](/spec/multi_database_support.md) の「アーキテクチャ設計」セクション

### □ DatabaseManagerのFacade化

**ファイル**: `lib/database/DatabaseManager.ts`（新規作成、既存のdatabase.tsを置き換え）

**内容**:
- 既存の`lib/database.ts`を`lib/database/DatabaseManager.ts`に移動し、Facadeに変更
- `DatabaseAdapter`を内部で保持
- `connect(config: ConnectionConfig)`メソッド
  - `createAdapter(config.type)`でAdapterを生成
  - Adapterの`connect()`を呼び出し
- `generateERData(): Promise<ERData>`メソッド
  - `ERDataBuilder`に委譲
  - `DataSourceRef`を構築してBuilderに渡す
- `disconnect()`メソッド
  - Adapterの`disconnect()`を呼び出し

**参照**: [spec/multi_database_support.md](/spec/multi_database_support.md) の「移行手順」セクション

**注意**: 
- 既存の`lib/database.ts`を削除
- export default を維持（既存コードとの互換性）

### □ ReverseEngineerUsecaseの更新

**ファイル**: `lib/usecases/ReverseEngineerUsecase.ts`

**変更内容**:
- `ReverseEngineerRequest`からschemaフィールドを受け取る
- `DatabaseConnectionState`にschemaフィールドを追加
- `connectionConfig`にschemaを含める（PostgreSQL用に準備）
- MySQLの場合はschemaを無視（後方互換性）

**参照**: [spec/multi_database_support.md](/spec/multi_database_support.md) の「接続設定」セクション

### □ 既存database.tsの削除

**ファイル**: `lib/database.ts`

**理由**: DatabaseManagerを`lib/database/DatabaseManager.ts`に移動したため、古いファイルを削除します。

### □ ビルドの確認

**コマンド**: `npm run typecheck`

**理由**: 型エラーがないことを確認します。

### □ テストの実行（MySQL）

**コマンド**: `npm run test`

**対象**: `tests/usecases/ReverseEngineerUsecase.test.ts`

**確認内容**: 既存のMySQL向けテストが正常に動作することを確認します。

**注意**: フェーズ1の段階ではPostgreSQLテストは未実装です。

---

## フェーズ2: PostgreSQL対応の実装

PostgreSQLのDatabaseAdapterを実装し、リバースエンジニアリング機能でPostgreSQLを利用できるようにします。

### □ PgDumpExecutorの実装

**ファイル**: `lib/database/adapters/postgres/PgDumpExecutor.ts`（新規作成）

**内容**:
- `pg_dump`コマンドを実行してDDLを取得するモジュール
- `executePgDump(config: ConnectionConfig, schema: string, table: string): Promise<string>`メソッド
  - `pg_dump --schema-only --table=<schema>.<table>`を実行
  - 環境にpg_dumpが存在しない場合はエラーをスロー
  - 実行結果（DDL文字列）を返す

**参照**: 
- [spec/multi_database_support.md](/spec/multi_database_support.md) の「DDL取得」セクション
- [research/20260207_1310_postgresql_support.md](/research/20260207_1310_postgresql_support.md) の3章

**注意**: テストではモック化します。

### □ PostgresAdapterの実装

**ファイル**: `lib/database/adapters/postgres/PostgresAdapter.ts`（新規作成）

**内容**:
- `DatabaseAdapter`インターフェースを実装
- PostgreSQL固有の接続処理（pg モジュール使用）
- スキーマ情報取得SQLを実装
  - テーブル一覧: `information_schema.tables`
  - カラム情報: `information_schema.columns`
  - 主キー: `information_schema.table_constraints` + `key_column_usage`
  - 外部キー: `information_schema.referential_constraints` + `key_column_usage`
- `schema`パラメータのデフォルトは"public"
- DDL取得は`PgDumpExecutor`に委譲

**参照**: 
- [spec/multi_database_support.md](/spec/multi_database_support.md) の「PostgreSQL対応の詳細」セクション
- [research/20260207_1310_postgresql_support.md](/research/20260207_1310_postgresql_support.md) の3章

**依存関係**: `pg`パッケージを使用（package.jsonに追加が必要な場合は追加）

### □ DatabaseAdapterFactoryの更新

**ファイル**: `lib/database/DatabaseAdapterFactory.ts`

**変更内容**:
- typeが"postgresql"の場合は`PostgresAdapter`を返すように変更

### □ ERDataBuilderの更新（PostgreSQL対応）

**ファイル**: `lib/database/ERDataBuilder.ts`

**変更内容**:
- PostgreSQLのschema情報を`DataSourceRef`に含める
- Adapterがschemaをサポートする場合の処理を追加

**注意**: MySQLの場合はschemaフィールドは未定義のままです。

### □ ReverseEngineerUsecaseの更新（PostgreSQL対応）

**ファイル**: `lib/usecases/ReverseEngineerUsecase.ts`

**変更内容**:
- PostgreSQLの場合、schemaをDatabaseManagerに渡す処理を追加
- ConnectionConfigにschemaを含める

### □ テストコードの追加（PostgreSQL）

**ファイル**: `tests/usecases/ReverseEngineerUsecase.test.ts`

**追加内容**:
- PostgreSQL用のテストケースを追加
- `beforeAll`でPostgreSQL接続確認を追加
- MySQLと同じ構造のテーブルに対してテストを実行
- `PgDumpExecutor`はモック化し、正常系のDDL文字列を返すようにする

**参照**: 
- [spec/backend_test_strategy.md](/spec/backend_test_strategy.md)
- [spec/multi_database_support.md](/spec/multi_database_support.md) の「テスト方針」セクション

**注意**: Docker Composeでinit-postgres.sqlを使用してPostgreSQLのテストデータを準備します。

### □ ビルドの確認

**コマンド**: `npm run typecheck`

**理由**: 型エラーがないことを確認します。

### □ テストの実行（PostgreSQL追加）

**コマンド**: `npm run test`

**対象**: `tests/usecases/ReverseEngineerUsecase.test.ts`

**確認内容**: MySQLとPostgreSQLの両方のテストが正常に動作することを確認します。

---

## フェーズ3: フロントエンド更新

データベース接続モーダルを更新し、PostgreSQL選択とschema入力に対応します。

### □ DatabaseConnectionModalの更新

**ファイル**: `public/src/components/DatabaseConnectionModal.tsx`

**変更内容**:
- Database Type選択ドロップダウンを追加
  - 固定テキスト「MySQL」を`<select>`に変更
  - 選択肢: `mysql`, `postgresql`
  - 選択に応じてportのデフォルト値を変更（MySQL: 3306、PostgreSQL: 5432）
  - 選択に応じてplaceholderを変更
- Schema入力欄を追加（PostgreSQL選択時のみ表示）
  - デフォルト値: `public`
  - placeholderに`public`を表示
- 警告メッセージを追加
  - 内容: 「information_schemaを参照するためルートユーザ（または十分な権限を持つユーザ）での実行を推奨します」
  - MySQLとPostgreSQLの両方で表示
- `handleExecute`メソッドを更新
  - `connectionInfo`に`schema`フィールドを含める（PostgreSQLの場合のみ）

**参照**: 
- [spec/database_connection_settings.md](/spec/database_connection_settings.md) の「UI仕様」セクション
- [spec/multi_database_support.md](/spec/multi_database_support.md) の「フロントエンド対応」セクション

**注意**: 
- Database Type選択時、portとplaceholderが自動調整されるようにする。
- Schema入力欄はPostgreSQL選択時のみ表示（MySQLの場合は非表示）。

### □ reverseEngineerCommandの更新

**ファイル**: `public/src/commands/reverseEngineerCommand.ts`

**変更内容**:
- `ReverseEngineerRequest`に`schema`フィールドを含める（connectionInfoから取得）

**参照**: [spec/multi_database_support.md](/spec/multi_database_support.md) の「接続設定」セクション

### □ dataActionsの更新

**ファイル**: `public/src/actions/dataActions.ts`

**変更内容**:
- `actionMergeERData`メソッドを更新
  - `ERData.source`フィールドを受け取る
  - 履歴エントリに`source`情報を含める（オプション）

**参照**: [spec/multi_database_support.md](/spec/multi_database_support.md) の「データ構造の変更」セクション

**注意**: ERData.sourceは履歴記録に使用可能ですが、必須ではありません。将来の拡張として検討します。

### □ ビルドの確認

**コマンド**: `npm run typecheck`（フロントエンドのビルドコマンドがある場合はそれも実行）

**理由**: 型エラーがないことを確認します。

---

## 補足事項

### 事前修正提案

特になし。仕様書に基づいて実装を進めることができます。

### 実装時の注意点

1. **Column型の簡素化**: type、nullable、default、extraフィールドを削除するため、既存コードでこれらのフィールドを参照している箇所がないか確認してください。現在のER図表示では使用していないため、削除しても問題ありません。

2. **Entity.foreignKeysの削除**: Relationshipのみで外部キー情報を管理します。既存コードでforeignKeysを参照している箇所がないか確認してください。

3. **isForeignKeyの導出**: Column.isForeignKeyはRelationshipから導出する必要があります。ERDataBuilderで、Relationship生成後に逆引きして設定してください。

4. **DDL取得**: PostgreSQLのDDL取得にはpg_dumpが必要です。環境にpg_dumpが存在しない場合は空文字列を返すか、エラーメッセージを返してください。

5. **schema概念**: PostgreSQLはdatabase内にschemaを持ちますが、MySQLにはschema概念がありません。MySQLの場合はschemaフィールドを無視してください。

6. **テストデータ**: PostgreSQL用のテストデータ（init-postgres.sql）が既に存在するか確認してください。存在しない場合は、MySQLのinit.sqlと同じ構造のテーブルを作成してください。

7. **依存パッケージ**: PostgreSQL接続には`pg`パッケージが必要です。package.jsonに追加されていない場合は追加してください。

### 不要になったコード

- `lib/database.ts`（DatabaseManagerを移動するため削除）
- `Entity.foreignKeys`フィールド（Relationshipのみ使用）
- `Column.type`, `Column.nullable`, `Column.default`, `Column.extra`フィールド（UI表示に不要）

以上
