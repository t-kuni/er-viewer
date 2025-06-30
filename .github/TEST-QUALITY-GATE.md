# テスト品質ゲート

このプロジェクトでは、テストコードの品質を保つために自動化された品質ゲートを導入しています。

## 概要

テスト品質ゲートは以下の3つのレベルで動作します：

1. **開発時チェック** - ESLintによるリアルタイムチェック
2. **コミット時チェック** - Huskyによるpre-commitフック
3. **CI/CDチェック** - GitHub Actionsによる自動チェック

## テストコーディングルール

すべてのテストコードは以下のルールに従う必要があります：

### 1. AAAパターン
すべてのテストケースは Arrange/Act/Assert パターンに従います：

```javascript
test('エンティティが正しく描画される', () => {
  // Arrange
  const infrastructure = new InfrastructureMock();
  const app = new ERViewerApplication(infrastructure);
  
  // Act
  app.drawEntity('users');
  
  // Assert
  expect(infrastructure.dom.createElement).toHaveBeenCalledWith('g');
});
```

### 2. 制御構造の排除
テストコード内では `if`、`switch`、配列メソッド（`forEach`、`map`、`filter` など）の使用を避けます：

```javascript
// ❌ 悪い例
entities.forEach(entity => {
  expect(entity.visible).toBe(true);
});

// ✅ 良い例
expect(entities[0].visible).toBe(true);
expect(entities[1].visible).toBe(true);
```

### 3. Mock検証中心
stateの検証ではなく、Infrastructure Mockの呼び出しを検証します：

```javascript
// ❌ 悪い例
expect(app.state.sidebarVisible).toBe(true);

// ✅ 良い例
expect(infrastructure.dom.setAttribute).toHaveBeenCalledWith(
  'sidebar',
  'data-visible',
  'true'
);
```

### 4. 可読性優先
DRY原則よりもテストの可読性を重視し、リテラル値を直接使用します：

```javascript
// ❌ 悪い例
const TEST_USER_NAME = 'テストユーザー';
beforeEach(() => {
  mockData = { name: TEST_USER_NAME };
});

// ✅ 良い例
test('ユーザー名が表示される', () => {
  const mockData = { name: 'テストユーザー' };
  // ...
});
```

## ローカル開発での使用方法

### テスト品質チェックの実行

```bash
# すべてのテスト品質チェックを実行
npm run test:all

# テストコーディングルールのチェックのみ
npm run test:quality

# テストファイル専用のESLintチェック
npm run test:lint

# カバレッジレポートの生成
npm run test:coverage
```

### pre-commitフックの設定

初回セットアップ時に以下を実行：

```bash
npm install
npm run prepare
```

これにより、コミット時に自動的にテスト品質チェックが実行されます。

## CI/CDでの動作

GitHub ActionsのワークフローはPush/PRイベントで自動的に実行されます：

1. **Linting** - コードスタイルのチェック
2. **Formatting** - Prettierによるフォーマットチェック
3. **Type Checking** - TypeScriptの型チェック
4. **Test Execution** - すべてのテストの実行
5. **Coverage Check** - カバレッジが85%以上であることを確認
6. **Test Rules Check** - テストコーディングルールの遵守確認

## トラブルシューティング

### テスト品質チェックが失敗する場合

1. エラーメッセージを確認して違反箇所を特定
2. 該当するテストファイルを修正
3. `npm run test:quality` で再チェック

### ESLintエラーが出る場合

```bash
# 自動修正可能なエラーを修正
npm run lint:fix

# テストファイル専用のチェック
npm run test:lint
```

### pre-commitフックをスキップしたい場合

緊急時のみ使用してください：

```bash
git commit --no-verify -m "緊急修正"
```

## 設定ファイル

- `.github/workflows/test-quality-gate.yml` - GitHub Actionsワークフロー
- `.github/scripts/check-test-rules.js` - テストルールチェックスクリプト
- `.eslintrc.test.js` - テストファイル専用のESLint設定
- `.husky/pre-commit` - pre-commitフック設定

## 今後の改善予定

- [ ] Visual Studio Code拡張機能の開発
- [ ] より詳細なカバレッジレポート
- [ ] パフォーマンス測定の追加
- [ ] テストの並列実行最適化