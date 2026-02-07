## 1. 最小限の必要情報の結論（リサーチ観点1）

### 現在のER図表示を維持するために本当に必要な情報

* **ERData**

  * `entities[]`
  * `relationships[]`
* **Entity（テーブル）**

  * `id`（参照のための識別子）
  * `name`（表示名）
  * `columns[]`（カラム一覧）
  * `ddl`（DDL表示用。取得できないDB/権限もあり得るので optional 推奨）
* **Column（カラム）**

  * `id`
  * `name`
  * ※ `isForeignKey` は **relationships から導出可能**（後述）
* **Relationship（リレーション/FK）**

  * 参照元/参照先（テーブル・カラムの参照）
  * `constraintName`（表示しているなら保持。ただし optional 推奨）

### 削除可能なフィールド（現状UIだけを見るなら）

* `Column.type / nullable / key / default / extra`（UI未使用）
* `Entity.foreignKeys`（Relationship と内容重複）
* `ForeignKey` 型そのもの（Relationship に統合するなら不要）

### 残すべきフィールド（理由つき）

* **差分検出（カラム変更）を維持したいなら**、`type/nullable/default/autoIncrement/primary/unique` 相当の情報は「どこか」に必要（後述の観点5）。
* ただし、それらは **UIモデル直下ではなく optional な詳細情報として分離**すると、UI最小化と差分検出を両立できる。

---

## 2. 複数データソース対応の推奨データ構造設計案（リサーチ観点2）

⚠ **意思決定が必要です（Columnの未使用フィールド）**

* **選択肢A**: Columnから未使用フィールド削除（最小：id/name/isForeignKey）
* **選択肢B**: 未使用フィールドを残しつつ、DB固有表現→汎用表現へ変更
* **選択肢C**: 将来拡張のため保持（汎用表現に変更）

**推奨：選択肢B（ただし「UIコア」と「詳細」を分離）**

* UIに必要な最小コアは軽く保つ
* 差分検出や将来表示のために、DB非依存に正規化した詳細を optional で持つ
* DB固有文字列は「raw」として別枠に隔離（捨てずに閉じ込める）

### 推奨 TypeSpec 定義（新 ERData）

```typespec
// DB方言
enum DatabaseDialect {
  mysql,
  postgresql,
  oracle,
  sqlserver,
  sqlite,
}

// 取得元の識別（将来、同一アプリで複数接続も視野に入れるなら有用）
model DataSourceRef {
  dialect: DatabaseDialect;
  // 例: MySQLのdatabase / PostgreSQLのdatabase など（任意）
  database?: string;
  // 例: PostgreSQL/Oracle/SQL Server の schema（任意）
  schema?: string;
}

// リバースエンジニアリング結果
model ERData {
  source: DataSourceRef;
  entities: Entity[];
  relationships: Relationship[];
}

// テーブル
model Entity {
  id: string;
  name: string;
  // schemaが必要ならここに持つ（source.schema と併用も可）
  schema?: string;
  columns: Column[];
  ddl?: string;
}

// カラム（UIコアは最小、詳細はoptional）
model Column {
  id: string;
  name: string;
  details?: ColumnDetails;
}

// カラム詳細（差分検出・将来表示向け）
model ColumnDetails {
  // DB間で共通化した最小限の性質
  type?: NormalizedType;
  nullable?: boolean;
  default?: string | null;

  // キー/制約（列単体に落とせる範囲のみ）
  isPrimaryKey?: boolean;
  isUnique?: boolean;

  // auto increment/identity 相当（DBごとに呼称は違う）
  isAutoIncrement?: boolean;

  // DB固有情報（必要なら保持。UI/差分は基本 normalized を見る）
  raw?: ColumnRaw;
}

enum TypeCategory {
  integer,
  decimal,
  float,
  boolean,
  string,
  text,
  date,
  time,
  timestamp,
  binary,
  json,
  uuid,
  other,
}

model NormalizedType {
  category: TypeCategory;

  // 型の修飾（DBごとに取れないこともあるので optional）
  length?: int32;
  precision?: int32;
  scale?: int32;

  // 表示用に「DB非依存の代表名」を置きたい場合（例: varchar/numeric）
  displayName?: string;
}

model ColumnRaw {
  // DBのネイティブ型名（例: int4, character varying, NUMBER, nvarchar）
  nativeTypeName?: string;
  // 可能なら fully qualified な型表現（例: varchar(255), numeric(10,2)）
  nativeTypeFull?: string;

  // DB固有のdefault表現（必要なら）
  nativeDefault?: string | null;
}

// FK（将来 multi-column FK を前提にする）
model Relationship {
  id: string;

  // 制約名（DBによって無名/自動生成/長大などがあり得るので optional 推奨）
  constraintName?: string;

  fromEntityId: string;
  toEntityId: string;

  // 複合FK対応（単一FKも要素数1で表現）
  mappings: RelationshipColumnMapping[];
}

model RelationshipColumnMapping {
  fromColumnId: string;
  toColumnId: string;
}
```

### 設計根拠（要点）

* **DB差異が出るのは ColumnDetails 側に閉じ込める**（UIコアを汚さない）
* **FKは Relationship を唯一の正として持つ**（重複排除・複合FKも自然に表現）
* `Column.isForeignKey` は不要：`relationships[].mappings[].fromColumnId` から導出できる

---

## 3. データの重複排除（リサーチ観点3）

⚠ **意思決定が必要です（FK重複の扱い）**

* **選択肢A**: `Entity.foreignKeys`を廃止し、`Relationship`のみで表現
* **選択肢B**: `Relationship`を廃止し、`Entity.foreignKeys`から導出
* **選択肢C**: 両方残す

**推奨：選択肢A（Relationshipのみ）**

* ER図レンダリングの「線」は Relationship の方が自然（from/to が直にある）
* 複合FKも Relationship の方が表現しやすい
* `Column.isForeignKey` も **Relationshipから導出**で足りる（列フラグの重複を避けられる）

---

## 4. DDL情報の扱い（リサーチ観点4）

### 結論

* **DDLは正規化しない**（MVP・表示用途なら raw を保持で十分）
* ただし **取得できないDB/権限/環境があり得る**ので `Entity.ddl` は optional 推奨

### DBごとのDDL取得の代表例（保持方針の根拠）

* MySQL: `SHOW CREATE TABLE` でCREATE文を取得できる。([MySQL Developer Zone][1])
* PostgreSQL: `pg_dump --schema-only` でスキーマ定義（CREATE/ALTER等）を出力できる。([PostgreSQL][2])
* Oracle Database: `DBMS_METADATA` によりDDLとしてメタデータを取り出せる。([Oracle Docs][3])
* SQLite: `sqlite_master` に CREATE TABLE 文（作成時SQL）が格納される。([system.data.sqlite.org][4])
* Microsoft SQL Server: SSMSの「Generate Scripts」等でスクリプト生成が可能（プログラム的にはSMO等が一般的）。([Microsoft Learn][5])

---

## 5. 増分リバースエンジニアリングへの影響と対応策（リサーチ観点5）

### 影響（重要）

* **Column.details を削る（＝選択肢A）**と、「カラム変更（型/nullable/default等）」の検出精度が落ちる

  * 最小モデルだけだと **“追加/削除” は検出できても “変更” が検出できない** か、誤検出（削除→追加扱い）になりやすい

### 推奨対応：差分用スナップショットは「正規化済みの署名」を比較

UIに不要でも、差分検出のために **ColumnDetails 相当から signature を作る**。

#### ColumnSnapshot（内部用）の例

```ts
type ColumnSnapshot = {
  entityId: string;        // できれば安定ID
  columnId: string;        // できれば安定ID
  name: string;

  // detailsから生成した正規化署名
  signature: string;

  // FK判定はRelationshipから導出（保持しない）
  isForeignKey: boolean;
};
```

#### signature 生成方針（例）

* `type.category`
* `type.length/precision/scale`（ある範囲で）
* `nullable`
* `default`（正規化：NULL/空文字/関数等の扱いをルール化）
* `isPrimaryKey/isUnique/isAutoIncrement`

→ この方針なら、DBごとの “生文字列差” に引っ張られにくい（MySQLの `varchar(255)` と PostgreSQLの `character varying(255)` などを同一視可能）。

### Relationshipの差分

* `constraintName` はDBによって自動生成・変更されやすい場合があるため、差分キーは

  * `fromEntityId + toEntityId + mappings(fromColId,toColId)` を主
  * `constraintName` は補助（表示用）
    が安全。

---

## 6. 既存コードへの影響範囲（リサーチ観点6）

※リポジトリ実物が提示されていないため、ファイル名は「変更が必要になる領域」を列挙します（実際の命名に読み替え）。

* **TypeSpec**

  * `scheme/main.tsp`：ERData/Entity/Column/Relationship の再定義、`ForeignKey`削除、`Entity.foreignKeys`削除 など
  * 型生成の出力（バック/フロント双方）への影響
* **バックエンド（DatabaseManager / Adapter層）**

  * `generateERData()` が新モデルを返すよう修正
  * FK収集ロジック：`relationships[].mappings[]` を生成する方式に変更
  * `Column.isForeignKey` を廃止するなら、その設定ロジック削除
  * `Column.details` の正規化（type/nullable/default/keys/autoIncrement）を Adapter で吸収
* **増分更新（差分検出）**

  * ColumnSnapshot の入力元を `Column.details` に変更
  * FK判定を relationships から導出するよう変更
* **フロントエンド（ER図描画）**

  * `isForeignKey` を relationships から導出する前処理を追加（描画前に Set を作る）
  * Relationship が複合対応になった場合：線の描画単位（mapping単位 or relationship単位）を決めて反映

---

## 7. 将来の拡張性に関する考察（リサーチ観点7）

⚠ **意思決定が必要です（最小限 vs 拡張性）**

* **選択肢A**: MVP優先で最小限、必要になったら追加
* **選択肢B**: 将来拡張を見越してフィールドを用意

**推奨：選択肢A（ただし “拡張の器” として Column.details を optional で用意）**

* UIコアは増やさない（YAGNI）
* それでも差分検出と将来表示の余地が必要なので、**optional の details に押し込む**のが折衷として効く

将来追加しやすい候補（details配下 or 別モデル）

* インデックス（table-level）
* ビュー/プロシージャ等（別エンティティ種別として追加）
* 制約（check、FKの on delete/update、deferrable など）

---

## 8. 参考となる設計パターンや既存ライブラリ（リサーチ観点8）

* ORMは「モデル（テーブル）」「フィールド（カラム）」「リレーション」を中核に置く

  * Prisma はスキーマで relation を明示し、モデル間の関係を中心に表現している。([prisma.io][6])
  * TypeORM も entity を columns + relations として扱う（設計の中心が同じ）。([TypeORM][7])
  * Sequelize も association を belongsTo/hasMany 等で表現し、FKを関係として扱う。([Sequelize][8])
* 変更管理ツールは「DB非依存な変更表現」を志向

  * Liquibase は changelog に変更を列挙し追跡する。([Liquibase Docs][9])
* 複数DBのスキーマ取得・比較という観点では、DB非依存メタデータ抽象化の実例がある

  * SchemaCrawler はJDBCを介してDB非依存にメタデータを扱うことを明示している（差分・比較ユースケースも含む）。([SchemaCrawler][10])

[1]: https://dev.mysql.com/doc/refman/8.0/ja/show-create-table.html?utm_source=chatgpt.com "13.7.7.10 SHOW CREATE TABLE ステートメント"
[2]: https://www.postgresql.org/docs/current/app-pgdump.html?utm_source=chatgpt.com "PostgreSQL: Documentation: 18: pg_dump"
[3]: https://docs.oracle.com/cd/E16338_01/appdev.112/b56262/d_metada.htm?utm_source=chatgpt.com "87 DBMS_METADATA"
[4]: https://system.data.sqlite.org/home/doc/dc206da59f/Doc/Extra/lang_createtable.html?utm_source=chatgpt.com "CREATE TABLE"
[5]: https://learn.microsoft.com/en-us/ssms/scripting/generate-and-publish-scripts-wizard?utm_source=chatgpt.com "Generate Scripts Wizard"
[6]: https://www.prisma.io/docs/orm/prisma-schema/data-model/relations?utm_source=chatgpt.com "Relations | Prisma Documentation"
[7]: https://typeorm.io/docs/entity/entities/?utm_source=chatgpt.com "Entities"
[8]: https://sequelize.org/docs/v6/core-concepts/assocs/?utm_source=chatgpt.com "Associations"
[9]: https://docs.liquibase.com/pro/user-guide-4-33/what-is-a-changelog?utm_source=chatgpt.com "Pro 4.33: What is a Changelog?"
[10]: https://www.schemacrawler.com/?utm_source=chatgpt.com "SchemaCrawler - Free database schema discovery and ..."
