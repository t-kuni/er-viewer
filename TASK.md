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

## フェーズ1: データ構造変更とMySQL実装のAdapter化 ✅

既存のMySQL実装をDatabaseAdapterアーキテクチャに移行し、データ構造を簡素化します。このフェーズでは既存機能（MySQL）が正常に動作することを確認します。

**完了日**: 2026-02-07

**実装内容**:
- scheme/main.tspの型定義は既に更新済みでした
- DatabaseAdapterインターフェース、MySqlAdapter、ERDataBuilder、DatabaseAdapterFactory、DatabaseManagerを新規作成
- ReverseEngineerUsecase、server.ts、テストファイルのimportパスを更新
- 既存のlib/database.tsを削除
- GetInitialViewModelUsecaseにGlobalUIStateの新しいフィールド（showHistoryPanel, clipboard, lastMousePosition）を追加
- MySQLのテストが全て成功（5 tests passed）

**注意事項**:
- フロントエンド（public/src）の型エラーは残っていますが、これらはフェーズ3で対応する予定です
- バックエンド（lib/）の型エラーは全て解消されています

### ✅ scheme/main.tspの型定義を更新

**ファイル**: `scheme/main.tsp`

**実施内容**: 既に更新済みでした。

### ✅ 型生成の実行

**コマンド**: `npm run generate`

**実施内容**: 正常に完了しました。

### ✅ DatabaseAdapterインターフェースの定義

**ファイル**: `lib/database/adapters/DatabaseAdapter.ts`（新規作成）

**実施内容**: 作成完了しました。

### ✅ MySqlAdapterの実装

**ファイル**: `lib/database/adapters/mysql/MySqlAdapter.ts`（新規作成）

**実施内容**: 作成完了しました。

### ✅ ERDataBuilderの実装

**ファイル**: `lib/database/ERDataBuilder.ts`（新規作成）

**実施内容**: 作成完了しました。

### ✅ DatabaseAdapterFactoryの実装

**ファイル**: `lib/database/DatabaseAdapterFactory.ts`（新規作成）

**実施内容**: 作成完了しました。

### ✅ DatabaseManagerのFacade化

**ファイル**: `lib/database/DatabaseManager.ts`（新規作成、既存のdatabase.tsを置き換え）

**実施内容**: 作成完了しました。

### ✅ ReverseEngineerUsecaseの更新

**ファイル**: `lib/usecases/ReverseEngineerUsecase.ts`

**実施内容**: schemaフィールド対応を完了しました。

### ✅ 既存database.tsの削除

**ファイル**: `lib/database.ts`

**実施内容**: 削除完了しました。

### ✅ ビルドの確認

**コマンド**: `npm run typecheck`

**実施内容**: バックエンド（lib/）の型エラーは解消されました。フロントエンド（public/src）の型エラーはフェーズ3で対応します。

### ✅ テストの実行（MySQL）

**コマンド**: `npm run test -- tests/usecases/ReverseEngineerUsecase.test.ts`

**実施内容**: 5つのテストが全て成功しました。

---

## フェーズ2: PostgreSQL対応の実装 ✅

PostgreSQLのDatabaseAdapterを実装し、リバースエンジニアリング機能でPostgreSQLを利用できるようにします。

**完了日**: 2026-02-07

**実装内容**:
- PgDumpExecutor、PostgresAdapter、DatabaseAdapterFactory、ERDataBuilder、ReverseEngineerUsecaseを実装・更新
- pgパッケージと@types/pgをインストール
- PostgreSQL用のテストケースを追加（4テスト）
- すべてのテストが成功（MySQL 5テスト + PostgreSQL 4テスト = 計9テスト）
- バックエンドの型エラーは全て解消

**注意事項**:
- PgDumpExecutorはテストでモック化されており、実際のpg_dumpコマンドに依存しない
- フロントエンド（public/src）の型エラーは残っていますが、フェーズ3で対応する予定です

### ✅ PgDumpExecutorの実装

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

**実施内容**: 作成完了しました。PgDumpExecutorはpg_dumpコマンドを実行してDDLを取得します。テストではモック化されています。

### ✅ PostgresAdapterの実装

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

**実施内容**: 作成完了しました。PostgreSQL固有の接続処理とスキーマ情報取得SQLを実装しました。`pg`パッケージをインストールしました。

### ✅ DatabaseAdapterFactoryの更新

**ファイル**: `lib/database/DatabaseAdapterFactory.ts`

**変更内容**:
- typeが"postgresql"の場合は`PostgresAdapter`を返すように変更

**実施内容**: 更新完了しました。PostgresAdapterをインポートし、"postgresql"の場合にPostgresAdapterを返すように変更しました。

### ✅ ERDataBuilderの更新（PostgreSQL対応）

**ファイル**: `lib/database/ERDataBuilder.ts`

**変更内容**:
- PostgreSQLのschema情報を`DataSourceRef`に含める
- Adapterがschemaをサポートする場合の処理を追加

**注意**: MySQLの場合はschemaフィールドは未定義のままです。

**実施内容**: ERDataBuilderはすでにPostgreSQL対応のschemaをサポートしていました。変更は不要でした。

### ✅ ReverseEngineerUsecaseの更新（PostgreSQL対応）

**ファイル**: `lib/usecases/ReverseEngineerUsecase.ts`

**変更内容**:
- PostgreSQLの場合、schemaをDatabaseManagerに渡す処理を追加
- ConnectionConfigにschemaを含める

**実施内容**: ReverseEngineerUsecaseはすでにPostgreSQL対応のschemaをサポートしていました。変更は不要でした。

### ✅ テストコードの追加（PostgreSQL）

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

**実施内容**: 追加完了しました。PostgreSQL用のテストケースを4つ追加しました（接続情報指定、schema省略、DDL取得、外部キー変換）。PgDumpExecutorをモック化しました。

### ✅ ビルドの確認

**コマンド**: `npm run typecheck`

**理由**: 型エラーがないことを確認します。

**実施内容**: バックエンド（lib/）の型エラーは全て解消されました。フロントエンド（public/src）の型エラーはフェーズ3で対応します。

### ✅ テストの実行（PostgreSQL追加）

**コマンド**: `npm run test`

**対象**: `tests/usecases/ReverseEngineerUsecase.test.ts`

**確認内容**: MySQLとPostgreSQLの両方のテストが正常に動作することを確認します。

**実施内容**: テストが全て成功しました（9 tests passed）。MySQL 5テスト + PostgreSQL 4テスト = 計9テストが正常に動作しています。

---

## フェーズ3: フロントエンド更新

データベース接続モーダルを更新し、PostgreSQL選択とschema入力に対応します。

**実施日**: 2026-02-07

**進捗状況**: 
- DatabaseConnectionModal、reverseEngineerCommandの更新は完了
- 型エラーが多数検出され、TASK.mdに記載されていない追加の修正作業が必要

**検出された型エラー**:
1. `public/src/actions/dataActions.ts`: Column型の`type`、`nullable`、`default`、`extra`フィールドが参照されているが、これらのフィールドはフェーズ1で削除済み（276-300行目）
2. `public/src/actions/dataActions.ts`: `ReverseEngineeringHistoryEntry`の`type`フィールドの型が不一致（491行目）
3. `public/src/actions/clipboardActions.ts`: Rectangle、TextBoxの型エラー（36, 47, 86, 97行目）
4. `public/src/commands/layoutOptimizeCommand.ts`: TextAlignの型エラー（複数箇所）
5. `public/src/components/App.tsx`: ViewModelの型エラー（複数箇所）

**次のステップ**:
- TASK.mdに記載されていない追加の型エラー修正が必要
- フェーズ1の「Column型の簡素化」に伴うフロントエンドの修正が未完了
- これらの修正を別タスクとして洗い出す必要がある

### ✅ DatabaseConnectionModalの更新

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

**実施内容**: 完了しました。Database Type選択ドロップダウン、Schema入力欄、警告メッセージを追加しました。

### ✅ reverseEngineerCommandの更新

**ファイル**: `public/src/commands/reverseEngineerCommand.ts`

**変更内容**:
- `ReverseEngineerRequest`に`schema`フィールドを含める（connectionInfoから取得）

**参照**: [spec/multi_database_support.md](/spec/multi_database_support.md) の「接続設定」セクション

**実施内容**: 完了しました。PostgreSQLの場合、connectionInfo.schemaをrequestに含めるように更新しました。

### ⏸️ dataActionsの更新

**ファイル**: `public/src/actions/dataActions.ts`

**変更内容**:
- `actionMergeERData`メソッドを更新
  - `ERData.source`フィールドを受け取る
  - 履歴エントリに`source`情報を含める（オプション）

**参照**: [spec/multi_database_support.md](/spec/multi_database_support.md) の「データ構造の変更」セクション

**注意**: ERData.sourceは履歴記録に使用可能ですが、必須ではありません。将来の拡張として検討します。

**実施内容**: スキップしました。ERData.sourceは必須ではなく、将来の拡張として残します。

**型エラー検出**: Column型の`type`、`nullable`、`default`、`extra`フィールドを参照していますが、これらのフィールドはフェーズ1で削除済みです（276-300行目、491行目）。TASK.mdに記載されていない追加の修正作業が必要です。

### ⚠️ ビルドの確認

**コマンド**: `npm run typecheck`（フロントエンドのビルドコマンドがある場合はそれも実行）

**理由**: 型エラーがないことを確認します。

**実施内容**: 型エラーが多数検出されました（合計30+件）。主な問題：
1. **dataActions.ts**: Column型の削除されたフィールド（type、nullable、default、extra）を参照（276-300行目）
2. **dataActions.ts**: ReverseEngineeringHistoryEntryのtypeフィールドの型不一致（491行目）
3. **clipboardActions.ts**: Rectangle、TextBoxの型エラー（36, 47, 86, 97行目）
4. **layoutOptimizeCommand.ts**: TextAlignの型エラー（複数箇所）
5. **App.tsx**: ViewModelの型エラー（複数箇所）

これらの型エラーは、TASK.mdに記載されていない追加の修正作業が必要です。

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
