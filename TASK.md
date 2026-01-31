# buildERDiagramIndex 重複コード整理タスク

## 背景

`buildERDiagramIndex` 関数が以下の2箇所に重複して実装されていることが判明しました：
- `lib/utils/buildERDiagramIndex.ts` (バックエンド側)
- `public/src/utils/buildERDiagramIndex.ts` (フロントエンド側)

調査の結果、以下のことが明らかになりました：
1. **バックエンドのUsecaseでは全く使用されていない**
2. 逆引きインデックスはフロントエンド専用の機能（ホバーハイライト処理に使用）
3. 仕様書に矛盾した記述があり、これが重複実装を生む原因となっていた

仕様書は修正済みです（[spec/frontend_state_management.md](/spec/frontend_state_management.md)）。

## タスク一覧

### フェーズ1: 重複コードの整理 ✅ 完了

#### バックエンド側ファイルの削除

- [x] `lib/utils/buildERDiagramIndex.ts` を削除
  - バックエンドのUsecaseで使用されていないため不要
  - フロントエンド側の実装のみを残す

#### テストファイルの移動

- [x] `tests/utils/buildERDiagramIndex.test.ts` を `public/tests/utils/buildERDiagramIndex.test.ts` に移動
  - テスト内容をフロントエンド側のコードに合わせて修正
  - import文を修正：
    ```typescript
    // 修正前
    import { buildERDiagramIndex } from '../../lib/utils/buildERDiagramIndex';
    import type { EntityNodeViewModel, RelationshipEdgeViewModel } from '../../lib/utils/buildERDiagramIndex';
    
    // 修正後
    import { buildERDiagramIndex } from '../../src/utils/buildERDiagramIndex';
    import type { EntityNodeViewModel, RelationshipEdgeViewModel } from '../../src/api/client';
    ```
  - 型のimportを `api/client` から行うように変更

#### フロントエンド側のimport文修正

- [x] `public/src/utils/importViewModel.ts` のimport文を修正
  - 現在の状態：
    ```typescript
    import { buildERDiagramIndex } from "../../../lib/utils/buildERDiagramIndex.js";
    ```
  - 修正後：
    ```typescript
    import { buildERDiagramIndex } from "./buildERDiagramIndex";
    ```
  - バックエンド側への参照を削除し、フロントエンド側のコードを参照するように変更

#### ビルド確認

- [x] TypeScriptのビルドが成功することを確認
  ```bash
  npm run generate
  ```
  - エラーが出ないことを確認

#### テスト実行

- [x] 移動したテストが正常に動作することを確認
  ```bash
  npm run test
  ```
  - `public/tests/utils/buildERDiagramIndex.test.ts` のテストがすべてパスすることを確認
  - 他のテストにも影響がないことを確認

### フェーズ2: 検討事項（オプション）

以下は、今回のタスクには含めませんが、将来的な改善案として記録します。

#### actionRebuildIndex の実装検討

**背景：**
現在、`buildERDiagramIndex` は以下の箇所で呼ばれています：
- `actionMergeERData` 内で直接呼び出し
- `importViewModel` 内で直接呼び出し

インデックス再構築ロジックをaction層に統一することで、以下のメリットがあります：
- インデックス構築ロジックがaction層にカプセル化される
- 状態更新パターンが統一される
- テストがしやすくなる

**実装案：**

`public/src/actions/dataActions.ts` に以下のactionを追加：

```typescript
/**
 * ViewModelのnodesとedgesから逆引きインデックスを再構築するAction
 * 
 * @param viewModel 現在の状態
 * @returns インデックスが再構築された新しい状態
 */
export function actionRebuildIndex(viewModel: ViewModel): ViewModel {
  const newIndex = buildERDiagramIndex(
    viewModel.erDiagram.nodes,
    viewModel.erDiagram.edges
  );
  
  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      index: newIndex,
    },
  };
}
```

**使用箇所の修正案：**
- `actionMergeERData` の最後で `buildERDiagramIndex` を直接呼ぶのではなく、返却前に `actionRebuildIndex` を適用する形に変更
- `importViewModel` でも同様に、ViewModelを構築後に `actionRebuildIndex` を適用

**注意：**
この変更は、既存の実装が正常に動作している状態で行うべきリファクタリングです。優先度は低いため、MVPフェーズでは実施不要です。

## 完了条件

- [x] フェーズ1のすべてのタスクが完了している
- [x] ビルドが成功する
- [x] すべてのテストがパスする
- [x] バックエンド側に `buildERDiagramIndex` への参照が残っていない

## 参考情報

### 関連仕様書
- [spec/frontend_state_management.md](/spec/frontend_state_management.md) - フロントエンド状態管理（逆引きインデックスの説明を含む）
- [spec/incremental_reverse_engineering.md](/spec/incremental_reverse_engineering.md) - 増分リバースエンジニアリング（インデックス再計算の説明）
- [spec/import_export_feature.md](/spec/import_export_feature.md) - インポート時のインデックス再計算の説明

### 逆引きインデックスの目的
- エンティティやカラムへのホバー時に関連する要素を高速に検索するため
- O(1)またはO(接続数)で関連要素を取得可能
- フロントエンド専用の機能（バックエンドでは不要）

### 重複が発生した原因
1. 仕様書に「バックエンドで計算する」という誤った記述があった
2. 実装時に仕様書を参照し、バックエンド側にも実装してしまった
3. この問題は2度目の発生であり、仕様書の矛盾が根本原因

### 仕様書の修正内容
`spec/frontend_state_management.md` を修正し、以下の点を明確化：
- 逆引きインデックスはフロントエンドで計算する
- `buildERDiagramIndex` 関数を使用する
- バックエンドでは計算しない
