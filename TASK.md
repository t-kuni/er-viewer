# レイヤー管理機能実装タスク一覧

仕様書: [spec/layer_management.md](./spec/layer_management.md)

## 概要

新仕様により、矩形をER図の前面・背面に配置し、左サイドバーのレイヤーパネルでドラッグ&ドロップにより順序を編集できるようにする。

**主な変更点:**
- `GlobalUIState.selectedRectangleId` → `GlobalUIState.selectedItem`（種類と選択の統一）
- `ERDiagramUIState.layerOrder` を追加（レイヤー順序管理）
- `GlobalUIState.showLayerPanel` を追加（レイヤーパネル表示制御）
- レイヤーパネルを左サイドバーに配置（矩形プロパティパネルは右サイドバーで共存可能）
- 矩形をViewportPortalで描画し、z-indexで前面・背面を制御

**スコープ:**
- テキスト機能は対象外（未実装のため）
- エンティティ・リレーションは選択対象外（レイヤーパネル上では「ER Diagram」として一括扱い）

修正対象: 更新約10ファイル、新規作成4ファイル
実装は2フェーズに分けて行う。

---

## フェーズ1: Action層実装と選択状態統一

このフェーズでは、型の再生成、レイヤー管理用のAction実装、選択状態の統一（`selectedRectangleId` → `selectedItem`）を行う。
ビルド・テスト可能な状態を維持する。

### タスク

#### 型の再生成

- [x] 型の再生成
  - `npm run generate` を実行して `scheme/main.tsp` から型を再生成する
  - 生成される型: `LayerItemKind`, `LayerItemRef`, `LayerPosition`, `LayerOrder`
  - `GlobalUIState` に `selectedItem`, `showLayerPanel` が追加される
  - `ERDiagramUIState` に `layerOrder` が追加される
  - **注意**: `selectedRectangleId` は型定義から削除されているため、既存コードとの互換性が一時的に失われる

#### Store初期状態の更新

- [x] Store初期状態の更新
  - ファイル: `public/src/store/erDiagramStore.ts`
  - `initialState` を更新:
    ```typescript
    const initialState: ViewModel = {
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: { backgroundItems: [], foregroundItems: [] }, // 追加
        },
        loading: false,
      },
      ui: {
        selectedItem: null, // selectedRectangleId から置き換え
        showBuildInfoModal: false,
        showLayerPanel: false, // 追加
      },
      buildInfo: {
        data: null,
        loading: false,
        error: null,
      },
    };
    ```

#### レイヤー管理Action実装

- [x] `layerActions.ts` の実装
  - ファイル: `public/src/actions/layerActions.ts` (新規作成)
  - 以下のActionを実装（すべて純粋関数、状態に変化がない場合は同一参照を返す）:
    
    **`actionReorderLayerItems`**:
    - シグネチャ: `(vm: ViewModel, position: 'foreground' | 'background', activeIndex: number, overIndex: number) => ViewModel`
    - 機能: 同一セクション内でアイテムを並べ替え
    - 実装: 配列から要素を削除し、新しい位置に挿入（イミュータブル）
    
    **`actionMoveLayerItem`**:
    - シグネチャ: `(vm: ViewModel, itemRef: LayerItemRef, toPosition: 'foreground' | 'background', toIndex: number) => ViewModel`
    - 機能: アイテムを別のセクションへ移動
    - 実装: 元のセクションから削除し、移動先のセクションに挿入
    
    **`actionAddLayerItem`**:
    - シグネチャ: `(vm: ViewModel, itemRef: LayerItemRef, position: 'foreground' | 'background') => ViewModel`
    - 機能: 新規アイテムをレイヤーに追加
    - 実装: 指定されたセクションの配列末尾に追加（配列の後ろが前面）
    
    **`actionRemoveLayerItem`**:
    - シグネチャ: `(vm: ViewModel, itemRef: LayerItemRef) => ViewModel`
    - 機能: アイテムを削除時にレイヤーからも除去
    - 実装: 背面・前面の両方を探索して削除
    
    **`actionSelectItem`**:
    - シグネチャ: `(vm: ViewModel, itemRef: LayerItemRef | null) => ViewModel`
    - 機能: アイテムを選択（nullで選択解除）
    - 実装: `vm.ui.selectedItem` を更新
    
    **`actionToggleLayerPanel`**:
    - シグネチャ: `(vm: ViewModel) => ViewModel`
    - 機能: レイヤーパネルの表示/非表示を切り替え
    - 実装: `vm.ui.showLayerPanel` をトグル

- [x] `layerActions.test.ts` の実装
  - ファイル: `public/tests/actions/layerActions.test.ts` (新規作成)
  - 各Actionの単体テストを実装:
    - `actionReorderLayerItems`: 同一セクション内での並べ替えが正しく動作すること
    - `actionMoveLayerItem`: セクション間の移動が正しく動作すること
    - `actionAddLayerItem`: アイテムが配列末尾に追加されること
    - `actionRemoveLayerItem`: 両セクションからアイテムが削除されること
    - `actionSelectItem`: 選択状態が正しく更新されること
    - `actionToggleLayerPanel`: パネルの表示状態が切り替わること
    - すべてのActionで、変化がない場合に同一参照を返すこと

#### 既存Actionの更新

- [x] `rectangleActions.ts` の更新
  - ファイル: `public/src/actions/rectangleActions.ts`
  - **`actionAddRectangle`** を更新:
    - 矩形追加後、`actionAddLayerItem` を呼び出して背面レイヤーに追加
    - 実装例:
      ```typescript
      export function actionAddRectangle(
        vm: ViewModel,
        rectangle: Rectangle
      ): ViewModel {
        // 既存の矩形追加ロジック
        let nextVm = { ...vm, erDiagram: { ...vm.erDiagram, rectangles: { ...vm.erDiagram.rectangles, [rectangle.id]: rectangle } } };
        
        // レイヤーに追加
        nextVm = actionAddLayerItem(nextVm, { kind: 'rectangle', id: rectangle.id }, 'background');
        
        return nextVm;
      }
      ```
  - **`actionRemoveRectangle`** を更新:
    - 矩形削除時、`actionRemoveLayerItem` を呼び出してレイヤーからも削除
    - 削除する矩形が選択中の場合は `actionSelectItem(vm, null)` で選択解除
    - 実装例:
      ```typescript
      export function actionRemoveRectangle(
        vm: ViewModel,
        rectangleId: string
      ): ViewModel {
        if (!vm.erDiagram.rectangles[rectangleId]) {
          return vm;
        }
        
        // 矩形を削除
        const { [rectangleId]: _, ...restRectangles } = vm.erDiagram.rectangles;
        let nextVm = { ...vm, erDiagram: { ...vm.erDiagram, rectangles: restRectangles } };
        
        // レイヤーから削除
        nextVm = actionRemoveLayerItem(nextVm, { kind: 'rectangle', id: rectangleId });
        
        // 選択中の場合は選択解除
        if (nextVm.ui.selectedItem?.kind === 'rectangle' && nextVm.ui.selectedItem.id === rectangleId) {
          nextVm = actionSelectItem(nextVm, null);
        }
        
        return nextVm;
      }
      ```
  - `layerActions` からのインポートを追加

- [x] `rectangleActions.test.ts` の更新
  - ファイル: `public/tests/actions/rectangleActions.test.ts`
  - `actionAddRectangle` のテストを更新:
    - レイヤーに追加されることを確認（`vm.erDiagram.ui.layerOrder.backgroundItems` に含まれること）
  - `actionRemoveRectangle` のテストを更新:
    - レイヤーから削除されることを確認
    - 選択中の矩形を削除すると選択が解除されることを確認

- [x] `globalUIActions.ts` の更新
  - ファイル: `public/src/actions/globalUIActions.ts`
  - 以下の関数を削除（`layerActions.ts` の `actionSelectItem` で代替）:
    - `actionSelectRectangle`
    - `actionDeselectRectangle`
  - ビルド情報モーダル関連の関数（`actionShowBuildInfoModal`, `actionHideBuildInfoModal`）は維持

- [x] `globalUIActions.test.ts` の更新
  - ファイル: `public/tests/actions/globalUIActions.test.ts`
  - `actionSelectRectangle`, `actionDeselectRectangle` のテストを削除
  - ビルド情報モーダル関連のテストは維持

#### UI層の選択状態統一

- [x] `App.tsx` の更新
  - ファイル: `public/src/components/App.tsx`
  - インポートを更新:
    - `actionSelectRectangle`, `actionDeselectRectangle` を削除
    - `actionSelectItem` を追加（`layerActions` から）
  - `selectedRectangleId` の購読を `selectedItem` に変更:
    ```typescript
    const selectedItem = useViewModel((vm) => vm.ui.selectedItem)
    ```
  - `handleSelectionChange` を更新:
    ```typescript
    const handleSelectionChange = (rectangleId: string | null) => {
      if (rectangleId === null) {
        dispatch(actionSelectItem, null)
      } else {
        dispatch(actionSelectItem, { kind: 'rectangle', id: rectangleId })
      }
    }
    ```
  - プロパティパネルの表示条件を更新:
    ```typescript
    {selectedItem?.kind === 'rectangle' && (
      <div style={{ width: '300px', ... }}>
        <RectanglePropertyPanel rectangleId={selectedItem.id} />
      </div>
    )}
    ```

- [x] `ERCanvas.tsx` の更新
  - ファイル: `public/src/components/ERCanvas.tsx`
  - `selectedItem` を購読:
    ```typescript
    const selectedItem = useViewModel((vm) => vm.ui.selectedItem)
    ```
  - `handleSelectionChange` を更新して `actionSelectItem` を使用
  - React Flowノードの選択状態と `selectedItem` を同期（将来のViewportPortal移行に備えた準備）

#### ビルド・テスト確認

- [x] ビルド確認
  - フロントエンドのビルドが通ること（`cd public && npm run build`）
  - バックエンドのビルドが通ること（`npm run build`）

- [x] テスト実行
  - すべてのテストが通ること（`npm run test`）

**フェーズ1完了**: 型の再生成、レイヤー管理Action実装、選択状態統一、テスト実装がすべて完了しました。

---

## フェーズ2: レイヤーパネルUI + ViewportPortal + z-index制御

このフェーズでは、左サイドバーにレイヤーパネルを実装し、ViewportPortalで矩形を前面・背面にレンダリングする。
dnd-kitを導入してドラッグ&ドロップ機能を実装し、Portal要素のドラッグ・リサイズも実装する。

### タスク

#### dnd-kitのインストール

- [x] dnd-kitのインストール
  - `cd public && npm install @dnd-kit/core @dnd-kit/sortable`

#### z-index計算ユーティリティ

- [x] `zIndexCalculator.ts` の実装
  - ファイル: `public/src/utils/zIndexCalculator.ts` (新規作成)
  - レイヤー順序から各アイテムのz-indexを計算する関数を実装:
    ```typescript
    import type { components } from '../../../lib/generated/api-types';
    
    type LayerOrder = components['schemas']['LayerOrder'];
    type LayerItemRef = components['schemas']['LayerItemRef'];
    
    /**
     * レイヤー順序から特定アイテムのz-indexを計算
     */
    export function calculateZIndex(layerOrder: LayerOrder, itemRef: LayerItemRef): number {
      // 背面レイヤーを探索
      const bgIndex = layerOrder.backgroundItems.findIndex(
        item => item.kind === itemRef.kind && item.id === itemRef.id
      );
      if (bgIndex !== -1) {
        return -10000 + bgIndex;
      }
      
      // 前面レイヤーを探索
      const fgIndex = layerOrder.foregroundItems.findIndex(
        item => item.kind === itemRef.kind && item.id === itemRef.id
      );
      if (fgIndex !== -1) {
        return 10000 + fgIndex;
      }
      
      // 見つからない場合はデフォルト（0）
      return 0;
    }
    
    /**
     * すべての背面・前面アイテムのz-indexをMapで返す
     */
    export function calculateAllZIndices(layerOrder: LayerOrder): Map<string, number> {
      const zIndices = new Map<string, number>();
      
      layerOrder.backgroundItems.forEach((item, index) => {
        zIndices.set(`${item.kind}-${item.id}`, -10000 + index);
      });
      
      layerOrder.foregroundItems.forEach((item, index) => {
        zIndices.set(`${item.kind}-${item.id}`, 10000 + index);
      });
      
      return zIndices;
    }
    ```

#### レイヤーパネルUI実装

- [x] `LayerPanel.tsx` の実装
  - ファイル: `public/src/components/LayerPanel.tsx` (新規作成)
  - dnd-kitを使用してドラッグ&ドロップ機能を実装
  - レイヤーパネルのUI構成:
    - 3つのセクション: 前面、ER図（固定）、背面
    - 各セクション間に区切り線
  - 各アイテムの表示:
    - 矩形: アイコン + "Rectangle" + 短縮ID（最初の6文字）
    - ER図: 「ER Diagram」固定ラベル（ドラッグ不可、選択不可）
  - 選択中のアイテムは背景色でハイライト
  - ドラッグ中のアイテムは透明度を下げる
  - アイテムクリックで `actionSelectItem` をdispatch
  - Store から `layerOrder` と `selectedItem` を購読
  - ドラッグ&ドロップ処理:
    - `onDragEnd` で以下を判定:
      - 同一セクション内の並べ替え → `actionReorderLayerItems` をdispatch
      - セクション間の移動 → `actionMoveLayerItem` をdispatch
      - ER図セクションはドロップ禁止エリア
  - 実装の参考:
    - `@dnd-kit/core` の `DndContext`, `DragOverlay` を使用
    - `@dnd-kit/sortable` の `SortableContext`, `useSortable` を使用
    - 前面・背面セクションに個別の `SortableContext` を適用

- [x] `App.tsx` へのレイヤーパネル追加
  - ファイル: `public/src/components/App.tsx`
  - `LayerPanel` をインポート
  - `actionToggleLayerPanel` をインポート
  - `showLayerPanel` を購読:
    ```typescript
    const showLayerPanel = useViewModel((vm) => vm.ui.showLayerPanel)
    ```
  - ヘッダーに「レイヤー」ボタンを追加:
    ```typescript
    <button 
      onClick={() => dispatch(actionToggleLayerPanel)}
      style={{ ... }}
    >
      レイヤー
    </button>
    ```
  - 左サイドバーとしてレイヤーパネルを表示:
    ```typescript
    <main style={{ display: 'flex', height: 'calc(100vh - 70px)' }}>
      {showLayerPanel && (
        <div style={{ width: '250px', background: '#f5f5f5', borderRight: '1px solid #ddd', overflowY: 'auto' }}>
          <LayerPanel />
        </div>
      )}
      <div style={{ flex: 1, position: 'relative' }}>
        <ERCanvas onSelectionChange={handleSelectionChange} />
      </div>
      {selectedItem?.kind === 'rectangle' && (
        <div style={{ width: '300px', ... }}>
          <RectanglePropertyPanel rectangleId={selectedItem.id} />
        </div>
      )}
    </main>
    ```

#### ViewportPortalとz-index制御

- [x] React Flowパッケージの移行
  - **必要な作業**: React Flow v11ではパッケージ名が変更されている
  - `reactflow` パッケージをアンインストール: `cd public && npm uninstall reactflow` ✅
  - `@xyflow/react` パッケージをインストール: `cd public && npm install @xyflow/react` ✅
  - **理由**: v11では `ViewportPortal` を含むすべてのコンポーネントは `@xyflow/react` からインポートする必要がある
  - **追加対応**: `ReactFlow` もnamed exportに変更（`import ReactFlow` → `import { ReactFlow }`）

- [x] 全ファイルのimport文を更新
  - 以下の5ファイルのimport文を `reactflow` → `@xyflow/react` に変更: ✅
    1. `public/src/components/ERCanvas.tsx` (ViewportPortal のimportも追加)
    2. `public/src/components/RectangleNode.tsx`
    3. `public/src/utils/reactFlowConverter.ts`
    4. `public/src/components/RelationshipEdge.tsx`
    5. `public/src/components/EntityNode.tsx`
  - CSSのimport: `'reactflow/dist/style.css'` → `'@xyflow/react/dist/style.css'` ✅

- [x] `ERCanvas.tsx` の大幅更新
  - ファイル: `public/src/components/ERCanvas.tsx`
  - **React Flow設定の更新**:
    - `elevateEdgesOnSelect={false}` を追加 ✅
    - エンティティノードに `zIndex: 0` を設定（`convertToReactFlowNodes` で） ✅
    - リレーションエッジに `zIndex: -100` を設定（`convertToReactFlowEdges` で） ✅

  - **ViewportPortalで矩形をレンダリング**: ✅
    - `ViewportPortal` をインポート（`@xyflow/react` から） ✅
    - `useViewport()` でviewport座標を取得 ✅
    - `layerOrder` と `rectangles` を購読 ✅
    - `calculateZIndex` を使ってz-indexを計算 ✅
    - 背面Portal と 前面Portal を実装 ✅
  
  - **Portal要素のドラッグ実装**: ✅
    - `handleRectangleMouseDown` を実装 ✅
    - viewport座標とスクリーン座標の変換を考慮（`useViewport()` の `zoom` を使用） ✅
    - ドラッグ中はローカル状態で管理 ✅
    - マウスアップ時に `actionUpdateRectanglePosition` をdispatch ✅
    - `stopPropagation()` で React Flow のパン操作と干渉しないようにする ✅
  
  - **リサイズハンドルの実装**: ✅
    - `ResizeHandles` コンポーネントを実装 ✅
    - 四隅と四辺にリサイズハンドルを配置 ✅
    - リサイズ中は `actionUpdateRectangleBounds` をdispatch ✅
  
  - **矩形ノードの削除**: ✅
    - `convertToReactFlowRectangles` の呼び出しを削除 ✅
    - `useEffect` で矩形を React Flow ノードとして追加していた処理を削除 ✅
    - すべて ViewportPortal で描画 ✅

- [x] `reactFlowConverter.ts` の更新（必要に応じて）
  - ファイル: `public/src/utils/reactFlowConverter.ts`
  - `convertToReactFlowRectangles` 関数に非推奨コメントを追加 ✅
  - エンティティノードに `zIndex: 0` を追加 ✅
  - エッジに `zIndex: -100` を追加 ✅

- [x] `RectangleNode.tsx` の削除または非推奨化
  - ファイル: `public/src/components/RectangleNode.tsx`
  - ViewportPortalで矩形を描画するため、このコンポーネントは不要になる ✅
  - 非推奨コメントを追加（既に追加済み） ✅

#### ビルド・テスト確認

- [x] ビルド確認
  - フロントエンドのビルドが通ること（`cd public && npm run build`） ✅
  - バックエンドのビルドが通ること（`npm run build`） ✅

- [x] テスト実行
  - すべてのテストが通ること（`npm run test`） ✅ (62 tests passed)

**フェーズ2完了**: ViewportPortalによる矩形描画、z-index制御、Portal要素のドラッグ・リサイズ機能がすべて実装完了しました。

---

## フェーズ2の現状（2026-01-25 更新）

### ✅ すべての作業が完了しました！

#### 完了した作業
- dnd-kitのインストール ✅
- `zIndexCalculator.ts`の実装 ✅
- `LayerPanel.tsx`の実装（dnd-kitを使用したドラッグ&ドロップ機能付き） ✅
- `App.tsx`へのレイヤーパネル追加（左サイドバー） ✅
- **型定義の問題を解決**: `npm run generate`を実行し、`layerOrder`、`selectedItem`、レイヤー関連型がすべて正しく生成されることを確認 ✅
- **React Flowパッケージの移行**: `reactflow` → `@xyflow/react` ✅
- **全ファイルのimport文更新**: 5ファイルすべて更新完了 ✅
- **ViewportPortalの動作確認**: importに成功し、ビルドも通ることを確認 ✅
- **ERCanvas.tsxの大幅更新**: ViewportPortalによる矩形描画、z-index制御の実装 ✅
- **Portal要素のドラッグ・リサイズ機能**: マウスイベントを使った完全なドラッグ・リサイズ実装 ✅
- **reactFlowConverter.tsの更新**: エンティティノードとエッジにzIndex追加 ✅
- **RectangleNode.tsxの非推奨化**: 既に非推奨コメント付き ✅
- **ビルド・テスト確認**: フロントエンド・バックエンドのビルド、62テストすべて通過 ✅

#### 実装の詳細
1. **ViewportPortalによる矩形描画**:
   - 背面・前面の2つのViewportPortalで矩形を描画
   - `calculateZIndex`関数でレイヤー順序からz-indexを計算
   - 選択中の矩形にはアウトライン表示

2. **ドラッグ機能**:
   - `handleRectangleMouseDown`でドラッグ開始
   - viewport.zoomを考慮した座標変換
   - `actionUpdateRectanglePosition`でStoreを更新

3. **リサイズ機能**:
   - `ResizeHandles`コンポーネントで四隅・四辺にハンドルを配置
   - 各ハンドルでドラッグすると矩形のサイズと位置を更新
   - `actionUpdateRectangleBounds`でStoreを更新

4. **React Flow設定**:
   - `elevateNodesOnSelect={false}` と `elevateEdgesOnSelect={false}` を設定
   - エンティティノード: `zIndex: 0`
   - リレーションエッジ: `zIndex: -100`
   - 背面矩形: `zIndex: -10000 + index`
   - 前面矩形: `zIndex: 10000 + index`

---

## 備考

- 各フェーズの最後に必ずビルド確認・テスト実行を行う
- Portal要素のドラッグ・リサイズ、viewport座標同期は実装時に試行錯誤が必要
- テキスト機能は対象外（将来的に実装された場合、同様の方法でレイヤー管理に統合）
- エンティティ・リレーションはレイヤーパネル上では選択対象外（「ER Diagram」として一括扱い）
