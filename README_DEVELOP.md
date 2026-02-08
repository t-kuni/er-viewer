# 🟦 開発者向け情報

## 🟠 前提条件

- Node.js 18以上
- Docker & Docker Compose
- TypeScript 5.0以上

## 🟠 環境構築

```bash
# .envファイルをコピー
cp .env.example .env

# 必要に応じてDB設定を変更
vi .env

# バックエンドの依存関係のインストール
npm install

# フロントエンドの依存関係のインストール
cd public && npm install

# コード生成
npm run generate

# 起動
npm run dev

# ブラウザでアクセス
open http://localhost:5173
```

## 🟠 テストコード実行

```bash
npm run generate
npm run test
```

## 🟠 コンテナイメージ更新

```bash
docker build -f Dockerfile.prod -t tkuni83/relavue-er .
docker push tkuni83/relavue-er
```

# 🟦 開発支援プロンプト

## 🟠 外部のLLMに投げる時の要件整理プロンプト

```
以下のリサーチプロンプトを作成して

* 要件
```

## 🟠 仕様検討プロンプト

```
以下を満たせる仕様を検討してください

* 達成したいこと
```

# 仕様書の変更からタスク洗い出しプロンプト

```
仕様書を更新してます。直前のコミットの差分を確認して、タスクを洗い出してください
```

## 🟠 バグの原因調査プロンプト

```
以下のバグの原因を調査してください

* バグの挙動
```

## 🟠 テストエラー解析プロンプト

```
テストのエラーの原因を調査してください
```

## 🟠 コマンド群

* `/init-worktree`
    * エージェントをworktreeで起動する場合は付与する
* `/commit`
    * コミットします