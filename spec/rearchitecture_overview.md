# ER Viewer リアーキテクチャ仕様

## 概要

本アプリケーションの全体構成と実行環境を作り直す（リアーキテクチャ）仕様書。
バックエンド（TypeScript + Express + MySQL）とフロントエンド（TypeScript）の分離、TypeSpecによるAPI定義、Docker Composeによる開発環境、本番運用のコンテナ化を定義する。

## システム構成

### 技術スタック

* **バックエンド**: TypeScript + Express + MySQL
* **フロントエンド**: TypeScript + React + React Flow
* **API定義**: TypeSpec
* **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
* **本番運用**: Docker コンテナ

### ディレクトリ構成

```
/er-viewer
├─ docker-compose.yml           （MySQL用）
├─ .env.example
├─ server.ts                    （バックエンド統合ファイル - API + 静的ファイル配信）
├─ package.json
├─ tsconfig.base.json           （共通TypeScript設定）
├─ tsconfig.server.json         （バックエンド用TypeScript設定）
├─ Dockerfile.prod              （本番用）
├─ public/                      （フロントエンドのコード）
│   ├─ src/
│   │   ├─ components/
│   │   ├─ services/
│   │   └─ api/
│   ├─ package.json
│   ├─ tsconfig.json            （フロントエンド用TypeScript設定）
│   └─ vite.config.ts
├─ scheme/                      （TypeSpec定義ファイル）
│   ├─ main.tsp                 （すべての型を包括的に管理）
│   └─ tspconfig.yaml
└─ lib/
    └─ generated/               （バックエンド用TypeScript型定義）
```

## 開発環境仕様

### Docker Compose構成

`docker-compose.yml`で以下のサービスを定義：

* **db (MySQL)**
  * ベースイメージ: `mysql:8`
  * 環境変数: `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`
  * ポート: `30177:3306`（ホストOSから接続可能）
  * 用途: ER図リバースエンジニアリング用のテストデータ
  * `init.sql`によるテストデータの自動投入

### 開発環境の起動

#### データベースの起動

```bash
docker compose up
```

* MySQL 8がポート30177で起動
* ホストOSからの接続が可能
* `init.sql`によるテストデータの自動投入

#### アプリケーションの起動

```bash
npm run dev
```

* 開発用Webサーバーが30033ポートで待ち受け
* `public`フォルダのコード変更で自動再ビルドとブラウザ更新
* バックエンドコード変更時の自動再起動

## アプリケーション仕様

### 基本構成

* **言語・フレームワーク**: TypeScript + Express
* **データベース**: MySQL（テスト用途のみ）
* **データベースアクセス**: 生SQL（ORMは使用しない）
* **ポート**: 30033（固定）
* **フロントエンドビルドツール**: Vite
* **フロントエンドフレームワーク**: React + React Flow（詳細は[frontend_er_rendering.md](./frontend_er_rendering.md)を参照）
* **バックエンド実行ツール**: tsx（開発時）、tsup（本番ビルド）

### アーキテクチャ

* **統合サーバー**: `server.ts`単一ファイルにバックエンドAPIと静的ファイル配信の全ロジックを実装
  * **エントリーポイント**: `server.ts`
* **フロントエンド**: `public`フォルダ内のTypeScriptコードをViteでビルド
  * **エントリーポイント**: `public/src/app.ts`
* **バックエンド**: シンプルなAPIエンドポイント群を`server.ts`に直接実装（分割不要）

### API仕様管理

* TypeSpecファイル（`scheme/main.tsp`）でAPI仕様と型を包括的に定義
* `npm run generate`でOpenAPI仕様、TypeScriptクライアント、バックエンド用型定義を自動生成
* フロントエンドは生成されたクライアントコード（`public/src/api/client/`）を利用
* バックエンドは生成された型定義（`lib/generated/api-types.ts`）を利用

### 開発時ビルド

* `tsx watch`による開発サーバー起動（`server.ts`）
  * ES Modulesネイティブサポート
  * 高速な起動と再実行
  * `--clear-screen=false`オプションでクリーンなログ出力
* バックエンドコード変更時の自動再起動
* フロントエンドコード変更時のViteによる自動ビルドとブラウザ更新
  * Docker環境では`server.watch.usePolling=true`を設定
* `concurrently`によるフロント・バック並列実行
* 静的ファイルはExpressで配信

### APIクライアント

* TypeSpecから生成されたクライアントコードを`public/src/api/`に配置
* 型安全なAPI通信を実現

### 本番ビルド

* Multi-stage Dockerfileによる最適化
* フロントエンドの`npm run build`による静的ファイル生成
* バックエンドの`tsup`によるesbuildベースの高速ビルド
  * ESM/CJS両対応の出力
  * zero-configでの最適化
  * `dist/`ディレクトリへの出力
* `npm ci && npm run build && npm prune --production`による軽量化
* 単一コンテナで統合アプリケーションを実行

## 本番運用仕様

### コンテナビルド

1. 統合アプリケーションコンテナのビルド
   ```bash
   docker build -f Dockerfile.prod -t yourrepo/er-viewer:tag .
   ```

2. Docker Hubへの登録
   ```bash
   docker push yourrepo/er-viewer:tag
   ```

### エンドユーザーでの実行

```bash
docker run -d --name er-viewer \
  -e DB_URL="mysql://user:pass@host:3306/db" \
  -p 30033:30033 yourrepo/er-viewer:tag
```

### データベース接続

* 本番用コンテナにはDBを含めない
* 環境変数`DB_URL`で任意のMySQLサーバーに接続可能
* PostgreSQL等の他のDBにも対応可能な設計
* アプリケーションデータは管理せず、接続先DBのスキーマ情報のみを読み取り

## 機能要件

### ER図生成・表示機能

* **MySQLデータベースからのER図自動生成**
  * スキーマ情報の読み取り
  * テーブル・カラム・リレーション情報の取得
  * 増分リバース対応（既存の配置情報を維持）

* **DDL情報の管理**
  * テーブル定義の保持
  * CREATE TABLE文の表示

### インタラクティブ操作

* **ER図表示・操作**
  * インタラクティブなER図表示
  * エンティティのドラッグ&ドロップ配置
  * ズーム・パン操作
  * リレーション線の表示（直角ポリライン）

* **ビジュアル表現**
  * ホバー時のハイライト表示
  * プライマリキー・外部キーの視覚的区別
  * カスタマイズ可能な色・サイズ

### 情報表示機能

* **詳細情報表示**
  * エンティティクリックでDDL表示
  * サイドバーでの詳細情報表示

### 図形描画・注釈機能

* **補助図形**
  * 矩形描画（エンティティのグループ化用）
  * テキスト追加（補足情報記載用）

### データ永続化

* **保存機能**
  * ER図データとレイアウト情報の保存
  * Dockerボリュームによる柔軟な保存場所設定

## 実現可能性の検証

### 技術的実現性

* TypeScript + Express + MySQL: 実績のある技術スタック
* 生SQLによるスキーマ情報取得: 標準的なアプローチ
* TypeSpec: Microsoft製のAPI定義ツールで安定性あり
* Docker Compose: 開発環境の標準的な構成管理
* Vite: 高速なビルドツールでホットリロード対応、React統合も標準サポート
* React + React Flow: 図エディタ実装に必要な機能が揃っている
* tsx: esbuildベースで高速なTypeScript実行
* tsup: esbuildベースで高速なTypeScriptビルド

### 開発効率

* ホットリロードによる開発体験の向上
  * tsx watchによる高速な自動再起動
  * Viteによる高速なフロントエンドリビルド
  * Docker Compose watchによる効率的なファイル同期
* TypeSpecによる型安全なAPI開発
* Docker Composeによる環境構築の簡素化
* ORMなしによるシンプルなDB操作
* esbuild系ツール統一による学習コストの削減
* 共通tsconfig設定による設定管理の簡素化

### 運用面

* コンテナ化による環境差異の解消
* 外部DB接続による柔軟なインフラ構成
* Docker Hubによる配布の簡素化
* 認証なしによるシンプルな運用

## 懸念事項・確認事項

### 技術的懸念

* TypeSpec学習コストと開発チームの習熟度
* React + React Flowの学習コスト（詳細は[frontend_er_rendering.md](./frontend_er_rendering.md)を参照）
* 生SQLによるDBアクセスのメンテナンス性

### 運用面の懸念

* 本番環境でのコンテナ管理方法
* ログ管理とモニタリング方法
* データ保存場所の管理（Dockerボリューム）

### 確認が必要な項目

* 本番環境のインフラ構成（クラウド等）
* データ保存の永続化戦略
