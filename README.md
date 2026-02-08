# RelavueER

RelavueER（レラビューアー）は、データベースからER図をリバースエンジニアリングし、ブラウザ上で可視化・編集できるツールです。

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

### Linux の場合

```bash
docker run --rm --network host tkuni83/relavue-er
```

[http://localhost:30033](http://localhost:30033) にアクセスし、「リバースエンジニア」ボタンからDB接続情報を入力してください。

**ホストOS上のMySQLに接続する場合**:
- Host: `localhost`
- Port: `3306`（MySQLの待ち受けポート）
- User/Password/Database: 接続先DBの情報を入力

### macOS / Windows（Docker Desktop）の場合

```bash
docker run --rm -p 30033:30033 tkuni83/relavue-er
```

[http://localhost:30033](http://localhost:30033) にアクセスし、「リバースエンジニア」ボタンからDB接続情報を入力してください。

**ホストOS上のMySQLに接続する場合**:
- Host: `host.docker.internal`
- Port: `3306`（MySQLの待ち受けポート）
- User/Password/Database: 接続先DBの情報を入力

> **注意**: macOS/Windows では `--network host` は使用できません（Docker DesktopがVM上で動作するため）

## 開発環境設定

### 前提条件

- Node.js 18以上
- Docker & Docker Compose
- TypeScript 5.0以上

### セットアップ

```bash
# .envファイルをコピー
cp .env.example .env

# 必要に応じてDB設定を変更
vi .env

# バックエンドの依存関係のインストール
npm install

# フロントエンドの依存関係のインストール
cd public && npm install
```

### テストコード実行

```bash
npm run test
```

### 起動

```bash
npm run dev

# ブラウザでアクセス
open http://localhost:5173
```

### コンテナイメージ更新

```bash
docker build -f Dockerfile.prod -t tkuni83/relavue-er .
docker push tkuni83/relavue-er
```

## 外部のLLMに投げる時の要件整理プロンプト

```
以下のリサーチプロンプトを作成して

* 要件
```

## 仕様検討プロンプト

```
以下を満たせる仕様を検討してください

* 達成したいこと
```

# 仕様書の変更からタスク洗い出しプロンプト

```
仕様書を更新してます。直前のコミットの差分を確認して、タスクを洗い出してください
```

## バグの原因調査プロンプト

```
以下のバグの原因を調査してください

* バグの挙動
```

## テストエラー解析プロンプト

```
テストのエラーの原因を調査してください
```

## コマンド群

* `/init-worktree`
    * エージェントをworktreeで起動する場合は付与する
* `/commit`
    * コミットします