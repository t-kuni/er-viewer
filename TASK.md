# タスク一覧

## 概要

直前のコミットで更新された仕様書に基づき、エンティティのグリッドレイアウトアルゴリズムを修正する。

**仕様変更内容**:
- 1行あたりのエンティティ数を固定値（4個）から動的計算（`ceil(sqrt(エンティティ総数))`）に変更
- これにより、エンティティが正方形に近い形で配置される

**関連仕様書**:
- [リバースエンジニアリング機能仕様](spec/reverse_engineering.md)
- [増分リバース・エンジニアリング機能仕様](spec/incremental_reverse_engineering.md)

## タスク

### フロントエンド実装の修正

- [x] `public/src/actions/dataActions.ts` の `actionMergeERData` 関数を修正
  - **修正内容**:
    - 固定値 `ENTITIES_PER_ROW = 4` を削除
    - 通常モード（新規作成）の場合: `Math.ceil(Math.sqrt(erData.entities.length))` で列数を計算
    - 増分モード（既存エンティティあり）の場合: 新規エンティティの数から `Math.ceil(Math.sqrt(新規エンティティ数))` で列数を計算
    - 計算された列数を使用してグリッド配置を行う
  - **注意事項**:
    - 新規エンティティ数が0の場合の処理を考慮する（ゼロ除算の防止）
    - 既存エンティティの座標は変更しない
  - **参照**: [仕様書 reverse_engineering.md の座標計算セクション](spec/reverse_engineering.md#デフォルトレイアウト仕様)
  - **実施内容**:
    - 固定値 `ENTITIES_PER_ROW = 4` を削除
    - 増分モード時に新規エンティティ数をカウントするロジックを追加
    - `entitiesPerRow` を動的に計算するロジックを追加
      - 通常モード: `Math.ceil(Math.sqrt(erData.entities.length))`
      - 増分モード: `Math.ceil(Math.sqrt(newEntityCount))`（0の場合は1）
    - グリッド配置ロジックで動的に計算した `entitiesPerRow` を使用

### テストコードの修正

- [x] `public/tests/actions/dataActions.test.ts` のテストケースを修正
  - **修正内容**:
    - 通常モードのテストケース「空のViewModelに対してERDataをマージする」を修正
      - 現在は2エンティティで `x: 50, y: 50` と `x: 350, y: 50` を期待（1列4個の配置）
      - 修正後は2エンティティで `x: 50, y: 50` と `x: 350, y: 50` を期待（`ceil(sqrt(2)) = 2` なので2列配置）
      - **期待値は変わらない**が、計算ロジックが変更されたことを確認する
    - 増分モードのテストケースを修正（必要に応じて）
      - 現在のテストは新規エンティティが1個なので影響なし（`ceil(sqrt(1)) = 1`）
      - 追加のテストケースを検討:
        - 新規エンティティが4個の場合（2列 × 2行）
        - 新規エンティティが9個の場合（3列 × 3行）
        - 新規エンティティが10個の場合（4列 × 3行）
  - **参照**: 既存のテストケースの構造を参考にする
  - **実施内容**:
    - 既存のテストケースは修正不要（期待値が変わらないため）
    - すべてのテストが正常に実行されることを確認

### ビルドの確認

- [x] TypeScript のビルドエラーがないことを確認
  - **コマンド**: `npm run generate && cd public && npm run build`
  - **期待結果**: エラーなくビルドが完了する
  - **結果**: ✅ ビルド成功

### テストの実行

- [x] ユニットテストが正常に通ることを確認
  - **コマンド**: `npm run test`
  - **期待結果**: すべてのテストが成功する
  - **対象テスト**: 
    - `public/tests/actions/dataActions.test.ts` の `actionMergeERData` 関連のテスト
    - 他のテストにも影響がないことを確認
  - **結果**: ✅ 13ファイル、198テストすべて成功

## 補足

### 配置例（仕様書より）

- 4エンティティの場合: 2列 × 2行（正方形）
  - 列数 = `ceil(sqrt(4))` = 2
- 9エンティティの場合: 3列 × 3行（正方形）
  - 列数 = `ceil(sqrt(9))` = 3
- 10エンティティの場合: 4列 × 3行（ほぼ正方形）
  - 列数 = `ceil(sqrt(10))` = 4
- 16エンティティの場合: 4列 × 4行（正方形）
  - 列数 = `ceil(sqrt(16))` = 4
- 100エンティティの場合: 10列 × 10行（正方形）
  - 列数 = `ceil(sqrt(100))` = 10

### 増分モードにおける新規エンティティ数の計算

増分モードでは、既存エンティティと新規エンティティを区別する必要がある。新規エンティティ数は以下のように計算される:

```typescript
// 新規エンティティ数のカウント
let newEntityCount = 0;
erData.entities.forEach((entity: Entity) => {
  const existingNode = existingNodesByName.get(entity.name);
  if (!existingNode) {
    newEntityCount++;
  }
});

// 列数の計算
const entitiesPerRow = Math.ceil(Math.sqrt(newEntityCount));
```

### エッジケース

- **エンティティ数が0の場合**: 列数は1とする（ただし配置するエンティティがないのでループは実行されない）
- **エンティティ数が1の場合**: 列数は1（1列 × 1行）
