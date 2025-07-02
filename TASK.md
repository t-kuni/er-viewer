# ESLint エラー解消タスクリスト

## 概要
- **総エラー数**: 957問題（667エラー、290警告）
- **主要ファイル**: er-viewer-application.ts, clustering-engine.ts, app.ts, annotation-controller.ts
- **修正方針**: 段階的な品質重視アプローチ

## Phase 1: 基盤整備

### 環境設定修正
- [ ] package.jsonに`"type": "module"`を追加してモジュール警告を解消

## Phase 2: 構文エラー修正（エラー優先）

### case文の変数宣言問題修正
- [ ] `clustering-engine.ts:174` - case文内のlexical declaration修正
- [ ] `clustering-engine.ts:182` - case文内のlexical declaration修正

## Phase 3: 型安全性改善（最重要・大規模）

### any型の除去
- [ ] `er-viewer-application.ts:70` - any型をプロパーな型に変更
- [ ] `er-viewer-application.ts:1055` - any型をプロパーな型に変更
- [ ] `er-viewer-application.ts:1155` - any型をプロパーな型に変更
- [ ] `er-viewer-application.ts:1185` - any型をプロパーな型に変更
- [ ] `er-viewer-application.ts:1225` - any型をプロパーな型に変更

### unsafe操作の修正（any型由来）
- [ ] `er-viewer-application.ts` - 全てのunsafe assignmentを型安全に修正
- [ ] `er-viewer-application.ts` - 全てのunsafe member accessを型安全に修正
- [ ] `er-viewer-application.ts` - 全てのunsafe callを型安全に修正

### 関数戻り値型の明示
- [ ] `app.ts:57` - 関数の戻り値型を明示
- [ ] `app.ts:71` - 関数の戻り値型を明示

## Phase 4: モダン構文改善

### nullish coalescing演算子への変更
- [ ] `annotation-controller.ts` - 6箇所の`||`を`??`に変更
- [ ] `app.ts:206` - `||`を`??`に変更
- [ ] `clustering-engine.ts` - 6箇所の`||`を`??`に変更
- [ ] `er-viewer-application.ts` - 多数の`||`を`??`に変更

### optional chaining適用
- [ ] `clustering-engine.ts:280` - オプショナルチェーンを適用
- [ ] `er-viewer-application.ts` - 該当箇所でオプショナルチェーンを適用

## Phase 5: 条件式・非同期処理改善

### strict boolean expressions修正
- [ ] `app.ts:206` - conditional内のany値を明示的比較に変更
- [ ] `clustering-engine.ts:280` - オブジェクト値の条件式を修正
- [ ] `er-viewer-application.ts` - 全ての非boolean条件式を修正

### floating promises処理
- [ ] `er-viewer-application.ts:191` - Promiseを適切に処理（await/catch/then）
- [ ] その他の未処理Promiseを適切に処理

### 不要なasync/await修正
- [ ] `er-viewer-application.ts:1041` - awaitのないasync関数を修正
- [ ] `er-viewer-application.ts:1137` - awaitのないasync関数を修正
- [ ] `er-viewer-application.ts:1215` - awaitのないasync関数を修正

## Phase 6: 最終確認・検証

### 品質確認
- [ ] `npm run lint:fix && npm run test && npm run typecheck` 実行
- [ ] 全エラーが解消されていることを確認
- [ ] 機能が正常に動作することを確認（ブラウザテスト推奨）

## 推奨作業順序

1. **Phase 1**: 基盤整備（最初に実施）
2. **Phase 2**: 構文エラー（エラー解消優先）
3. **Phase 3**: 型安全性（最重要・時間をかけて慎重に）
4. **Phase 4**: モダン構文（自動修正可能）
5. **Phase 5**: 条件式・非同期処理（慎重に）
6. **Phase 6**: 最終確認

## 注意事項

- **型安全性の改善**が最も重要で時間がかかる作業
- **er-viewer-application.ts**が最も多くのエラーを含む（優先対象）
- **段階的な修正**を推奨（一度に全て修正すると破綻リスク）
- **各Phase完了時**に品質確認コマンドを実行
- **機能テスト**も並行して実施推奨