# タスク一覧：画面表示と疎通確認（実装タスク）

## 目的
画面を開けるようにして、疎通確認として`GET /api/build-info`を呼び出した結果を表示する

## 前提条件
- [x] TypeSpecからAPIクライアントが生成済み（`public/src/api/client/`）
- [x] HTML構造が用意済み（`public/index.html`）
- [x] Vite設定が完了（APIプロキシ設定済み）
- [x] バックエンドAPIが実装済み（`/api/build-info`）

## 実装タスク

### 1. フロントエンドのメインアプリケーションコード作成
**ファイル**: `public/src/app.ts`

- [ ] 既存のテストコードを削除
- [ ] APIクライアントをインポート
- [ ] DOM要素の取得処理を実装
- [ ] ビルド情報取得処理を実装
- [ ] ビルド情報をモーダルに表示する処理を実装
- [ ] エラーハンドリングを実装

**実装内容**:
```typescript
- DefaultService.apiGetBuildInfo()を呼び出し
- 取得したBuildInfo型のデータをHTMLに整形して表示
- モーダルの表示/非表示の制御
- エラー時の表示処理
```

## 動作確認（実施者が行う）

### 確認手順
1. 依存パッケージのインストール確認
   - ルート: `npm install`
   - フロントエンド: `cd public && npm install`

2. 開発サーバーの起動
   - `npm run dev`（バックエンド+フロントエンドが起動）

3. ブラウザでアクセス
   - `http://localhost:5173`にアクセス
   - 「ビルド情報」ボタンをクリック
   - モーダルにビルド情報が表示されることを確認

### 確認項目
- [ ] 画面が正常に表示される
- [ ] ビルド情報ボタンでモーダルが開く
- [ ] モーダル内にビルド情報が表示される（version, name, buildTime, buildDate, git情報）
- [ ] モーダルの閉じるボタンが動作する
- [ ] DevToolsでエラーが出ていない
- [ ] Network タブで`GET /api/build-info`が200 OKで返る

## メモ

### 既存のHTML要素ID
- `#build-info`: ビルド情報ボタン
- `#build-info-modal`: ビルド情報モーダル
- `#build-info-content`: ビルド情報の表示エリア
- `#close-build-info`: モーダルを閉じるボタン

### 生成されたAPIクライアントの使用方法
```typescript
import { DefaultService } from './api/client';

// ビルド情報取得
const buildInfo = await DefaultService.apiGetBuildInfo();
```

### Viteプロキシ設定
- フロントエンド: `http://localhost:5173`
- バックエンド: `http://localhost:30033`
- `/api/*` のリクエストは自動的にバックエンドにプロキシされる
