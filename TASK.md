# タスク一覧: リバースエンジニアリングAPI設計変更

## 概要

リバースエンジニアリングAPIの設計を変更し、バックエンドとフロントエンドの責務を明確に分離します。

### 変更の概要
- **バックエンド**: データベースからERDataを取得して返却するのみ（マージロジックを削除）
- **フロントエンド**: 受け取ったERDataを既存ViewModelとマージ（マージロジックを追加）

### 関連仕様書
- [spec/database_connection_settings.md](./spec/database_connection_settings.md)
- [spec/incremental_reverse_engineering.md](./spec/incremental_reverse_engineering.md)
- [spec/reverse_engineering.md](./spec/reverse_engineering.md)
- [spec/viewmodel_based_api.md](./spec/viewmodel_based_api.md)

## フェーズ1: バックエンドの修正

### 1-1. APIスキーマの型生成

**目的**: TypeSpecで定義した新しいAPIスキーマから型を生成する

**作業内容**:
- `npm run generate` を実行
- `lib/generated/api-types.ts` と `public/src/api/client/` が更新されることを確認

**確認方法**:
- 生成されたファイルを確認
- `ReverseEngineerRequest` が接続情報フィールド（type, host, port, user, password, database）を持つこと
- `ReverseEngineerResponse` が `erData` と `connectionInfo` を持つこと
- `LayoutData` と `EntityLayoutItem` が削除されていること

**対象ファイル**:
- `lib/generated/api-types.ts` (生成)
- `public/src/api/client/models/` (生成)

---

### 1-2. ReverseEngineerUsecaseの修正

**目的**: バックエンドのUsecaseをシンプル化し、マージロジックを削除する

**作業内容**:
1. `ReverseEngineerUsecase.ts` を修正:
   - 引数を `(request: ReverseEngineerRequest)` に変更
   - 戻り値を `Promise<ReverseEngineerResponse>` に変更
   - リクエストから直接接続情報を取得（viewModel経由を削除）
   - パスワードが空文字列の場合のみ環境変数フォールバック
   - マージロジック（増分更新）をすべて削除
   - ERDataを生成して返却
   - `connectionInfo` を返却（パスワードを除く）
2. 不要なインポートを削除:
   - `EntityNodeViewModel`, `RelationshipEdgeViewModel`, `LayerItemRef` など
   - `buildERDiagramIndex` のインポートも削除

**確認方法**:
- 型エラーがないこと
- ビルドが成功すること

**対象ファイル**:
- `lib/usecases/ReverseEngineerUsecase.ts`

**実装のポイント**:
- リクエストの接続情報をそのまま使用
- パスワードが空文字列（`""`）の場合のみ `process.env.DB_PASSWORD` をフォールバック
- 環境変数からの接続情報取得ロジックを削除
- ViewModelの更新ロジックを削除
- 増分更新のマッチングロジックを削除

---

### 1-3. DatabaseManagerの修正

**目的**: 不要な型定義とメソッドを削除する

**作業内容**:
1. `lib/database.ts` を修正:
   - `generateDefaultLayoutData` メソッドを削除
   - `LayoutData`, `EntityLayoutItem`, `Rectangle`, `TextBox` の型インポートを削除
2. エクスポートから不要な型を削除

**確認方法**:
- 型エラーがないこと
- ビルドが成功すること

**対象ファイル**:
- `lib/database.ts`

---

### 1-4. サーバーエンドポイントの確認

**目的**: サーバーのエンドポイントが新しいリクエスト/レスポンス型を正しく処理することを確認する

**作業内容**:
1. `server.ts` を確認:
   - `/api/reverse-engineer` エンドポイントが `ReverseEngineerRequest` を受け取ること
   - `ReverseEngineerResponse` を返却すること
2. 必要に応じて型アノテーションを修正

**確認方法**:
- 型エラーがないこと
- ビルドが成功すること

**対象ファイル**:
- `server.ts`

---

### 1-5. バックエンドのテストコード修正

**目的**: ReverseEngineerUsecaseのテストを新しいAPI仕様に合わせて修正する

**作業内容**:
1. `tests/usecases/ReverseEngineerUsecase.test.ts` を修正:
   - テストケースのリクエスト形式を変更（viewModelではなく接続情報）
   - レスポンスの検証を変更（ViewModelではなくReverseEngineerResponse）
   - 増分更新のテストケースをすべて削除（フロントエンドに移行するため）
   - 環境変数フォールバックのテストケースを簡略化
   - 接続情報の検証ロジックを修正

**テストケース**:
- 基本的なリバースエンジニアリング（接続情報を直接指定）
- パスワードの環境変数フォールバック
- 接続情報不足時のエラー
- 接続エラー時のエラー処理

**削除するテストケース**:
- 増分リバースエンジニアリングのテストケース（6つ）
- `viewModel.settings.lastDatabaseConnection` からの接続情報取得テスト
- UI状態の引き継ぎテスト
- レイヤー順序の更新テスト

**対象ファイル**:
- `tests/usecases/ReverseEngineerUsecase.test.ts`

---

### 1-6. バックエンドのビルド確認

**目的**: バックエンドのコードがエラーなくビルドできることを確認する

**作業内容**:
- `npm run build` を実行（またはバックエンドのビルドコマンド）

**確認方法**:
- ビルドが成功すること
- エラーや警告が出ないこと

---

### 1-7. バックエンドのテスト実行

**目的**: バックエンドのテストがすべて成功することを確認する

**作業内容**:
- `npm run test` を実行（またはバックエンドのテストコマンド）

**確認方法**:
- すべてのテストが成功すること
- ReverseEngineerUsecaseのテストが正しく動作すること

---

## フェーズ2: フロントエンドの修正

### 2-1. マージActionの実装

**目的**: ERDataを既存ViewModelとマージするActionを実装する

**作業内容**:
1. `public/src/actions/dataActions.ts` に `actionMergeERData` を追加:
   - `actionMergeERData(viewModel: ViewModel, erData: ERData, connectionInfo: DatabaseConnectionState): ViewModel` 関数を実装
   - エンティティのマッチング処理（テーブル名で比較）
   - 既存エンティティのID・座標維持
   - 新規エンティティの配置計算
   - カラム情報の全件置き換え
   - リレーションシップの全件置き換え
   - 削除されたエンティティのレイヤー順序からの削除
   - UI状態のクリア（highlightedNodeIds等）
   - 矩形・テキストの維持
   - 逆引きインデックスの再計算
   - `settings.lastDatabaseConnection`の更新

**実装のポイント**:
- 既存のマッチングロジックは `ReverseEngineerUsecase.ts` の増分更新部分を参考にする
- `buildERDiagramIndex` を使用してインデックスを再計算
- 新規エンティティの配置は既存エンティティの最大座標を基準にする
- 純粋関数として実装（副作用なし、状態変更なしの場合は同一参照を返す）

**対象ファイル**:
- `public/src/actions/dataActions.ts`

---

### 2-2. reverseEngineerCommandの修正

**目的**: フロントエンドのコマンドを新しいAPI仕様に合わせて修正する

**作業内容**:
1. `public/src/commands/reverseEngineerCommand.ts` を修正:
   - リクエストの作成を変更（ViewModelではなく接続情報のみ）
   - レスポンスで受け取った `erData` と `connectionInfo` を `actionMergeERData` でマージ
   - `dispatch(actionMergeERData, response.erData, response.connectionInfo)` を実行

**実装のポイント**:
- `actionMergeERData` をインポートして使用
- パスワードが空の場合は空文字列として送信
- モーダルから取得した接続情報をそのままリクエストに使用
- マージ処理はActionに委譲（コマンドはAPI呼び出しとActionのdispatchのみ）

**対象ファイル**:
- `public/src/commands/reverseEngineerCommand.ts`

---

### 2-3. マージActionのテスト作成

**目的**: マージActionが正しく動作することを確認するテストを作成する

**作業内容**:
1. `public/tests/actions/dataActions.test.ts` に `actionMergeERData` のテストを追加（または専用ファイル作成）:
   - 新規作成モード（既存ノードが空）のテスト
   - 増分更新モード（既存エンティティの座標維持）のテスト
   - 新規エンティティの追加テスト
   - 削除エンティティの除外テスト
   - カラム変更の反映テスト
   - リレーションシップの全件置き換えテスト
   - UI状態のクリアテスト
   - レイヤー順序の更新テスト
   - 矩形・テキストの維持テスト
   - 逆引きインデックスの再計算テスト
   - `settings.lastDatabaseConnection`の更新テスト

**参考**:
- `tests/usecases/ReverseEngineerUsecase.test.ts` の増分更新テストケースを参考にする
- 純粋関数なので、入力（viewModel + erData + connectionInfo）と出力（newViewModel）の検証のみ

**対象ファイル**:
- `public/tests/actions/dataActions.test.ts` または `public/tests/actions/mergeERData.test.ts` (新規作成)

---

### 2-4. フロントエンドのビルド確認

**目的**: フロントエンドのコードがエラーなくビルドできることを確認する

**作業内容**:
- `cd public && npm run build` を実行

**確認方法**:
- ビルドが成功すること
- エラーや警告が出ないこと

---

### 2-5. フロントエンドのテスト実行

**目的**: フロントエンドのテストがすべて成功することを確認する

**作業内容**:
- `cd public && npm run test` を実行

**確認方法**:
- すべてのテストが成功すること
- マージユーティリティのテストが正しく動作すること

---

## 完了条件

- [ ] フェーズ1のすべてのタスクが完了
  - [ ] バックエンドのビルドが成功
  - [ ] バックエンドのテストが成功
- [ ] フェーズ2のすべてのタスクが完了
  - [ ] フロントエンドのビルドが成功
  - [ ] フロントエンドのテストが成功
- [ ] 仕様書の内容と実装が一致していること

## 備考

### 主な変更点の整理

**APIスキーマ（scheme/main.tsp）**:
- `ReverseEngineerRequest`: `viewModel`と`password`の代わりに、接続情報フィールド（type, host, port, user, password, database）を追加
- `ReverseEngineerResponse`: 新規追加（`erData`と`connectionInfo`）
- `LayoutData`と`EntityLayoutItem`: 削除

**バックエンド**:
- 接続情報の解決ロジックを簡略化（リクエストから直接取得）
- マージロジックをすべて削除
- ERDataを生成して返却するだけ

**フロントエンド**:
- マージロジックをActionとして新規実装（`actionMergeERData`）
- 逆引きインデックスの再計算を実装
- `settings.lastDatabaseConnection`の更新を実装
- フロントエンド状態管理仕様のAction層パターンに準拠

### 注意点

1. **パスワードのフォールバック**:
   - フロントエンドから空文字列が送信された場合のみ、バックエンドで環境変数をフォールバック
   - それ以外のフィールドは環境変数フォールバックなし

2. **増分更新ロジック**:
   - バックエンドから完全に削除
   - フロントエンドで`actionMergeERData`として実装
   - Action層の設計パターンに準拠（純粋関数、テスト容易）

3. **逆引きインデックス**:
   - バックエンドでは計算しない
   - フロントエンドでマージ後に再計算

4. **テストの移行**:
   - バックエンドの増分更新テストは削除
   - フロントエンドのActionテストとして再実装
