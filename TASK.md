# TypeScript移行プロジェクト タスクリスト

## プロジェクト概要
本プロジェクトでは、ER Viewer ApplicationのJavaScriptコードを段階的にTypeScriptに移行し、型安全性を確保しながらアプリケーションが正常に動作する状態を目指します。

## 移行戦略
- **段階的移行**: Infrastructure層 → ユーティリティ → メインアプリケーション の順序で移行
- **テスト駆動**: 各段階でテストが通ることを確認
- **型安全性重視**: 厳密な型定義による品質向上

---

## Phase 1: 環境セットアップ

### 1.1 TypeScript基盤環境構築
- [ ] TypeScriptのインストール (`typescript`, `@types/node`, `@types/jest`)
- [ ] `tsconfig.json`の作成と設定
  - [ ] ES6モジュール対応設定
  - [ ] DOM型定義の有効化
  - [ ] 厳密な型チェック設定
  - [ ] アウトプットディレクトリ設定
- [ ] ESLint + TypeScript設定 (`@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`)
- [ ] Prettierとの連携設定

### 1.2 ビルドプロセス更新
- [ ] package.jsonのスクリプト更新
  - [ ] `build:ts` スクリプト追加（TypeScriptコンパイル）
  - [ ] `dev:ts` スクリプト追加（watch mode）
  - [ ] `typecheck` スクリプト追加
- [ ] Jest設定のTypeScript対応
  - [ ] `ts-jest`のインストールと設定
  - [ ] `jest.config.js`のTypeScript対応
- [ ] babel設定のTypeScript対応
  - [ ] `@babel/preset-typescript`の追加

---

## Phase 2: 型定義ファイル作成

### 2.1 アプリケーション型定義
- [ ] `types/index.ts` - 基本型定義
  - [ ] `ERData`型（Entity, Column, Relationship）
  - [ ] `LayoutData`型
  - [ ] `Viewport`型
  - [ ] `ApplicationState`型
- [ ] `types/dom.ts` - DOM関連型定義
  - [ ] カスタムDOM要素の型拡張
  - [ ] SVG要素の型定義
- [ ] `types/events.ts` - イベント関連型定義
  - [ ] カスタムイベント型
  - [ ] マウス/キーボードイベント拡張型

### 2.2 Infrastructure層型定義
- [ ] `types/infrastructure.ts` - Infrastructure型定義
  - [ ] `Infrastructure`インターフェース型
  - [ ] `DOMInterface`型
  - [ ] `NetworkInterface`型
  - [ ] `StorageInterface`型
  - [ ] `BrowserAPIInterface`型

---

## Phase 3: Infrastructure層のTypeScript化

### 3.1 Interfaceファイルの移行
- [ ] `infrastructure/interfaces/infrastructure.js` → `.ts`
- [ ] `infrastructure/interfaces/dom-interface.js` → `.ts`
  - [ ] DOM操作メソッドの型定義強化
  - [ ] Element型の適切な型付け
- [ ] `infrastructure/interfaces/network-interface.js` → `.ts`
  - [ ] HTTP関連型の定義
  - [ ] レスポンス型の定義
- [ ] `infrastructure/interfaces/storage-interface.js` → `.ts`
  - [ ] ストレージデータ型の定義
- [ ] `infrastructure/interfaces/browser-api-interface.js` → `.ts`
  - [ ] ブラウザAPI型の定義

### 3.2 Implementation層の移行
- [ ] `infrastructure/implementations/infrastructure-implementation.js` → `.ts`
- [ ] `infrastructure/implementations/dom-implementation.js` → `.ts`
  - [ ] 実DOM操作の型安全化
  - [ ] TypeScriptのDOM型との整合性確保
- [ ] `infrastructure/implementations/network-implementation.js` → `.ts`
  - [ ] fetch APIの型安全化
  - [ ] エラーハンドリングの型定義
- [ ] `infrastructure/implementations/storage-implementation.js` → `.ts`
  - [ ] localStorageの型安全化
- [ ] `infrastructure/implementations/browser-api-implementation.js` → `.ts`
  - [ ] ブラウザAPI呼び出しの型安全化

### 3.3 Mock層の移行
- [ ] `infrastructure/mocks/infrastructure-mock.js` → `.ts`
- [ ] `infrastructure/mocks/dom-mock.js` → `.ts`
  - [ ] MockDOM実装の型安全化
  - [ ] テスト用型定義の強化
- [ ] `infrastructure/mocks/network-mock.js` → `.ts`
  - [ ] Mock HTTP実装の型安全化
- [ ] `infrastructure/mocks/storage-mock.js` → `.ts`
  - [ ] Mock Storage実装の型安全化
- [ ] `infrastructure/mocks/browser-api-mock.js` → `.ts`
  - [ ] Mock BrowserAPI実装の型安全化

---

## Phase 4: ユーティリティ・補助モジュールの移行

### 4.1 Utilsモジュール
- [ ] `utils/client-logger.js` → `.ts`
  - [ ] ログレベル型の定義
  - [ ] ログメッセージ型の定義
- [ ] `utils/coordinate-transform.js` → `.ts`
  - [ ] 座標変換関数の型定義
  - [ ] Point, Bounds型の活用
- [ ] `utils/svg-utils.js` → `.ts`
  - [ ] SVG操作関数の型安全化
  - [ ] SVGElement型の適切な使用

### 4.2 Pathfindingモジュール
- [ ] `pathfinding/connection-points.js` → `.ts`
  - [ ] 接続点計算の型定義
  - [ ] 幾何学計算の型安全化
- [ ] `pathfinding/smart-routing.js` → `.ts`
  - [ ] ルーティングアルゴリズムの型定義
  - [ ] パス型の定義

### 4.3 その他の補助モジュール
- [ ] `clustering/clustering-engine.js` → `.ts`
  - [ ] クラスタリング関連型の定義
- [ ] `highlighting/highlight-manager.js` → `.ts`
  - [ ] ハイライト状態型の定義

---

## Phase 5: 主要アプリケーションモジュールの移行

### 5.1 コントローラー層
- [ ] `events/event-controller.js` → `.ts`
  - [ ] イベントハンドラー型の定義
  - [ ] イベント管理の型安全化
- [ ] `ui/ui-controller.js` → `.ts`
  - [ ] UI状態管理の型定義
  - [ ] UI要素型の定義
- [ ] `state/state-manager.js` → `.ts`
  - [ ] 状態管理の型安全化
  - [ ] State型の厳密な定義

### 5.2 レンダリング層
- [ ] `rendering/canvas-renderer.js` → `.ts`
  - [ ] レンダリング関数の型定義
  - [ ] Canvas描画の型安全化
- [ ] `layer-manager.js` → `.ts`
  - [ ] レイヤー管理の型定義

### 5.3 注釈・アノテーション
- [ ] `annotations/annotation-controller.js` → `.ts`
  - [ ] 注釈データ型の定義
  - [ ] 注釈操作の型安全化

---

## Phase 6: メインアプリケーションの移行

### 6.1 統合アプリケーションクラス
- [ ] `er-viewer-application.js` → `.ts` (1,538行の大規模ファイル)
  - [ ] `ERViewerApplication`クラスの型定義
  - [ ] 巨大なstateオブジェクトの型安全化
  - [ ] 全メソッドの引数・戻り値型定義
  - [ ] Infrastructure依存性の型整合性確保
  - [ ] イベントハンドラーの型安全化
  - [ ] DOM操作の型安全化

### 6.2 エントリーポイント
- [ ] `app-new.js` → `.ts`
  - [ ] アプリケーション初期化の型安全化
  - [ ] グローバル型定義の追加
- [ ] `app.js` → `.ts` (レガシーファイルの場合)

---

## Phase 7: テストファイルの移行

### 7.1 統合テスト
- [ ] `tests/er-viewer-application.test.js` → `.ts`
  - [ ] テストケースの型安全化
  - [ ] Mock型との整合性確保
  - [ ] アサーション型の強化

### 7.2 テスト設定
- [ ] `tests/setup.js` → `.ts`
  - [ ] テスト環境設定の型定義

---

## Phase 8: バックエンドの移行（オプション）

### 8.1 サーバーファイル
- [ ] `server.js` → `.ts`
  - [ ] Express型の適用
  - [ ] ルートハンドラーの型定義
  - [ ] ミドルウェア型の定義

### 8.2 ライブラリファイル
- [ ] `lib/database.js` → `.ts`
  - [ ] MySQL操作の型安全化
  - [ ] クエリ結果型の定義
- [ ] `lib/storage.js` → `.ts`
  - [ ] ファイルI/O操作の型定義
- [ ] `lib/logger.js` → `.ts`
  - [ ] ログ関連型の定義

---

## Phase 9: 設定ファイル更新

### 9.1 HTMLファイル更新
- [ ] `public/index.html`のscript tagを`.ts`ファイル参照に更新
  - [ ] ES6モジュール設定の確認
  - [ ] TypeScriptコンパイル後のパス設定

### 9.2 ドキュメント更新
- [ ] `CLAUDE.md`のTypeScript情報追加
- [ ] `README.md`のセットアップ手順更新
- [ ] 開発環境セットアップのTypeScript化

---

## Phase 10: 品質保証・動作確認

### 10.1 型チェック
- [ ] 全ファイルの型エラー解決
- [ ] 厳密な型設定での型チェック通過
- [ ] ESLintルール適用とエラー解決

### 10.2 テスト実行
- [ ] `npm test`実行成功
- [ ] 全テストケース通過
- [ ] カバレッジレポート確認

### 10.3 ビルド・動作確認
- [ ] TypeScriptコンパイル成功
- [ ] `npm run build`成功
- [ ] docker compose up --buildが成功すること

---

## Phase 11: 最終調整・クリーンアップ

### 11.1 不要ファイル削除
- [ ] 元の`.js`ファイル削除（バックアップ確認後）
- [ ] 古い設定ファイル削除

### 11.2 最終確認

- [ ] 全てのjsファイルがtsファイルに置き換わっていること（テストコード含む）
- [ ] docker compose up --buildが起動すること
- [ ] ブラウザでlocalhost:30033を表示してエラーが出力されていないこと
- [ ] npm testが成功すること