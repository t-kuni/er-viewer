# Infrastructure Mock Coverage Guide

## 概要

Infrastructure Mock Coverageは、テスト実行中のMockメソッド呼び出しを追跡し、どのMockメソッドがテストでカバーされているかを可視化する機能です。

## 主な機能

### 1. Mock呼び出しトラッキング

- テスト実行中のすべてのMockメソッド呼び出しを自動追跡
- 呼び出し回数、引数、呼び出し元テストを記録
- リアルタイムでカバレッジ情報を収集

### 2. カバレッジレポート生成

#### テキストレポート (mock-coverage.md)
- Mock別のカバレッジ率
- 未使用メソッドの一覧
- 呼び出し頻度の高いメソッドTOP10

#### HTMLレポート (index.html)
- インタラクティブなダッシュボード
- Mock別の詳細ビュー
- カラーコード付きの視覚的表示

#### JSONレポート (mock-coverage.json)
- プログラマティックな処理用
- CI/CDパイプラインでの活用
- 外部ツールとの連携

### 3. CI/CD統合

- GitHub Actionsでの自動実行
- PRコメントへのサマリー投稿
- カバレッジ閾値チェック

## 使用方法

### ローカル環境での実行

```bash
# Mock Coverageレポートを生成
npm run test:mock-coverage

# レポートを生成して自動的にブラウザで開く
npm run test:mock-coverage:open
```

### レポートの確認

生成されたレポートは以下の場所に保存されます：

- `coverage/mock-coverage/index.html` - HTMLレポート
- `coverage/mock-coverage/mock-coverage.md` - Markdownレポート
- `coverage/mock-coverage/mock-coverage.json` - JSONレポート

### カバレッジ閾値の設定

`jest.config.js`でMock固有のカバレッジ閾値を設定できます：

```javascript
coverageThreshold: {
  './public/js/infrastructure/mocks/*.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
},
```

## レポートの読み方

### カバレッジ率

- **Total Coverage**: すべてのMockメソッドに対するカバー率
- **Mock Details**: 各Mock別の詳細なカバレッジ情報
- **Uncovered Methods**: テストで使用されていないメソッド一覧

### カラーコード

- 🟢 緑 (80%以上): 優秀なカバレッジ
- 🟡 黄 (60-79%): 改善の余地あり
- 🔴 赤 (60%未満): 要改善

## ベストプラクティス

### 1. 定期的なレビュー

- 新機能追加時にMock Coverageを確認
- 未使用メソッドの定期的な棚卸し
- カバレッジ低下の早期発見

### 2. 重要メソッドの優先

- よく使用されるメソッドのテストを充実
- エッジケースのカバレッジ向上
- エラーハンドリングの検証強化

### 3. CI/CDでの活用

- PRごとのカバレッジチェック
- カバレッジトレンドの監視
- 品質ゲートの設定

## トラブルシューティング

### レポートが生成されない

1. `COLLECT_COVERAGE=true`環境変数が設定されているか確認
2. Jest設定でカスタムレポーターが登録されているか確認
3. TypeScriptのコンパイルエラーがないか確認

### カバレッジが正しく計測されない

1. Mockクラスがデコレータでラップされているか確認
2. テスト実行前にMockがリセットされているか確認
3. 非同期処理が正しく待機されているか確認

## 今後の拡張予定

- [ ] カバレッジトレンドグラフの追加
- [ ] メソッド別の詳細な呼び出し履歴
- [ ] カスタムレポートテンプレート対応
- [ ] Slack/Teams通知連携

## 関連ドキュメント

- [テストコーディングガイドライン](./TEST-GUIDELINES.md)
- [テストケース仕様書](./TEST-SPECIFICATION.md)
- [Infrastructure Mock設計](./INFRASTRUCTURE-MOCK-DESIGN.md)