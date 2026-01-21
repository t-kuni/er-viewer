## 1. Fluxアーキテクチャの適用（現実的に可能か？React Flowと統合できるか？）

可能です。あなたが想定している `action(state, ...params) => newState` は、実質「Reducer（純粋関数）」そのものなので、**単一状態ツリー + 純粋関数更新**の構造はReactで素直に実現できます。

React Flow側も **controlled / uncontrolled 両対応**で、`nodes/edges + onNodesChange/onEdgesChange` を使うcontrolled運用が可能です。([React Flow][1])
（ただし、React Flowはインタラクション量が多いので、どこまでを“完全に自前状態で同期”するかは設計判断になります。後述）

---

## 2. 状態管理ライブラリは何が適切か？

結論：**Redux Toolkit（RTK）**が最も目的に合います。

* **Action層=純粋関数（Reducer）**を中心に据えやすい
* DevTools（差分追跡/タイムトラベル）や周辺エコシステムが強い
* RTKは内部でImmerを使い、immutable更新の記述を簡略化できる([redux-toolkit.js.org][2])
* React Flow公式も「Zustandを例にするがRedux等でもOK」と明言している([React Flow][3])

他の候補との相性（要点だけ）:

* **useReducer**: `dispatch(actionFn, ...params)` みたいな形にしやすく、あなたの“関数Action”に最も近い。ただしDevTools/設計の標準化が弱い。
* **Zustand**: 低ボイラープレートで速い。React Flow自体が内部でZustandを使うので親和性は高い([React Flow][3])。ただし「純粋関数として外出ししてテストする」運用を自分で規律化する必要がある（storeの`set`で直接更新しがち）。
* **Jotai/Recoil**: 状態が原子化されるので「単一状態ツリー」「action集約」とは思想がズレやすい。
* **MobX**: 自動追跡・ミューテーション中心になりやすく、純粋関数テスト最大化とは逆方向。

---

## 3. マウスイベントを `actionMouseMove(state, x, y)` にする妥当性

設計としては妥当ですが、**mousemoveのたびに状態更新**はそのままだと再レンダリングが過剰になりやすいです（MVPでも不快になり得る）。

現実的な落とし所：

* **mousemoveは発火しても良いが、Actionで“変化があった時だけ”stateを変える**

  * 「ホバー対象が前回と同じなら state を返す（参照同一）」
* さらに安全策として

  * `requestAnimationFrame` で間引く（1フレーム1回）
  * もしくは一定msでthrottle

React Flow上の座標変換は、`ReactFlowInstance.screenToFlowPosition()` が公式に用意されています([React Flow][4])
（パン/ズームを含む座標系がReact Flow内部にあるため、これを使って「flow座標」にしてからhit-testするのが筋）

---

## 4. DOMサイズ（width/height）を状態へ反映

現実的です。副作用は「DOM計測」で、Action自体は **計測結果を受け取って純粋にstate更新**にすれば良いです。

* `ResizeObserver` でノード要素のサイズを監視
* 変化があった時だけ `actionUpdateNodeSize(state, id, w, h)` をdispatch
* 初回は「描画→計測→state更新→再描画」が1回増えるのは基本避けられません（ただし差分ガードで最小化可能）

---

## 5. React Flowとの統合（内部状態との分離・ドラッグ同期）

おすすめ方針（MVPで破綻しにくい）：

* **ERDiagramViewModel（あなたのVM）を正として保持**
* React Flowに渡す `Node[]/Edge[]` は **VMから毎回変換（selector）**
* インタラクションは可能な限り **React Flowイベント → action dispatch** に変換
* ただしドラッグ中は更新頻度が高いので、次のどちらかにする

### A. “完全controlled”で同期（実装が単純）

* `onNodesChange`（位置変更）でVMの `x/y` を更新
* ただし **エッジハンドル再計算はdrag中はやらず、drag stopでまとめて**
  （drag中は線の出入口が多少ズレてもMVPなら許容）

React Flowはcontrolled運用を公式に想定しており、`nodes/edges + onNodesChange/onEdgesChange` が基本形です([React Flow][1])

### B. “ドラッグ中はReact Flow内部、確定だけVMへ”（二重状態を最小化）

* ドラッグ中の見た目はReact Flowに任せる
* `onNodeDragStop` 等のタイミングで `getNodes()` から最終位置を拾ってVMへ反映
  （この場合「ドラッグ中だけ一時的に二重」になる）

---

## 6. ロジックをActionへ集約（純粋関数で可能か？）

可能です。ポイントは「Actionは副作用を持たない」だけで、**検索・計算は副作用ではない**ので問題ありません。

ただし、あなたが書こうとしているような `isHighlighted/isDimmed` を全ノードに持たせると、

* hoverのたびに大量のノードを書き換える（O(N)更新）
  になりやすいです。

おすすめは次のどちらか：

* **(推奨) UIフラグを“集合”で保持**

  * `ui.highlightedNodeIds: Set<string>`
  * `ui.dimmed: boolean` は「hover中か」で決まる
  * コンポーネントは `set.has(id)` で描画するだけ（ロジックが薄い）
* どうしても `node.isHighlighted` を持ちたいなら

  * hover対象の近傍だけ更新する設計に寄せる（全ノード再計算を避ける）

---

## 7. テスト戦略（Action単体テスト中心）

あなたの想定通り、Action（純粋関数）を直接叩けばほぼ全ロジックをカバーできます。
UIは「Actionをdispatchしてるか」「stateを描いてるか」程度の薄いテストにできます。

---

## 8. 実装の複雑さとトレードオフ（MVP向きか？）

* **実装コストは上がる**（状態設計・Action境界・変換層・イベント変換が必要）
* ただし **MVPでも“作り直し前提”ならむしろ相性が良い**

  * Action中心にしておくと破壊的変更でも修正箇所が狭い
  * テスト資産がUI変更に引きずられにくい

大きなトレードオフは

* mousemove/dragの高頻度更新を、どこまでstore更新に載せるか
* UIフラグを「全ノードに展開」するか「集合で持つ」か
  です。

---

## 9. 代替・段階移行（現実的な進め方）

段階移行が一番安全です。

1. **HoverContextのロジックを丸ごとActionへ移管**し、Contextは廃止 or store参照に置換
2. 次に **エッジハンドル計算とドラッグ確定**をAction化
3. 最後に `Node[]/Edge[]` 二重管理を解消（VM→React Flow変換を正規ルートにする）

---

## 10. サンプル実装（Action層 / Redux / React Flow / ResizeObserver / テスト）

### 10.1 State定義（UIは集合で保持する例）

```ts
export type HoverTarget =
  | { type: 'entity'; id: string }
  | { type: 'edge'; id: string }
  | { type: 'column'; entityId: string; columnName: string }
  | null;

export type EntityNodeVM = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;   // 0なら未計測
  height: number;  // 0なら未計測
  columns: Column[];
  ddl: string;
};

export type RelationshipEdgeVM = {
  id: string;
  source: string;
  target: string;
  fromColumn: string;
  toColumn: string;
  constraintName: string;
  sourceHandle: string;
  targetHandle: string;
};

export type ERDiagramState = {
  nodes: Record<string, EntityNodeVM>;
  edges: Record<string, RelationshipEdgeVM>;
  ui: {
    hover: HoverTarget;
    highlightedNodeIds: Set<string>;
    highlightedEdgeIds: Set<string>;
    highlightedColumns: Map<string, Set<string>>; // entityId -> column set
  };
};
```

### 10.2 純粋関数Action例（hover）

```ts
const emptyUI = () => ({
  hover: null as HoverTarget,
  highlightedNodeIds: new Set<string>(),
  highlightedEdgeIds: new Set<string>(),
  highlightedColumns: new Map<string, Set<string>>(),
});

export function actionClearHover(state: ERDiagramState): ERDiagramState {
  // 変化がなければ参照を返して再レンダ抑制したいなら条件分岐しても良い
  return { ...state, ui: emptyUI() };
}

export function actionHoverEntity(state: ERDiagramState, entityId: string): ERDiagramState {
  if (!state.nodes[entityId]) return state;

  const highlightedNodeIds = new Set<string>([entityId]);
  const highlightedEdgeIds = new Set<string>();

  for (const edge of Object.values(state.edges)) {
    if (edge.source === entityId) {
      highlightedEdgeIds.add(edge.id);
      highlightedNodeIds.add(edge.target);
    } else if (edge.target === entityId) {
      highlightedEdgeIds.add(edge.id);
      highlightedNodeIds.add(edge.source);
    }
  }

  return {
    ...state,
    ui: {
      hover: { type: 'entity', id: entityId },
      highlightedNodeIds,
      highlightedEdgeIds,
      highlightedColumns: new Map(),
    },
  };
}
```

### 10.3 mousemove（hit-testして“変化がある時だけ”更新）

```ts
type Point = { x: number; y: number };

function hitTestEntity(state: ERDiagramState, p: Point): string | null {
  // MVP: 総当たり。後で空間インデックスに置換可能
  for (const n of Object.values(state.nodes)) {
    if (n.width <= 0 || n.height <= 0) continue;
    const left = n.x;
    const top = n.y;
    const right = n.x + n.width;
    const bottom = n.y + n.height;
    if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) return n.id;
  }
  return null;
}

export function actionMouseMove(state: ERDiagramState, p: Point): ERDiagramState {
  const hoveredId = hitTestEntity(state, p);

  const current = state.ui.hover?.type === 'entity' ? state.ui.hover.id : null;
  if (hoveredId === current) return state;

  if (hoveredId) return actionHoverEntity(state, hoveredId);
  return actionClearHover(state);
}
```

### 10.4 DOMサイズ反映（ResizeObserver → actionUpdateNodeSize）

```ts
export function actionUpdateNodeSize(
  state: ERDiagramState,
  nodeId: string,
  width: number,
  height: number
): ERDiagramState {
  const n = state.nodes[nodeId];
  if (!n) return state;

  // 変化がなければ更新しない
  if (n.width === width && n.height === height) return state;

  return {
    ...state,
    nodes: {
      ...state.nodes,
      [nodeId]: { ...n, width, height },
    },
  };
}
```

### 10.5 Redux Toolkitで“イベント → 純粋Action呼び出し”にする例

```ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  actionMouseMove,
  actionHoverEntity,
  actionClearHover,
  actionUpdateNodeSize,
} from './actions';

const initialState: ERDiagramState = {
  nodes: {},
  edges: {},
  ui: {
    hover: null,
    highlightedNodeIds: new Set(),
    highlightedEdgeIds: new Set(),
    highlightedColumns: new Map(),
  },
};

export const erSlice = createSlice({
  name: 'er',
  initialState,
  reducers: {
    mouseMove(state, a: PayloadAction<{ x: number; y: number }>) {
      return actionMouseMove(state as unknown as ERDiagramState, a.payload);
    },
    hoverEntity(state, a: PayloadAction<{ entityId: string }>) {
      return actionHoverEntity(state as unknown as ERDiagramState, a.payload.entityId);
    },
    clearHover(state) {
      return actionClearHover(state as unknown as ERDiagramState);
    },
    updateNodeSize(state, a: PayloadAction<{ nodeId: string; w: number; h: number }>) {
      return actionUpdateNodeSize(state as unknown as ERDiagramState, a.payload.nodeId, a.payload.w, a.payload.h);
    },
  },
});

export const erActions = erSlice.actions;
```

### 10.6 React Flow統合（screen→flow座標変換してmousemoveをdispatch）

`screenToFlowPosition` は `ReactFlowInstance` のAPIとして提供されています([React Flow][4])

```tsx
import { ReactFlow, useReactFlow } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import { erActions } from './erSlice';

export function ERCanvas() {
  const dispatch = useDispatch();
  const rf = useReactFlow();

  const nodes = useSelector(selectReactFlowNodes);
  const edges = useSelector(selectReactFlowEdges);

  // rAFで間引く（1フレーム1回）
  const rafRef = useRef<number | null>(null);
  const lastClientRef = useRef<{x:number;y:number} | null>(null);

  const onMouseMove = (e: React.MouseEvent) => {
    lastClientRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current != null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = lastClientRef.current;
      if (!p) return;

      const flowPos = rf.screenToFlowPosition({ x: p.x, y: p.y });
      dispatch(erActions.mouseMove({ x: flowPos.x, y: flowPos.y }));
    });
  };

  return (
    <div style={{ width: '100%', height: '100%' }} onMouseMove={onMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        // ドラッグ等は onNodesChange / onNodeDragStop でVMへ同期（方針A or B）
      />
    </div>
  );
}
```

### 10.7 ResizeObserver（ノードコンポーネント側で計測→dispatch）

```tsx
function useResizeDispatch(nodeId: string) {
  const dispatch = useDispatch();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      dispatch(erActions.updateNodeSize({ nodeId, w: cr.width, h: cr.height }));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [nodeId, dispatch]);

  return ref;
}
```

### 10.8 Action単体テスト例（Vitest/Jest想定）

```ts
import { describe, it, expect } from 'vitest';
import { actionHoverEntity } from './actions';

describe('actionHoverEntity', () => {
  it('ホバーしたエンティティと隣接要素がハイライトされる', () => {
    const state = {
      nodes: {
        A: { id: 'A', name: 'A', x: 0, y: 0, width: 100, height: 50, columns: [], ddl: '' },
        B: { id: 'B', name: 'B', x: 200, y: 0, width: 100, height: 50, columns: [], ddl: '' },
      },
      edges: {
        E1: { id: 'E1', source: 'A', target: 'B', fromColumn: 'a', toColumn: 'b', constraintName: '', sourceHandle: '', targetHandle: '' },
      },
      ui: { hover: null, highlightedNodeIds: new Set(), highlightedEdgeIds: new Set(), highlightedColumns: new Map() },
    };

    const next = actionHoverEntity(state as any, 'A');

    expect(next.ui.hover).toEqual({ type: 'entity', id: 'A' });
    expect(next.ui.highlightedNodeIds.has('A')).toBe(true);
    expect(next.ui.highlightedNodeIds.has('B')).toBe(true);
    expect(next.ui.highlightedEdgeIds.has('E1')).toBe(true);
  });
});
```

[1]: https://reactflow.dev/api-reference/react-flow?utm_source=chatgpt.com "The ReactFlow component"
[2]: https://redux-toolkit.js.org/api/createreducer?utm_source=chatgpt.com "createReducer"
[3]: https://reactflow.dev/learn/advanced-use/state-management?utm_source=chatgpt.com "Using a State Management Library"
[4]: https://reactflow.dev/api-reference/types/react-flow-instance "ReactFlowInstance - React Flow"


------

状態管理のライブラリは使わないって選択はアリ？ シンプルにTypeScriptで実現する。

アリ。要件（単一状態ツリー / 純粋関数action / テスト容易性）だけなら、**ライブラリ無しでTypeScript + React（useSyncExternalStore か useReducer）**で実現できる。

### ライブラリ無しで成立する最小構成

* 状態：`ERDiagramState` を1つだけ持つ
* 更新：`action(state, ...args) => newState` の純粋関数だけで更新
* ブラウザ操作：UIイベントは `dispatch(actionFn, ...args)` に集約
* React反映：購読（subscribe）で再描画
* テスト：actionを直接呼んで入出力比較

### 実装パターン（おすすめ順）

#### 1) 自前Store + useSyncExternalStore（Fluxに一番近い）

* Reactに依存しない `store.ts` を作る
* `dispatch` は「現stateにaction適用して差し替える」だけ
* React側は `useSyncExternalStore(store.subscribe, store.getState)` で読む

```ts
// store.ts
export type ActionFn<A extends any[] = any[]> = (s: ERDiagramState, ...a: A) => ERDiagramState;

export function createStore(initial: ERDiagramState) {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (l: () => void) => (listeners.add(l), () => listeners.delete(l)),
    dispatch: <A extends any[]>(action: ActionFn<A>, ...args: A) => {
      const next = action(state, ...args);
      if (next === state) return; // 変化なしなら通知しない
      state = next;
      listeners.forEach((l) => l());
    },
  };
}
```

```tsx
// useERStore.ts
import { useSyncExternalStore } from 'react';
import { store } from './storeInstance';

export function useERState<T>(selector: (s: ERDiagramState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}

export const dispatch = store.dispatch;
```

この方式だと、actionは完全に純粋関数で固定できるし、テストもReact抜きでできる。

#### 2) useReducer（React内完結で簡単）

* `dispatch({type, payload})` に寄せるか、
* `dispatch((s)=>actionX(s,...))` のような関数dispatchに寄せる

ただし「store外の任意コンポーネントから状態参照」や「selector購読最適化」は自前Storeより弱い。

---

## ライブラリ無しで注意すべき点（破綻しやすい所）

1. **再レンダが大きくなりやすい**
   単一状態を雑に購読すると、mousemove等で全ツリーが描き直される。
   対策は最低限：

* actionが「変化がないなら同一参照を返す」
* `useERState(selector)` で必要部分だけ読む（selector分割）
* hover/ハイライトは `Set` 等の集合で持って差分更新を小さくする

2. **開発時の観測性（デバッグ）が落ちる**
   Redux DevTools相当がない。MVPなら割り切れるが、必要なら「dispatchログ」「直近N件のaction履歴」を自前で入れられる。

3. **非同期（API呼び出し）の置き場所**
   actionは純粋関数なので、APIは別層（command/handler）に置く：

* `async function cmdReverseEngineer(){ const res=...; dispatch(actionSetVM,res); }`

---

## 結論

* **ライブラリ無しは十分アリ**。特に「純粋関数action中心・テスト最大化」は実現しやすい。
* ただし **mousemove/drag** を入れるなら、最低限「変化時のみ更新」「selector購読」を入れないと体感が悪化しやすい。
* その前提なら、**自前Store + useSyncExternalStore** が一番きれいにFluxっぽく作れる。
