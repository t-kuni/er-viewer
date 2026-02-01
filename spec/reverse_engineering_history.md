# リバースエンジニアリング履歴機能仕様

## 概要

リバースエンジニアリングを実行した際の変更履歴を時系列で記録し、UI上から確認できる機能。初回リバースと増分リバースを区別し、増分リバースの場合はテーブル・カラム・リレーションシップの追加・削除・変更内容を記録する。

リバースエンジニアリング機能の基本については[リバースエンジニアリング機能仕様](./reverse_engineering.md)および[増分リバース・エンジニアリング機能仕様](./incremental_reverse_engineering.md)を参照。

## 機能要件

### 履歴の記録

リバースエンジニアリング実行時に履歴エントリを作成し、`ERDiagramViewModel.history`配列に追記する。

**初回リバースエンジニアリング**
- `erDiagram.nodes`が空の状態でリバースエンジニアリングを実行した場合
- タイムスタンプと`type: "initial"`を記録
- サマリー情報として総テーブル数・総カラム数・総リレーション数を記録（任意）

**増分リバースエンジニアリング**
- `erDiagram.nodes`が空でない状態でリバースエンジニアリングを実行した場合
- タイムスタンプと`type: "incremental"`を記録
- 差分検出を実行し、変更内容を記録

**変更がない場合の扱い**
- 増分リバースエンジニアリングで変更がなかった場合でも履歴エントリは作成される
- サマリーがすべて0になるため、UI上で「変更なし」であることが確認できる

### 差分検出の対象

以下の変更を検出して記録する：

**テーブル（エンティティ）**
- キー: テーブル名（`Entity.name`）
- 追加されたテーブル
- 削除されたテーブル

**カラム**
- キー: カラム名（`Column.name`）
- 対象: マッチしたテーブル内のカラムのみ（削除されたテーブル内のカラム差分は、テーブル削除として扱う）
- 追加されたカラム（テーブル名とカラム名で識別）
- 削除されたカラム（テーブル名とカラム名で識別）
- 変更されたカラム（以下のフィールドを比較）
  - `type`（データ型）
  - `nullable`（NULL許可）
  - `key`（キー制約）
  - `default`（デフォルト値）
  - `extra`（その他の属性）
  - `isForeignKey`（外部キーフラグ）

**リレーション**
- 第一キー: `constraintName`（取得できる場合）
- フォールバックキー: `${fromTable}.${fromColumn}->${toTable}.${toColumn}`
- 追加されたリレーション
- 削除されたリレーション

### 履歴エントリのデータ構造

詳細な型定義は[scheme/main.tsp](/scheme/main.tsp)の`ReverseEngineeringHistoryEntry`および関連する型を参照。

**ReverseEngineeringHistoryEntry**
- `timestamp`: エントリのタイムスタンプ（Unix時間ミリ秒）
- `type`: `"initial"`（初回）または`"incremental"`（増分）
- `summary`: サマリー情報（追加・削除・変更の件数）
- `changes`: 変更詳細（増分リバースのみ）

**ReverseEngineeringSummary**
- 各種変更の件数（テーブル、カラム、リレーション）
- 初回リバースの場合は総件数を記録（任意）

**ReverseEngineeringChanges**
- テーブル・カラム・リレーションの追加・削除・変更のリスト
- カラムの変更は`before`と`after`のスナップショットを含む

### 保存とインポート・エクスポート

**保存場所**
- `ERDiagramViewModel.history`配列に保持
- インポート・エクスポート機能で自動的に含まれる

**エクスポート時**
- 履歴配列を全件含める（現行の「ViewModelをJSON化」に自然に含まれる）

**インポート時**
- JSONの`erDiagram.history`配列を読み込む
- 配列でない場合や存在しない場合は空配列として扱う
- エントリの型チェックを実施（`timestamp`と`type`の存在確認）
- 不正なエントリは無視してインポート継続

詳細は[インポート・エクスポート機能仕様](./import_export_feature.md)を参照。

## UI仕様

### 配置とアクセス方法

**配置**
- 右サイドバーに「履歴パネル」を配置
- 折りたたみ可能なパネルとして実装

**表示切り替え**
- ヘッダーに「履歴」ボタンを追加
- ボタンをクリックすると`ui.showHistoryPanel`がトグルされる
- ボタンの配置順序: レイヤー / エクスポート / インポート / 履歴 / ビルド情報

**UI状態の管理**
- `GlobalUIState.showHistoryPanel`フラグで表示状態を管理
- 詳細は[フロントエンド状態管理仕様](./frontend_state_management.md)を参照

### 表示内容

**一覧表示**
- 履歴エントリを新しい順に表示
- 各エントリに以下を表示
  - 日時（`timestamp`をフォーマット）
  - リバース種別（初回 / 増分）
  - サマリー（例: +3テーブル, -1テーブル, +5カラム, ~2カラム）

**詳細表示（折りたたみ）**
- 各エントリは折りたたみ可能
- 展開すると以下を表示
  - 追加されたテーブル名のリスト
  - 削除されたテーブル名のリスト
  - 追加されたカラム（`テーブル名.カラム名`形式）
  - 削除されたカラム（`テーブル名.カラム名`形式）
  - 変更されたカラム（`テーブル名.カラム名`と`before`/`after`の差分）
  - 追加されたリレーション（`constraintName`またはエンドポイント）
  - 削除されたリレーション（`constraintName`またはエンドポイント）

**折りたたみUIの実装**
- HTMLの`<details>`/`<summary>`要素を使用
- または、React stateで管理するアコーディオンUI
- 同時に複数のエントリを開くことが可能

## 差分検出の仕様

### 処理の流れ

`actionMergeERData`内で以下の処理を実行：

1. 初回/増分の判定
   - `viewModel.erDiagram.nodes`が空なら初回
   - 空でなければ増分

2. 差分検出（増分の場合のみ）
   - 別関数`detectSchemaChanges(prevViewModel, erData)`を呼び出し
   - 変更サマリーと変更詳細を取得

3. 既存のマージ処理を実行

4. 履歴エントリを作成して配列に追記

### 差分検出アルゴリズム

差分検出は純粋関数`detectSchemaChanges(prevViewModel, erData)`として実装する。

**テーブルの差分**
- 前回のテーブル名集合: `prevTables = Set(prevViewModel.erDiagram.nodes[*].name)`
- 今回のテーブル名集合: `nextTables = Set(erData.entities[*].name)`
- 追加: `nextTables - prevTables`
- 削除: `prevTables - nextTables`

**カラムの差分**
- マッチしたテーブルのみ対象
- 前回のカラム名集合: `prevColumns = Set(entity.columns[*].name)`
- 今回のカラム名集合: `nextColumns = Set(entity.columns[*].name)`
- 追加: `nextColumns - prevColumns`
- 削除: `prevColumns - nextColumns`
- 変更: 両方に存在し、スナップショットが異なるカラム
  - 比較対象: `type`, `nullable`, `key`, `default`, `extra`, `isForeignKey`

**リレーションの差分**
- リレーションキー生成
  - `constraintName`がある場合はそれを使用
  - ない場合は`${fromTable}.${fromColumn}->${toTable}.${toColumn}`
- 前回のリレーション集合: `prevRelations = Set(リレーションキー)`
- 今回のリレーション集合: `nextRelations = Set(リレーションキー)`
- 追加: `nextRelations - prevRelations`
- 削除: `prevRelations - nextRelations`

### パフォーマンス

- MapとSetを使用して概ね**O(テーブル数 + カラム数 + リレーション数)**
- MVP段階では最適化不要

## 関連仕様書

- [リバースエンジニアリング機能仕様](./reverse_engineering.md) - 基本的なリバースエンジニアリング処理
- [増分リバース・エンジニアリング機能仕様](./incremental_reverse_engineering.md) - 増分更新の詳細
- [フロントエンド状態管理仕様](./frontend_state_management.md) - Action層とUI状態管理
- [インポート・エクスポート機能仕様](./import_export_feature.md) - データの保存と読み込み
- [scheme/main.tsp](/scheme/main.tsp) - 型定義
