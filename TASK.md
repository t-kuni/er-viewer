# タスク一覧: レイヤー配列順序の修正

## 概要

レイヤー管理機能において、`LayerOrder`の配列順序とz-index計算の対応関係を修正する。

**変更内容**:
- **修正前**: 配列の後ろが前面寄り（`backgroundItems[length-1]`が最前面）
- **修正後**: 配列の先頭が前面寄り（`backgroundItems[0]`が最前面、`foregroundItems[0]`が最前面）

**目的**:
- UIパネルでの表示順序と配列のインデックスを一致させる
- ドラッグ&ドロップ時のインデックス計算を簡素化する
- コードの直感性を向上させる

**参照仕様書**:
- [spec/layer_management.md](./spec/layer_management.md) - レイヤー管理機能仕様（更新済み）
  - 行63-66: UI表示順序の説明（配列順で表示）
  - 行141-146: z-index計算ルール（配列を逆順に計算）
  - 行207-212: 配列順序とUI表示の対応

**変更概要**:
- `scheme/main.tsp`の`LayerOrder`モデルのコメントを修正（仕様書との整合性のため）
- `public/src/actions/layerActions.ts`に`calculateZIndex`関数を追加（z-index計算ロジックを統合）
- `public/src/actions/layerActions.ts`の`actionAddLayerItem`を修正（配列の先頭に追加）
- `public/src/components/ERCanvas.tsx`のimport文を変更
- `public/src/utils/zIndexCalculator.ts`を削除（layerActionsに統合）
- テストコードを修正（期待値の変更）

**影響範囲**:
- TypeSpec型定義（コメントのみ）
- レイヤーアクション（z-index計算ロジックと新規追加時の挿入位置）
- ERCanvasのimport文
- テストコード

## フェーズ1: TypeSpecコメント修正と型再生成

### TypeSpecコメントの修正

- [x] `scheme/main.tsp`の`LayerOrder`モデルのコメントを修正（行224-225）
  - **現在の実装**:
    ```typescript
    backgroundItems: LayerItemRef[]; // 背面アイテム（配列の後ろが前面寄り）
    foregroundItems: LayerItemRef[]; // 前面アイテム（配列の後ろが前面寄り）
    ```
  - **修正後**:
    ```typescript
    backgroundItems: LayerItemRef[]; // 背面アイテム（配列の先頭が前面寄り、末尾が背面寄り）
    foregroundItems: LayerItemRef[]; // 前面アイテム（配列の先頭が最前面、末尾が背面寄り）
    ```
  - **注意**: コメントのみの修正のため、生成される型に影響はない
  - **仕様書参照**: spec/layer_management.md 行207-212

### 型定義の再生成

- [x] 型定義の再生成（念のため）
  ```bash
  cd /home/kuni/Documents/er-viewer
  npm run generate
  ```
  - `lib/generated/api-types.ts`が自動生成される
  - `public/src/api/client/`配下のファイルが自動生成される
  - エラーが出ないことを確認する
  - 注意: コメントのみの修正のため、型定義自体に変更はない

## フェーズ2: z-index計算ロジックの統合

### layerActionsへのcalculateZIndex関数追加

- [x] `public/src/actions/layerActions.ts`に`calculateZIndex`関数を追加（ファイル末尾に追加）
  - **追加内容**:
    ```typescript
    /**
     * レイヤー順序から特定アイテムのz-indexを計算
     */
    export function calculateZIndex(
      layerOrder: LayerOrder,
      itemRef: LayerItemRef
    ): number {
      // 背面レイヤーを探索
      const bgIndex = layerOrder.backgroundItems.findIndex(
        item => item.kind === itemRef.kind && item.id === itemRef.id
      );
      if (bgIndex !== -1) {
        return -10000 + (layerOrder.backgroundItems.length - 1 - bgIndex);
      }
      
      // 前面レイヤーを探索
      const fgIndex = layerOrder.foregroundItems.findIndex(
        item => item.kind === itemRef.kind && item.id === itemRef.id
      );
      if (fgIndex !== -1) {
        return 10000 + (layerOrder.foregroundItems.length - 1 - fgIndex);
      }
      
      // 見つからない場合はデフォルト（0）
      return 0;
    }
    ```
  - **変更内容**: 配列インデックスを逆順に計算する（`length - 1 - index`）
  - **仕様書参照**: spec/layer_management.md 行143-144
  - **注意**: `calculateAllZIndices`は使用されていないため実装しない

### ERCanvasのimport文変更

- [x] `public/src/components/ERCanvas.tsx`のimport文を修正（行26付近）
  - **現在の実装**:
    ```typescript
    import { calculateZIndex } from '../utils/zIndexCalculator'
    ```
  - **修正後**:
    ```typescript
    import { calculateZIndex } from '../actions/layerActions'
    ```
  - **変更内容**: インポート元を`layerActions`に変更

### 不要ファイルの削除

- [x] `public/src/utils/zIndexCalculator.ts`を削除
  - **理由**: レイヤー管理のロジックを`layerActions.ts`に集約するため
  - **削除コマンド**:
    ```bash
    rm /home/kuni/Documents/er-viewer/public/src/utils/zIndexCalculator.ts
    ```

## フェーズ3: レイヤーアクションの修正

### actionAddLayerItemの修正

- [x] `public/src/actions/layerActions.ts`の`actionAddLayerItem`関数を修正（行108-138）
  - **現在の実装**: 配列の末尾に追加（`[...items, itemRef]`）
  - **修正後**: 配列の先頭に追加（`[itemRef, ...items]`）
  - **修正内容**:
    ```typescript
    // 既に存在する場合は追加しない
    const exists = items.some(item => item.kind === itemRef.kind && item.id === itemRef.id);
    if (exists) {
      return vm;
    }

    const newItems = [itemRef, ...items];  // ← 先頭に追加（末尾から変更）

    return {
      ...vm,
      erDiagram: {
        ...vm.erDiagram,
        ui: {
          ...vm.erDiagram.ui,
          layerOrder: {
            ...vm.erDiagram.ui.layerOrder,
            [position === 'foreground' ? 'foregroundItems' : 'backgroundItems']: newItems,
          },
        },
      },
    };
    ```
  - **理由**: 新規追加されたアイテムは最前面に表示されるべき（UI上の自然な動作）
  - **仕様書参照**: spec/layer_management.md 行164-167（actionAddLayerItemの説明）

## フェーズ4: テストコードの修正

### layerActionsへのcalculateZIndexテスト追加

- [x] `public/tests/actions/layerActions.test.ts`に`calculateZIndex`のテストを追加（ファイル末尾に追加）
  - **追加位置**: `actionToggleLayerPanel`のテストの後（行372付近）
  - **テスト内容**:
    ```typescript
    describe('calculateZIndex', () => {
      it('backgroundItemsの先頭要素が最も大きいz-indexを持つ', () => {
        const layerOrder: LayerOrder = {
          backgroundItems: [
            { kind: 'rectangle', id: 'rect1' },  // z-index = -10000 + 2 = -9998（最前面）
            { kind: 'rectangle', id: 'rect2' },  // z-index = -10000 + 1 = -9999
            { kind: 'rectangle', id: 'rect3' },  // z-index = -10000 + 0 = -10000（最背面）
          ],
          foregroundItems: [],
        };

        expect(calculateZIndex(layerOrder, { kind: 'rectangle', id: 'rect1' })).toBe(-9998);
        expect(calculateZIndex(layerOrder, { kind: 'rectangle', id: 'rect2' })).toBe(-9999);
        expect(calculateZIndex(layerOrder, { kind: 'rectangle', id: 'rect3' })).toBe(-10000);
      });

      it('foregroundItemsの先頭要素が最も大きいz-indexを持つ', () => {
        const layerOrder: LayerOrder = {
          backgroundItems: [],
          foregroundItems: [
            { kind: 'text', id: 'text1' },  // z-index = 10000 + 2 = 10002（最前面）
            { kind: 'text', id: 'text2' },  // z-index = 10000 + 1 = 10001
            { kind: 'text', id: 'text3' },  // z-index = 10000 + 0 = 10000（最背面）
          ],
        };

        expect(calculateZIndex(layerOrder, { kind: 'text', id: 'text1' })).toBe(10002);
        expect(calculateZIndex(layerOrder, { kind: 'text', id: 'text2' })).toBe(10001);
        expect(calculateZIndex(layerOrder, { kind: 'text', id: 'text3' })).toBe(10000);
      });

      it('アイテムが見つからない場合は0を返す', () => {
        const layerOrder: LayerOrder = {
          backgroundItems: [],
          foregroundItems: [],
        };

        expect(calculateZIndex(layerOrder, { kind: 'rectangle', id: 'unknown' })).toBe(0);
      });

      it('単一要素の場合は正しいz-indexを返す', () => {
        const layerOrder: LayerOrder = {
          backgroundItems: [{ kind: 'rectangle', id: 'rect1' }],
          foregroundItems: [],
        };

        // length=1, index=0 → -10000 + (1 - 1 - 0) = -10000
        expect(calculateZIndex(layerOrder, { kind: 'rectangle', id: 'rect1' })).toBe(-10000);
      });

      it('backgroundとforegroundの両方にアイテムがある場合', () => {
        const layerOrder: LayerOrder = {
          backgroundItems: [
            { kind: 'rectangle', id: 'rect1' },
            { kind: 'rectangle', id: 'rect2' },
          ],
          foregroundItems: [
            { kind: 'text', id: 'text1' },
            { kind: 'text', id: 'text2' },
          ],
        };

        expect(calculateZIndex(layerOrder, { kind: 'rectangle', id: 'rect1' })).toBe(-9999);  // -10000 + (2 - 1 - 0)
        expect(calculateZIndex(layerOrder, { kind: 'rectangle', id: 'rect2' })).toBe(-10000); // -10000 + (2 - 1 - 1)
        expect(calculateZIndex(layerOrder, { kind: 'text', id: 'text1' })).toBe(10001);       // 10000 + (2 - 1 - 0)
        expect(calculateZIndex(layerOrder, { kind: 'text', id: 'text2' })).toBe(10000);       // 10000 + (2 - 1 - 1)
      });
    });
    ```
  - **注意**: `calculateZIndex`を`layerActions.ts`からimportする必要がある
    ```typescript
    import {
      actionReorderLayerItems,
      actionMoveLayerItem,
      actionAddLayerItem,
      actionRemoveLayerItem,
      actionSelectItem,
      actionToggleLayerPanel,
      calculateZIndex,  // ← 追加
    } from '../../src/actions/layerActions';
    ```
  - **目的**: z-index計算が正しく逆順になっていることを検証
  - **注意**: 配列の先頭ほど大きいz-index値を持つことを確認

### layerActionsの既存テスト修正

- [x] `public/tests/actions/layerActions.test.ts`の`actionAddLayerItem`テストを修正（行146-171）
  - **現在の実装**:
    ```typescript
    it('アイテムが配列末尾に追加されること', () => {
      const vm = createInitialViewModel();
      vm.erDiagram.ui.layerOrder.backgroundItems = [
        { kind: 'rectangle', id: 'rect1' },
      ];

      const result = actionAddLayerItem(vm, { kind: 'rectangle', id: 'rect2' }, 'background');

      expect(result.erDiagram.ui.layerOrder.backgroundItems).toEqual([
        { kind: 'rectangle', id: 'rect1' },
        { kind: 'rectangle', id: 'rect2' },  // ← 末尾に追加
      ]);
    });
    ```
  - **修正後**:
    ```typescript
    it('アイテムが配列先頭に追加されること', () => {
      const vm = createInitialViewModel();
      vm.erDiagram.ui.layerOrder.backgroundItems = [
        { kind: 'rectangle', id: 'rect1' },
      ];

      const result = actionAddLayerItem(vm, { kind: 'rectangle', id: 'rect2' }, 'background');

      expect(result.erDiagram.ui.layerOrder.backgroundItems).toEqual([
        { kind: 'rectangle', id: 'rect2' },  // ← 先頭に追加
        { kind: 'rectangle', id: 'rect1' },
      ]);
    });
    ```
  - **変更内容**: テストケースのタイトルと期待値を修正

## フェーズ5: テストとビルド確認

### テスト実行

- [x] フロントエンドのテスト実行
  ```bash
  cd /home/kuni/Documents/er-viewer/public
  npm run test
  ```
  - すべてのテストがpassすることを確認する
  - 特に`layerActions.test.ts`の`calculateZIndex`テストが通ることを確認

- [x] バックエンドのテスト実行（念のため）
  ```bash
  cd /home/kuni/Documents/er-viewer
  npm run test
  ```
  - すべてのテストがpassすることを確認する

### ビルド確認

- [x] フロントエンドのビルド
  ```bash
  cd /home/kuni/Documents/er-viewer/public
  npm run build
  ```
  - エラーが出ないことを確認する

- [x] バックエンドのビルド確認
  ```bash
  cd /home/kuni/Documents/er-viewer
  npm run build
  ```
  - エラーが出ないことを確認する

## 実装時の注意事項

### z-index計算の逆順変換

配列のインデックスを逆順に変換する計算式は以下の通り：

```typescript
// 配列: [A, B, C]  (length = 3)
// index=0 (A) → reversedIndex = 3 - 1 - 0 = 2 (最大値)
// index=1 (B) → reversedIndex = 3 - 1 - 1 = 1
// index=2 (C) → reversedIndex = 3 - 1 - 2 = 0 (最小値)
```

これにより、配列の先頭要素が最も大きなz-index値を持つようになります。

### UI表示順序との対応

修正後は以下のようになります：

| 配列インデックス | UI表示位置 | z-index値（背面） | z-index値（前面） |
|---|---|---|---|
| 0（先頭） | 最上部（最前面） | -9998 | 10002 |
| 1 | 中間 | -9999 | 10001 |
| 2（末尾） | 最下部（最背面） | -10000 | 10000 |

※ 配列長が3の場合の例

### ドラッグ&ドロップへの影響

この変更により、レイヤーパネルのドラッグ&ドロップ実装が簡素化されます：
- UI上の表示順序（上から下）と配列のインデックス（0から順）が一致
- ドラッグ時のインデックス計算が直感的になる
- `dnd-kit`のソート機能をそのまま利用可能

### 新規アイテムの追加位置

`actionAddLayerItem`で配列の先頭に追加されることにより、新規作成されたアイテムは常に最前面に表示されます。これはユーザーの期待に沿った自然な動作です。

### 既存データへの影響

現在のプロトタイプ段階では、`layerOrder`に実データが格納されているケースは少ないと想定されます。もし既存のテストデータやlocalStorageにデータがある場合、z-indexの順序が逆転する可能性があります。その場合はデータをクリアしてください。

## MVP範囲外（今回は実装しない）

以下は今回の実装では対象外です：

- 既存データの移行処理（配列の順序を反転する処理）
- レイヤーパネルUI自体の実装（別タスクで実装予定）
- dnd-kitによるドラッグ&ドロップ実装（別タスクで実装予定）

## 事前修正提案

特になし。現在の実装状態で問題なく修正可能です。
