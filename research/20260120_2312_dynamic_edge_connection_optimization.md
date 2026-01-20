# React Flowでのリレーション線の動的な接続ポイント最適化

## 結論（MVPで現実的な選択肢）

1. **最短で効く**：**4方向ハンドル（Top/Right/Bottom/Left）を常設**し、`edge.sourceHandle / edge.targetHandle` を**ノード位置から都度再計算して更新**する。 ([React Flow][1])
2. **「自由な箇所から生える」を満たしやすい**：公式の **Floating Edges**（ノード外周上の交点を計算して接続）をベースに**カスタムエッジで接続点を完全制御**する。 ([React Flow][2])

---

## 1. 複数接続ポイント（ハンドル）の配置

### 4方向ハンドルは複数配置できるか

可能。`<Handle />` を複数置けます。 ([React Flow][1])

### 一意IDは必要か

**同じ type（source 同士 / target 同士）を複数置くなら必須**です。React Flow は `id` でハンドルを識別し、エッジ側は `sourceHandle` / `targetHandle` で参照します。 ([React Flow][1])

### 見た目の調整

* `style` / CSS で可能。複数ハンドルを同じ辺に並べたい場合も、`style` で位置をずらせます。 ([React Flow][1])
* 接続中は `connecting` / `valid` クラスが付くので状態別スタイルも可能。 ([React Flow][1])
* `display:none` は計算が壊れやすいので、隠すなら `visibility:hidden` / `opacity:0`。 ([React Flow][1])

### 複数ハンドルがあると自動で「最適」を選ぶか

**標準では「自動最適化」はしません**。
どのハンドルに繋ぐかは、(a) ユーザーが接続したハンドル、または (b) `edge.sourceHandle / targetHandle` をあなたが指定、で決まります。複数ハンドル運用の基本は「エッジ側で明示」です。 ([React Flow][1])
※「近い辺に吸い付く」系は **Simple Floating Edges** のように、例側がロジックでやっています。 ([React Flow][3])

---

## 2. 動的なハンドル選択（位置関係から最適化）

### 方式A（MVP向け）：相対位置で4方向を選ぶ（軽い）

**中心差分 `dx, dy` の優勢軸で決める**のが簡単です。

* `abs(dx) > abs(dy)` → 左右で接続（`dx>0` なら source=Right / target=Left）
* それ以外 → 上下で接続（`dy>0` なら source=Bottom / target=Top）

この方式だと「Aが上・Bが下なのに AのTop→BのBottom」みたいな不自然はだいぶ減ります。

### 方式B（見た目重視）：4×4候補の距離最小を選ぶ（まだ軽い）

source の4辺中点 × target の4辺中点（計16通り）を作り、**距離が最小の組を採用**。
列数が多いERでも計算は軽く、MVPでも十分回ります。

### `sourceHandle / targetHandle` の使い方

エッジ型に `sourceHandle` / `targetHandle` があり、ここにハンドル `id` を入れます。 ([React Flow][4])

#### Node側（8個：4方向× source/target）

（※import は現行の `reactflow`/`@xyflow/react` どちらでも同名で読み替え）

```tsx
import { Handle, Position } from 'reactflow';

const H = 8;

<Handle type="target" id="t-top"    position={Position.Top}    style={{ width: H, height: H }} />
<Handle type="target" id="t-right"  position={Position.Right}  style={{ width: H, height: H }} />
<Handle type="target" id="t-bottom" position={Position.Bottom} style={{ width: H, height: H }} />
<Handle type="target" id="t-left"   position={Position.Left}   style={{ width: H, height: H }} />

<Handle type="source" id="s-top"    position={Position.Top}    style={{ width: H, height: H }} />
<Handle type="source" id="s-right"  position={Position.Right}  style={{ width: H, height: H }} />
<Handle type="source" id="s-bottom" position={Position.Bottom} style={{ width: H, height: H }} />
<Handle type="source" id="s-left"   position={Position.Left}   style={{ width: H, height: H }} />
```

#### Edge側（計算結果を反映）

```ts
type Side = 'top' | 'right' | 'bottom' | 'left';

const opposite: Record<Side, Side> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

function pickSideByDelta(dx: number, dy: number): Side {
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

function computeHandles(sourceCenter: {x:number;y:number}, targetCenter: {x:number;y:number}) {
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const s = pickSideByDelta(dx, dy);
  const t = opposite[s];
  return { sourceHandle: `s-${s}`, targetHandle: `t-${t}` };
}
```

---

## 3. エンティティ移動時の動的更新

### MVPなら：`onNodeDragStop` で再計算（体感が安定）

ドラッグ中にハンドルがパカパカ切り替わるより、**ドロップ時に最適化**の方が見た目も実装も楽です。

### リアルタイムにしたいなら：`onNodesChange` を throttle

* 変更が `position` のときだけ
* 動かしたノードに接続するエッジだけ更新
* 16〜50ms 程度で throttle（`requestAnimationFrame` でもOK）

### 「全エッジ再計算」を避ける

React Flow には「指定ノード群に繋がるエッジ」を取るユーティリティもあります（接続エッジだけ更新に使える）。 ([React Flow][5])

### 重要：存在しない handle id を指すとエラー/非表示になり得る

複数ハンドル運用で `sourceHandle/targetHandle` が見つからないと問題が起きます。動的にハンドル数や位置を変えるなら node internals 更新も必要になります。 ([React Flow][6])

---

## 4. React Flow機能・API観点

### カスタムエッジとパス生成

* `getSmoothStepPath` / `getBezierPath` / `getStraightPath` などを使ってエッジを描けます（カスタムエッジガイドにまとまっています）。 ([React Flow][7])
* いまの `RelationshipEdge` は `getSmoothStepPath` なので、「どのハンドルを使うか」を直せば、パスはそのまま改善します。 ([React Flow][8])

### ハンドルの「動的配置」

* 位置は基本 Top/Right/Bottom/Left + `style` でオフセットが現実的です（辺の中央以外にずらす、同一辺に複数並べる等）。 ([React Flow][1])
* 「ノードの外周上の任意点」までやりたいなら、ハンドルを増やすより **Floating Edges** 方式（エッジ側で交点計算）が素直です。 ([React Flow][2])

### エッジのカスタムデータ

`edge.data` に `fromColumn/toColumn/constraintName` 等を持てます（更新ロジックで参照も可能）。 ([React Flow][4])

---

## 5. 実装例（MVPに寄せた構成）

### 実装ステップ（4方向ハンドル + 動的選択）

1. `EntityNode` に **8ハンドル（4方向×source/target）** を追加し、`id` を固定（`s-top` 等）。 ([React Flow][1])
2. `ERCanvas`（または edges 生成箇所）で、各 relationship edge に `sourceHandle/targetHandle` を計算して付与。 ([React Flow][4])
3. `onNodeDragStop` で「動かしたノードに繋がるエッジ」だけ再計算して `setEdges`。

---

## 6. 複雑さとトレードオフ（MVP目線）

### 4方向ハンドル方式

* **メリット**：実装が直線的、既存 `RelationshipEdge` をほぼ維持できる
* **デメリット**：「自由な箇所」までは行けない（4方向の選択まで）

### Floating Edges方式

* **メリット**：要求の「自由な箇所から生える」に一番近い。ノード移動に自然追従。 ([React Flow][2])
* **デメリット**：カスタムエッジ導入＋交点計算ユーティリティの移植が必要

---

## 7. 代替・段階的アプローチ

### 段階導入（おすすめ）

* **Step1**：4方向ハンドル + `sourceHandle/targetHandle` の動的更新（最小工数で改善） ([React Flow][1])
* **Step2**：まだ線が冗長なら **Simple Floating Edges → Floating Edges** に置き換え（外周任意点へ） ([React Flow][3])

### 将来的に交差や見た目まで詰めたい場合

ELK の "ports（=handles）" を使って「どの側に出すか」までレイアウトエンジンに寄せる例もあります（MVP後）。 ([React Flow][9])

[1]: https://reactflow.dev/learn/customization/handles "Handles - React Flow"
[2]: https://reactflow.dev/examples/edges/floating-edges "Floating Edges - React Flow"
[3]: https://reactflow.dev/examples/edges/simple-floating-edges "Simple Floating Edges - React Flow"
[4]: https://reactflow.dev/api-reference/types/edge "Edge - React Flow"
[5]: https://reactflow.dev/api-reference/utils?utm_source=chatgpt.com "Utils - React Flow"
[6]: https://reactflow.dev/learn/troubleshooting/common-errors?utm_source=chatgpt.com "Common Errors"
[7]: https://reactflow.dev/learn/customization/custom-edges?utm_source=chatgpt.com "Custom Edges - React Flow"
[8]: https://reactflow.dev/api-reference/utils/get-smooth-step-path?utm_source=chatgpt.com "getSmoothStepPath() - React Flow"
[9]: https://reactflow.dev/examples/layout/elkjs-multiple-handles?utm_source=chatgpt.com "Elkjs Multiple Handles"
