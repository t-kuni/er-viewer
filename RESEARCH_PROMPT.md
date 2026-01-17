# TypeScriptバックエンドのUsecaseテスト実装方針のリサーチ

## リサーチ要件

backend_usecase_architecture.mdの方針でテストコードを追加しようと思っている。TypeScriptのテストコードはどういう方針やライブラリを使うのがよいか？

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec

### 現状のフェーズ

- アプリケーションを丸ごと作り直そうとしているので不要なコードが残っているケースあり
- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- 後方互換も考慮しない
- 不要になったコードは捨てる

## Usecaseアーキテクチャの方針

以下は、backend_usecase_architecture.mdに記載されているバックエンドのUsecaseアーキテクチャ方針です。

### Usecaseレイヤーの責務

- **1API = 1Usecase**: 各APIエンドポイントに対応する1つのUsecaseを作成
- **副作用の分離**: テストの妨げとなる副作用（ファイルシステムアクセス等）は依存性注入（DI）で受け取る
- **DBアクセスの扱い**: DBアクセスはUsecaseに直接記述（テスト時はテスト用DBインスタンスを使用するため、DIしない）

### テスト方針

- Usecaseに対してユニットテストを作成
- テストはDBのインスタンスを立てた状態で実行
- DBアクセス以外の副作用（ファイルI/O、外部API呼び出し等）はモック化

### ディレクトリ構成

```
/er-viewer
├─ lib/
│   ├─ database.ts                 （既存のDatabaseManager）
│   └─ usecases/
│       └─ *.ts                    （各Usecaseファイル）
├─ tests/
│   └─ usecases/
│       └─ *.test.ts               （各Usecaseのテスト）
└─ server.ts                       （Expressのルーティングと依存性注入のみ）
```

### Usecaseの設計パターン

#### クロージャパターンによる依存性注入

- Usecaseは`create*Usecase(deps: Dependencies)`関数でインスタンス化
- `Dependencies`型で注入する副作用の型を定義
- 返り値は実際のビジネスロジックを実行する関数

#### 依存性注入の対象となる副作用

以下のような副作用はテストの妨げになるため、DIで注入する：

- ファイルシステムへのアクセス（`fs.readFile`, `fs.existsSync`等）
- 環境変数へのアクセス（`process.env`）
- プロセス情報へのアクセス（`process.version`, `process.platform`等）
- 外部サービスへのAPI呼び出し
- 日時取得（`new Date()`）
- DatabaseManagerのインスタンス生成（ファクトリ関数として注入）

#### DIしない要素

- DBへのクエリ実行（テスト時は実際のテスト用DBを使用）
- ビジネスロジック自体

### server.tsの役割

Usecaseレイヤー導入後、server.tsは以下の責務のみを持つ：

- **ルーティング定義**: Expressのルートハンドラを定義
- **依存性注入**: Usecaseに必要な依存性（副作用）を注入してインスタンス化
- **HTTPレスポンス処理**: Usecaseの結果をHTTPレスポンスに変換
- **エラーハンドリング**: エラーを適切なHTTPステータスコードに変換

### テスト実装方針

#### テスト用データベース

- 実際のDBインスタンスを使用（Docker Compose等で起動）
- **テストデータは初期化SQLで準備済み**: Docker Compose起動時に`init.sql`でテスト用レコードが投入される
- **DBは参照のみ**: Usecaseでは既存DBのスキーマ情報を読み取るのみで、書き込みは行わない
- **テストケース毎のデータ操作は不要**: レコードの挿入・削除・更新などは不要
- **重厚なエコシステムは不要**: 複雑なマイグレーションツールやフィクスチャ管理は不要

#### モック化の対象

- ファイルシステムアクセス
- 環境変数
- プロセス情報
- その他、Usecaseに注入された副作用すべて

### 実装時の注意事項

- 各Usecaseファイルは`lib/usecases/`配下に配置
- 各テストファイルは`tests/usecases/`配下に配置
- Usecase名は対応するAPIの処理内容を表す命名にする（例: `ReverseEngineerUsecase`）
- テストフレームワークは後日選定（Jest または Vitest）
- 既存の実装があるAPIから優先的にUsecaseへ切り出す
- ダミー実装のAPIについては、データ保存仕様の確定後に実装

### テストの実行方針

- **直列実行**: テストケースは直列実行で十分（それほど数が増えない想定）
- **速度より可読性**: 実行速度よりも、テストコードの可読性と変更のしやすさを重視
- **ローカル実行のみ**: CI/CDは行わず、ローカル環境でのテスト実行のみを想定
- **カバレッジ不要**: テストカバレッジの計測・レポートは不要

### 確認事項

- **テストフレームワークの選定**: Jest と Vitest のどちらを使用するか
- **データ保存の仕様**: 現在ダミー実装のAPIのデータ保存方法（ファイル or DB 等）

## 現在のプロジェクト構成

### package.json（バックエンド）

```json
{
  "name": "er-viewer",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node dist/server.js",
    "dev": "concurrently \"tsx watch --clear-screen=false server.ts\" \"npm run --prefix public dev\"",
    "build": "tsup server.ts --format esm,cjs && npm run --prefix public build",
    "typecheck": "tsc -p tsconfig.server.json --noEmit && tsc -p public/tsconfig.json --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "generate": "npx tsp compile scheme/main.tsp && npx openapi-typescript-codegen --input scheme/openapi.yaml --output public/src/api/client"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "livereload": "^0.9.3",
    "mysql2": "^3.6.1"
  },
  "devDependencies": {
    "@babel/core": "^7.27.4",
    "@babel/preset-env": "^7.27.2",
    "@babel/preset-typescript": "^7.27.1",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^30.0.0",
    "@types/livereload": "^0.9.5",
    "@types/node": "^24.0.7",
    "@typespec/compiler": "^0.60.0",
    "@typespec/http": "^0.60.0",
    "@typespec/openapi3": "^0.60.0",
    "@typespec/rest": "^0.60.0",
    "babel-jest": "^30.0.0",
    "chokidar": "^3.5.3",
    "concurrently": "^9.2.1",
    "jest": "^30.0.0",
    "jest-environment-jsdom": "^30.0.0",
    "jsdom": "^26.1.0",
    "ts-jest": "^29.4.0",
    "tsup": "^8.5.0",
    "tsx": "^4.20.5",
    "typescript": "^5.8.3"
  }
}
```

### TypeScript設定

#### tsconfig.base.json

共通のTypeScript設定を定義。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["public/src/*"]
    }
  }
}
```

#### tsconfig.server.json

バックエンド用のTypeScript設定。

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./",
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["server.ts", "lib/**/*"],
  "exclude": ["node_modules", "dist", "public"]
}
```

### データベース環境

Docker Composeを使用してMySQL 8を実行：

```yaml
services:
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: erviewer
    ports:
      - "30177:3306"
    volumes:
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
```

### データベースアクセス

`lib/database.ts`でDatabaseManagerクラスを実装。生SQL（ORMなし）でMySQLにアクセス。

### 現在のテスト状況

- package.jsonにJest関連のスクリプトとパッケージが含まれているが、実際のテストコードは未実装
- `tests/`ディレクトリは存在するが、内容は空または不完全
- テストフレームワークとしてJestとts-jestがインストール済み
- jest-environment-jsdomもインストールされているが、バックエンドUsecaseテストには不要の可能性

## 期待する回答

以下の観点から、TypeScriptバックエンドのUsecaseテスト実装に最適な方針とライブラリを提案してください：

### 1. テストフレームワークの選定

- **Jest vs Vitest**: どちらを使用すべきか
  - ES Modules対応状況
  - TypeScript統合の品質
  - モック機能の充実度
  - 実行速度
  - メンテナンス性
  - コミュニティとエコシステム
- すでにJestがインストールされているが、Vitestに移行する価値はあるか

### 2. TypeScript統合

- **ts-jest vs tsx/tsup vs その他**: TypeScriptテストの実行方法
  - 設定の複雑さ
  - ビルド速度
  - ES Modules対応
  - 型チェックの扱い

### 3. モック戦略

- **モックライブラリ**: 依存性注入された副作用のモック方法
  - Jest組み込みモック vs 外部ライブラリ
  - ファイルシステムのモック（`fs`）
  - 環境変数のモック（`process.env`）
  - 日時のモック（`new Date()`）
- **モックの型安全性**: TypeScriptでのモック型定義

### 4. データベーステスト

- **テスト用DBのセットアップ**: Docker ComposeでのMySQL起動と接続方法
  - テスト実行前のDB接続確認
  - テストコード内でのDatabaseManagerの初期化
- **テストデータ**: Docker Compose起動時の`init.sql`で準備済みのデータを使用
  - テストケース毎のデータ操作は不要（参照のみ）
  - 複雑なフィクスチャ管理やクリーンアップは不要

### 5. テストの構造化

- **ディレクトリ構成**: tests/usecases/配下のファイル構成
- **命名規則**: テストファイルとテストケースの命名
- **テストパターン**: Given-When-Then、AAA（Arrange-Act-Assert）等
- **可読性**: テストコードの読みやすさと理解しやすさを重視

### 6. 設定ファイル

- **jest.config.js/vitest.config.ts**: 具体的な設定例
- **TypeScript設定**: テスト用のtsconfig設定
- **シンプルな設定**: 必要最小限の設定で動作させる方法

### 7. その他の考慮事項

- **デバッグ方法**: VSCodeでのテストデバッグ設定
- **変更のしやすさ**: テストコードのメンテナンス性を高める方法
- **ベストプラクティス**: TypeScript + Node.js + MySQLのテストにおける、シンプルで保守しやすいベストプラクティス

### 重視しないこと

以下の項目は本プロジェクトでは不要です：

- **CI/CD対応**: ローカル環境でのテスト実行のみを想定
- **テストカバレッジ**: カバレッジ計測やレポート生成は不要
- **並列実行**: テストは直列実行で十分（速度より可読性を重視）
- **重厚なDBテストツール**: 参照のみなので複雑なフィクスチャ管理やトランザクション制御は不要

現在のプロジェクト構成（ES Modules、tsx/tsup使用、Docker Compose環境）を考慮した上で、シンプルで可読性が高く、変更しやすいテスト環境を提案してください。
