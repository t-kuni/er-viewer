# タスク一覧

## 概要

増分リバースエンジニアリング機能の実装。詳細は以下の仕様書を参照：
- [増分リバース・エンジニアリング機能仕様](./spec/incremental_reverse_engineering.md)
- [リバースエンジニアリング機能仕様](./spec/reverse_engineering.md)

現状のReverseEngineerUsecaseは常に新規作成モード（エンティティを全件置き換え）で動作している。これを、既存のエンティティが存在する場合は差分のみを反映する増分更新モードに対応させる。

## バックエンド実装

### ReverseEngineerUsecaseの修正

- [ ] **ファイル**: `lib/usecases/ReverseEngineerUsecase.ts`
- [ ] **変更内容**: 増分リバースエンジニアリング機能を実装する
- [ ] **実装詳細**:
  - [ ] `viewModel.erDiagram.nodes`が空かどうかをチェックする処理を追加
    - 空の場合: 現在の実装のまま（全件新規作成モード）
    - 空でない場合: 増分更新モード
  - [ ] 増分更新モードの実装:
    - [ ] **エンティティのマッチング処理**:
      - データベースから取得したテーブル名と既存ノードのテーブル名（`Entity.name`）で比較
      - マッチしたエンティティのid、x座標、y座標を保持するMapを作成（キー: テーブル名、値: {id, x, y}）
    - [ ] **エンティティの差分反映**:
      - マッチしたエンティティ: 既存のid、x、yを維持し、カラム情報を最新データで置き換え、ddlを更新
      - 新規エンティティ: 新しいidを生成し、既存エンティティの最大座標を基準に配置
        - 既存エンティティの最大X座標 + 300px（横方向の間隔）から開始
        - 既存エンティティの最大Y座標と同じ行から開始
        - 1行あたり4エンティティで折り返し（縦方向の間隔は200px）
      - 削除エンティティ: ViewModelから削除（データベースに存在しないエンティティ）
    - [ ] **カラムの全件置き換え**:
      - すべてのカラムに新しいidを生成
      - type、nullable、key、default、extraはデータベースの最新情報を反映
    - [ ] **リレーションシップの全件置き換え**:
      - すべてのリレーションシップに新しいidを生成
      - マッチしたエンティティのIDを使用してリレーションシップを構築
      - 削除されたエンティティに関連するリレーションシップは自動的に除外
    - [ ] **矩形・テキストの維持**:
      - `erDiagram.rectangles`の内容をそのまま維持
      - `erDiagram.ui.layerOrder`内のrectangleとtextの参照を維持
    - [ ] **UI状態のクリア**:
      - `erDiagram.ui.highlightedNodeIds`をクリア（空配列に設定）
      - `erDiagram.ui.highlightedEdgeIds`をクリア（空配列に設定）
      - `erDiagram.ui.highlightedColumnIds`をクリア（空配列に設定）
      - カラムとエッジのIDが新しく生成されるため、古いIDでの参照は無効になる
    - [ ] **レイヤー順序の更新**:
      - 削除されたエンティティのIDが`erDiagram.ui.layerOrder.backgroundItems`または`foregroundItems`に含まれている場合、該当する参照を削除
      - `LayerItemRef`の`type`が`"entity"`で、`id`が削除されたエンティティのIDと一致する要素を除外
- [ ] **参考実装**:
  - 現在の実装（58-71行目）は新規作成モードの処理として残す
  - 増分更新モードは別の処理フローとして実装
  - エンティティのマッチングには`Map`を使用すると効率的
  - 新規エンティティの配置計算には`Math.max()`で既存エンティティの最大座標を取得

### ReverseEngineerUsecaseのテストコード追加

- [ ] **ファイル**: `tests/usecases/ReverseEngineerUsecase.test.ts`
- [ ] **変更内容**: 増分リバースエンジニアリング機能のテストケースを追加
- [ ] **追加するテストケース**:
  - [ ] **既存エンティティの座標維持テスト**:
    - 既存のViewModelに`users`テーブルのノード（座標 x:100, y:200）を設定
    - リバースエンジニアリングを実行
    - `users`テーブルのノードのx、y座標が維持されることを確認
    - `users`テーブルのカラム情報が最新に更新されることを確認（idは新しく生成される）
  - [ ] **新規エンティティの追加テスト**:
    - 既存のViewModelに一部のテーブルのみ設定
    - `erviewer-2`スキーマに接続してリバースエンジニアリングを実行
    - データベースに存在するが既存ViewModelに存在しないテーブル（例: `task_comments`）が追加されることを確認
    - 新規エンティティが既存エンティティの右側・下側に配置されることを確認
  - [ ] **削除エンティティの除外テスト**:
    - 既存のViewModelに存在するが`erviewer-2`スキーマには存在しないテーブル（例: `activities`）を設定
    - リバースエンジニアリングを実行
    - `activities`テーブルのノードが削除されることを確認
  - [ ] **カラム変更の反映テスト**:
    - `erviewer`スキーマと`erviewer-2`スキーマでカラムが異なるテーブルをテスト
    - 例: `users.first_name` → `users.given_name`への変更
    - 既存のViewModelに`erviewer`のカラム情報を設定し、`erviewer-2`に接続して実行
    - カラムが最新情報に更新されることを確認
  - [ ] **UI状態のクリアテスト**:
    - 既存のViewModelに`highlightedNodeIds`、`highlightedEdgeIds`、`highlightedColumnIds`を設定
    - リバースエンジニアリングを実行
    - すべてのハイライト状態が空配列になることを確認
  - [ ] **レイヤー順序の更新テスト**:
    - 既存のViewModelのレイヤー順序に削除予定のエンティティ（例: `activities`）を設定
    - リバースエンジニアリングを実行
    - レイヤー順序から削除されたエンティティの参照が除外されることを確認
    - 残存するエンティティや矩形・テキストの参照は維持されることを確認
  - [ ] **矩形・テキストの維持テスト**:
    - 既存のViewModelに矩形とテキストを設定
    - リバースエンジニアリングを実行
    - 矩形とテキストがそのまま維持されることを確認
- [ ] **テスト実装のポイント**:
  - init.sqlの`erviewer`と`erviewer-2`スキーマの差分を利用する
  - 環境変数`DB_NAME`を`erviewer-2`に設定してテストを実行
  - 既存のテストケースを参考にViewModelを構築

## ビルド・テスト

### ビルド確認

- [ ] `npm run generate`を実行してコード生成を確認
- [ ] バックエンドとフロントエンドのビルドが成功することを確認

### テスト実行

- [ ] `npm run test`を実行してすべてのテストが成功することを確認
- [ ] 特に追加した増分リバースエンジニアリングのテストケースが成功することを確認

## 備考

### データベーススキーマの差分

init.sqlの`erviewer`と`erviewer-2`スキーマには以下の差分が存在する（テストに活用できる）:

- **テーブル名変更**: `user_profiles` → `profiles`
- **カラム名変更**: `users.first_name` → `users.given_name`
- **カラム追加**: `users.phone_number`
- **カラム削除**: `users.avatar_url`
- **カラム型変更**: `projects.budget`: DECIMAL(12,2) → DECIMAL(15,2)
- **テーブル追加**: `task_comments`、`subscriptions`、`audit_logs`
- **テーブル削除**: `activities`
- **外部キー制約変更**: `user_roles.assigned_by`のON DELETE: SET NULL → RESTRICT

### 既存の仕様との整合性

- レイアウト定数（横間隔300px、縦間隔200px、1行あたり4エンティティ、開始座標(50,50)）は既存の実装と同じ
- ViewModelベースAPIの設計は変更なし（リクエストでViewModelを受け取り、更新後のViewModelを返却）
