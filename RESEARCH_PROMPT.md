# リサーチプロンプト：複数データソース対応のためのデータ構造再検討

## リサーチ目的

MySQL以外のデータソースに対応できるようにするため、DatabaseManagerから返却するデータ構造を再検討する。

複数のデータソース（MySQL、PostgreSQL、将来的にOracle、SQL Server、SQLiteなど）に対応しつつ、シンプルで必要十分なデータ構造を設計したい。

## プロジェクト概要

**ER Diagram Viewer** は、RDB（リレーショナルデータベース）からER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーションです。

### 現在のフェーズ
- MVPのプロトタイピング中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能は盛り込まない
- 後方互換性は考慮しない（大幅な変更も可能）
- AIが作業するため学習コストは考慮不要

### アーキテクチャ
- **バックエンド**: Node.js + Express + TypeScript
- **フロントエンド**: React + TypeScript（`public/`ディレクトリ）
- **型管理**: TypeSpec（`scheme/main.tsp`）からバックエンド・フロントエンド両方の型を生成
- **データベース**: 現在はMySQL 8のみ対応、PostgreSQL対応を追加予定

## 現在のデータ構造

### ERData型（DatabaseManager.generateERData()の戻り値）

TypeSpecで定義されている現在のデータ構造は以下の通り：

```typescript
// ERData: リバースエンジニアリングの結果
model ERData {
  entities: Entity[];
  relationships: Relationship[];
}

// Entity: テーブル情報
model Entity {
  id: string; // UUID
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  ddl: string;
}

// Column: カラム情報
model Column {
  id: string; // UUID
  name: string;
  type: string;           // ← 現在使用されていない
  nullable: boolean;      // ← 現在使用されていない
  key: string;            // "PRI", "UNI" など ← 現在使用されていない
  default: string | null; // ← 現在使用されていない
  extra: string;          // "auto_increment" など ← 現在使用されていない
  isForeignKey: boolean;  // 外部キーカラムかどうか
}

// ForeignKey: 外部キー情報
model ForeignKey {
  id: string; // UUID
  columnId: string; // カラムID (UUID)
  referencedTableId: string; // 参照先エンティティID (UUID)
  referencedColumnId: string; // 参照先カラムID (UUID)
  constraintName: string;
}

// Relationship: リレーション情報
model Relationship {
  id: string; // UUID
  fromEntityId: string; // エンティティID (UUID)
  fromColumnId: string; // カラムID (UUID)
  toEntityId: string; // エンティティID (UUID)
  toColumnId: string; // カラムID (UUID)
  constraintName: string;
}
```

### 現状の問題点

1. **Column型に多数の未使用フィールドが存在**
   - `type`, `nullable`, `key`, `default`, `extra` はフロントエンドで表示されておらず、使用されていない
   - フロントエンドでは`column.name`と`column.isForeignKey`のみが使用されている

2. **MySQL固有の構造**
   - `Column.type`: MySQLの`COLUMN_TYPE`（例: `varchar(255)`）がそのまま入る
   - `Column.key`: MySQLの`COLUMN_KEY`（`PRI`, `UNI`, `MUL`）がそのまま入る
   - `Column.extra`: MySQLの`EXTRA`（`auto_increment`など）がそのまま入る
   - PostgreSQLや他のDBでは同じ情報を異なる形式で取得する必要がある

3. **データの重複**
   - `Entity.foreignKeys`と`Relationship`で外部キー情報が重複している
   - `ForeignKey.constraintName`と`Relationship.constraintName`は同じ情報

### 現在のER図表示に必要な情報

フロントエンドでER図を表示するために実際に使用されている情報：

1. **テーブル（Entity）**
   - テーブル名（`Entity.name`）
   - テーブルID（`Entity.id`）
   - DDL文（`Entity.ddl`）: DDLモーダルで表示

2. **カラム（Column）**
   - カラム名（`Column.name`）
   - カラムID（`Column.id`）
   - 外部キーフラグ（`Column.isForeignKey`）: 外部キーカラムを視覚的に区別するために使用

3. **リレーション（Relationship）**
   - 参照元テーブルID（`Relationship.fromEntityId`）
   - 参照元カラムID（`Relationship.fromColumnId`）
   - 参照先テーブルID（`Relationship.toEntityId`）
   - 参照先カラムID（`Relationship.toColumnId`）
   - 制約名（`Relationship.constraintName`）

### 既存のPostgreSQL対応リサーチ

別のリサーチレポート（`research/20260207_1310_postgresql_support.md`）で、PostgreSQL対応のためのアーキテクチャ設計が提案されている：

- DatabaseAdapter パターンでDB固有処理を分離
- MySQLとPostgreSQLで共通のERData生成ロジック
- 各DBごとのスキーマ情報取得SQL

このリサーチを参考にしながら、データ構造自体をシンプル化できないか検討したい。

## リサーチ要件（原文ママ）

以下はユーザーからの要望をそのまま記載：

> * 後方互換は考慮しなくていい
> * 現状のER図を表現できる最低限の情報があればよい（テーブル名、カラム名、リレーション、DDL文あたり？）
>     * この点を考慮すると複数データソースに対応しつつシンプルなデータ構造にできないか？
> * 現状のデータ型には使ってない項目もあるかも。
>     * 少なくともカラムの型などは使ってない

## 調査観点

以下の観点で調査し、設計案を提示してください：

### 1. 最小限の必要情報の洗い出し

現在のER図表示機能を維持するために**本当に必要な情報**だけを洗い出す。

- 現在のフロントエンドでの使用状況から判断した必要情報
- 将来の機能拡張を考えた場合に必要になりそうな情報（カラムの型、NULL許可など）の要否

### 2. 複数データソース対応のデータ構造設計

MySQL、PostgreSQL、Oracle、SQL Server、SQLiteなど、複数のデータソースに対応できるシンプルなデータ構造を設計する。

- DB固有の情報（MySQLの`COLUMN_TYPE`形式など）に依存しない、汎用的な表現方法
- 各DBから取得できる情報の共通項を抽出
- DB間の差異を吸収する方法（正規化、マッピング、最小公倍数的アプローチなど）

⚠ **意思決定が必要です**

- **選択肢A**: Column型から未使用フィールド（type, nullable, key, default, extra）を削除し、最小限の情報（id, name, isForeignKey）のみにする
- **選択肢B**: 未使用フィールドを残しつつ、DB固有の表現から汎用的な表現に変更する（例: `type`を共通の型名にマッピング）
- **選択肢C**: 将来の拡張性を考慮して、現状は使わないがフィールドは保持する（ただし汎用的な表現に変更）

### 3. データの重複排除

現在のデータ構造では、外部キー情報が`Entity.foreignKeys`と`Relationship`で重複している。

- 重複を排除してシンプルにする方法
- `ForeignKey`型を廃止して`Relationship`のみにする案の妥当性
- または`Entity.foreignKeys`を廃止する案の妥当性

⚠ **意思決定が必要です**

- **選択肢A**: `Entity.foreignKeys`を廃止し、`Relationship`のみで外部キー情報を表現する
- **選択肢B**: `Relationship`を廃止し、`Entity.foreignKeys`から計算で導出する（パフォーマンスへの影響）
- **選択肢C**: 両方を残す（重複だが、それぞれ異なる目的で使用する）

### 4. DDL情報の扱い

DDL文（`Entity.ddl`）は現在使用されているが、DB固有の方言が含まれる。

- DDL文をそのままDBから取得して保持する現在の方法の妥当性
- DBごとのDDL取得方法の違い（MySQLの`SHOW CREATE TABLE`、PostgreSQLの`pg_dump`など）
- DDL文を正規化・共通化する必要性の有無

### 5. 増分リバースエンジニアリングへの影響

現在、増分リバースエンジニアリング機能が実装されており、以下の差分検出を行っている：

- テーブルの追加/削除
- カラムの追加/削除/変更
- リレーションの追加/削除

データ構造を変更した場合、この差分検出ロジックへの影響を考慮する必要がある。

- 現在の`ColumnSnapshot`型で使用されているフィールド（type, nullable, key, default, extra, isForeignKey）
- これらのフィールドを削減した場合、差分検出の精度への影響
- 最小限の情報で差分検出を実現する方法

### 6. 段階的な移行戦略

後方互換性は考慮不要だが、既存コードへの影響を理解する必要がある。

- データ構造変更の影響範囲（バックエンド、フロントエンド、増分更新ロジックなど）
- 変更を段階的に適用する場合の手順

### 7. 将来の拡張性

現在は最小限の情報で良いが、将来的に以下の機能を追加する可能性を考慮する：

- カラムの型、NULL許可、デフォルト値などの詳細情報の表示
- インデックス情報の表示
- ビューやストアドプロシージャの対応

これらの拡張を見越した場合のデータ構造設計の考え方。

⚠ **意思決定が必要です**

- **選択肢A**: MVP優先で現時点で最小限にし、将来必要になったら追加する（YAGNI原則）
- **選択肢B**: 将来の拡張を見越してフィールドを用意しておく（拡張性優先）

### 8. 参考となる設計パターンや既存ライブラリ

複数のデータベースに対応したスキーマ情報の扱いについて、参考になる設計パターンや既存ライブラリ。

- ORMツール（Prisma、TypeORM、Sequelizeなど）のスキーマ表現
- データベース移行ツール（Flyway、Liquibaseなど）のメタデータ表現
- 他のER図ツールのデータモデル

## 成果物

調査結果を以下の形式でまとめてください：

1. **最小限の必要情報の結論**
   - 現在のER図表示に必要な情報のリスト
   - 削除可能なフィールドのリスト
   - 残すべきフィールドとその理由

2. **推奨データ構造設計案**
   - ERData型の新しい定義（TypeSpec形式）
   - Entity型の新しい定義
   - Column型の新しい定義
   - ForeignKey型の要否と定義
   - Relationship型の新しい定義
   - 各フィールドの説明と設計根拠

3. **DB固有情報の正規化・マッピング方法**
   - カラム型の共通表現（必要な場合）
   - キー種別の共通表現（必要な場合）
   - 各DBから取得した情報を共通形式に変換する方法

4. **データ重複の解決策**
   - `Entity.foreignKeys`と`Relationship`の関係性
   - どちらを残すか、または両方残すかの推奨案と理由

5. **増分リバースエンジニアリングへの影響と対応策**
   - `ColumnSnapshot`型の変更内容
   - 差分検出ロジックの変更内容

6. **既存コードへの影響範囲**
   - 変更が必要なファイルのリスト
   - 主な変更内容の概要

7. **将来の拡張性に関する考察**
   - 推奨するアプローチ（最小限 vs 拡張性優先）とその理由
   - 将来追加する可能性がある情報の扱い方

8. **参考情報**
   - 既存ライブラリやツールの設計パターン
   - 採用した設計の根拠となる情報源

コード例や具体的なデータ構造の定義を含めて提案してください。

リサーチ観点に連番を付与し、意思決定が必要な観点には「⚠ 意思決定が必要です」と記載し、選択肢を明示してください。
