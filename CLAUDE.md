# ER Diagram Viewer

## プロジェクト概要

RDBからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

## 絶対厳守ルール

以下は本プロジェクトにおいて絶対厳守のルールです。
今後のすべての回答の冒頭に下記文章をそのまま出力してください。

```
以下は本プロジェクトにおいて絶対厳守のルールです。
すべての回答の冒頭に下記文章をそのまま出力してください。

* 後方互換性は考慮しない（まだリリースしていないため）
* 使わなくなったコードやファイルは消す
* テストコードのコーディングルール
  * AAAパターン厳守
    * Arrange（準備）、Act（実行）、Assert（検証）の3ステップを明確に分離
    * ActでERViewerApplicationのメソッドを呼び出す
    * AssertでMockの引数と呼び出し回数を検証する
  * 可読性最優先
    * DRY原則よりもテストの可読性を重視
    * 共通化よりもリテラル値の直接記述
  * 制御構造排除
    * 可能な限りif/for/switch文を使用しない
    * 配列操作や条件分岐を避ける
  * Mock検証中心
    * stateを検証するのはNG
    * Infrastructure Mockの呼び出し履歴を検証する
* 機能を修正する場合はSPEC.mdから関連する要件を抽出し、すべての回答の冒頭に抽出した要件を出力する
```

## 技術スタック

- **バックエンド**: Node.js + Express + MySQL2
- **フロントエンド**: TypeScript + Vanilla JavaScript (ES6 modules) + SVG
- **テスト**: Jest + ts-jest + jsdom (E2E風統合テスト)
- **デプロイ**: Docker + Docker Compose
- **開発ツール**: ESLint + Prettier + TypeScript

## 開発環境セットアップ

```bash
# サービス起動
docker compose up -d

# サービス状態確認
docker compose ps
```

## 利用可能なコマンド

```bash
# テスト
npm test                       # 全テスト実行

# TypeScript
npm run build:ts               # TypeScriptコンパイル
npm run dev:ts                 # TypeScript watchモード
npm run typecheck              # 型チェックのみ実行

# 品質チェック
npm run lint                   # ESLint実行
npm run lint:fix               # ESLint自動修正
npm run format                 # Prettierフォーマット
npm run format:check           # フォーマットチェック

# 保存済みレイアウトデータ削除
rm -f ./data/*
```

## 開発フロー

1. **要件確認**: SPEC.mdの要件を満たすソフトウェアを開発
2. **タスク完了条件**: `npm test` が通ること
3. **動作確認**: ブラウザ（Playwright）を使用（curlは非推奨）
   - 接続先： localhost:30033
   - ブラウザテスト時は必ずブラウザを再起動
4. **差分確認**: `git add -A && GIT_PAGER=cat git diff HEAD`

## アーキテクチャ設計方針

### 統合アプリケーション設計

- **単一責任の統合クラス**: `ERViewerApplication`がアプリケーション全体を管理
- **中央集権的状態管理**: 全状態を単一オブジェクトで管理（`this.state`）
- **依存性注入**: Infrastructure層をコンストラクタで注入
- **副作用の完全分離**: 全ての副作用をInfrastructure層に委譲

### Infrastructure層による副作用隔離

- **Interface-Implementation-Mock三層構造**
- **完全な抽象化**: DOM、Network、Storage、BrowserAPI操作を抽象化
- **テスト容易性**: Mock実装により高速で信頼性の高いテストを実現

## アーキテクチャ概要

```
/public/js/
├── app-new.ts                          # メインエントリーポイント（本番用）
├── er-viewer-application.ts            # 統合アプリケーションクラス（1539行）
├── types/                              # TypeScript型定義
│   ├── index.ts                        # 基本型定義（ERData、Entity等）
│   ├── dom.ts                          # DOM関連型定義
│   ├── events.ts                       # イベント関連型定義
│   └── infrastructure.ts               # Infrastructure層型定義
└── infrastructure/                     # 副作用管理層
    ├── interfaces/                     # 抽象インタフェース定義
    │   ├── infrastructure.js           # 統合インタフェース
    │   ├── dom-interface.js            # DOM操作抽象化
    │   ├── network-interface.js        # HTTP通信抽象化
    │   ├── storage-interface.js        # ストレージ抽象化
    │   └── browser-api-interface.js    # ブラウザAPI抽象化
    ├── implementations/                # 実装クラス（本番用）
    │   ├── infrastructure-implementation.js
    │   ├── dom-implementation.js
    │   ├── network-implementation.js
    │   ├── storage-implementation.js
    │   └── browser-api-implementation.js
    └── mocks/                          # テスト用モック実装
        ├── infrastructure-mock.js
        ├── dom-mock.js
        ├── network-mock.js
        ├── storage-mock.js
        └── browser-api-mock.js

/tests/
├── initialization-setup.test.ts        # 初期化とセットアップのテスト
├── rendering.test.ts                    # レンダリング機能のテスト
├── user-interaction.test.ts             # ユーザーインタラクションのテスト
├── data-management.test.ts              # データ管理のテスト
├── ui-components.test.ts                # UIコンポーネントのテスト
├── state-management.test.ts             # 状態管理のテスト
├── error-handling.test.ts               # エラーハンドリングのテスト
└── test-data-factory.ts                 # テストデータファクトリー

/lib/                                   # バックエンドライブラリ
├── database.js                         # MySQL操作
├── storage.js                          # データ永続化
└── logger.js                           # ログ管理
```

## テスト戦略

### テストコーディングルール

- **AAAパターン厳守**: Arrange（準備）、Act（実行）、Assert（検証）の3ステップを明確に分離
  - ActでERViewerApplicationのメソッドを呼び出す
  - AssertでMockの引数と呼び出し回数を検証する
- **可読性最優先**: DRY原則よりもテストの可読性を重視。共通化よりもリテラル値の直接記述
- **制御構造排除**: if/for/switch文を使用禁止。配列操作や条件分岐を避ける
- **Mock検証中心**: stateを検証するのはNG。Infrastructure Mockの呼び出し履歴を検証する

### テスト実行の特徴

- **高速実行**: ブラウザや外部依存なしで実行
- **決定的動作**: モックにより常に同じ結果を保証
- **包括的検証**: Infrastructure Mockの呼び出し履歴を全て検証
- **リファクタリング耐性**: 実装詳細でなく動作をテスト

### モック戦略

```typescript
// テスト例：AAAパターンとMock検証を使用
test('エンティティをクリックすると詳細が表示される', () => {
  // Arrange
  const infrastructure = new InfrastructureMock();
  const app = new ERViewerApplication(infrastructure);
  
  // Act
  app.showTableDetails('users');
  
  // Assert - Mock呼び出しを検証
  expect(infrastructure.dom.setAttribute).toHaveBeenCalledWith(
    'sidebar', 
    'data-visible', 
    'true'
  );
  expect(infrastructure.dom.setTextContent).toHaveBeenCalledWith(
    'current-table', 
    'users'
  );
});
```

