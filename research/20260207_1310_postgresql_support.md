## 1. ライブラリ選定結果

### 推奨: `pg`（node-postgres）v8 系（例: `pg@8.18.0`）

* **理由**

  * PostgreSQL クライアントとして最も標準的で、情報量・利用実績が多い
  * Pool/Client の基本機能が揃っていて、今回の「スキーマ取得（SQL直書き）」用途に過不足がない
  * npm 上で継続的に更新されている（最新 8.18.0）。([npm][1])

### 代替候補（要件次第）

* `postgres`（通称 postgres.js）v3 系（例: `postgres@3.4.8`）

  * **理由**: “Fastest full featured” を掲げる軽量クライアントで、API もシンプル。([npm][2])
* `slonik` v48 系（例: `slonik@48.10.0`）

  * **理由**: 型安全・ログ・ガード（SQL合成）など「ツールとしての堅牢性」が高い。今回の「MVPでセキュリティ考慮しない」方針だと過剰になりやすいが、将来の品質強化には有力。([npm][3])

結論としては、既存の mysql2 と同じ “素のドライバ + SQL” という作りを維持しやすい **`pg@8`** が最短ルート。

---

## 2. アーキテクチャ設計案

### 方針

* **DB固有部分（接続・メタ情報取得SQL）** と **共通部分（ERData生成）** を分離
* 既存 `DatabaseManager` を “オーケストレータ（Facade）” に寄せ、DBごとの実装は `Adapter` に逃がす
* `DatabaseType`（TypeSpec 既存 enum）で **Factory 生成**する

### インターフェース案（DB固有の境界）

```ts
// lib/database/adapters/DatabaseAdapter.ts
export interface DatabaseAdapter {
  readonly type: "mysql" | "postgresql";

  connect(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }): Promise<void>;

  disconnect(): Promise<void>;

  // --- introspection（DB固有SQLで実装） ---
  getTables(params?: { schema?: string }): Promise<Array<{ name: string; schema?: string }>>;

  getTableColumns(table: { name: string; schema?: string }): Promise<Array<{
    name: string;
    type: string;
    nullable: boolean;
    default: string | null;
    extra: string | null;        // MySQL: auto_increment 等 / PG: identity 等の表現
    key: string | null;          // "PRI" | "UNI" 等に正規化（後述）
  }>>;

  getForeignKeys(table: { name: string; schema?: string }): Promise<Array<{
    constraintName: string;
    columnName: string;
    referencedTableName: string;
    referencedColumnName: string;
  }>>;

  getTableDDL(table: { name: string; schema?: string }): Promise<string>;
}
```

### 共通ロジック（ERData生成）を別クラスへ

```ts
// lib/database/ERDataBuilder.ts
import crypto from "crypto";
import { DatabaseAdapter } from "./adapters/DatabaseAdapter";

export class ERDataBuilder {
  constructor(private readonly adapter: DatabaseAdapter) {}

  async generateERData(params?: { schema?: string }) {
    const tables = await this.adapter.getTables(params);

    // 取得は並列化しやすい（MVP前提なら単純 Promise.all でOK）
    const entities = await Promise.all(tables.map(async (t) => {
      const [cols, fks, ddl] = await Promise.all([
        this.adapter.getTableColumns(t),
        this.adapter.getForeignKeys(t),
        this.adapter.getTableDDL(t),
      ]);

      const columnIdByName = new Map<string, string>();
      const columns = cols.map((c) => {
        const id = crypto.randomUUID();
        columnIdByName.set(c.name, id);
        return {
          id,
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          key: c.key,
          default: c.default,
          extra: c.extra,
          isForeignKey: false, // あとで fks を見て立てる
        };
      });

      // fks の columnName に一致する Column を isForeignKey=true に
      const fkColumnNames = new Set(fks.map((x) => x.columnName));
      for (const col of columns) {
        if (fkColumnNames.has(col.name)) col.isForeignKey = true;
      }

      return {
        id: crypto.randomUUID(),
        name: t.name,
        columns,
        foreignKeys: [], // relationship 生成時に埋める（またはここで作っても良い）
        ddl,
      };
    }));

    // Relationship / ForeignKey の整形（共通）
    // referencedTableName -> entityId を解決して Relationship を生成
    // ※既存の型（ForeignKey / Relationship）に合わせて UUID を付与

    return { entities, relationships: [] };
  }
}
```

### Factory（DatabaseType → Adapter）

```ts
// lib/database/DatabaseAdapterFactory.ts
import { DatabaseAdapter } from "./adapters/DatabaseAdapter";
import { MySqlAdapter } from "./adapters/mysql/MySqlAdapter";
import { PostgresAdapter } from "./adapters/postgres/PostgresAdapter";

export function createAdapter(type: "mysql" | "postgresql"): DatabaseAdapter {
  switch (type) {
    case "mysql": return new MySqlAdapter();
    case "postgresql": return new PostgresAdapter();
  }
}
```

### 既存 `DatabaseManager` の落としどころ（影響最小）

* `DatabaseManager` は **「type を見て adapter を持つ」Facade**にして、既存 `ReverseEngineerUsecase` からの呼び方を極力変えない

ディレクトリ構成例:

```
lib/
  database/
    DatabaseManager.ts
    DatabaseAdapterFactory.ts
    ERDataBuilder.ts
    adapters/
      DatabaseAdapter.ts
      mysql/
        MySqlAdapter.ts
      postgres/
        PostgresAdapter.ts
```

---

## 3. PostgreSQL 用スキーマ情報取得クエリ集

PostgreSQL では `information_schema` が標準的な入口（移植性・安定性が高い）で、足りないところは `pg_catalog` を併用する方針が現実的です。([PostgreSQL][4])

以降、`$1` は schema（例: `public`）、`$2` は table 名。

### 3.1 テーブル一覧

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = $1
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 3.2 カラム情報

MVP なら `information_schema.columns` で十分（nullable/default/type を取れる）。([PostgreSQL][5])

```sql
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = $1
  AND table_name = $2
ORDER BY ordinal_position;
```

* `type` 表示を “読みやすく” したい場合は `udt_name` より `data_type` を優先し、必要なら `data_type + (character_maximum_length 等)` で整形
* さらに PostgreSQL らしい型表現（`varchar(255)` / `numeric(10,2)` 等）を優先したいなら、`pg_catalog.format_type(...)` を使う `pg_catalog` 版に寄せる（後述）。([Qiita][6])

### 3.3 主キー/ユニーク（Column.key の算出用）

`information_schema.table_constraints` は制約種別（PRIMARY KEY/UNIQUE/FOREIGN KEY）を持つ。([PostgreSQL][7])
`key_column_usage` は制約に参加する列を持つ。([PostgreSQL][8])

**主キー列**

```sql
SELECT kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.constraint_schema = kcu.constraint_schema
WHERE tc.table_schema = $1
  AND tc.table_name = $2
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY kcu.ordinal_position;
```

**ユニーク列（単列ユニークだけ "UNI" にする等の運用も可）**

```sql
SELECT kcu.column_name, kcu.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.constraint_schema = kcu.constraint_schema
WHERE tc.table_schema = $1
  AND tc.table_name = $2
  AND tc.constraint_type = 'UNIQUE'
ORDER BY kcu.constraint_name, kcu.ordinal_position;
```

`Column.key` の正規化案:

* 主キー参加 → `"PRI"`
* ユニーク参加 → `"UNI"`
* それ以外 → `null`
  （MySQL の `"MUL"` 相当は “インデックス” 概念寄りで、現状の ER 表示に必須でなければ無理に合わせない）

### 3.4 外部キー（参照元列 → 参照先列 を 1 行ずつ）

複合外部キーでも列対応が崩れない形にするため、`referential_constraints` と `key_column_usage.position_in_unique_constraint` を使って参照先列を突き合わせるのが安全です。([PostgreSQL][9])

```sql
SELECT
  kcu.constraint_name,
  kcu.column_name              AS column_name,
  pkcu.table_name              AS referenced_table_name,
  pkcu.column_name             AS referenced_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.constraint_schema = kcu.constraint_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
 AND rc.constraint_schema = tc.constraint_schema
JOIN information_schema.key_column_usage pkcu
  ON pkcu.constraint_name = rc.unique_constraint_name
 AND pkcu.constraint_schema = rc.unique_constraint_schema
 AND pkcu.ordinal_position = kcu.position_in_unique_constraint
WHERE tc.table_schema = $1
  AND tc.table_name = $2
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY kcu.constraint_name, kcu.ordinal_position;
```

### 3.5 DDL 取得（PostgreSQL の “SHOW CREATE TABLE 相当”）

PostgreSQL コアには MySQL の `SHOW CREATE TABLE` に相当する **標準関数がない**前提で設計するのが安全です（`pg_get_tabledef` はコアに無い、という整理が一般的）。([Stack Overflow][10])

MVP での実装案は2段構えがおすすめです。

#### 案A（推奨）: `pg_dump --schema-only --table=...` を呼ぶ

* `--schema-only` で DDL を出せる。([Stack Overflow][11])
* Node.js 側は `child_process.execFile` で `pg_dump` を実行して文字列を取る
* 注意: バックエンド実行環境に `pg_dump` が必要（後述リスク）

例（疑似コード）:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

async function getTableDDLByPgDump(conn: {
  host: string; port: number; user: string; password: string; database: string;
}, schema: string, table: string) {
  const args = [
    "--schema-only",
    "--no-owner",
    "--no-privileges",
    `--host=${conn.host}`,
    `--port=${conn.port}`,
    `--username=${conn.user}`,
    `--dbname=${conn.database}`,
    `--table=${schema}.${table}`,
  ];

  const env = { ...process.env, PGPASSWORD: conn.password };
  const { stdout } = await execFileAsync("pg_dump", args, { env });
  return stdout;
}
```

#### 案B（フォールバック）: 取得できる範囲で “簡易DDL” を組み立て

* `pg_catalog.format_type` や `pg_get_expr` 等を使って列定義・デフォルトを取れる。([Qiita][6])
* 制約は `pg_get_constraintdef` 等で “CREATE TABLE 内表現” を取れる（ただし完全再現は難しい）

---

## 4. 実装方針（リファクタリング手順、ファイル構成変更案）

### 4.1 段階的な手順（既存影響を最小化）

1. **抽象インターフェース導入**

* `lib/database/adapters/DatabaseAdapter.ts` を追加
* 既存 MySQL 実装を `MySqlAdapter` に移植（中身はほぼコピペでOK）

2. **共通 ERData 生成を `ERDataBuilder` に移動**

* 既存 `DatabaseManager.generateERData()` の中身を `ERDataBuilder` に寄せる
* MySQL 側の出力が変わらないことを最優先（スナップショットテスト推奨）

3. **`DatabaseManager` を Facade 化**

* `connect(config)` で `createAdapter(config.type)` → adapter.connect()
* `generateERData()` は `new ERDataBuilder(adapter).generateERData()`

4. **PostgresAdapter 追加**

* 3章のSQLで `getTables/getTableColumns/getForeignKeys` を実装
* `getTableDDL` はまず空文字 or 簡易DDLでも動くようにして UI 側の確認を先に進める
  → その後 `pg_dump` 方式を追加（導入可否は環境次第）

5. **Usecase/Route は型（DatabaseType）をそのまま流す**

* `ReverseEngineerRequest.type` が既に `mysql/postgresql` を持つ前提なので、バックエンドは分岐するだけ

### 4.2 DB固有/共通の切り分け（共通化可能な処理）

**共通化する**

* UUID 採番
* `ERData` の構造（Entity/Relationship/ForeignKey の生成）
* テーブルごとの「columns + fks + ddl」を束ねる orchestration
* “参照先テーブル名 → entityId” の解決と Relationship 作成

**DB固有にする**

* 接続管理（client/pool の作り）
* introspection SQL（tables/columns/constraints/ddl）
* 型文字列の整形（MySQL の `column_type` と PG の `data_type/format_type` の差）

---

## 5. フロントエンド修正箇所

### 5.1 Database Type を選択可能にする

* 現状モーダルが MySQL 固定表示とのことなので、以下に変更

  * 表示: 固定テキスト → **select（`mysql` / `postgresql`）**
  * 送信: `ReverseEngineerRequest.type` に選択値を入れる（TypeSpec 既存の enum をそのまま使用）

### 5.2 初期値・placeholder（ポート等）

* タイプ選択に応じて UI 側の初期値を切り替える

  * `mysql` → port: `3306`
  * `postgresql` → port: `5432`
* ローカル開発で docker-compose のホスト公開ポート（例: PostgreSQL `30178`）を優先したいなら、

  * placeholder を `30178` にする、または
  * 「最後に成功した接続情報」を `connectionInfo` から初期表示に使う（既存フロー的に相性が良い）

実装イメージ（疑似コード）:

```ts
const defaultsByType = {
  mysql:      { host: "127.0.0.1", port: 3306, user: "root", database: "..." },
  postgresql: { host: "127.0.0.1", port: 5432, user: "postgres", database: "erviewer" },
};

function onChangeType(nextType) {
  // 未入力項目だけ defaults を補完（ユーザー入力を上書きしない）
}
```

---

## 6. テスト戦略／リスクや注意点

### 6.1 テスト戦略（MySQL/PostgreSQL 両対応）

**(A) コントラクトテスト（推奨）**

* `DatabaseAdapter` に対して同一の期待を流す “共通テストスイート” を作る

  * `getTables` がテーブル名を返す
  * `getTableColumns` が少なくとも name/type/nullable を返す
  * `getForeignKeys` が参照関係を返す
* 実行対象だけ差し替える（MySqlAdapter / PostgresAdapter）

**(B) ユニットテスト（モック中心）**

* `ERDataBuilder` は adapter をモックして、

  * Entity/Relationship のID採番・紐付けが正しい
  * FK列に `isForeignKey=true` が立つ
  * `referencedTableName` 解決が正しい
    を確認する（DB無しで高速）

**(C) 結合テスト（docker compose）**

* 既に MySQL/PostgreSQL の compose がある前提なので、

  * テスト前に起動
  * 接続して reverse-engineer API を叩く
  * ERData の一部をスナップショット
    の形が最短

### 6.2 注意点・リスク

* **DDL取得**

  * PostgreSQL には MySQL の `SHOW CREATE TABLE` のような単発 SQL が標準で無い前提が安全。`pg_dump --schema-only` を使う案が現実的。([Stack Overflow][11])
  * `pg_dump` を backend 実行環境に入れる必要がある（コンテナに postgresql-client を追加等）

* **schema の概念差**

  * MySQL は “database = schema” に近いが、PostgreSQL は `database` の中に `schema(public 等)` がある
  * MVP は `public` 固定で開始し、将来 `ReverseEngineerRequest` に `schema` を追加して拡張できる設計（adapter 引数に schema を通しておく）

* **識別子の大文字小文字**

  * PostgreSQL は未クォート識別子が小文字正規化されるため、テーブル名/列名の扱いで “表示名” と “実体名” の差が出る可能性

* **権限による情報欠落**

  * `information_schema` のビューは権限で見える範囲が変わる（MVP では管理者接続前提で割り切り）

* **型表現の差**

  * MySQL の `extra`/`key` と PostgreSQL の対応は完全一致しないため、「表示用の正規化ルール」を決めて寄せる（PRI/UNI/null くらいから始めるのが安全）

[1]: https://www.npmjs.com/package/pg?utm_source=chatgpt.com "pg"
[2]: https://www.npmjs.com/package/postgres?utm_source=chatgpt.com "postgres"
[3]: https://www.npmjs.com/package/slonik?utm_source=chatgpt.com "slonik"
[4]: https://www.postgresql.org/docs/current/information-schema.html?utm_source=chatgpt.com "Documentation: 18: Chapter 35. The Information Schema"
[5]: https://www.postgresql.org/docs/current/infoschema-columns.html?utm_source=chatgpt.com "Documentation: 18: 35.17. columns"
[6]: https://qiita.com/ester41/items/c3081da57cab22709745?utm_source=chatgpt.com "PL/pgSQLでDDLを取得してみる"
[7]: https://www.postgresql.org/docs/current/infoschema-table-constraints.html?utm_source=chatgpt.com "PostgreSQL: Documentation: 18: 35.52. table_constraints"
[8]: https://www.postgresql.org/docs/current/infoschema-key-column-usage.html?utm_source=chatgpt.com "Documentation: 18: 35.32. key_column_usage"
[9]: https://www.postgresql.org/docs/current/infoschema-referential-constraints.html?utm_source=chatgpt.com "Documentation: 18: 35.34. referential_constraints"
[10]: https://stackoverflow.com/questions/1846542/postgresql-get-table-definition-pg-get-tabledef?utm_source=chatgpt.com "Postgresql, get table definition, pg_get_tabledef"
[11]: https://stackoverflow.com/questions/1884758/generate-ddl-programmatically-on-postgresql?utm_source=chatgpt.com "Generate DDL programmatically on Postgresql"
