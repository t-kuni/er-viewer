# TypeScript エラー解消タスク

## 概要
`npm run typecheck`で発生している120+のTypeScriptエラーを品質重視で解消する

## 主要エラーカテゴリ
- TS6133: 未使用変数・関数
- TS18048/TS2532: null/undefinedチェックが必要  
- TS18046: unknown型のエラーハンドリング
- TS2345/TS2352/TS2559: 型の不整合
- TS2341: プライベートメンバーアクセス
- TS2367: 型比較の問題

## ファイル別修正タスク

### tests/error-handling.test.ts（最優先）
- [ ] 未使用importの削除（createERData, createEntity, createUserEntity, createPostEntity, createUserPostERData, createNetworkResponse, createDDLResponse, createSuccessResponse）
- [ ] 未使用変数の削除（waitForAsync, app）
- [ ] null/undefinedチェックの追加（errorRequest, notFoundRequest, forbiddenRequest, rateLimitRequest, lastError）
- [ ] unknown型エラーの型アサーション追加（catch文のerror）
- [ ] 型の不整合修正（Element vs MockElement）

### tests/infrastructure-matchers.test.ts
- [ ] 未使用変数の削除（app変数複数, setAttributeSpy）
- [ ] Element型とMockElement型の互換性修正
- [ ] プライベートメンバー「reverseEngineer」のアクセス方法修正
- [ ] null/undefinedチェックの追加

### tests/initialization-setup.test.ts  
- [ ] 未使用importの削除（createEntity, createUserEntity, createPostEntity, createUserPostERData, createNetworkResponse, createDDLResponse, createSuccessResponse）
- [ ] 未使用変数の削除
- [ ] 型の不整合修正（Element vs MockElement）
- [ ] null/undefinedチェック追加

### tests/rendering.test.ts
- [ ] 未使用importの削除
- [ ] 未使用変数の削除
- [ ] 型の不整合修正（Element vs MockElement）
- [ ] null/undefinedチェック追加

### tests/state-management.test.ts
- [ ] 未使用importの削除
- [ ] 型の不整合修正（Element vs MockElement）
- [ ] null/undefinedチェック追加

### tests/ui-components.test.ts
- [ ] 未使用変数の削除
- [ ] 型の不整合修正（Element vs MockElement）
- [ ] 型キャストの修正

### tests/user-interaction.test.ts
- [ ] 未使用importの削除（createEntity, createPostEntity）
- [ ] 未使用変数の削除（appendChildSpy, removeClassSpy, getElementByIdSpy）
- [ ] 型の不整合修正（MockElement vs Element）
- [ ] null/undefinedチェック追加
- [ ] ERData型とレスポンス型の互換性修正
- [ ] 型比較の修正（Element vs MockElement）

## 品質改善タスク

### 型定義の改善
- [ ] MockElement型とElement型の互換性を確保する型定義追加
- [ ] テスト用の型ガードまたはヘルパー関数作成
- [ ] unknown型エラーハンドリング用のユーティリティ関数作成

### テストコードの品質向上
- [ ] 不要なimportの一括削除
- [ ] 型安全性を保つためのnull/undefinedチェック統一
- [ ] プライベートメンバーテスト戦略の見直し

### 最終検証
- [ ] `npm run typecheck`でエラー0件を確認
- [ ] `npm test`でテストが正常実行されることを確認
- [ ] コードレビューでの品質確認

## 注意事項
- 後方互換性は考慮しない（まだリリースしていないため）  
- 使わなくなったコードやファイルは削除する
- AAAパターンを崩さないよう注意
- Mock検証中心の原則を維持