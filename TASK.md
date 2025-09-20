# ER Viewer リアーキテクチャタスク一覧

## 概要

現在の実装と仕様書（`spec/rearchitecture_overview.md`）を比較した結果、大幅なリアーキテクチャが必要です。
現在はJavaScript + Expressベースの構成ですが、仕様書ではTypeScript + Express + 統合サーバー構成への変更が定義されています。

## 開発環境構築タスク

### サーバーサイド統合

- [x] **server.jsをserver.tsに変換**
  - `server.js`を`server.ts`にリネーム・変換
  - ES ModulesからCommonJSへの変更（仕様書では統合サーバーとして定義）
  - TypeScriptの型定義を追加
  - 参照: `spec/rearchitecture_overview.md` L24, L90-92

- [x] **TypeScript設定の調整**
  - `tsconfig.json`を仕様書の構成に合わせて修正
  - バックエンド・フロントエンド統合構成への変更
  - 出力ディレクトリ設定の見直し
  - 参照: `spec/rearchitecture_overview.md` L26

- [x] **package.jsonスクリプトの更新**
  - `ts-node-dev --respawn server.ts`での開発サーバー起動に変更
  - ビルドスクリプトの追加・修正
  - 依存関係の追加（`ts-node-dev`等）
  - 参照: `spec/rearchitecture_overview.md` L49, L102

### フロントエンド構成変更

- [x] **publicディレクトリ構成の変更**
  - 現在の`public/js/`から`public/src/`構成への移行
  - `public/src/components/`, `public/src/services/`, `public/src/api/`ディレクトリの作成
  - 既存の`app-new.ts`の適切な場所への移動・拡張
  - 参照: `spec/rearchitecture_overview.md` L29-36

- [x] **Vite設定の追加**
  - `public/vite.config.ts`ファイルの作成
  - TypeScriptビルド設定
  - ホットリロード設定
  - 参照: `spec/rearchitecture_overview.md` L36, L85, L104

- [x] **フロントエンド用package.jsonの作成**
  - `public/package.json`の作成
  - Vite関連の依存関係定義
  - フロントエンド用ビルドスクリプト
  - 参照: `spec/rearchitecture_overview.md` L34

- [x] **フロントエンド用tsconfig.jsonの作成**
  - `public/tsconfig.json`の作成
  - フロントエンド専用のTypeScript設定
  - 参照: `spec/rearchitecture_overview.md` L35

### API仕様管理の導入

- [ ] **TypeSpec設定の追加**
  - `api-spec/`ディレクトリの作成
  - TypeSpec定義ファイル（`.tsp`）の作成
  - 既存のAPIエンドポイントのTypeSpec定義
  - 参照: `spec/rearchitecture_overview.md` L37-38, L94-98

- [ ] **TypeSpecクライアント生成の設定**
  - `tsp compile`コマンドの設定
  - 生成されたクライアントコードの`public/src/api/`への配置設定
  - 参照: `spec/rearchitecture_overview.md` L97-98, L107-110

### Docker設定の更新

- [ ] **docker-compose.ymlの仕様書対応**
  - 現在の構成から仕様書のapp + dbサービス構成への変更
  - ポート設定の修正（30033:30033）
  - ボリュームマウント設定の調整
  - 参照: `spec/rearchitecture_overview.md` L45-66

- [ ] **Dockerfile.devの作成**
  - 開発環境用Dockerfileの作成
  - `node:20-alpine`ベースイメージ
  - `ts-node-dev`での起動設定
  - 参照: `spec/rearchitecture_overview.md` L27, L48


- [ ] **.env.exampleファイルの作成**
  - 環境変数のサンプルファイル作成
  - DB接続設定等の定義
  - 参照: `spec/rearchitecture_overview.md` L23

### データベース設定の調整

- [ ] **MySQL設定の仕様書対応**
  - docker-compose.ymlのMySQL設定を内部ネットワークのみに変更
  - 環境変数設定の調整
  - 参照: `spec/rearchitecture_overview.md` L60-65

- [ ] **DatabaseManagerの型定義追加**
  - `lib/database.js`の`lib/database.ts`への変換
  - TypeScript型定義の追加
  - 生SQL継続の確認

### ビルドシステムの整備

- [ ] **統合ビルドシステムの構築**
  - フロントエンドViteビルドとバックエンドビルドの統合
  - 静的ファイル配信の設定
  - 参照: `spec/rearchitecture_overview.md` L100-105

- [ ] **ホットリロード設定の更新**
  - バックエンドコード変更時の自動再起動
  - フロントエンドコード変更時の自動ビルド・ブラウザ更新
  - 参照: `spec/rearchitecture_overview.md` L53-55, L104

## 開発環境確認タスク

- [ ] **TypeScript型チェックの実行**
  - 全ファイルの型エラー修正
  - `npm run typecheck`の実行確認

- [ ] **開発環境ビルド確認**
  - 開発環境ビルドの確認（`docker compose up`）
  - ホットリロード動作確認
