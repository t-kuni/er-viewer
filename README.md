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

```bash
docker run \
  --rm \
  -p 30033:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=3306 \
  -e DB_USER=root \
  -e DB_PASSWORD=password \
  -e DB_NAME=test \
  tkuni83/er-viewer
```

[http://localhost:30033](http://localhost:30033) に接続する

## 開発環境設定

```bash
# .envファイルをコピー
cp .env.example .env

# 必要に応じてDB設定を変更
vi .env
```

```bash
# Docker Composeで起動
docker-compose up -d

# ブラウザでアクセス
open http://localhost:30033
```

### claude起動

```
claude --max-turns 1000 --dangerously-skip-permissions --mcp-config mcp-servers.json
```

### コンテナイメージ更新

```
docker build -t tkuni83/er-viewer .
docker push tkuni83/er-viewer
```