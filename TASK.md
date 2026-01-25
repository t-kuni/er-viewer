# データベース接続設定機能実装タスク

データベース接続設定モーダルUIを追加し、リバースエンジニアリング実行時にユーザーが接続情報を入力・確認できるようにする。

**関連仕様書**:
- [データベース接続設定仕様](/spec/database_connection_settings.md)
- [リバースエンジニアリング機能仕様](/spec/reverse_engineering.md)
- [ViewModelベースAPI仕様](/spec/viewmodel_based_api.md)
- [scheme/main.tsp](/scheme/main.tsp)

---

## フェーズ1: バックエンドの修正

### ✅ 型定義の生成

**編集対象**: `lib/generated/api-types.ts`, `public/src/api/client/`

**変更点**:
- `npm run generate` を実行して、`scheme/main.tsp` から更新された型定義を生成
- 以下の型が生成されることを確認:
  - `DatabaseType` enum
  - `DatabaseConnectionState` model
  - `AppSettings` model
  - `ReverseEngineerRequest` model
  - `ViewModel.settings` フィールド
  - `GlobalUIState.showDatabaseConnectionModal` フィールド

**備考**: すでにmain.tspは更新されているため、generateコマンドの実行のみ

---

### ✅ DatabaseManager の修正

**編集対象**: `lib/database.ts`

**変更点**:
- `connect()` メソッドのシグネチャを変更し、外部から接続設定を上書き可能にする
  - `async connect(config?: Partial<DatabaseConfig>): Promise<void>`
- 接続情報解決ロジックを実装:
  - 優先順位: 引数で渡された`config` > 環境変数 > エラー
  - host, port, user, database, password すべてについて解決
- 環境変数からのフォールバック処理を維持

**インタフェース**:
```typescript
async connect(config?: Partial<DatabaseConfig>): Promise<void>
```

**参照**: [データベース接続設定仕様 - DatabaseManager変更](/spec/database_connection_settings.md#databasemanager-変更)

---

### ✅ ReverseEngineerUsecase の修正

**編集対象**: `lib/usecases/ReverseEngineerUsecase.ts`

**変更点**:
- 引数を `viewModel: ViewModel` から `request: ReverseEngineerRequest` に変更
- 接続情報解決ロジックを実装:
  1. `request.viewModel.settings.lastDatabaseConnection` から取得（存在する場合）
  2. 上記がない場合は環境変数（`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`）
  3. どちらもない場合はエラー
- パスワード解決ロジックを実装:
  1. `request.password` から取得（存在し、空でない場合）
  2. 上記がない場合は環境変数（`DB_PASSWORD`）
  3. どちらもない場合はエラー
- 解決した接続情報を `DatabaseManager.connect(config)` に渡す
- 成功時、`viewModel.settings.lastDatabaseConnection` に接続情報（passwordを除く）をセット
- 既存の`settings`フィールドがない場合は新規作成

**インタフェース変更**:
```typescript
// 変更前
(viewModel: ViewModel): Promise<ViewModel>

// 変更後
(request: ReverseEngineerRequest): Promise<ViewModel>
```

**参照**: [データベース接続設定仕様 - Usecase変更](/spec/database_connection_settings.md#usecase-変更)

---

### ✅ サーバーエンドポイントの修正

**編集対象**: `server.ts`

**変更点**:
- `/api/reverse-engineer` エンドポイントのリクエストボディ受け取りを変更
  - 変更前: `req.body` を `viewModel` として扱う
  - 変更後: `req.body` を `ReverseEngineerRequest` として扱う
- エラーレスポンスを `{ error: string }` 形式で返却（既存と同じ）

**変更箇所**:
```typescript
// 変更前
const viewModel = req.body;
const updatedViewModel = await reverseEngineerUsecase(viewModel);

// 変更後
const request = req.body; // ReverseEngineerRequest型
const updatedViewModel = await reverseEngineerUsecase(request);
```

---

### ✅ ReverseEngineerUsecase のテスト修正

**編集対象**: `tests/usecases/ReverseEngineerUsecase.test.ts`

**変更点**:
- テストの入力を `ViewModel` から `ReverseEngineerRequest` 形式に変更
- テストケース追加:
  - `viewModel.settings.lastDatabaseConnection` を使用した接続情報解決のテスト
  - `request.password` を使用したパスワード解決のテスト
  - 環境変数フォールバックのテスト
  - 接続情報・パスワードがどちらもない場合のエラーテスト
- 成功時に `viewModel.settings.lastDatabaseConnection` が更新されることを検証

**参照**: [データベース接続設定仕様 - バックエンドでの接続情報解決](/spec/database_connection_settings.md#バックエンドでの接続情報解決)

---

### ✅ バックエンドのビルド確認

**コマンド**: `npm run generate && npm run build`（バックエンドのビルド）

**確認事項**:
- TypeScriptのコンパイルエラーがないこと
- 型定義が正しく生成されていること

---

### ✅ バックエンドのテスト実行

**コマンド**: `npm run test`

**確認事項**:
- 既存のテストが通ること
- 新規追加したテストが通ること

---

## フェーズ2: フロントエンドの修正

### ✅ GlobalUIActions の追加

**編集対象**: `public/src/actions/globalUIActions.ts`

**変更点**:
- `actionShowDatabaseConnectionModal` を追加
  - `showDatabaseConnectionModal` を `true` にセット
  - 既存の `actionShowBuildInfoModal` と同様の実装
- `actionHideDatabaseConnectionModal` を追加
  - `showDatabaseConnectionModal` を `false` にセット
  - 既存の `actionHideBuildInfoModal` と同様の実装

**インタフェース**:
```typescript
export function actionShowDatabaseConnectionModal(viewModel: ViewModel): ViewModel
export function actionHideDatabaseConnectionModal(viewModel: ViewModel): ViewModel
```

**参照**: [データベース接続設定仕様 - 状態管理](/spec/database_connection_settings.md#状態管理)

---

### ✅ DatabaseConnectionModal コンポーネントの作成

**新規作成**: `public/src/components/DatabaseConnectionModal.tsx`

**実装内容**:
- モーダルコンポーネント（背景クリックで閉じない、ESCキーで閉じる）
- 入力フィールド:
  - Database Type: 固定表示（"MySQL"）
  - Host: テキスト入力（placeholder: "localhost"）
  - Port: 数値入力（placeholder: "3306"）
  - User: テキスト入力（placeholder: "root"）
  - Password: パスワード入力（マスク表示、placeholderなし）
  - Database: テキスト入力（placeholder: "test"）
- ボタン:
  - 実行: リバースエンジニアリング実行
  - キャンセル: モーダルを閉じる
- エラーメッセージ表示エリア
- 初期値:
  - `viewModel.settings?.lastDatabaseConnection` から取得
  - パスワードは常に空

**Props**:
```typescript
interface DatabaseConnectionModalProps {
  onExecute: (connectionInfo: DatabaseConnectionState, password: string) => void;
  onCancel: () => void;
  initialValues?: DatabaseConnectionState;
  errorMessage?: string;
}
```

**UI仕様**: [データベース接続設定仕様 - モーダルUI要素](/spec/database_connection_settings.md#モーダルui要素)

**参考コンポーネント**: `BuildInfoModal.tsx`（モーダル実装の参考）

---

### ✅ reverseEngineerCommand の修正

**編集対象**: `public/src/commands/reverseEngineerCommand.ts`

**変更点**:
- 引数を追加して接続情報とパスワードを受け取る
  - `connectionInfo: DatabaseConnectionState`
  - `password: string`
- 現在のViewModelをコピーし、`settings.lastDatabaseConnection` を更新
- `ReverseEngineerRequest` 形式でリクエストを送信
  - `viewModel`: 更新後のViewModel
  - `password`: 引数で受け取ったパスワード
- エラー時の処理を追加（エラーメッセージを返却）

**インタフェース変更**:
```typescript
// 変更前
export async function commandReverseEngineer(
  dispatch: Store['dispatch'],
  getState: Store['getState']
): Promise<void>

// 変更後
export async function commandReverseEngineer(
  dispatch: Store['dispatch'],
  getState: Store['getState'],
  connectionInfo: DatabaseConnectionState,
  password: string
): Promise<{ success: boolean; error?: string }>
```

**参照**: [データベース接続設定仕様 - コマンド変更](/spec/database_connection_settings.md#コマンド変更)

---

### ✅ App.tsx の修正

**編集対象**: `public/src/components/App.tsx`

**変更点**:
- 「リバースエンジニア」ボタンを追加（ヘッダー内）
- ボタン押下時に `actionShowDatabaseConnectionModal` をdispatch
- `DatabaseConnectionModal` コンポーネントを条件付きレンダリング
  - 表示条件: `viewModel.ui.showDatabaseConnectionModal === true`
- モーダルの `onExecute` で `commandReverseEngineer` を呼び出し
- モーダルの `onCancel` で `actionHideDatabaseConnectionModal` をdispatch
- エラー処理: コマンド失敗時にエラーメッセージをモーダルに表示

**参考実装**: BuildInfoModalの表示制御（既存実装）

**参照**: [データベース接続設定仕様 - UXフロー](/spec/database_connection_settings.md#uxフロー)

---

### ✅ getInitialViewModelValues の修正

**編集対象**: `public/src/utils/getInitialViewModelValues.ts`

**変更点**:
- `getInitialGlobalUIState()` 関数に `showDatabaseConnectionModal: false` を追加

**変更箇所**:
```typescript
export function getInitialGlobalUIState(): GlobalUIState {
  return {
    selectedItem: null,
    showBuildInfoModal: false,
    showLayerPanel: false,
    showDatabaseConnectionModal: false, // 追加
  };
}
```

---

### ✅ GlobalUIActions のテスト追加

**編集対象**: `public/tests/actions/globalUIActions.test.ts`

**変更点**:
- `actionShowDatabaseConnectionModal` のテスト追加
  - `showDatabaseConnectionModal` が `true` になることを検証
  - 既に `true` の場合、同一参照を返すことを検証
- `actionHideDatabaseConnectionModal` のテスト追加
  - `showDatabaseConnectionModal` が `false` になることを検証
  - 既に `false` の場合、同一参照を返すことを検証

**参考**: 既存の `actionShowBuildInfoModal` / `actionHideBuildInfoModal` のテスト

---

### ✅ フロントエンドのビルド確認

**コマンド**: `cd public && npm run build`

**確認事項**:
- TypeScriptのコンパイルエラーがないこと
- Reactコンポーネントが正しくビルドされること

---

### ✅ フロントエンドのテスト実行

**コマンド**: `cd public && npm run test`

**確認事項**:
- 既存のテストが通ること
- 新規追加したテストが通ること

---

## 補足事項

### 実装の注意点

- パスワードは `ViewModel` に保存せず、API呼び出し時のみ送信する
- モーダルのパスワード欄は常に空で表示（セキュリティのため）
- エラー時はモーダルを開いたまま、エラーメッセージを表示
- 成功時のみ `lastDatabaseConnection` を更新
- 環境変数がある場合、パスワード入力を省略可能（開発時の利便性）

### 既存機能への影響

- `GetInitialViewModelUsecase` の修正は不要（`settings` は optional なのでデフォルトで未設定でOK）
- インポート・エクスポート機能は既に `settings` フィールドに対応済み（仕様書更新済み）
- 既存のリバースエンジニアリング機能は、接続情報入力UI追加により改善される
