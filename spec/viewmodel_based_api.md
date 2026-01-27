# ViewModel ベースAPI仕様

## 概要

バックエンドAPIをViewModel中心の設計に刷新する。すべてのAPIはViewModelを入出力とすることで、フロントエンドとバックエンドの状態管理を統一し、型安全性を高める。

## 基本方針

- **ViewModelベースの通信**: すべてのAPIリクエスト・レスポンスはViewModel型を使用
- **初期化API**: 新規に`GET /api/init`を追加し、初期状態のViewModelを返却
- **BuildInfo統合**: BuildInfoはinitAPIで一緒に返却し、専用エンドポイントは廃止
- **不要なAPIの削除**: ER図データやレイアウトの個別操作APIは削除（後日再設計）

## API仕様

### GET /api/init

初期状態のViewModelを返却する。アプリケーション起動時に1回呼び出される。

**エンドポイント**
```
GET /api/init
```

**リクエスト**
- パラメータなし

**レスポンス**
- 成功時: `ViewModel`
- エラー時: `ErrorResponse`

**レスポンスに含まれる内容**
- `format`: `"er-viewer"` （固定値）
- `version`: `1` （現在は固定値）
- `erDiagram`: 空のER図状態
  - `nodes`: `{}`（空のRecord）
  - `edges`: `{}`（空のRecord）
  - `rectangles`: `{}`（空のRecord）
  - `texts`: `{}`（空のRecord）
  - `index`: 空のインデックス
    - `entityToEdges`: `{}`（空のRecord）
    - `columnToEntity`: `{}`（空のRecord）
    - `columnToEdges`: `{}`（空のRecord）
  - `ui.hover`: `null`
  - `ui.highlightedNodeIds`: `[]`
  - `ui.highlightedEdgeIds`: `[]`
  - `ui.highlightedColumnIds`: `[]`
  - `ui.layerOrder.backgroundItems`: `[]`
  - `ui.layerOrder.foregroundItems`: `[]`
  - `loading`: `false`
- `ui`: 初期のグローバルUI状態
  - `selectedItem`: `null`
  - `showBuildInfoModal`: `false`
  - `showLayerPanel`: `false`
  - `showDatabaseConnectionModal`: `false`
- `buildInfo`: ビルド情報の完全なデータ
  - `data`: BuildInfo型のビルド情報
  - `loading`: `false`
  - `error`: `null`
- `settings`: 未設定（`undefined`または`null`）

### POST /api/reverse-engineer

データベースをリバースエンジニアリングしてER図を生成し、ViewModelを返却する。

**エンドポイント**
```
POST /api/reverse-engineer
```

**リクエスト**
- ボディ: `ReverseEngineerRequest`
  - `viewModel`: 現在のViewModel
  - `password`: データベース接続用パスワード（オプション）

**レスポンス**
- 成功時: `ViewModel`（更新後の状態）
- エラー時: `ErrorResponse`

**処理内容**
- データベース接続情報を解決（詳細は[データベース接続設定仕様](./database_connection_settings.md)を参照）
- データベースに接続してスキーマ情報を取得
- エンティティとリレーションシップを抽出
- デフォルトのレイアウトでER図を構築（詳細は[リバースエンジニアリング機能仕様](./reverse_engineering.md)の「デフォルトレイアウト仕様」を参照）
- **逆引きインデックス（`index`）を計算** - ホバーインタラクションのパフォーマンス最適化のため
  - `entityToEdges`: 各エンティティに接続されているエッジのリストを生成
  - `columnToEntity`: 各カラムが所属するエンティティを特定
  - `columnToEdges`: 各カラムに接続されているエッジのリストを生成
- リクエストで受け取ったViewModelのerDiagramを更新して返却
- `settings.lastDatabaseConnection`を更新（パスワードを除く）
- ui状態とbuildInfo状態はリクエストから引き継ぐ

## 削除されるAPI

以下のAPIエンドポイントは削除される：

- `GET /api/er-data`
- `POST /api/layout` - インポート・エクスポート機能で代替（詳細は[インポート・エクスポート機能仕様](./import_export_feature.md)を参照）
- `GET /api/layout` - インポート・エクスポート機能で代替（詳細は[インポート・エクスポート機能仕様](./import_export_feature.md)を参照）
- `GET /api/table/{tableName}/ddl`
- `GET /api/build-info`

## 削除されるデータ構造

以下のデータ構造は使用されなくなるため、scheme/main.tspから削除される：

- `LayoutData` - ViewModelのERDiagramViewModelに統合されるため不要
- `EntityLayoutItem` - ViewModelのEntityNodeViewModelに統合されるため不要
- `DDLResponse` - 対応するAPIが削除されるため不要
- `SuccessResponse` - 使用されていないため削除
- `ReverseEngineerResponse` - ViewModelを直接返却するため不要
- `ERData` - ViewModelのERDiagramViewModelに統合されるため不要

## ViewModelの構造

詳細な型定義は [scheme/main.tsp](/scheme/main.tsp) を参照。

**ViewModel**（ルート）
- `format: string` - データフォーマット識別子（詳細は[インポート・エクスポート機能仕様](/spec/import_export_feature.md)を参照）
- `version: number` - データフォーマットのバージョン（詳細は[インポート・エクスポート機能仕様](/spec/import_export_feature.md)を参照）
- `erDiagram: ERDiagramViewModel` - ER図の状態
- `ui: GlobalUIState` - グローバルUI状態
- `buildInfo: BuildInfoState` - ビルド情報のキャッシュ
- `settings?: AppSettings` - アプリケーション設定（詳細は[データベース接続設定仕様](/spec/database_connection_settings.md)を参照）

**ERDiagramViewModel**
- `nodes: Record<EntityNodeViewModel>` - エンティティノード（キーはUUID）
- `edges: Record<RelationshipEdgeViewModel>` - リレーションシップエッジ（キーはUUID）
- `rectangles: Record<Rectangle>` - 矩形（キーはUUID）
- `texts: Record<TextBox>` - テキストボックス（キーはUUID）
- `index: ERDiagramIndex` - 逆引きインデックス（パフォーマンス最適化用）
- `ui: ERDiagramUIState` - ER図のUI状態
- `loading: boolean` - 処理中フラグ

## フロントエンドの実装への影響

### 初期化フロー

1. アプリケーション起動時に`GET /api/init`を呼び出し
2. 返却されたViewModelをそのままReduxストアに保存
3. ViewModelをReact Flowのデータ構造に変換して描画

### リバースエンジニアリングフロー

1. ユーザーが「リバースエンジニア」ボタンを押下
2. 現在のViewModelを`POST /api/reverse-engineer`に送信
3. 返却されたViewModelでReduxストアを更新
4. ViewModelをReact Flowのデータ構造に変換して再描画

### 状態管理

- Reduxストアの状態はViewModel型と完全に一致
- APIレスポンスをそのままストアにセット可能
- API呼び出し時は現在のストア状態をそのまま送信

## バックエンドの実装への影響

### Usecaseの設計

**GetInitialViewModelUsecase**
- format/versionのデフォルト値を設定（`"er-viewer"`, `1`）
- BuildInfoを生成
- 空のERDiagramViewModelを生成（空のインデックスを含む）
- 初期のGlobalUIStateを生成
- これらを組み合わせてViewModelを返却

**ReverseEngineerUsecase**
- リクエストのViewModelを受け取る
- データベースからER図を生成
- **逆引きインデックスを計算**
  - `nodes`と`edges`から`index`を生成
  - 計算ロジックはユーティリティ関数として実装
- ViewModelのerDiagramを更新（nodes, edges, indexを含む）
- format/version、ui状態、buildInfo状態は維持
- 更新後のViewModelを返却

## 実現可能性の検証

### 技術的実現性

- **ViewModel型の完全性**: 既にmain.tspでViewModel型は定義済み
- **BuildInfo生成**: 既存のGetBuildInfoUsecaseで実装済み
- **リバースエンジニア**: 既存のReverseEngineerUsecaseをViewModelベースに変更するだけ
- **型安全性**: TypeSpecで型定義されているため、フロント・バック間の型の一致を保証

### 開発効率の向上

- **単純化**: APIエンドポイント数が大幅に削減（6個 → 2個）
- **一貫性**: すべての通信がViewModel型で統一される
- **保守性**: フロントとバックで同じ型を共有するため、変更時の影響範囲が明確

### MVP段階での適合性

- **機能削減**: 不要なAPIを削除し、必要最小限の機能に絞り込む
- **後方互換性不要**: 既存のAPIユーザーがいないため、破壊的変更も問題なし
- **再設計の余地**: 削除したAPIは後日必要に応じて再設計可能

## 懸念事項・確認事項

### 懸念事項

**ViewModelのサイズ**
- ER図が大きい場合、ViewModelのJSONサイズが大きくなる可能性
- 対処：MVP段階では許容、パフォーマンス問題が発生したら部分更新APIを検討

**状態の同期**
- フロントとバックでViewModelを往復させる際、状態の同期ずれが発生する可能性
- 対処：ViewModelを常にサーバーが正とし、レスポンスで完全に上書きする設計

**DDL情報の取得**
- 削除される`GET /api/table/{tableName}/ddl`の代替方法は？
- 対処：EntityNodeViewModelに既にddlフィールドがあるため、そこから取得可能

### 確認事項

**増分リバースエンジニア**
- 既存のレイアウトを維持したまま新しいテーブルを追加する機能
- 詳細は[増分リバース・エンジニアリング機能仕様](./incremental_reverse_engineering.md)を参照

## 関連仕様書

- [scheme/main.tsp](/scheme/main.tsp) - API型定義
- [TypeSpec API定義仕様](/spec/typespec_api_definition.md) - API定義方法とビルドプロセス
- [リアーキテクチャ仕様](/spec/rearchitecture_overview.md) - システム全体構成
- [リバースエンジニアリング機能仕様](/spec/reverse_engineering.md) - リバースエンジニアの詳細（一部内容は本仕様で置き換え）
- [増分リバース・エンジニアリング機能仕様](/spec/incremental_reverse_engineering.md) - 増分更新の詳細