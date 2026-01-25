# リバースエンジニアリング機能仕様

## 概要

データベースからER図を自動生成（リバースエンジニアリング）し、ブラウザ上で表示する機能の仕様。データベースのスキーマ情報を読み取り、ViewModelを構築してフロントエンドに返却する。

**API仕様の詳細**: [ViewModelベースAPI仕様](./viewmodel_based_api.md)を参照

## 機能要件

### リバースエンジニアリング処理

- データベースに接続してスキーマ情報を取得
- テーブル情報（Entity）とリレーション情報（Relationship）を抽出
- エンティティの配置情報を含むER図データをViewModelに構築
- リクエストで受け取ったViewModelを更新して返却

### 画面操作フロー

1. ユーザーが画面上の「リバースエンジニア」ボタンを押下
2. データベース接続設定モーダルが表示される（詳細は[データベース接続設定仕様](./database_connection_settings.md)を参照）
3. ユーザーが接続情報を入力して「実行」ボタンを押下
4. フロントエンドが現在のViewModelと接続情報を`POST /api/reverse-engineer`に送信
5. バックエンドが更新後のViewModelを返却
6. フロントエンドがcanvas上にER図をレンダリング

## バックエンド処理仕様

### 処理フロー

1. データベースに接続
2. スキーマ情報からエンティティとリレーションシップを抽出
3. デフォルトレイアウトでER図を構築
4. ViewModelのerDiagramを更新
5. 更新後のViewModelを返却
6. データベースから切断

### デフォルトレイアウト仕様

**配置アルゴリズム**: グリッドレイアウト

**配置定数**
- 横方向の間隔: 300px
- 縦方向の間隔: 200px
- 1行あたりのエンティティ数: 4
- 開始X座標: 50px
- 開始Y座標: 50px

**座標計算**
- i番目のエンティティの列位置: `i % 4`
- i番目のエンティティの行位置: `floor(i / 4)`
- x座標: `50 + (列位置 × 300)`
- y座標: `50 + (行位置 × 200)`

## フロントエンド仕様

フロントエンドの状態管理については[フロントエンド状態管理仕様](./frontend_state_management.md)を参照。

### UI要素

- 「リバースエンジニア」ボタン
- React Flowベースのインタラクティブなキャンバス

### 処理フロー

1. 「リバースエンジニア」ボタン押下
2. 現在のViewModelを`POST /api/reverse-engineer`に送信
3. レスポンスで受け取ったViewModelでストアを更新
4. ViewModelをReact Flowのnodesとedgesにマッピングしてレンダリング
5. エラー時はエラーメッセージを表示

## 増分リバースエンジニアリング

既存のレイアウトを維持したまま差分を反映する機能。詳細は[増分リバース・エンジニアリング機能仕様](./incremental_reverse_engineering.md)を参照。

## 関連仕様書

- [増分リバース・エンジニアリング機能仕様](./incremental_reverse_engineering.md) - 増分更新の詳細
- [データベース接続設定仕様](./database_connection_settings.md) - データベース接続情報の入力・管理
- [ViewModelベースAPI仕様](./viewmodel_based_api.md) - API仕様の詳細
- [フロントエンド状態管理仕様](./frontend_state_management.md) - フロントエンドの状態管理
- [scheme/main.tsp](/scheme/main.tsp) - API型定義
- [TypeSpec API定義仕様](/spec/typespec_api_definition.md) - API定義方法とビルドプロセス
- [リアーキテクチャ仕様](/spec/rearchitecture_overview.md) - システム全体構成
