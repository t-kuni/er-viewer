# タスク一覧

## 概要

仕様書 `spec/frontend_er_rendering.md` に複数エンティティドラッグ機能の仕様が追加されました。
この仕様に基づき、以下のタスクを実行します。

## 参照するべき仕様書

- [spec/frontend_er_rendering.md](./spec/frontend_er_rendering.md) - 複数エンティティドラッグ仕様セクション（225-295行目）
- [research/20260204_1500_multi_entity_drag.md](./research/20260204_1500_multi_entity_drag.md) - 実装方法の詳細

## 実装タスク

### フロントエンド修正

#### - [x] ERCanvas.tsx の `onNodeDragStop` ハンドラーを修正

**ファイル**: `public/src/components/ERCanvas.tsx`

**変更箇所**: 297-363行目の `onNodeDragStop` コールバック

**変更内容**:

現在の実装は、ドラッグしたノード1つ（`node`）の座標だけをStoreに反映しているため、複数選択時に他のノードが元の位置に戻ってしまいます。

1. **選択中のentityNodeを全て取得**
   - `getNodes()` で全ノードを取得
   - `node.type === 'entityNode' && node.selected` でフィルタして選択中のエンティティノードを抽出
   - フォールバック: 選択ノードが0個の場合は、ドラッグ対象ノード（`node`）だけを対象とする

2. **複数ノードの位置を一括更新**
   - 抽出したノード群の座標配列を作成
   - `dispatch(actionUpdateNodePositions, positions)` で一括更新
   - 単一ノードドラッグ時も同じロジックで処理される（`selected`が1つだけの場合）

3. **影響を受けるエッジのハンドルを再計算**
   - 移動したノードのIDセット（`movedIds`）を作成
   - `edges.filter(e => movedIds.has(e.source) || movedIds.has(e.target))` で影響を受けるエッジを抽出
   - 抽出したエッジのハンドル（接続点）を再計算
   - 既存の実装（322-354行目）を活用し、全エッジではなく影響を受けるエッジのみを対象とする

4. **ドラッグ終了をdispatch**
   - `dispatch(actionStopEntityDrag)`

**参考実装例**:

```typescript
const onNodeDragStop = useCallback(
  (_event: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
    if (node.type === 'entityNode') {
      // 1) 選択中のentityNodeを全取得
      const selectedEntityNodes = getNodes().filter(
        (n) => n.type === 'entityNode' && n.selected
      );
      
      // フォールバック: 選択が取れていないケースは、ドラッグ対象ノードだけ確定
      const movedNodes = selectedEntityNodes.length > 0 ? selectedEntityNodes : [node];
      
      // 2) Store(ViewModel)へ一括確定
      dispatch(
        actionUpdateNodePositions,
        movedNodes.map((n) => ({
          id: n.id,
          x: n.position.x,
          y: n.position.y,
        }))
      );
      
      // 3) 影響を受けるエッジを抽出
      const movedIds = new Set(movedNodes.map((n) => n.id));
      const connectedEdges = edges.filter(
        (edge) => movedIds.has(edge.source) || movedIds.has(edge.target)
      );
      
      if (connectedEdges.length === 0) {
        dispatch(actionStopEntityDrag);
        return;
      }
      
      // 4) 全ノードの現在位置とサイズを取得
      const currentNodes = getNodes();
      
      // 5) 接続エッジのハンドルを再計算（既存ロジックを活用）
      const updatedEdges = edges.map((edge) => {
        if (!connectedEdges.find((e) => e.id === edge.id)) {
          return edge; // 変更不要
        }
        
        // ... 既存のハンドル再計算ロジック（322-354行目）をそのまま適用 ...
      });
      
      setEdges(updatedEdges);
      dispatch(actionStopEntityDrag);
    }
  },
  [edges, getNodes, setEdges, dispatch]
);
```

**注意事項**:

- `node.selected` フラグはReact Flowの内部状態で管理される（ViewModelには保存しない）
- `onNodeDragStop` は選択グループをドラッグした場合でも呼ばれる（React Flow v12の仕様）
- エッジハンドル再計算では、移動したノードに接続されるエッジのみを対象とし、全エッジを再計算しない（パフォーマンス最適化）
- ノードのwidth/heightは`node.width`と`node.height`プロパティから取得する（React Flowが自動的に設定）

---

#### - [x] React Flowの設定確認（念のため）

**ファイル**: `public/src/components/ERCanvas.tsx`

**確認箇所**: 729-748行目の `<ReactFlow>` コンポーネント

**確認内容**:

複数選択機能が正しく動作するための設定を確認します。

- `elevateNodesOnSelect={false}` が設定されている（742行目） ✓
- `elevateEdgesOnSelect={false}` が設定されている（743行目） ✓
- `panOnDrag={true}` が設定されている（745行目） ✓

※ これらの設定は既に正しく設定されているため、変更不要です。

---

### テストコード作成

#### - [x] 複数エンティティドラッグのテストを追加

**ファイル**: `public/tests/actions/dataActions.test.ts`

**追加内容**:

`actionUpdateNodePositions` が複数ノードの位置を正しく更新できることを確認するテストケースを追加します。

**テストケース**:

1. **複数ノードの位置を一括更新**
   - 3つのノードを含むViewModelを作成
   - `actionUpdateNodePositions` に3つのノード位置を渡す
   - 全てのノード位置が正しく更新されることを確認

2. **一部のノードのみ更新**
   - 3つのノードを含むViewModelを作成
   - `actionUpdateNodePositions` に2つのノード位置を渡す
   - 指定したノードのみが更新され、他のノードは変更されないことを確認

3. **存在しないノードIDを含む場合**
   - 既存のノードと存在しないノードIDを含む配列を渡す
   - 存在するノードのみが更新され、エラーが発生しないことを確認

4. **空配列を渡した場合**
   - 空配列を渡す
   - ViewModelが変更されない（同一参照が返される）ことを確認

**参考実装例**:

```typescript
describe('actionUpdateNodePositions - 複数ノード更新', () => {
  it('複数ノードの位置を一括更新できる', () => {
    const viewModel = createViewModelWithNodes([
      { id: 'node1', x: 0, y: 0 },
      { id: 'node2', x: 100, y: 100 },
      { id: 'node3', x: 200, y: 200 },
    ]);
    
    const updated = actionUpdateNodePositions(viewModel, [
      { id: 'node1', x: 50, y: 60 },
      { id: 'node2', x: 150, y: 160 },
      { id: 'node3', x: 250, y: 260 },
    ]);
    
    expect(updated.erDiagram.nodes['node1'].x).toBe(50);
    expect(updated.erDiagram.nodes['node1'].y).toBe(60);
    expect(updated.erDiagram.nodes['node2'].x).toBe(150);
    expect(updated.erDiagram.nodes['node2'].y).toBe(160);
    expect(updated.erDiagram.nodes['node3'].x).toBe(250);
    expect(updated.erDiagram.nodes['node3'].y).toBe(260);
  });
  
  // ... その他のテストケース ...
});
```

---

### ビルド確認

#### - [x] フロントエンドのビルド確認

**実行コマンド**:

```bash
cd /home/kuni/Documents/er-viewer/public
npm run build
```

**確認内容**:

- ビルドエラーが発生しないこと
- 型エラーが発生しないこと

---

### テスト実行

#### - [x] フロントエンドのテスト実行

**実行コマンド**:

```bash
cd /home/kuni/Documents/er-viewer/public
npm run test
```

**確認内容**:

- 既存のテストが全て成功すること
- 新規追加したテストが全て成功すること

---

## 補足事項

### 複数選択の操作方法

- **複数選択**: Shift + ドラッグで矩形選択領域を作成
- **複数ドラッグ**: 選択されている全てのエンティティが一緒に移動する
- **ドロップ**: 全ての選択ノードの最終位置がViewModelに反映される

### 複数選択時の制限（既存の実装で対応済み）

以下の機能は既存のコードで無効化されているため、追加の実装は不要です：

- **DDL表示機能**: 無効（`onSelectionChange`で選択解除: 365-373行目）
- **プロパティ変更機能**: 無効（同上）
- **許可される操作**: ドラッグによる位置変更のみ

### 状態管理方針

- **選択状態**: React Flowの内部状態（`node.selected`フラグ）で管理
- **ドラッグ中の位置**: React Flowの内部状態で管理（ViewModelには反映しない）
- **確定後の位置**: `actionUpdateNodePositions`でViewModelに反映

ViewModelに複数選択状態を持たせず、React Flowの内部状態を活用することで実装を簡潔に保つ方針です。

---

## 作業不要な項目

以下の項目は既存の実装で対応済みのため、追加の作業は不要です：

- ✓ React Flowの標準機能（Shift+ドラッグによる複数選択）の有効化
- ✓ 複数選択時のDDL表示機能の無効化
- ✓ 複数選択時のプロパティ変更機能の無効化
- ✓ `actionUpdateNodePositions` の複数ノード対応（既に配列を受け取る実装になっている）
