[![Custom Edges - React Flow](https://tse2.mm.bing.net/th/id/OIP.0sWECUU2MKyuxhs8-tdPiAHaGO?pid=Api)](https://reactflow.dev/learn/customization/custom-edges?utm_source=chatgpt.com)

## 1. 自己参照リレーションのUI表現パターン（推奨案）

### よく使われる表現

* **外周ループ（片側にC字/U字/矩形で“外を回って戻る”）**
  UMLの自己関連（self-association）は「ループとして描く」前提の説明が一般的で、階層（同種同士の親子）を直感的に伝える用途で使われます。([softwareideas.net][1])
  ER（概念）でも“同一エンティティが関係に複数回参加する”＝再帰関係として扱い、**役割（role）を付けて区別**する説明がよく出ます（supervisor / supervised など）。([pressbooks.pub][2])
* **（Chen記法寄り）関係（ダイヤ）を介して同じエンティティに2本つなぐ＋役割名**
  関係を明示する記法では、同じ箱に2本戻すこと自体は自然です（ただし画面占有が増えがち）。([red-gate.com][3])
* **補助記号（↺ / “self” バッジ）で“自己参照”を即時認知させる**
  ループ形状だけでも伝わりますが、ER図編集UIでは混雑時に埋もれるので、**線種/記号で別カテゴリ**にすると視認性が上がります（後述の実装で低コストに実現可）。

### あなたのER Diagram Viewer向け推奨（MVP優先）

**「外周ループ」＋（必要なら）最小限の役割ヒント**が一番噛み合います。

* **自己参照だと一目で分かる**（線が“同一ノード内を縦断”しない）
* **他ノード間エッジと見た目で分離**（外側に出る／線種を変える）
* **ノード配置やサイズを変えずに導入できる**
* **既存のホバー連動と相性が良い**（エッジ＝自己参照の“まとまり”として強調しやすい）
* **複数自己参照も「外側オフセット」で並べられる**

役割ヒントは、常時表示すると散らかりやすいので、MVPなら

* **ホバー時のみ “sourceColumnId → targetColumnId” を小さく出す**（または ↺ のみ）
  が無難です（EdgeLabelRendererで実装が軽い）。([React Flow][4])

---

## 2. React Flow v12での実現方法（検出〜Custom Edgeまで）

React Flow公式に **Self Connecting Edge（自己接続エッジ）** の例があり、`BaseEdge` を使って独自パスを描く流れがそのまま使えます。([React Flow][5])

### 2.1 自己参照エッジの検出（ViewModel→Edge変換）

```ts
type RelationshipEdgeData = {
  sourceColumnId: string;
  targetColumnId: string;
  constraintName: string;

  // 自己参照用
  self?: {
    index: number; // 0..count-1
    count: number; // 同一エンティティ内の自己参照本数
    side?: 'right' | 'left'; // 任意: 多い場合に左右に振る
  };

  // 既存のホバー/選択統合用（必要なら）
  isHighlighted?: boolean;
};

function buildEdges(viewModels: RelationshipEdgeViewModel[]) {
  // 自己参照をエンティティ単位で束ねて index/count を付ける
  const selfGroups = new Map<string, RelationshipEdgeViewModel[]>();
  for (const e of viewModels) {
    if (e.sourceEntityId === e.targetEntityId) {
      const key = e.sourceEntityId;
      const arr = selfGroups.get(key) ?? [];
      arr.push(e);
      selfGroups.set(key, arr);
    }
  }

  // 安定した順序（例: constraintName→columnId）で index を固定
  const selfMeta = new Map<string, { index: number; count: number; side: 'right' | 'left' }>();
  for (const [entityId, arr] of selfGroups) {
    const sorted = [...arr].sort((a, b) =>
      (a.constraintName ?? '').localeCompare(b.constraintName ?? '') ||
      a.sourceColumnId.localeCompare(b.sourceColumnId) ||
      a.targetColumnId.localeCompare(b.targetColumnId) ||
      a.id.localeCompare(b.id)
    );

    const count = sorted.length;
    sorted.forEach((e, index) => {
      // MVP: 右側固定。多い場合だけ左右に振りたいならここで決める
      const side: 'right' | 'left' = 'right';
      selfMeta.set(e.id, { index, count, side });
    });
  }

  return viewModels.map((e) => {
    const isSelf = e.sourceEntityId === e.targetEntityId;
    const meta = isSelf ? selfMeta.get(e.id) : undefined;

    return {
      id: e.id,
      type: isSelf ? 'selfRelationshipEdge' : 'relationshipEdge',
      source: e.sourceEntityId,
      target: e.targetEntityId,

      // 自己参照は“同一ノード内の別ハンドル同士”を明示して座標を分ける（後述）
      ...(isSelf
        ? {
            sourceHandle: 'self-out',
            targetHandle: 'self-in',
          }
        : {}),

      data: {
        sourceColumnId: e.sourceColumnId,
        targetColumnId: e.targetColumnId,
        constraintName: e.constraintName,
        ...(isSelf && meta
          ? { self: { index: meta.index, count: meta.count, side: meta.side } }
          : {}),
      } satisfies RelationshipEdgeData,
    };
  });
}
```

### 2.2 ハンドル配置（同一ノード内で“出る点/戻る点”を分ける）

複数ハンドルは `id` を付ければOKで、公式も「同種ハンドルが複数ならID必須」としています。([React Flow][6])

Entityノードに、自己参照専用の2つのハンドルを追加（例: 右側の上寄り/下寄り）:

```tsx
import { Handle, Position } from '@xyflow/react';

export function EntityNode(/* NodeProps... */) {
  return (
    <div className="entity-node">
      {/* 既存: Top/Right/Bottom/Left のハンドル群 */}

      {/* 追加: 自己参照用（表示を隠すなら opacity/visibility 推奨） */}
      <Handle
        id="self-out"
        type="source"
        position={Position.Right}
        style={{ top: '35%', opacity: 0 }}
        isConnectable={false} // MVPで手動接続しないなら false
      />
      <Handle
        id="self-in"
        type="target"
        position={Position.Right}
        style={{ top: '65%', opacity: 0 }}
        isConnectable={false}
      />
    </div>
  );
}
```

* ハンドルを動的に増減/移動する設計にする場合は `useUpdateNodeInternals()` が必要です。([React Flow][7])
* `display: none` で隠すのは避ける（公式トラブルシュートで注意）。([React Flow][8])

### 2.3 SelfLoop用 Custom Edge（SVGパス生成）

公式ガイドは `BaseEdge`＋パス計算（`getBezierPath`等）という形なので、自己参照だけ独自パスにします。([React Flow][9])

#### ループ型（右側C字/U字）の最小実装

* 2つのハンドルで `sourceY != targetY` が作れる前提
* `index` に応じて外側オフセットを増やし、複数自己参照を並べる

```tsx
import type { EdgeProps } from '@xyflow/react';
import { BaseEdge, EdgeLabelRenderer } from '@xyflow/react';

type Data = {
  sourceColumnId: string;
  targetColumnId: string;
  constraintName: string;
  self?: { index: number; count: number; side?: 'right' | 'left' };
  isHighlighted?: boolean;
};

export function SelfRelationshipEdge(props: EdgeProps<{ data: Data }['data']>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    markerEnd,
    selected,
    style,
    data,
  } = props;

  const self = data?.self ?? { index: 0, count: 1, side: 'right' as const };

  // 外側への張り出し量（本数に応じて増やす）
  const baseOut = 36;
  const stepOut = 14;
  const out = baseOut + self.index * stepOut;

  // ループの上下の“開き”（本数が多いときに少しずらす）
  const dy = (self.index - (self.count - 1) / 2) * 6;

  const sx = sourceX;
  const sy = sourceY + dy;
  const tx = targetX;
  const ty = targetY + dy;

  const isLeft = self.side === 'left';
  const outX = (isLeft ? Math.min(sx, tx) - out : Math.max(sx, tx) + out);

  // C字/U字っぽい cubic-bezier（外側へ出て戻る）
  const edgePath = `M ${sx} ${sy}
    C ${outX} ${sy},
      ${outX} ${ty},
      ${tx} ${ty}`;

  const active = !!data?.isHighlighted || selected;
  const mergedStyle = {
    ...style,
    strokeWidth: active ? 2.5 : 1.2,
    // 自己参照を区別したいなら破線など（任意）
    // strokeDasharray: '4 3',
  };

  // ラベル（MVPならホバー時だけ↺を出す、など）
  const labelX = outX;
  const labelY = (sy + ty) / 2;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={mergedStyle} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'none',
            fontSize: 10,
            opacity: active ? 1 : 0.6,
          }}
        >
          ↺
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
```

* `EdgeLabelRenderer` は「SVG外にdivでラベルを出す」ための公式コンポーネントです。([React Flow][4])
* `BaseEdge` は不可視の当たり判定パス等も面倒を見てくれます。([React Flow][10])

### 2.4 矢印（MarkerEnd）の扱い

* `BaseEdge` に `markerEnd` を渡せます（公式説明）。([React Flow][11])
* 既存エッジと同じ `markerEnd`（例: `MarkerType.ArrowClosed`）を使えば、ループの終点接線方向に矢印が乗ります。

---

## 3. ホバーインタラクションとの統合（仕様案＋実装要点）

### 3.1 仕様（自己参照エッジ）

* **自己参照エッジにホバー**

  * そのエッジを強調
  * 接続先/接続元のエンティティは同一なので **ノード強調は1回だけ**
  * `sourceColumnId` と `targetColumnId` は別カラムになり得るので **両方のカラムを強調**（同一なら1回）
* **カラムにホバー**

  * そのカラムが関与する自己参照エッジを強調
  * 反対側カラム（同一テーブル内）も強調

実装は「ハイライト対象を Set で重複排除」するだけで整合します。

### 3.2 z-index（見やすさのための前面化）

* 選択時の前面化は `elevateEdgesOnSelect` が公式プロップとしてあります。([React Flow][12])
* 個別に前後関係を制御するなら `edge.zIndex` / `defaultEdgeOptions.zIndex` が公式にあり、サブフロー説明でも zIndex を触れます。([React Flow][13])
* “ホバーで前面化”は選択とは別なので、**hover中だけ当該エッジの `zIndex` を上げる**（edges配列更新）か、`zIndexMode` を使って運用します。([React Flow][12])
* `interactionWidth` を広げるとループが掴みやすいです（DefaultEdgeOptions）。([React Flow][13])

---

## 4. 複数の自己参照リレーション（重なり回避）

### 4.1 オフセット戦略（MVP向けに単純で強い）

* **同一エンティティ内の自己参照をグルーピング**
* `index/count` を持たせる
* パスの外側張り出し `out = base + index * step` で平行ループ化
* さらに `dy` を少しずらす（上の実装）と、同一点付近での重なりも減る

### 4.2 多すぎる場合（任意）

* 例えば `index` が一定数を超えたら `side = left/right` を交互にして左右に逃がす
  （上の実装は `side` を見て `outX` を左右に振れる）

---

## 5. 段階的アプローチ（推奨順序）

### フェーズ1（最短で“見やすい自己参照”を出す）

1. `sourceEntityId === targetEntityId` を検出
2. `type: 'selfRelationshipEdge'` に振り分け
3. ノードに `self-out/self-in` ハンドル追加（右側に固定）
4. SelfRelationshipEdge を `BaseEdge` で描画（外周ループ）

（React Flow公式の Self Connecting Edge 例の流れを踏襲できます。([React Flow][5])）

### フェーズ2（視覚改善）

* `index/count` を付けて複数ループをオフセット
* ホバー時だけ ↺ や（必要なら）小さなラベルを表示（EdgeLabelRenderer）([React Flow][4])
* `interactionWidth` 調整、hover時 zIndex 上げ([React Flow][13])

### フェーズ3（複雑ケース）

* ループの左右振り分け（周辺ノード密度で決める等）
* 将来的な障害物回避ルーティング（別枠）：自己参照は専用ループのほうが分かりやすいので、一般ルータと分離しても運用しやすい

---

## 6. 参考実装・他ライブラリの知見（応用ポイント）

### React Flow（公式）

* **Custom Edges 例**に Self Connecting Edge が含まれています（`BaseEdge` 利用）。([React Flow][5])
* **Edge Markers**：`BaseEdge` に `markerStart/markerEnd` を渡す説明。([React Flow][11])
* **Handle**：複数ハンドルや `id` の概念、動的変更時の `useUpdateNodeInternals()`。([React Flow][6])
* **z-index**：`elevateEdgesOnSelect`、`defaultEdgeOptions.zIndex`、`zIndexMode`。([React Flow][12])

### 他ダイアグラムライブラリ（“自己ループは専用パラメータを持つ”が多い）

* Cytoscape.js は self-loop（source=target）を“loop edge”として扱い、ループ方向/開きなどのスタイル概念があります。([GitHub][14])
* JointJS はリンクが loop かどうか（source==target）を判定するAPIがあり、ループを前提にしています。([docs.jointjs.com][15])
* D3系は「自己リンクは“同一点開始終了の弧は描きにくいので、開始終点を少しずらしてarc pathにする」という実装知見が共有されています（React Flow側でも `dy` を付ける発想に近い）。([stackoverflow.com][16])

---

[1]: https://www.softwareideas.net/uml-self-association?utm_source=chatgpt.com "Self-Association in UML Diagrams"
[2]: https://pressbooks.pub/bcis1305/chapter/entity-relationship-modeling/?utm_source=chatgpt.com "Entity Relationship Modeling – Business Computer ..."
[3]: https://www.red-gate.com/blog/chen-erd-notation?utm_source=chatgpt.com "Chen Notation"
[4]: https://reactflow.dev/api-reference/components/edge-label-renderer?utm_source=chatgpt.com "The EdgeLabelRenderer component"
[5]: https://reactflow.dev/examples/edges/custom-edges "Custom Edges - React Flow"
[6]: https://reactflow.dev/api-reference/components/handle?utm_source=chatgpt.com "The Handle component"
[7]: https://reactflow.dev/api-reference/hooks/use-update-node-internals?utm_source=chatgpt.com "useUpdateNodeInternals()"
[8]: https://reactflow.dev/learn/troubleshooting/common-errors?utm_source=chatgpt.com "Common Errors"
[9]: https://reactflow.dev/learn/customization/custom-edges "Custom Edges - React Flow"
[10]: https://reactflow.dev/api-reference/components/base-edge?utm_source=chatgpt.com "The BaseEdge component"
[11]: https://reactflow.dev/examples/edges/markers "Edge Markers - React Flow"
[12]: https://reactflow.dev/api-reference/react-flow "The ReactFlow component - React Flow"
[13]: https://reactflow.dev/api-reference/types/default-edge-options "DefaultEdgeOptions - React Flow"
[14]: https://github.com/cytoscape/cytoscape.js/issues/2687?utm_source=chatgpt.com "Self loop edges of shaped node · Issue #2687 · cytoscape ..."
[15]: https://docs.jointjs.com/api/dia/Link/?utm_source=chatgpt.com "Link (v4.2)"
[16]: https://stackoverflow.com/questions/16358905/d3-force-layout-graph-self-linking-node?utm_source=chatgpt.com "D3 Force Layout Graph - Self linking node"
