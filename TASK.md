# ESLint エラー解消タスクリスト

* `npm run lint` のエラーを全て解消する

## 概要
- **総エラー数**: 975問題（944エラー、31警告）
- **主要ファイル**: er-viewer-application.ts（最多エラー）, annotation-controller.ts, app.ts, clustering-engine.ts
- **修正方針**: 段階的な品質重視アプローチ

## Phase 1: 基盤整備

### 環境設定修正
- [x] package.jsonに`"type": "module"`を追加してモジュール警告を解消

## Phase 2: 構文エラー修正（エラー優先）

### case文の変数宣言問題修正
- [x] `clustering-engine.ts:174` - case文内のlexical declaration修正
- [x] `clustering-engine.ts:182` - case文内のlexical declaration修正

## Phase 3: strict boolean expressions修正（最優先・22個）

### annotation-controller.ts の修正（15個）
- [ ] `annotation-controller.ts:54` - nullable string値の条件を明示的に処理
- [ ] `annotation-controller.ts:79` - nullable string値の条件を明示的に処理
- [ ] `annotation-controller.ts:150` - nullable string値の条件を明示的に処理
- [ ] `annotation-controller.ts:179` - nullable string値の条件を明示的に処理
- [ ] `annotation-controller.ts:183` - nullable number値の条件を明示的に処理
- [ ] `annotation-controller.ts:237` - nullable string値の条件を明示的に処理
- [ ] `annotation-controller.ts:255` - nullable boolean値の条件を明示的に処理
- [ ] `annotation-controller.ts:260` (3個) - nullable string値の条件を明示的に処理
- [ ] `annotation-controller.ts:275` - nullable boolean値の条件を明示的に処理
- [ ] `annotation-controller.ts:280` - nullable string値の条件を明示的に処理
- [ ] `annotation-controller.ts:292` (3個) - nullable string値の条件を明示的に処理

### app.ts の修正（2個）
- [ ] `app.ts:204` - any値の条件を明示的比較に変更
- [ ] `app.ts:256` - nullable string値の条件を明示的に処理

### clustering-engine.ts の修正（2個）
- [ ] `clustering-engine.ts:119` - nullable boolean値の条件を明示的に処理
- [ ] `clustering-engine.ts:282` - オブジェクト値の条件式を修正（常にtrueの条件）

## Phase 4: 型安全性改善（最重要・大規模・約900個）

### any型の除去（6個）
- [ ] `app.ts:32` - constructorの引数any型を適切な型に変更
- [ ] `app.ts:196` - エンティティ操作でのany型を適切な型に変更
- [ ] `er-viewer-application.ts:1055` - any型をプロパーな型に変更
- [ ] `er-viewer-application.ts:1155` - any型をプロパーな型に変更
- [ ] `er-viewer-application.ts:1185` - any型をプロパーな型に変更
- [ ] `er-viewer-application.ts:1225` - any型をプロパーな型に変更

### unsafe操作の修正（any型由来・約900個）
- [ ] `app.ts` - 192,196,197,204行のunsafe操作を型安全に修正
- [ ] `er-viewer-application.ts` - 全てのunsafe assignmentを型安全に修正（約300個）
- [ ] `er-viewer-application.ts` - 全てのunsafe member accessを型安全に修正（約300個）
- [ ] `er-viewer-application.ts` - 全てのunsafe callを型安全に修正（約300個）

### 関数戻り値型の明示（2個）
- [ ] `app.ts:57` - 関数の戻り値型を明示
- [ ] `app.ts:71` - 関数の戻り値型を明示

## Phase 5: 非同期処理改善

### 不要なasync/await修正（3個）
- [ ] `er-viewer-application.ts:1041` - awaitのないasync関数を修正
- [ ] `er-viewer-application.ts:1137` - awaitのないasync関数を修正
- [ ] `er-viewer-application.ts:1215` - awaitのないasync関数を修正

### floating promises処理
- [ ] 未処理Promiseがあれば適切に処理（await/catch/then）

## Phase 6: 最終確認・検証

### 最終確認
- [ ] `npm run lint:fix && npm run test && npm run typecheck` 実行
- [ ] `npm run lint` の全エラーが解消されていることを確認
- [ ] 機能が正常に動作することを確認（ブラウザテスト推奨）

## 推奨作業順序

1. **Phase 1**: 基盤整備（完了済み）
2. **Phase 2**: 構文エラー（完了済み）
3. **Phase 3**: strict boolean expressions修正（優先度最高・22個）
4. **Phase 4**: 型安全性（最重要・約900個・時間をかけて慎重に）
5. **Phase 5**: 非同期処理（3個）
6. **Phase 6**: 最終確認

## 注意事項

- **strict boolean expressions**（22個）を最優先で修正
- **型安全性の改善**（約900個）が最も重要で時間がかかる作業
- **er-viewer-application.ts**が最も多くのエラーを含む（優先対象）
- **annotation-controller.ts**のboolean expressions修正は比較的容易
- **段階的な修正**を推奨（一度に全て修正すると破綻リスク）
- **各Phase完了時**に品質確認コマンドを実行
- **機能テスト**も並行して実施推奨

## 進捗状況

### 2025-07-02（初回）
- Phase 1: 基盤整備
  - [x] package.jsonに`"type": "module"`を追加完了
  - モジュール警告の解消を確認（ESLintエラー数：957問題のまま変化なし）
- Phase 2: 構文エラー修正
  - [x] clustering-engine.ts:174, 182のlexical declarationエラーを修正
  - case文内にブロックスコープ `{}` を追加して修正
  - ESLintエラー数：957問題から955問題に減少（2エラー解消）

### 2025-07-02（再分析・タスクリスト完全更新）
- 最新のlintエラー分析完了：**975問題**（944エラー、31警告）
- エラータイプ別分類・優先順位付け完了
  - **Phase 3**: strict-boolean-expressions: 22個（最優先・比較的修正容易）
  - **Phase 4**: unsafe系（any型由来）: 約900個（最重要・大規模・時間要）
  - **Phase 5**: require-await: 3個（軽微）
- **タスクリスト全面刷新**: 最新状況に合わせて詳細化・実行可能なレベルに分解完了
- **次のアクション**: Phase 3のstrict boolean expressions修正から開始推奨