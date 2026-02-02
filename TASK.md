# タスク一覧: テキスト機能のドロップシャドウ分離

## 概要

テキスト描画機能において、ドロップシャドウを「文字に適用されるもの」と「背景の矩形に適用されるもの」の2種類に分離し、個別に設定できるようにする。

**要件**:
- 文字のみにシャドウを適用できる（背景透過のテキストで視認性を高める用途）
- 背景のみにシャドウを適用できる（カード風デザイン、フローティング効果）
- 両方にシャドウを適用できる（強調表示、異なるパラメータで立体感と浮遊感を演出）
- 各シャドウは完全に独立したパラメータを持つ（offsetX, offsetY, blur, spread, color, opacity）

**参照仕様書**:
- [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) - テキスト描画機能仕様（更新済み）

**変更概要**:
- `TextBox`モデルの`shadow`プロパティを`textShadow`（文字用）と`backgroundShadow`（背景用）に分離
- プロパティパネルのUIを2つのシャドウセクションに分割
- レンダリングロジックで2種類のシャドウを独立して適用

## フェーズ1: データモデルとアクションの変更

### TypeSpec型定義の変更

- [x] `scheme/main.tsp`の`TextBox`モデルを修正（行117-146）
  - **現在の実装**: `shadow: DropShadow;` 1つのシャドウプロパティ
  - **修正内容**:
    ```typescript
    model TextBox {
      // ... 既存のプロパティ ...
      
      textShadow: DropShadow;       // 文字のドロップシャドウ（spreadは使用しない）
      backgroundShadow: DropShadow; // 背景矩形のドロップシャドウ
    }
    ```
  - `shadow`プロパティを削除し、`textShadow`と`backgroundShadow`の2つに置き換える
  - 注意: `textShadow`でも`DropShadow`モデルを使用するが、実装時に`spread`は使用しない（UIにも表示しない）
  - **仕様書参照**: spec/text_drawing_feature.md 行36-44（データモデル）

- [ ] 型定義の再生成
  ```bash
  cd /home/kuni/Documents/er-viewer
  npm run generate
  ```
  - `lib/generated/api-types.ts`が自動生成される
  - `public/src/api/client/`配下のファイルが自動生成される
  - エラーが出ないことを確認する

### Actionの変更

- [ ] `public/src/actions/textActions.ts`に`actionUpdateBackgroundShadow`関数を追加
  - **追加位置**: `actionUpdateTextShadow`関数の直後（行380付近）
  - **インタフェース**:
    ```typescript
    export function actionUpdateBackgroundShadow(
      vm: ViewModel,
      textId: string,
      shadowPatch: Partial<DropShadow>
    ): ViewModel
    ```
  - **実装内容**:
    - `vm.erDiagram.texts[textId]`が存在しない場合は変更なしで返す
    - `shadowPatch`の各プロパティを`text.backgroundShadow`にマージ
    - 変更がない場合は同一参照を返す（純粋関数として実装）
  - **参考実装**: `actionUpdateTextShadow`関数（行362-380）と同じパターン
  - **仕様書参照**: spec/text_drawing_feature.md 行273（Action設計）

- [ ] `public/src/actions/textActions.ts`の`actionUpdateTextShadow`関数のコメントを更新
  - 「ドロップシャドウのプロパティを部分更新」→「文字のドロップシャドウのプロパティを部分更新」
  - 実装ロジックは変更なし（`text.textShadow`を更新するように既にプロパティ名が変わるため）

- [ ] `public/src/actions/textActions.ts`の`actionAddText`関数のデフォルト値を修正
  - **現在の実装**: `shadow: { enabled: false, offsetX: 2, ... }`
  - **修正内容**:
    ```typescript
    textShadow: {
      enabled: false,
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      color: "#000000",
      opacity: 0.3,
    },
    backgroundShadow: {
      enabled: false,
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      spread: 0,
      color: "#000000",
      opacity: 0.3,
    },
    ```
  - 両方とも`enabled: false`をデフォルトとする
  - **仕様書参照**: spec/text_drawing_feature.md 行67-83（新規作成時のデフォルト値）

## フェーズ2: レンダリングとUIの変更

### レンダリングロジックの変更

- [ ] `public/src/components/ERCanvas.tsx`の`renderTexts`関数を修正
  - **textShadowの生成処理を修正**（行564-570付近）
    - 現在: `text.shadow.enabled`を参照
    - 修正: `text.textShadow.enabled`を参照
    ```typescript
    const textShadow = text.textShadow.enabled
      ? (() => {
          const shadowColor = hexToRgba(text.textShadow.color, text.textShadow.opacity);
          return `${text.textShadow.offsetX}px ${text.textShadow.offsetY}px ${text.textShadow.blur}px ${shadowColor}`;
        })()
      : 'none';
    ```
  - **backgroundShadowの生成処理を追加**（textShadowの直後）
    ```typescript
    const boxShadow = text.backgroundShadow.enabled && text.backgroundEnabled
      ? (() => {
          const shadowColor = hexToRgba(text.backgroundShadow.color, text.backgroundShadow.opacity);
          return `${text.backgroundShadow.offsetX}px ${text.backgroundShadow.offsetY}px ${text.backgroundShadow.blur}px ${text.backgroundShadow.spread}px ${shadowColor}`;
        })()
      : 'none';
    ```
  - **注意点**:
    - `textShadow`は`spread`パラメータを含まない（CSS仕様の制限）
    - `boxShadow`は`spread`パラメータを含む
    - `boxShadow`は`backgroundEnabled=true`の場合のみ適用（背景が無効なら影も表示しない）
  - **外側コンテナのスタイルに`boxShadow`を追加**（行603付近）
    ```typescript
    style={{
      // ... 既存のスタイル ...
      backgroundColor,
      boxShadow,  // ← 追加
      cursor: 'move',
      // ...
    }}
    ```
  - **仕様書参照**: 
    - spec/text_drawing_feature.md 行131-169（HTML要素のスタイル）
    - spec/text_drawing_feature.md 行341-346（ドロップシャドウの2種類の独立適用）

- [ ] `public/src/components/ERCanvas.tsx`の編集UI部分を修正（行753-808付近）
  - 編集UI（`<textarea>`のラッパー）の`boxShadow`を更新
  - 現在: `text.shadow.enabled`を参照
  - 修正: `text.backgroundShadow.enabled`を参照（背景のシャドウを編集UI背景にも適用）

### プロパティパネルUIの変更

- [ ] `public/src/components/TextPropertyPanel.tsx`のimport文を修正
  - `actionUpdateBackgroundShadow`をimport
    ```typescript
    import {
      actionUpdateTextContent,
      actionUpdateTextStyle,
      actionSetTextAutoSizeMode,
      actionUpdateTextShadow,
      actionUpdateBackgroundShadow,  // ← 追加
      actionUpdateTextPadding,
      actionUpdateTextBackground,
      actionRemoveText,
      actionUpdateTextBounds,
    } from '../actions/textActions';
    ```

- [ ] `public/src/components/TextPropertyPanel.tsx`の状態管理を修正（行26付近）
  - 現在: `showShadowColorPicker`状態が1つ
  - 修正: 2つに分離
    ```typescript
    const [showTextShadowColorPicker, setShowTextShadowColorPicker] = useState(false);
    const [showBackgroundShadowColorPicker, setShowBackgroundShadowColorPicker] = useState(false);
    ```

- [ ] `public/src/components/TextPropertyPanel.tsx`のイベントハンドラを追加・修正
  - **既存の文字シャドウハンドラを修正**
    - プロパティアクセスを`text.shadow.*`から`text.textShadow.*`に変更
    - `handleShadowSpreadChange`ハンドラを削除（文字シャドウではspreadを使用しない）
  - **背景のシャドウ用のハンドラを追加**（既存の`handleShadow*`ハンドラの直後に追加）
    ```typescript
    const handleBackgroundShadowEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(actionUpdateBackgroundShadow, textId, { enabled: e.target.checked });
    };

    const handleBackgroundShadowOffsetXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const offsetX = parseFloat(e.target.value);
      if (!isNaN(offsetX)) {
        dispatch(actionUpdateBackgroundShadow, textId, { offsetX });
      }
    };

    const handleBackgroundShadowOffsetYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const offsetY = parseFloat(e.target.value);
      if (!isNaN(offsetY)) {
        dispatch(actionUpdateBackgroundShadow, textId, { offsetY });
      }
    };

    const handleBackgroundShadowBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const blur = parseFloat(e.target.value);
      if (!isNaN(blur) && blur >= 0) {
        dispatch(actionUpdateBackgroundShadow, textId, { blur });
      }
    };

    const handleBackgroundShadowSpreadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const spread = parseFloat(e.target.value);
      if (!isNaN(spread)) {
        dispatch(actionUpdateBackgroundShadow, textId, { spread });
      }
    };

    const handleBackgroundShadowColorChange = (color: string) => {
      dispatch(actionUpdateBackgroundShadow, textId, { color });
    };

    const handleBackgroundShadowOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const opacity = parseFloat(e.target.value);
      dispatch(actionUpdateBackgroundShadow, textId, { opacity });
    };
    ```

- [ ] `public/src/components/TextPropertyPanel.tsx`のドロップシャドウセクションを2つに分割（行498-653）
  - **現在の実装**: 「ドロップシャドウ」セクションが1つ
  - **修正内容**:
    - 既存のセクションを「文字のドロップシャドウ」に変更
      - チェックボックスラベル: 「文字のドロップシャドウ」
      - プロパティアクセス: `text.shadow.*` → `text.textShadow.*`
      - イベントハンドラ: 既存のまま（または`handleTextShadow*`に改名）
      - 有効時の入力欄: offsetX, offsetY, blur, color, opacity（**spreadは削除**）
      - 注意: 文字シャドウでは`spread`パラメータを使用しないため、UI上も`spread`入力欄は表示しない
    - 「背景のドロップシャドウ」セクションを追加（文字のシャドウセクションの直後）
      - チェックボックスラベル: 「背景のドロップシャドウ」
      - チェック状態: `text.backgroundShadow.enabled`
      - イベントハンドラ: `handleBackgroundShadowEnabledChange`
      - 有効時の入力欄: offsetX, offsetY, blur, spread, color, opacity（文字シャドウと異なり、spreadも表示）
      - プロパティアクセス: `text.backgroundShadow.*`
      - イベントハンドラ: 上記で追加した`handleBackgroundShadow*`系
      - 背景が無効の場合の警告メッセージを追加:
        ```typescript
        {text.backgroundShadow.enabled && !text.backgroundEnabled && (
          <div style={{ 
            fontSize: '12px', 
            color: '#f59e0b', 
            marginTop: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#fffbeb',
            borderRadius: '4px',
            border: '1px solid #fcd34d'
          }}>
            ⚠️ 背景色が無効のため、影は表示されません
          </div>
        )}
        ```
  - **UIレイアウト**: 文字のシャドウと背景のシャドウのセクションを縦に並べる
  - **仕様書参照**: spec/text_drawing_feature.md 行198-215（プロパティパネル設計）

## フェーズ3: テストとビルド確認

### テストコードの更新

- [ ] `public/tests/actions/textActions.test.ts`の既存テストを修正
  - **`actionUpdateTextShadow`のテストを更新**（行430-475付近）
    - プロパティアクセス: `result.erDiagram.texts[id].shadow.*` → `result.erDiagram.texts[id].textShadow.*`
    - テスト内容は変更なし（文字のシャドウが正しく更新されることを確認）
  
- [ ] `public/tests/actions/textActions.test.ts`に`actionUpdateBackgroundShadow`のテストを追加
  - **追加位置**: `actionUpdateTextShadow`のテストの直後
  - **テストケース**:
    ```typescript
    describe('actionUpdateBackgroundShadow', () => {
      it('背景のドロップシャドウのプロパティを部分更新する', () => {
        const id = 'text-1';
        const vm = createViewModel();
        vm.erDiagram.texts[id] = createTextBox(id);
        
        // enabled を true に変更
        let result = actionUpdateBackgroundShadow(vm, id, { enabled: true });
        expect(result.erDiagram.texts[id].backgroundShadow.enabled).toBe(true);
        expect(result).not.toBe(vm); // 新しい参照
        
        vm = result;
        
        // offsetX を変更
        result = actionUpdateBackgroundShadow(vm, id, { offsetX: 5 });
        expect(result.erDiagram.texts[id].backgroundShadow.offsetX).toBe(5);
        expect(result.erDiagram.texts[id].backgroundShadow.enabled).toBe(true); // 既存値は維持
        expect(result).not.toBe(vm);
        
        vm = result;
        
        // 複数プロパティを同時に変更
        result = actionUpdateBackgroundShadow(vm, id, {
          blur: 10,
          spread: 2,
          color: '#FF0000',
        });
        expect(result.erDiagram.texts[id].backgroundShadow.blur).toBe(10);
        expect(result.erDiagram.texts[id].backgroundShadow.spread).toBe(2);
        expect(result.erDiagram.texts[id].backgroundShadow.color).toBe('#FF0000');
        expect(result.erDiagram.texts[id].backgroundShadow.offsetX).toBe(5); // 既存値は維持
      });

      it('存在しないテキストIDの場合は変更なしで返す', () => {
        const vm = createViewModel();
        const result = actionUpdateBackgroundShadow(vm, 'non-existent', { enabled: true });
        expect(result).toBe(vm); // 同一参照
      });

      it('変更がない場合は同一参照を返す', () => {
        const id = 'text-1';
        const vm = createViewModel();
        vm.erDiagram.texts[id] = createTextBox(id);
        
        // 既存値と同じ値で更新
        const result = actionUpdateBackgroundShadow(vm, id, {
          offsetX: vm.erDiagram.texts[id].backgroundShadow.offsetX,
        });
        expect(result).toBe(vm); // 同一参照
      });
    });
    ```
  - **参考実装**: `actionUpdateTextShadow`のテスト（行430-475）と同じパターン

- [ ] `public/tests/actions/textActions.test.ts`の`actionAddText`のテストを修正
  - プロパティアクセス: `result.erDiagram.texts[id].shadow` → `result.erDiagram.texts[id].textShadow`と`result.erDiagram.texts[id].backgroundShadow`
  - 両方のシャドウプロパティが正しくデフォルト値で初期化されることを確認

### テスト実行

- [ ] フロントエンドのテスト実行
  ```bash
  cd /home/kuni/Documents/er-viewer/public
  npm run test
  ```
  - すべてのテストがpassすることを確認する
  - 特に`textActions.test.ts`の新規追加テストが通ることを確認

- [ ] バックエンドのテスト実行（念のため）
  ```bash
  cd /home/kuni/Documents/er-viewer
  npm run test
  ```
  - すべてのテストがpassすることを確認する
  - TypeSpecの変更がバックエンドに影響しないことを確認

### ビルド確認

- [ ] フロントエンドのビルド
  ```bash
  cd /home/kuni/Documents/er-viewer/public
  npm run build
  ```
  - エラーが出ないことを確認する
  - 型エラーがないことを確認する
  - 特に`text.shadow`への参照が残っていないことを確認

- [ ] バックエンドのビルド確認
  ```bash
  cd /home/kuni/Documents/er-viewer
  npm run build
  ```
  - エラーが出ないことを確認する

## 実装時の注意事項

### TypeScriptの型エラー

`npm run generate`実行後、既存コードで`text.shadow`への参照がある箇所で型エラーが発生します。以下のファイルで修正が必要です：
- `public/src/components/ERCanvas.tsx`
- `public/src/components/TextPropertyPanel.tsx`
- `public/tests/actions/textActions.test.ts`

### CSSのドロップシャドウ仕様

- **`box-shadow`**: `offsetX offsetY blur spread rgba(r, g, b, opacity)` 形式（spread対応）
- **`text-shadow`**: `offsetX offsetY blur rgba(r, g, b, opacity)` 形式（spread非対応）

文字のシャドウ（`textShadow`）では`spread`パラメータを使用しません。データモデルにも含めず、UIにも表示しません。

### 背景のシャドウの表示条件

背景のシャドウ（`boxShadow`）は`backgroundShadow.enabled && backgroundEnabled`の両方が`true`の場合のみ適用してください。背景が無効な場合、影も表示されません。

### プロパティパネルのスクロール

2つのシャドウセクションを追加することでプロパティパネルが長くなります。既にスクロール可能な実装になっているため、特別な対応は不要ですが、UIが縦に伸びることを想定してください。

### 既存データとの互換性

プロトタイプ段階のため、既存データの移行は考慮不要です。ただし、開発中にブラウザのlocalStorageに保存されているデータで`shadow`プロパティを参照している場合、エラーになる可能性があります。その場合はlocalStorageをクリアしてください。

### テストのヘルパー関数

`textActions.test.ts`で使用している`createTextBox`ヘルパー関数も`shadow`から`textShadow`と`backgroundShadow`に変更する必要があります。

注意: `textShadow`では`spread`プロパティは含めないようにしてください（または`spread: 0`として設定するが使用しない）。

## MVP範囲外（今回は実装しない）

以下は仕様書に記載されているが、今回の実装では対象外です：

- データ移行処理（既存の`shadow`を`textShadow`と`backgroundShadow`に変換する処理）
- プロパティパネルの折りたたみ機能（スクロールで対応）
- UIの最適化・リファクタリング
- パフォーマンス測定・改善

## 懸念事項（指示者宛て）

### 解決済み（指示者による決定事項）

以下の懸念については、指示者により方針が決定されました：

- **ユーザーの混乱について**: ✅ 決定
  - ラベルを「文字のドロップシャドウ」「背景のドロップシャドウ」と明確に表示する

- **`spread`パラメータの扱い**: ✅ 決定
  - 文字のシャドウでは`spread`パラメータを完全に削除する
  - UIからも`spread`入力欄を除外する
  - データモデル（TypeSpec）の`textShadow`でも`spread`は使用しない

- **背景が無効な場合のシャドウ設定**: ✅ 決定
  - 設定は保持されるが、背景が無効な場合は影も表示されない（現仕様のまま）
  - UI上で警告メッセージを表示して、ユーザーに状態を明示する

- **既存データとの非互換性**: ✅ 決定
  - プロトタイプ段階のため問題なし
  - マイグレーション処理は不要

### 残存する懸念

- **プロパティパネルの長さ**: 2つのシャドウセクションを追加することで、プロパティパネルが縦に長くなります
  - 対策: スクロールで対応（仕様書で承認済み）
  - 影響: 使い勝手に大きな問題はないと想定

## 事前修正提案

特になし。現在の実装状態で問題なく実装可能です。
