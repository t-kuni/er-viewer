# インポート・エクスポート機能仕様

## 概要

ER図のデータをJSON形式でエクスポート・インポートする機能。ViewModelをそのまま使用し、ユーザーがER図の作業内容を保存・復元できるようにする。

## データ形式

### エクスポートデータ

エクスポートデータは `ViewModel` 型をそのまま使用する。ViewModelの構造は [scheme/main.tsp](/scheme/main.tsp) で定義されている。

**ViewModel のフォーマット識別フィールド**
- `format: string` - データフォーマット識別子（固定値: `"er-viewer"`）
- `version: number` - データフォーマットのバージョン（現在は `1` 固定）

これらのフィールドは、初期化API（`GET /api/init`）で以下のデフォルト値が設定される：
- `format: "er-viewer"`
- `version: 1`

### エクスポート時の処理

**エクスポート時に破棄するフィールド**

以下の一時UI状態とキャッシュは、エクスポート前に初期値・デフォルト値に戻す（初期値の詳細は [ViewModelベースAPI仕様](/spec/viewmodel_based_api.md) の「GET /api/init」を参照）：

- `ui` - グローバルUI状態を初期化
- `buildInfo` - ビルド情報キャッシュを初期化
- `erDiagram.ui.hover` - ホバー状態を初期化
- `erDiagram.ui.highlightedNodeIds` - ハイライト状態を初期化
- `erDiagram.ui.highlightedEdgeIds` - ハイライト状態を初期化
- `erDiagram.ui.highlightedColumnIds` - ハイライト状態を初期化
- `erDiagram.ui.layerOrder` - **維持する**（レイヤー順序はエクスポート対象）
- `erDiagram.loading` - `false` をセット

**エクスポート時に保持するフィールド**

以下のフィールドはそのまま保持される：
- `format` - フォーマット識別子
- `version` - バージョン番号
- `erDiagram.nodes` - エンティティノード
- `erDiagram.edges` - リレーションシップエッジ
- `erDiagram.rectangles` - 矩形
- `erDiagram.texts` - テキストボックス
- `erDiagram.index` - 逆引きインデックス（そのまま保持するが、インポート時に再計算される）
- `erDiagram.ui.layerOrder` - レイヤー順序
- `settings` - アプリケーション設定（データベース接続情報など、パスワードは含まない）

### インポート時の処理

**インポート時のフィールド処理**

- `format`, `version` - バリデーションに使用後、そのまま保持
- `erDiagram.nodes` - インポートしたデータで置き換え
- `erDiagram.edges` - インポートしたデータで置き換え
- `erDiagram.rectangles` - インポートしたデータで置き換え
- `erDiagram.texts` - インポートしたデータで置き換え
- `erDiagram.index` - **nodes/edgesから再計算する**（ファイルに含まれていても無視し、常に再計算）
- `erDiagram.ui.layerOrder` - インポートしたデータで置き換え
- `erDiagram.loading` - `false` をセット
- `settings` - インポートしたデータで置き換え（存在する場合）

**インポート時にデフォルト値をセットするフィールド**

初期値の詳細は [ViewModelベースAPI仕様](/spec/viewmodel_based_api.md) の「GET /api/init」を参照。

- `ui` - 初期状態の GlobalUIState
- `buildInfo` - 現在の状態を維持（インポート前の buildInfo を保持）
- `erDiagram.ui.hover` - 初期値をセット
- `erDiagram.ui.highlightedNodeIds` - 初期値をセット
- `erDiagram.ui.highlightedEdgeIds` - 初期値をセット
- `erDiagram.ui.highlightedColumnIds` - 初期値をセット

### ファイル形式

- ファイル拡張子: `.json`
- 文字エンコーディング: UTF-8
- ファイル名の例: `er-viewer-2026-01-25.json`

## バリデーション

インポート時に以下のバリデーションを実行する：

1. **JSON構文チェック**
   - JSONとしてパース可能であること
   - パース失敗時: エラーメッセージ「Invalid JSON format」

2. **format フィールド**
   - `format` フィールドが存在すること
   - `format` の値が `"er-viewer"` であること
   - 不一致時: エラーメッセージ「Invalid format: expected 'er-viewer'」

3. **version フィールド**
   - `version` フィールドが存在すること
   - `version` が数値であること
   - `version >= 1` であること
   - 不一致時: エラーメッセージ「Invalid version: must be >= 1」

バリデーションエラー発生時はインポート処理を中断し、ユーザーにエラーメッセージを表示する。

## 機能仕様

### エクスポート機能

**トリガー**
- ヘッダーに「エクスポート」ボタンを配置
- ボタンクリックでエクスポート処理を実行
- キーボードショートカット: **Ctrl + S**（Windows/Linux）または **Cmd + S**（macOS）
  - アプリケーション全体で有効
  - テキストボックスなどの入力欄にフォーカスがある状態でも動作する
  - ブラウザのデフォルト動作（ページ保存）は抑制する

**処理フロー**
1. 現在の `ViewModel` を取得
2. 一時UI状態とキャッシュを初期化した `ViewModel` を生成（エクスポート時の処理に従う）
3. `ViewModel` を JSON 文字列にシリアライズ
4. ファイル名を自動生成（例: `er-viewer-2026-01-25.json`）
5. ブラウザのダウンロード機能でファイルをダウンロード

**ファイル名生成ルール**
- フォーマット: `er-viewer-{YYYY-MM-DD}.json`
- 日付は現在の日付を使用

**実装時の注意事項**
- キーボードショートカットはグローバルな `keydown` イベントリスナーで実装
- macOSでは `event.metaKey`、Windows/Linuxでは `event.ctrlKey` で判定
- `event.preventDefault()` でブラウザのデフォルト動作（ページ保存）を抑制

### インポート機能

**トリガー**
- ヘッダーに「インポート」ボタンを配置
- ボタンクリックでファイル選択ダイアログを表示（`react-dropzone` を使用）
- ファイルをドラッグ&ドロップでもインポート可能

**処理フロー**
1. ユーザーがファイルを選択またはドロップ
2. ファイルを読み込み、JSON としてパース
3. バリデーションを実行
4. バリデーション成功時:
   - パースした `ViewModel` をベースに、一時UI状態とキャッシュを補完（インポート時の処理に従う）
   - **`erDiagram.index` を `nodes` と `edges` から再計算**（フロントエンドで実行）
   - 補完した `ViewModel` を Store に設定（`actionSetViewModel`）
5. バリデーション失敗時:
   - エラーメッセージをユーザーに表示（トースト通知があれば使用、なければアラート）

**ドラッグ&ドロップエリア**
- 画面全体をドロップ可能領域とする
- ドラッグオーバー時は視覚的フィードバックを表示（画面全体にオーバーレイを表示）
- ライブラリ: `react-dropzone`

## UI配置

**ヘッダーのボタン配置順序（左から右）**
1. レイヤーボタン（既存）
2. エクスポートボタン（新規）
3. インポートボタン（新規）
4. ビルド情報ボタン（既存）

## バージョン管理

- 現在のバージョン: `1`
- 今後のバージョンアップ時の対応:
  - `version >= 1` であればインポートを許可
  - バージョン間の差異は将来の仕様で対応
  - MVP段階では version 1 のみをサポート

## エラーハンドリング

**エクスポート時のエラー**
- ファイル生成失敗: コンソールにエラーログを出力（ユーザーには通知しない）

**インポート時のエラー**
- バリデーションエラー: エラーメッセージをトースト通知で表示（実装が簡単でなければアラート）
- ファイル読み込みエラー: 「Failed to read file」をトースト通知で表示（実装が簡単でなければアラート）
- MVP段階では詳細なエラーハンドリングは不要

## 関連仕様書

- [ViewModelベースAPI仕様](/spec/viewmodel_based_api.md) - ViewModelの構造とAPIの基本設計
- [scheme/main.tsp](/scheme/main.tsp) - データ型定義
- [フロントエンド状態管理仕様](/spec/frontend_state_management.md) - Storeとアクションの設計
