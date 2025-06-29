# ER Diagram Viewer

## プロジェクト概要
RDBからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

## 技術スタック
- **バックエンド**: Node.js + Express + MySQL2
- **フロントエンド**: Vanilla JavaScript (ES6 modules) + SVG
- **テスト**: Jest + jsdom (E2E風統合テスト)
- **デプロイ**: Docker + Docker Compose

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
├── app-new.js                          # メインエントリーポイント（本番用）
├── er-viewer-application.js            # 統合アプリケーションクラス（1539行）
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
└── er-viewer-application.test.js       # 統合E2E風テスト（514行）

/lib/                                   # バックエンドライブラリ
├── database.js                         # MySQL操作
├── storage.js                          # データ永続化
└── logger.js                           # ログ管理
```

## テスト戦略

### E2E風統合テスト設計
- **単一テストファイル**: 全機能を1つのファイルでテスト
- **Infrastructure層のみモック**: ビジネスロジックは実際のコードを使用
- **ワークフロー重視**: ユーザーのワークフロー全体をテスト
- **高カバレッジ**: 1つのテストで関連する複数機能を検証

### テスト実行の特徴
- **高速実行**: ブラウザや外部依存なしで実行
- **決定的動作**: モックにより常に同じ結果を保証
- **包括的検証**: 状態変更、DOM操作、ネットワーク呼び出しを全て検証
- **リファクタリング耐性**: 実装詳細でなく動作をテスト

### モック戦略
```javascript
// テスト例：完全にモック化された環境で実アプリケーションコードを実行
const infrastructure = new InfrastructureMock();
const app = new ERViewerApplication(infrastructure);

// ユーザーワークフローをそのままテスト
app.showTableDetails('users');
expect(app.state.sidebarVisible).toBe(true);
expect(app.state.currentTable).toBe('users');
```

## 主要機能
- **リバースエンジニアリング**: MySQL→ER図変換
- **増分リバース**: 既存レイアウト保持での差分反映
- **インタラクティブ編集**: エンティティ配置、注釈追加
- **レイヤー管理**: ドラッグ&ドロップでの描画順序変更
- **データ永続化**: レイアウト・注釈データの保存

## アーキテクチャの利点

### 開発効率
- **シンプルな構造**: 1つのクラスで全体を把握
- **統一された状態管理**: `setState()`による一元的な状態更新
- **明確なデータフロー**: 全ての状態変更が追跡可能
- **高速なデバッグ**: 全ロジックが1箇所に集約

### テスト品質
- **包括的カバレッジ**: E2E風テストで統合的な品質保証
- **保守性の向上**: テストファイル数の大幅削減（25+ → 1）
- **高速実行**: モック利用によりミリ秒単位での実行
- **堅牢性**: リファクタリングに強いテスト設計

### 設計の健全性
- **適切な責任分離**: ビジネスロジックと副作用の完全分離
- **依存性の制御**: Interface-based designによる柔軟性
- **単一責任の徹底**: Infrastructure層は副作用のみを担当

## 環境変数設定
- **DB接続**: 環境変数でMySQL接続情報を設定
- **データ保存**: docker-compose volumeで保存先を管理

## 制約・注意点
- **大規模単一クラス**: ERViewerApplicationは1539行の大きなクラス
- **モノリシック設計**: 理論的な分離よりも実用性を重視
- **Infrastructure層の重要性**: 副作用の抽象化が設計の要
- **初期開発フェーズ**: 永続化層の後方互換は不要
- **対応DB**: 現在はMySQLのみ（将来的に拡張予定）