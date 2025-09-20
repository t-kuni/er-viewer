# TypeScript開発環境におけるコンパイル・実行ツール選択のリサーチ

## リサーチ要件

* 本プロジェクトではフロントとバックでTypeScriptを採用している。この環境下でTypeScriptのコンパイルや実行はどういうツールを使うべきか？
* 開発環境においては、コードを変更したらフロントとバックの実行中のコードも更新されてほしい

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で可視化・編集できるWebアプリケーションです。

### アーキテクチャ

- **バックエンド**: Node.js + Express + TypeScript
- **フロントエンド**: TypeScript + Vite
- **データベース**: MySQL 8
- **開発環境**: Docker Compose

### 現状のフェーズ

- アプリケーションを丸ごと作り直そうとしているので不要なコードが残っているケースあり
- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない

## 現在の実装状況

### プロジェクト構成

```
/home/kuni/Documents/er-viewer/
├── server.ts                    # バックエンドのメインファイル
├── lib/
│   └── database.ts             # データベース管理
├── public/                     # フロントエンドコード
│   ├── src/
│   │   ├── app-new.ts         # フロントエンドメイン
│   │   ├── components/        # UIコンポーネント
│   │   └── services/          # フロントサービス
│   ├── index.html
│   ├── package.json           # フロントエンド依存関係
│   ├── tsconfig.json          # フロント用TypeScript設定
│   └── vite.config.ts         # Vite設定
├── package.json               # バックエンド依存関係
├── tsconfig.json              # バックエンド用TypeScript設定
├── docker-compose.yml         # 開発環境設定
└── Dockerfile.dev             # 開発用Docker設定
```

### 現在のpackage.json（バックエンド）

```json
{
  "name": "er-viewer",
  "type": "module",
  "scripts": {
    "start": "node --loader ts-node/esm server.ts",
    "dev": "NODE_ENV=development node --loader ts-node/esm server.ts",
    "dev:watch": "NODE_ENV=development nodemon --exec \"node --loader ts-node/esm\" server.ts",
    "build:ts": "tsc",
    "dev:ts": "tsc --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "livereload": "^0.9.3",
    "mysql2": "^3.6.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/livereload": "^0.9.5",
    "@types/node": "^24.0.7",
    "chokidar": "^3.5.3",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.8.3"
  }
}
```

### 現在のpackage.json（フロントエンド）

```json
{
  "name": "er-viewer-frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### TypeScript設定

#### バックエンド（tsconfig.json）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./",
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["node"],
    "baseUrl": "./",
    "paths": {
      "@/*": ["public/src/*"]
    }
  },
  "include": ["server.ts", "lib/**/*", "public/src/**/*", "types/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### フロントエンド（public/tsconfig.json）

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "index.html"]
}
```

### 開発環境（Docker Compose）

```yaml
services:
  app:
    build:
      dockerfile: Dockerfile.dev
    ports:
      - "30033:30033"
    environment:
      - NODE_ENV=development
    volumes:
      - ./:/app
      - /app/node_modules
    command: ["npm", "run", "dev"]
```

### 現在の課題

1. バックエンドは`ts-node`でTypeScriptを直接実行している
2. フロントエンドは`vite`を使用している
3. 開発時のホットリロードは部分的にしか動作していない
4. 複数のTypeScript設定ファイルが存在し、管理が複雑
5. バックエンドとフロントエンドで異なるビルドツールを使用している

### 技術的制約

- Node.js 18以上
- TypeScript 5.0以上
- ES Modules使用（package.jsonで"type": "module"を設定）
- Docker環境での実行が前提
- フロントエンドはViteプロキシでバックエンドAPI（/api）にアクセス

## 期待する回答

以下の観点から最適なツール構成を提案してください：

1. **TypeScriptコンパイル・実行ツール**
   - バックエンド用のTypeScript実行ツール
   - フロントエンド用のビルドツール
   - 統一性とメンテナンス性の観点

2. **開発時のホットリロード**
   - コード変更時の自動リロード方法
   - バックエンドとフロントエンドの連携
   - Docker環境での実装方法

3. **設定の最適化**
   - tsconfig.jsonの構成
   - package.jsonのスクリプト設定
   - 開発・本番環境の使い分け

4. **具体的な実装手順**
   - 必要な依存関係の変更
   - 設定ファイルの修正内容
   - Docker設定の調整

現在の技術スタックと制約を考慮した上で、開発効率を最大化する構成を提案してください。
