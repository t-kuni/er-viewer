# リバースエンジニアリング機能仕様

## 概要

データベースからER図を自動生成（リバースエンジニアリング）し、ブラウザ上で表示する機能の仕様。データベースのスキーマ情報を読み取り、ERDataとデフォルトのLayoutDataを生成してフロントエンドに返却する。

## 機能要件

### リバースエンジニアリング処理

- データベースに接続してスキーマ情報を取得
- テーブル情報（Entity）とリレーション情報（Relationship）を抽出してERDataを生成
- エンティティの配置情報を含むデフォルトのLayoutDataを生成
- ERDataとLayoutDataを1つのAPIレスポンスとして返却

### デフォルトLayoutDataの生成ルール

- エンティティを等間隔に配置する
- 配置アルゴリズム：
  - グリッドレイアウト方式を採用
  - エンティティを左上から順に配置
  - 横方向の間隔：固定値（例：300px）
  - 縦方向の間隔：固定値（例：200px）
  - 1行あたりのエンティティ数：固定値または画面幅に基づく計算値
- rectangles（矩形）とtexts（テキスト）は空の配列で返却
- 配置の最適化やグラフレイアウトアルゴリズムは対象外（MVP段階では実装しない）

### 画面操作フロー

1. ユーザーが画面上の「リバースエンジニア」ボタンを押下
2. フロントエンドが`POST /api/reverse-engineer`を呼び出し
3. バックエンドがERDataとLayoutDataを返却
4. フロントエンドがcanvas上にER図をレンダリング
5. この処理では、フロントエンドはERDataとLayoutDataを編集せず、受け取ったデータをそのまま表示

## API仕様

### エンドポイント

```
POST /api/reverse-engineer
```

### リクエスト

- ボディなし
- 環境変数で設定されたデータベースに接続

### レスポンス

`ReverseEngineerResponse`または`ErrorResponse`を返却。

型定義の詳細は[scheme/main.tsp](/scheme/main.tsp)を参照。

**レスポンスに含まれるデータ**

- `erData`: データベースから取得したER図データ（Entity、Relationship）
- `layoutData`: デフォルトの配置情報
  - `entities`: エンティティID（UUID）をキーとした座標のマップ（Record<EntityLayoutItem>）
  - `rectangles`: 空配列（リバース時は未使用）
  - `texts`: 空配列（リバース時は未使用）


## バックエンド処理仕様

### 処理フロー

1. データベースに接続
2. ERDataを生成
3. デフォルトのLayoutDataを生成
4. ERDataとLayoutDataを含むレスポンスを返却
5. データベースから切断

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

### UI要素

- 「リバースエンジニア」ボタン
- React Flowベースのインタラクティブなキャンバス

### 処理フロー

1. 「リバースエンジニア」ボタン押下
2. `POST /api/reverse-engineer` API呼び出し
3. レスポンスから`erData`と`layoutData`を取得
4. ERData + LayoutDataをReact Flowのnodesとedgesにマッピングしてレンダリング
   - エンティティを`layoutData.entities`の座標に配置
   - リレーションシップを直角ポリライン（smoothstepエッジ）で描画
5. エラー時はエラーメッセージを表示

### データの取り扱い

- この機能では、フロントエンドはERDataとLayoutDataを編集しない
- 受け取ったデータをそのまま表示のみ行う
- React Flowの標準機能（ズーム、パン）は有効

## 実現可能性の検証

### 技術的実現性

- **データベース接続**: 既存の`DatabaseManager`クラスで実装済み
- **ERData生成**: 既存の`dbManager.generateERData()`で実装済み
- **LayoutData生成**: シンプルなグリッドレイアウトは容易に実装可能
- **API定義**: TypeSpecで型定義を追加し、コード生成で型安全性を確保
- **フロントエンド描画**: React + React Flowで実装（[frontend_er_rendering.md](/spec/frontend_er_rendering.md)参照）

### 懸念事項

- **エンティティ数が多い場合の表示**: グリッドレイアウトでは縦に長くなる可能性がある
  - 対処：React Flowの標準機能（ズーム、パン、スクロール）で対応
- **React Flowの学習コスト**: チームのReact習熟度によっては学習が必要
  - 対処：MVP段階では最小限の機能で実装し、段階的に拡張

### 確認事項

- **1行あたりのエンティティ数**: 固定値（4など）で良いか、画面幅に応じて動的に計算するか？
  - 提案：MVP段階では固定値で実装し、後で動的計算に変更
- **エラーハンドリング**: データベース接続エラー時の表示方法は？
  - 提案：モーダルまたはインラインでエラーメッセージを表示

## 関連仕様書

- [scheme/main.tsp](/scheme/main.tsp) - API型定義
- [TypeSpec API定義仕様](/spec/typespec_api_definition.md) - API定義方法とビルドプロセス
- [リアーキテクチャ仕様](/spec/rearchitecture_overview.md) - システム全体構成
