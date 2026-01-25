# バックエンドUsecaseアーキテクチャ仕様

## 概要

バックエンドのビジネスロジックをテスト可能にするため、Usecaseレイヤーを導入する。
本仕様書では、現在`server.ts`に直接記述されているロジックをUsecaseに切り出し、テスタブルな構造にするためのアーキテクチャ方針を定義する。

## 基本方針

### Usecaseレイヤーの責務

- **1API = 1Usecase**: 各APIエンドポイントに対応する1つのUsecaseを作成
- **副作用の分離**: テストの妨げとなる副作用（ファイルシステムアクセス等）は依存性注入（DI）で受け取る
- **DBアクセスの扱い**: DBアクセスはUsecaseに直接記述（テスト時はテスト用DBインスタンスを使用するため、DIしない）

### テスト方針

- Usecaseに対してユニットテストを作成
- テストはDBのインスタンスを立てた状態で実行
- DBアクセス以外の副作用（ファイルI/O、外部API呼び出し等）はモック化

### ディレクトリ構成

```
/er-viewer
├─ lib/
│   ├─ database.ts                 （既存のDatabaseManager）
│   └─ usecases/
│       └─ *.ts                    （各Usecaseファイル）
├─ tests/
│   └─ usecases/
│       └─ *.test.ts               （各Usecaseのテスト）
└─ server.ts                       （Expressのルーティングと依存性注入のみ）
```

## Usecaseの設計パターン

### クロージャパターンによる依存性注入

- Usecaseは`create*Usecase(deps: Dependencies)`関数でインスタンス化
- `Dependencies`型で注入する副作用の型を定義
- 返り値は実際のビジネスロジックを実行する関数

### 依存性注入の対象となる副作用

以下のような副作用はテストの妨げになるため、DIで注入する：

- ファイルシステムへのアクセス（`fs.readFile`, `fs.existsSync`等）
- 環境変数へのアクセス（`process.env`）
- プロセス情報へのアクセス（`process.version`, `process.platform`等）
- 外部サービスへのAPI呼び出し
- 日時取得（`new Date()`）
- DatabaseManagerのインスタンス生成（ファクトリ関数として注入）

### DIしない要素

- DBへのクエリ実行（テスト時は実際のテスト用DBを使用）
- ビジネスロジック自体

## server.tsの役割

Usecaseレイヤー導入後、`server.ts`は以下の責務のみを持つ：

- **ルーティング定義**: Expressのルートハンドラを定義
- **依存性注入**: Usecaseに必要な依存性（副作用）を注入してインスタンス化
- **HTTPレスポンス処理**: Usecaseの結果をHTTPレスポンスに変換
- **エラーハンドリング**: エラーを適切なHTTPステータスコードに変換

## テスト実装方針

テスト実装の具体的な方針（フレームワーク選定、モック戦略、設定など）は[バックエンドテスト戦略仕様](./backend_test_strategy.md)を参照。

### 基本方針

- Usecaseに対してユニットテストを作成
- テストは実際のDBインスタンスを立てた状態で実行
- DBアクセス以外の副作用（ファイルI/O、外部API呼び出し等）はモック化

## 実装時の注意事項

- 各Usecaseファイルは`lib/usecases/`配下に配置
- 各テストファイルは`tests/usecases/`配下に配置
- Usecase名は対応するAPIの処理内容を表す命名にする（例: `ReverseEngineerUsecase`）
- 既存の実装があるAPIから優先的にUsecaseへ切り出す

## 懸念事項・確認事項

### 懸念事項

- **テスト実行時間**: 実際のDBを使用するため、テスト実行時間が長くなる可能性
  - 対応方針：直列実行で十分な規模と想定、速度より可読性を重視

### 確認事項

- **テスト用DBの構成**: 本番用DBと別コンテナか、同一コンテナで別DBか

## 関連仕様書

- [リアーキテクチャ概要](./rearchitecture_overview.md) - 全体のアーキテクチャ
- [TypeSpec API定義](./typespec_api_definition.md) - APIスキーマ定義
- [バックエンドテスト戦略仕様](./backend_test_strategy.md) - テスト実装の具体的な方針