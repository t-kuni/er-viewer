# タスク一覧

## 概要

仕様書の更新により、`Rectangle`モデルに`fillEnabled`と`strokeEnabled`の2つのプロパティが追加されました。
これに伴い、以下の対応が必要です：

* 矩形作成時にデフォルト値を設定
* 矩形レンダリング時に`fillEnabled`/`strokeEnabled`を考慮
* プロパティパネルにチェックボックスとコントロールの有効/無効化を追加
* アクションの型定義を更新
* テストコードを更新
* 後方互換性の対応

参照仕様書:
- [rectangle_drawing_feature.md](/spec/rectangle_drawing_feature.md)
- [rectangle_property_panel.md](/spec/rectangle_property_panel.md)

## 完了報告

**すべてのフェーズが完了しました！**

- フェーズ1: バックエンド型定義とアクション、レンダリング処理の更新 ✅
- フェーズ2: プロパティパネルUIの更新 ✅
- フェーズ3: テストコードの更新とビルド確認 ✅

**実施内容:**
1. `ColorPickerWithPresets`コンポーネントに`disabled`プロパティを追加し、無効化時の視覚的なフィードバックを実装
2. `RectanglePropertyPanel`コンポーネントに背景色と枠線のチェックボックスを追加
3. チェックボックスの状態に応じてカラーピッカーと枠線幅入力を無効化
4. テストコードのモックデータに`fillEnabled`/`strokeEnabled`を追加
5. `actionUpdateRectangleStyle`のテストケースを追加
6. 全テスト（254個）がパス

**後方互換性:**
- 既存のデータで`fillEnabled`/`strokeEnabled`が未定義の場合、`?? true`でデフォルト値として扱われる

## タスク

### フェーズ1: バックエンド型定義とアクション、レンダリング処理の更新

#### 型生成の確認

- [x] `npm run generate`を実行して`lib/generated/api-types.ts`と`public/src/api/client`に`fillEnabled`/`strokeEnabled`が追加されたことを確認
  * 既に確認済み。型は正しく生成されている

#### アクション層の更新

- [x] `public/src/actions/rectangleActions.ts`の`actionUpdateRectangleStyle`関数を更新
  * 現在の`stylePatch`型定義に`fillEnabled?: boolean`と`strokeEnabled?: boolean`を追加
  * 現在の型定義:
    ```typescript
    stylePatch: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
    }
    ```
  * 更新後:
    ```typescript
    stylePatch: {
      fill?: string;
      fillEnabled?: boolean;
      stroke?: string;
      strokeEnabled?: boolean;
      strokeWidth?: number;
      opacity?: number;
    }
    ```
  * `hasChanges`の判定に`fillEnabled`と`strokeEnabled`の変更チェックを追加
  * スプレッド構文で`fillEnabled`と`strokeEnabled`を反映する処理を追加
  * 参照: `public/src/actions/rectangleActions.ts` 191-235行

#### 矩形作成処理の更新

- [x] `public/src/components/ERCanvas.tsx`の`handleAddRectangle`関数を更新
  * 矩形作成時に`fillEnabled: true`と`strokeEnabled: true`をデフォルト値として追加
  * 参照: `public/src/components/ERCanvas.tsx` 960-971行

- [x] `public/src/actions/clipboardActions.ts`の`actionPasteItem`関数を確認
  * ペースト処理は既存の`Rectangle`オブジェクトをコピーするため、`fillEnabled`/`strokeEnabled`も自動的にコピーされる
  * 後方互換性: 古いデータで`fillEnabled`/`strokeEnabled`が未定義の場合、レンダリング側で`true`として扱う（次のタスクで対応）
  * 参照: `public/src/actions/clipboardActions.ts` 95-104行
  * 確認完了: 変更不要

#### 矩形レンダリング処理の更新

- [x] `public/src/components/ERCanvas.tsx`の`renderRectangles`関数を更新
  * `fillEnabled`が`false`の場合は背景色を透明にする（`backgroundColor: 'transparent'`）
  * `strokeEnabled`が`false`の場合は枠線を非表示にする（`border: 'none'`または`borderWidth: 0`）
  * 後方互換性の対応: `rectangle.fillEnabled ?? true`、`rectangle.strokeEnabled ?? true`として未定義時は`true`として扱う
  * 参照: `public/src/components/ERCanvas.tsx` 592-645行
  * 現在のレンダリング処理:
    ```typescript
    border: `${rectangle.strokeWidth}px solid ${rectangle.stroke}`,
    backgroundColor: rectangle.fill,
    ```
  * 更新後（例）:
    ```typescript
    border: (rectangle.strokeEnabled ?? true) 
      ? `${rectangle.strokeWidth}px solid ${rectangle.stroke}` 
      : 'none',
    backgroundColor: (rectangle.fillEnabled ?? true) 
      ? rectangle.fill 
      : 'transparent',
    ```

### フェーズ2: プロパティパネルUIの更新

#### RectanglePropertyPanelコンポーネントの更新

- [x] `public/src/components/RectanglePropertyPanel.tsx`に背景色チェックボックスを追加
  * 「背景色」ラベルの直下にチェックボックス「背景色を表示」を追加
  * チェックボックスの状態を`rectangle.fillEnabled ?? true`で初期化（後方互換性）
  * チェック変更時に`dispatch(actionUpdateRectangleStyle, rectangleId, { fillEnabled: newValue })`を呼び出す
  * 参照: `public/src/components/RectanglePropertyPanel.tsx` 57-62行

- [x] `public/src/components/RectanglePropertyPanel.tsx`のカラーピッカー（背景色）を条件付き有効化
  * `fillEnabled === false`の場合は`ColorPickerWithPresets`を`disabled`状態にする
  * `ColorPickerWithPresets`が`disabled`プロパティをサポートしていない場合は、`opacity`や`pointerEvents: 'none'`で視覚的に無効化する、またはコンポーネントを条件付きレンダリングする
  * 参照: `public/src/components/RectanglePropertyPanel.tsx` 57-62行

- [x] `public/src/components/RectanglePropertyPanel.tsx`に枠線チェックボックスを追加
  * 「枠線色」ラベルを「枠線」に変更（仕様書に準拠）
  * 「枠線」ラベルの直下にチェックボックス「枠線を表示」を追加
  * チェックボックスの状態を`rectangle.strokeEnabled ?? true`で初期化（後方互換性）
  * チェック変更時に`dispatch(actionUpdateRectangleStyle, rectangleId, { strokeEnabled: newValue })`を呼び出す
  * 参照: `public/src/components/RectanglePropertyPanel.tsx` 64-69行

- [x] `public/src/components/RectanglePropertyPanel.tsx`のカラーピッカー（枠線）と枠線幅を条件付き有効化
  * `strokeEnabled === false`の場合は、枠線色の`ColorPickerWithPresets`と枠線幅の`<input type="number">`を無効化
  * カラーピッカーの無効化方法は背景色と同様
  * 枠線幅の`<input>`には`disabled={!(rectangle.strokeEnabled ?? true)}`属性を追加
  * 参照: `public/src/components/RectanglePropertyPanel.tsx` 64-106行

#### ColorPickerWithPresetsコンポーネントの更新（必要に応じて）

- [x] `public/src/components/ColorPickerWithPresets.tsx`に`disabled`プロパティを追加（オプショナル）
  * `disabled`プロパティを受け取り、無効化時にカラーピッカーとプリセットボタンを視覚的に無効化する
  * 無効化時の実装方法:
    * `opacity: 0.5`でグレーアウト
    * `pointerEvents: 'none'`でクリック無効化
    * または、`disabled`時は単に現在の色を表示するだけのシンプルなUIに切り替える
  * このタスクは、RectanglePropertyPanelでの条件付きレンダリングで対応可能な場合はスキップしてもよい

### フェーズ3: テストコードの更新とビルド確認

#### テストコードの更新

- [x] `public/tests/actions/rectangleActions.test.ts`のモックデータに`fillEnabled`と`strokeEnabled`を追加
  * `createMockViewModel`関数内の矩形データに`fillEnabled: true`と`strokeEnabled: true`を追加
  * 参照: `public/tests/actions/rectangleActions.test.ts` 22-32行

- [x] `public/tests/actions/rectangleActions.test.ts`の`actionAddRectangle`テストのモックデータを更新
  * テスト内で作成している`newRectangle`と`duplicateRectangle`に`fillEnabled: true`と`strokeEnabled: true`を追加
  * 参照: `public/tests/actions/rectangleActions.test.ts` 62-114行

- [x] `public/tests/actions/rectangleActions.test.ts`の`actionUpdateRectangleStyle`テストケースを追加
  * `fillEnabled`と`strokeEnabled`を個別に更新するテストケースを追加
  * 例:
    ```typescript
    it('fillEnabledが更新される', () => {
      const viewModel = createMockViewModel();
      const result = actionUpdateRectangleStyle(viewModel, 'rect-1', {
        fillEnabled: false,
      });
      expect(result.erDiagram.rectangles['rect-1'].fillEnabled).toBe(false);
    });
    ```
  * 同様に`strokeEnabled`のテストも追加
  * 参照: `public/tests/actions/rectangleActions.test.ts` 262-313行

- [x] `public/tests/actions/clipboardActions.test.ts`のモックデータを更新
  * `createMockViewModel`関数内の矩形データ（30-40行目）に`fillEnabled: true`と`strokeEnabled: true`を追加
  * 参照: `public/tests/actions/clipboardActions.test.ts` 29-40行

#### ビルドとテストの実行

- [x] ビルドの確認
  * `npm run generate`を実行して型定義を再生成
  * TypeScriptのコンパイルエラーがないことを確認

- [x] テストの実行
  * `npm run test`を実行してすべてのテストがパスすることを確認
  * 特に`rectangleActions.test.ts`と`clipboardActions.test.ts`が正常に動作することを確認
  * 結果: 254個のテストがすべてパス

## 補足事項

### 後方互換性の対応

* 既存のデータで`fillEnabled`/`strokeEnabled`が未定義の場合、`?? true`でデフォルト値`true`として扱う
* レンダリング処理とプロパティパネルの両方で後方互換性を考慮する

### フェーズ分けの理由

* フェーズ1: データ層とレンダリング層の基本的な対応（5ファイル更新）
* フェーズ2: UI層の対応（1〜2ファイル更新）
* フェーズ3: テストとビルド確認（2ファイル更新 + ビルド・テスト実行）

各フェーズの最後にビルドとテストを実行することで、段階的に動作確認が可能。

### 不要なファイル

* `public/src/utils/reactFlowConverter.ts`の`convertToReactFlowRectangles`関数は`@deprecated`のため更新不要
* `public/src/components/RectangleNode.tsx`も`@deprecated`のため更新不要
