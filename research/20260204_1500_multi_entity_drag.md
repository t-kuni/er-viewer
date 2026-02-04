## 1) 複数選択ノードをまとめてドラッグ→ドロップ時に全ノード位置を保存する方法

いま起きている「ドラッグ中は一緒に動くが、ドロップで1つ以外が戻る」は、`nodes`が **Store(ViewModel)由来の“制御コンポーネント”**になっていて、`onNodeDragStop`で**1ノード分しかStoreへ確定反映していない**ために、再描画で他ノードがStore上の旧座標に戻るのが原因です。

対策は「**ドロップ時点で“移動した全ノード”の座標をStoreへ一括反映**」です。
React Flow v12では、選択グループ（複数選択）をドラッグした場合でも `onNodeDragStop` が呼ばれるため、既存のフックに寄せて実装できます。([React Flow][1])

実装方針（現状方針のまま：ドラッグ中は内部状態、確定時のみStore反映）：

* `onNodeDragStop` で `getNodes()` を呼び、`node.selected === true` のノード群を取得して一括更新
* 複数選択でない（=単一ドラッグ）場合は、`selected` が1つだけなのでそのまま動きます

`getNodes()` は ReactFlowInstance から取得でき、ノード配列を返します。([React Flow][2])
また、ノードには `selected` フラグがあります。([React Flow][3])

```ts
// ERCanvas.tsx
const { getNodes } = useReactFlow(); // 既にgetNodesを使っている前提

const onNodeDragStop = useCallback(
  (_event: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
    if (node.type !== 'entityNode') return;

    // 1) “いま選択されている” entityNode を全取得（= 複数ドラッグ時の移動対象）
    const selectedEntityNodes = getNodes().filter(
      (n) => n.type === 'entityNode' && n.selected
    );

    // 念のため：選択が取れていないケースは、ドラッグ対象ノードだけ確定
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

    // 3) エッジ再計算（後述）
    const movedIds = movedNodes.map((n) => n.id);
    // … edge recalculation …

    // 4) ドラッグ終了（必要なら movedIds を渡す形に変更案あり：後述）
    dispatch(actionStopEntityDrag /*, movedIds */);
  },
  [getNodes, dispatch /*, edges など */]
);
```

> 代替として `onSelectionDragStop` を使い、コールバックに渡される `nodes: Node[]`（影響を受けたノード配列）で更新する手もあります。`onSelectionDragStop` は `<ReactFlow />` のSelection系イベントとして提供され、型も `(event, nodes)` です。([React Flow][4])
> ただし、既存の `onNodeDragStop` に寄せる方が差分が小さく、挙動の一貫性も保てます（選択ドラッグでも `onNodeDragStop` は呼ばれます）。([React Flow][1])

---

## 2) 選択中ノードを判別する方法

最小差分なら「React Flow内部状態から取る」が一番簡単です。

* `getNodes()` で全ノードを取得([React Flow][2])
* `node.selected` が true のものが選択中([React Flow][3])

これで **Store側に複数選択状態を持たなくても**、ドロップ確定時に必要な情報（移動対象集合）だけ取り出せます。

---

## 3) 複数ノード移動時のエッジ再計算方法

基本は「**移動したノードID集合に接続されるエッジだけ**」を対象にします。

1. `movedIds` を `Set` 化
2. `edges.filter(e => movedSet.has(e.source) || movedSet.has(e.target))` で **影響エッジ抽出**
3. 抽出したエッジだけ、既存の「エッジハンドル再計算」をループで適用
4. `setEdges` もしくは ViewModel更新Actionで反映

イメージ：

```ts
const movedSet = new Set(movedIds);

const affectedEdges = edges.filter(
  (e) => movedSet.has(e.source) || movedSet.has(e.target)
);

// 既存の「1エッジ分のハンドル再計算」を関数化して、
const updatedEdges = affectedEdges.map((e) => recomputeEdgeHandles(e, /* nodes情報 */));

// 反映（どちらか）
// setEdges((prev) => mergeById(prev, updatedEdges));
// dispatch(actionUpdateEdges, updatedEdges);
```

※ エッジ計算で「ノードの絶対座標」が必要なら、`onNodesChange` の `NodePositionChange` には `positionAbsolute` が含まれます。([React Flow][5])
（ただ、いまのVMが `x,y` をグローバル座標として扱っているなら `node.position` の確定で足ります）

---

## 4) `actionStopEntityDrag` の変更案

「状態は可能な限りViewModelで管理する」方針に寄せるなら、**“どのエンティティが動いたか”** を Action に渡して、関連エッジ更新まで ViewModel内で完結させるのが素直です。

案A（最小変更・拡張）：

```ts
export function actionStopEntityDrag(
  viewModel: ViewModel,
  movedEntityIds: string[]
): ViewModel {
  // 1) ドラッグ中フラグ等の後処理
  // 2) movedEntityIds に接続するエッジだけ再計算して viewModel を更新
  return next;
}
```

フロント側はドロップ時に `movedIds` を渡すだけにします。

---

## 5) エッジケース・制約

* **選択に entityNode 以外が混ざる**：`type === 'entityNode'` でフィルタして無視（要件どおり「位置だけ」対象を限定）
* **複数選択はしているが移動していない**：`onNodeDragStop` 自体が呼ばれないので、更新されない（自然）
* **ドラッグ対象ノードが `selected` でないケース**：`selectedEntityNodes.length === 0` のフォールバックで単一更新（上のコードのとおり）
* **ドラッグ中の逐次同期を避けたい**：`onNodesChange` ではなく、上記のように「Stop時点だけ `getNodes()` 参照→確定」なら要件どおりになります([React Flow][2])

[1]: https://reactflow.dev/learn/troubleshooting/migrate-to-v12 "Migrate to React Flow 12 - React Flow"
[2]: https://reactflow.dev/api-reference/types/react-flow-instance "ReactFlowInstance - React Flow"
[3]: https://reactflow.dev/api-reference/types/node "Node - React Flow"
[4]: https://reactflow.dev/api-reference/react-flow "The ReactFlow component - React Flow"
[5]: https://reactflow.dev/api-reference/types/node-change "NodeChange - React Flow"
