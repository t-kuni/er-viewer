# ER Diagram Viewer

MySQL データベースからER図をリバースエンジニアリングし、ブラウザ上で可視化・編集できるツールです。

![image](https://github.com/user-attachments/assets/fb8a0e8d-7b02-421f-be28-f93abeb39e32)


## 機能

### 🔄 リバースエンジニアリング
- MySQLデータベースからER図を自動生成
- 増分リバース対応（既存の配置情報を維持）
- DDL情報の保持

### 🎨 可視化・編集機能
- インタラクティブなER図表示
- エンティティのドラッグ&ドロップ配置
- ズーム・パン操作
- リレーション線の表示（直角ポリライン）
- ホバー時のハイライト表示

### 📊 詳細情報表示
- エンティティクリックでDDL表示
- サイドバーでの詳細情報表示
- プライマリキー・外部キーの視覚的区別

### ✏️ 注釈機能
- 矩形描画（エンティティのグループ化用）
- テキスト追加（補足情報記載用）
- カスタマイズ可能な色・サイズ

### 💾 データ永続化
- ER図データとレイアウト情報の保存
- Dockerボリュームによる柔軟な保存場所設定

## 使用方法

### 1. 環境設定

```bash
# .envファイルをコピー
cp .env.example .env

# 必要に応じてDB設定を変更
vi .env
```

### 2. 起動

```bash
# Docker Composeで起動
docker-compose up -d

# ブラウザでアクセス
open http://localhost:3000
```

### 3. 操作方法

#### リバースエンジニアリング
1. 「リバースエンジニア」ボタンをクリック
2. MySQLデータベースからER図が自動生成される

#### ER図の操作
- **ドラッグ**: エンティティを移動
- **ホイール**: ズーム
- **スペース+ドラッグ**: パン（画面移動）
- **エンティティクリック**: DDL詳細表示

#### レイアウト保存
- 「レイアウト保存」ボタンで配置情報を保存
- 「データ読み込み」ボタンで保存済みデータを復元

#### 注釈追加
- 「矩形追加」: エンティティをグループ化する矩形を追加
- 「テキスト追加」: 補足説明用のテキストを追加

## 技術仕様

### アーキテクチャ
- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript + SVG
- **Database**: MySQL 8.0
- **Container**: Docker + Docker Compose

### ファイル構成
```
er-viewer/
├── server.js              # メインサーバー
├── lib/
│   ├── database.js         # DB接続・スキーマ取得
│   └── storage.js          # データ保存・読み込み
├── public/
│   ├── index.html          # フロントエンドHTML
│   ├── style.css           # スタイル
│   └── script.js           # フロントエンドJS
├── data/                   # データ保存ディレクトリ
├── docker-compose.yml      # Docker設定
├── Dockerfile             # コンテナ定義
└── init.sql               # サンプルDBスキーマ
```

### API エンドポイント
- `GET /api/er-data` - ER図データ取得
- `POST /api/reverse-engineer` - リバースエンジニアリング実行
- `GET/POST /api/layout` - レイアウトデータの取得・保存
- `GET /api/table/:name/ddl` - テーブルDDL取得

## 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|--------------|------|
| DB_HOST | mysql | MySQLホスト名 |
| DB_PORT | 3306 | MySQLポート |
| DB_USER | root | MySQLユーザー名 |
| DB_PASSWORD | password | MySQLパスワード |
| DB_NAME | test | データベース名 |

## データ永続化

Docker Composeのvolume機能により、`./data`ディレクトリにER図データとレイアウト情報が保存されます。
このディレクトリをVCSで管理することで、チーム間でER図情報を共有できます。

## 開発・拡張

### ローカル開発
```bash
# 依存関係のインストール
npm install

# 開発モード（ホットリロード有効）
npm run dev

# ファイル監視付き開発モード
npm run dev:watch
```

### ホットリロード機能
開発時の効率を向上させるため、以下のホットリロード機能を提供しています：

- **サーバーサイド**: nodemonによるサーバー自動再起動
- **フロントエンド**: LiveReloadによるブラウザ自動更新
- **対象ファイル**: `.html`, `.css`, `.js`ファイルの変更を監視
- **ポート**: LiveReloadサーバーは35729ポートで動作

#### 使用方法
1. `npm run dev`で開発サーバーを起動
2. ブラウザで`http://localhost:3000`にアクセス
3. ファイルを編集すると自動的にブラウザが更新される

### 今後の拡張可能性
- PostgreSQL、SQL Server等の対応
- エクスポート機能（PNG、PDF等）
- エンティティの自動配置アルゴリズム改善
- リアルタイム協調編集機能
