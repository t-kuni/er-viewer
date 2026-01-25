# データベース接続設定仕様

## 概要

リバースエンジニアリング実行時にデータベース接続情報を設定するモーダルUIの仕様。毎回モーダルを表示し、接続情報を入力してからリバースエンジニアリングを実行する。

## UI仕様

### モーダル表示タイミング

- 「リバースエンジニア」ボタン押下時に**常にモーダルを表示**
- モーダルには前回成功した接続情報が初期値として表示される（パスワードを除く）
- ユーザーが内容を確認・編集してから実行ボタンを押下

### モーダルUI要素

#### 入力フィールド

- **Database Type**: MySQL（固定表示、MVPでは編集不可）
- **Host**: テキスト入力（例: `localhost`）
- **Port**: 数値入力（例: `3306`）
- **User**: テキスト入力（例: `root`）
- **Password**: パスワード入力（マスク表示）
  - UI上の初期値は常に空（セキュリティのため、環境変数があっても表示しない）
  - 空のまま実行した場合、バックエンドで環境変数 `DB_PASSWORD` を使用
- **Database**: テキスト入力（例: `test`）

#### ボタン

- **実行**: リバースエンジニアリングを実行（主ボタン）
- **キャンセル**: モーダルを閉じる

### 初期値の優先順位

#### フロントエンド（モーダル表示時の初期値）

**接続情報（host, port, user, database）**:
1. **ViewModel.settings.lastDatabaseConnection**（前回成功した接続情報）
2. **空（placeholder表示）**

**パスワード**:
- 常に空（セキュリティのため環境変数があっても表示しない）
- 空のまま実行した場合、バックエンドで環境変数 `DB_PASSWORD` を自動的に使用

**placeholder表示**:
- 入力欄が空の場合、placeholderとして一般的な値を表示
  - Host: `localhost`
  - Port: `3306`
  - User: `root`
  - Database: `test`
  - Password: （placeholderなし）

#### バックエンド（接続情報解決時）

バックエンドでの接続情報解決の詳細は「バックエンドでの接続情報解決」セクションを参照。

### エラー表示

リバースエンジニアリング失敗時：
- モーダルはそのまま表示
- エラーメッセージをモーダル内に表示（例: 「認証失敗」「ホストに接続できません」）
- ユーザーが接続情報を修正して再実行可能

## データモデル仕様

### ViewModel への追加

データモデルは [scheme/main.tsp](/scheme/main.tsp) に定義されています。

追加された型：
- `DatabaseType`: データベース種別（mysql, postgresql）
- `DatabaseConnectionState`: 接続情報（passwordを除く）
- `AppSettings`: アプリケーション設定
  - `lastDatabaseConnection`: 前回成功した接続情報
- `ViewModel.settings`: アプリケーション設定フィールド

### パスワードの扱い

- **ViewModel には保存しない**（エクスポート時の漏洩を防ぐ）
- **API呼び出し時にのみ送信**（リクエストボディの別パラメータとして）
- **SessionStorage や LocalStorage にも保存しない**（セキュリティリスク回避）

## API仕様

### リバースエンジニアAPI の変更

API定義は [scheme/main.tsp](/scheme/main.tsp) を参照してください。

- `ReverseEngineerRequest`: リクエストモデル
  - `viewModel`: 現在のViewModel
  - `password`: データベース接続用パスワード
- `POST /api/reverse-engineer`: リバースエンジニアリングエンドポイント
  - リクエスト: `ReverseEngineerRequest`
  - レスポンス: `ViewModel | ErrorResponse`

### バックエンドでの接続情報解決

バックエンドは以下の優先順位で接続情報を解決：

**host, port, user, database**:
1. **`request.viewModel.settings.lastDatabaseConnection`**（前回成功時の接続情報）
   - フロントエンドから送信された `viewModel` に含まれる
2. **上記がない場合**: サーバー環境変数（`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`）
3. **環境変数もない場合**: エラー（接続情報不足）

**password**:
1. **`request.password`**（フロントエンドから送信されたパスワード）
2. **上記が空または未指定の場合**: サーバー環境変数（`DB_PASSWORD`）
3. **環境変数もない場合**: エラー（パスワード不足）

**備考**:
- フロントエンドは、モーダルで入力された値で `viewModel.settings.lastDatabaseConnection` を更新してから送信
- パスワードのみ別パラメータ `request.password` で送信
- バックエンドは受信した接続情報で接続を試行し、成功時にそのまま `lastDatabaseConnection` として確定
- 開発時は環境変数を設定しておくことで、パスワード入力を省略可能

### レスポンス仕様

成功時：
- 更新された `ViewModel` を返却
- `ViewModel.settings.lastDatabaseConnection` には今回の接続に成功した情報（passwordを除く）が設定される
- 次回のモーダル表示時、この値が初期値として使用される

失敗時：
- `ErrorResponse` を返却
- エラーメッセージには具体的な失敗理由を含める（認証エラー、接続エラー、DB不存在など）
- `lastDatabaseConnection` は更新されない

## UXフロー

### 正常フロー

1. ユーザーが「リバースエンジニア」ボタンを押下
2. **接続設定モーダルが表示される**
   - 前回成功した接続情報が初期値として表示（`lastDatabaseConnection`）
   - 上記がない場合は空（placeholderが表示される）
   - パスワード欄は常に空（セキュリティのため）
3. ユーザーが必要に応じて接続情報を編集・確認
   - パスワードを入力しなくても、環境変数 `DB_PASSWORD` があればバックエンドで自動使用される
4. ユーザーが「実行」ボタンを押下
5. フロントエンドが `ReverseEngineerRequest` を送信
   - `viewModel`: 現在のViewModel
   - `password`: ユーザーが入力したパスワード（空の場合もあり）
6. バックエンドがリバースエンジニアリングを実行
   - パスワードが空の場合は環境変数 `DB_PASSWORD` を使用
7. 成功したViewModelを受け取り、ストアを更新
8. モーダルを閉じる
9. ER図を表示

### エラーフロー

1. リバースエンジニアリング失敗（認証エラーなど）
2. モーダルは開いたまま
3. エラーメッセージをモーダル内に表示
4. ユーザーが接続情報を修正して再実行可能

### キャンセルフロー

1. モーダルの「キャンセル」ボタン押下
2. モーダルを閉じる
3. リバースエンジニアリングは実行されない

## フロントエンド実装概要

### 新規コンポーネント

- `DatabaseConnectionModal.tsx`: 接続設定モーダル
  - 接続情報入力フォーム
  - 実行・キャンセルボタン
  - エラーメッセージ表示エリア

### 状態管理

`GlobalUIState` にモーダル表示フラグを追加。詳細は [scheme/main.tsp](/scheme/main.tsp) を参照してください。

- `showDatabaseConnectionModal`: データベース接続設定モーダルの表示フラグ

### コマンド変更

`public/src/commands/reverseEngineerCommand.ts`:
1. モーダルから接続情報（host, port, user, database）とパスワードを取得
2. 現在のViewModelをコピーし、`settings.lastDatabaseConnection` を更新
   - type: `DatabaseType.mysql`
   - host, port, user, database: モーダルで入力された値
3. `ReverseEngineerRequest` 形式でリクエストを送信
   - `viewModel`: 更新後のViewModel
   - `password`: モーダルで入力されたパスワード（空の場合もあり）

## バックエンド実装概要

### Usecase 変更

`lib/usecases/ReverseEngineerUsecase.ts`:
- 引数を `(viewModel: ViewModel)` から `(request: ReverseEngineerRequest)` に変更
- 接続情報を以下の優先順位で解決：
  1. `request.viewModel.settings.lastDatabaseConnection`
  2. 環境変数（`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`）
  3. なければエラー
- パスワードを以下の優先順位で解決：
  1. `request.password`
  2. 環境変数（`DB_PASSWORD`）
  3. なければエラー
- 解決した接続情報でデータベースに接続
- 成功時、使用した接続情報で `viewModel.settings.lastDatabaseConnection` を確定して返却

### DatabaseManager 変更

`lib/database.ts`:
- `connect()` メソッドに外部設定を受け取れるよう変更
- `connect(config?: Partial<DatabaseConfig>)` のようにオプションで上書き可能に
- 接続解決ロジックを実装

## 将来の拡張性

### PostgreSQL 対応時の変更

- UIでDatabase Typeをドロップダウン選択可能に
- Type選択時にportの既定値を自動調整（MySQL: 3306, PostgreSQL: 5432）
- バックエンドでDatabaseType別の接続処理を実装

### 接続テスト機能（オプション）

MVPでは省略。将来追加する場合：
- モーダルに「接続テスト」ボタンを追加
- `POST /api/test-connection` エンドポイントを作成
- 接続のみテストして即座に切断、結果をモーダルに表示

## 関連仕様書

- [リバースエンジニアリング機能仕様](./reverse_engineering.md) - リバースエンジニアリング全体の仕様
- [ViewModelベースAPI仕様](./viewmodel_based_api.md) - API全体の設計方針
- [フロントエンド状態管理仕様](./frontend_state_management.md) - 状態管理の詳細
- [インポート・エクスポート機能仕様](./import_export_feature.md) - ViewModel保存時の考慮事項
- [scheme/main.tsp](/scheme/main.tsp) - 型定義
