## 1. 根本原因の整理

### レイヤー問題（エッジがノードに隠れる）

React Flow は **ノード（HTML）** と **エッジ（SVG）** を別レイヤーとして描画します。結果として「個々のエッジだけをノードより前面に出す」を **`<g style={{ zIndex: ... }}` のような SVG 内の指定では実現できません**（SVG 内の前後は基本的に SVG 内の描画順で決まり、HTML レイヤーとは別の重なりになります）。

一方で React Flow 自体は「エッジをノードより上に描画する」ための仕組みとして **`edge.zIndex` / `defaultEdgeOptions.zIndex` をサポート**しており、公式ドキュメントでも **z-index を調整すればエッジをノードより上に出せる**と明記されています。([React Flow][1])

### 過去の透明化実装で重くなった理由（推測 → ほぼ確定に近い構造的理由）

削除された実装は「hover 中かどうか（`hasHover` / `hover !== null`）」を **全ノード・全エッジが購読**していたため、ホバー開始・終了のたびに **全要素が再レンダリング**しやすい構造でした（`null ↔ {type,id}` の変化が全購読者に波及）。
このタイプの負荷は、要素数 300 規模だと “一瞬で分かる” くらい効きます。

### いまの `zIndex` が効かない理由

あなたのコードは **SVG 内の `<g>` に zIndex を付けている**ため、React Flow が管理する「エッジ全体のスタッキング」には反映されません。
React Flow 側が解決策として用意しているのは **Edge オブジェクトの `zIndex`**（= React Flow が wrapper を分けたりしてスタッキングを調整する前提）です。([React Flow][1])

## 2. 透明化のパフォーマンス改善案（Option A/B/C の評価）

### Option A（各ノードが `hover !== null` を含む selector を購読）

* **実現可能性**: 可能
* **パフォーマンス**: あまり改善しません。`hover` の開始/終了で **非ハイライト側の大多数が boolean を変化させる**ので、結局ほぼ全ノードが再レンダリングしやすいです。
* **実装の複雑さ**: 低
* **推奨度**: 低

### Option B（DOM を直接操作して opacity / class を付け替え）

* **実現可能性**: 可能（React Flow v12 には nodes/edges に `domAttributes` を付ける escape hatch があります）([React Flow][2])
* **パフォーマンス**: 良い（React 再レンダリングを避けられる）。ただし hover のたびに DOM を列挙して class 付け替えをするので、実装次第。
* **実装の複雑さ**: 中（ref 管理、要素探索、破棄タイミング、将来の DOM 変更耐性）
* **推奨度**: 中（Option C が成立しない時の次点）

### Option C（ルートにクラス付与 + CSS で一括制御）

* **実現可能性**: 高（React Flow は外側に class を付けられる＆ノード/エッジに class 付与ができる）
* **パフォーマンス**: 高（**ホバー開始/終了は “ルート 1 箇所” の更新**、あとは CSS が描画に反映）
* **実装の複雑さ**: 低〜中（CSS 設計だけ注意）
* **推奨度**: 高（最優先）

#### Option C の具体ステップ（重要）

1. **ERCanvas（ReactFlow の外側）だけが `hover !== null` を購読**して、ルートにクラスを付ける
2. ノード・エッジ側は **「自分がハイライトかどうか」だけ**購読し、`is-highlighted` クラス（or data 属性）を付ける
3. CSS は `has-hover` × `:not(.is-highlighted)` で dim をかける

（例：概念コード）

```tsx
// ERCanvas.tsx
const hasHover = useViewModel(vm => vm.erDiagram.ui.hover !== null, (a,b)=>a===b);

return (
  <div className={clsx("er-canvas", hasHover && "has-hover")}>
    <ReactFlow ... />
  </div>
);
```

```tsx
// EntityNode.tsx（既存の isHighlighted 購読は維持）
return (
  <div className={clsx("entity-node", isHighlighted && "is-highlighted")}>
    ...
  </div>
);
```

```tsx
// RelationshipEdge.tsx
return (
  <g className={clsx("rel-edge", isHighlighted && "is-highlighted")}>
    <path ... />
  </g>
);
```

```css
/* hover中だけ、非ハイライトを薄くする */
.er-canvas.has-hover .entity-node:not(.is-highlighted) { opacity: .2; }
.er-canvas.has-hover .rel-edge:not(.is-highlighted) path { opacity: .2; }
```

> これだと hover の開始/終了で “全ノード再レンダリング” は起きません。起きるのはルートの class 切り替えと、ハイライト対象（少数）の class 切り替えだけです。

## 3. z-index 制御強化（最短で効く順）

### 3.1 **React Flow の正攻法：`edge.zIndex`（or `defaultEdgeOptions.zIndex`）を使う**

公式に「エッジはデフォルトではノードの下だが、`zIndex` でノードより上にもできる」と書かれています。([React Flow][1])
さらにメンテナの説明として「`edge.zIndex` を使うと別 wrapper で描画されて z-index 調整できる」旨もあります。([GitHub][3])

**ポイント**

* **ハイライト時だけ**対象エッジの `edge.zIndex` を大きくする（例：通常 0、ハイライト 100）
* React Flow の自動 z-index 調整とぶつかるのが嫌なら `zIndexMode="manual"` を指定する（manual は自動調整なし）([React Flow][4])

（例：ERCanvas で React Flow に渡す edges を組み立てる箇所）

```ts
const highlightedEdgeSet = useMemo(() => new Set(highlightedEdgeIds), [highlightedEdgeIds]);

const rfEdges = useMemo(
  () =>
    edgesVm.map(e => ({
      id: e.id,
      source: e.sourceEntityId,
      target: e.targetEntityId,
      type: "relationship",
      zIndex: highlightedEdgeSet.has(e.id) ? 100 : 0,
      // className/domAttributes は任意（Option C の CSS と相性が良い）
    })),
  [edgesVm, highlightedEdgeSet]
);
```

**パフォーマンス見込み**

* 更新対象が少数なら十分軽いです。
* React Flow 12 は z-index 変更でエッジが mount/unmount しない旨がリリース情報にもあります（= 変化が比較的軽くなる設計意図）。([xyflow][5])

### 3.2 “全エッジを前面” にする（妥協案だが実用度は高い）

`defaultEdgeOptions = { zIndex: 1 }` を使えば **全部のエッジをノードより上**にできます。([React Flow][1])
これ単体だと見た目がうるさくなりがちですが、**Option C の dim と組み合わせる**と「前面にいるのはほぼハイライト線だけ」になりやすく、MVP 的にはかなり強いです。

### 3.3 SVG の DOM 順序を変える

これは **エッジ同士の重なり**には効きますが、**ノードに隠れる問題そのものは解決しません**（ノードレイヤーが上にいる限り）。
なので優先度は低いです。

## 4. ViewportPortal / EdgeLabelRenderer を使う案（“確実に上に描く”）

### 4.1 ViewportPortal で “ハイライト専用オーバーレイ” を描く

`<ViewportPortal />` は「ノード/エッジと同じ座標系」「ズーム・パンの影響を受ける」要素を追加するためのコンポーネントです。([React Flow][6])
ここに **ハイライト中のエッジだけ**を “別描画” すれば、ノードに隠れる問題を確実に潰せます。

* **メリット**: 表示の確実性が高い／対象が少ないので負荷も読みやすい
* **デメリット**: 実装が一段複雑（オーバーレイ用の描画管理、pointer-events 調整、既存エッジと二重表示制御）

### 4.2 EdgeLabelRenderer パターン（portal の前例）

`<EdgeLabelRenderer />` は「SVG のエッジ上に div ベースの描画を portal で載せる」ための仕組みとして公式に案内されています。([React Flow][7])
あなたの用途は “ラベル” ではなく “線” なのでそのままではないですが、「portal で別レイヤーに描く」発想の根拠になります。

## 5. 透明化/z-index 以外の視覚的解決策（効果と負荷）

### 背景だけ半透明（opacity ではなく background-color）

ノード全体を `opacity` で薄くすると文字まで薄くなりますが、**背景だけ RGBA にする**と「エッジが透けて見える」効果を作れます。
Option C と同様に **CSS 一括**ででき、GPU 的にも blur/filter よりは扱いやすいことが多いです。

例（hover 中かつ非ハイライトだけ背景を薄く）

```css
.er-canvas.has-hover .entity-node:not(.is-highlighted) {
  background: rgba(255,255,255,.75);
}
```

### drop-shadow / blur / 点滅

* **drop-shadow**: “隠れている線” はそもそも描画されていないので、根本解決になりません（見えている区間を強調するだけ）。さらに filter はコストが上がりやすいです。
* **blur**: 視覚効果は出ますが filter は重くなりがちで、MVP のホバー用途には優先度低め。

### ポップオーバー/ツールチップ

線が完全に隠れても情報は伝えられますが、「線を見たい」要求の代替に留まります（補助策としては有効）。

### 配置最適化（根本軽減）

エッジがノードを貫通しない配置・ルーティング（障害物回避）に寄せれば、問題頻度は下がります。ただし実装コストが上がるので、MVP では後回しが妥当です。

## 6. 推奨する解決策と実装計画（優先度順）

### フェーズ1（最速・低リスクで効く）

1. **`edge.zIndex` を使ってハイライトエッジを前面化**（いまの `<g style={{zIndex}}>` をやめる）([React Flow][1])
2. `zIndexMode="manual"` を設定して、自動 z-index 調整と干渉しないようにする([React Flow][4])
3. **Option C（ルート class + CSS で dim）**を入れる（hover 状態を購読するのは ERCanvas だけ）

期待効果：

* ハイライト線がノードに隠れにくく（または消えなく）なる
* hover 開始/終了で全要素再レンダリングが復活しない

### フェーズ2（フェーズ1で不足が出た場合のみ）

* **ViewportPortal で “ハイライト線のオーバーレイ”**（描画を二重化して確実に上へ）([React Flow][6])
* 併せて EdgeLabelRenderer の portal パターンを参考に、pointer-events の扱いを整理([React Flow][7])

### フェーズ3（将来的）

* ルーティング/配置最適化で「そもそも貫通が起きにくい」状態へ（障害物回避の直交配線など）

## 7. 他の React Flow 事例（“同じ方向性” の根拠）

* 公式ドキュメントが **`zIndex` でエッジをノードより上にできる**と明記([React Flow][1])
* メンテナ回答として **`edge.zIndex` は wrapper が分かれて z-index 調整できる**旨の説明([GitHub][3])
* 公式が portal 系として **ViewportPortal** を提供([React Flow][6])、同じく **EdgeLabelRenderer** で “SVG の外側に描画を載せる” 前例を提示([React Flow][7])
* 公式 Example の一部は className を付け替えて視覚ハイライトを行う（ただし例は全ノード map 更新なので、そのまま真似ると規模次第で重くなり得る）([React Flow][8])

[1]: https://reactflow.dev/learn/layouting/sub-flows "Sub Flows - React Flow"
[2]: https://reactflow.dev/whats-new/2025-06-11?utm_source=chatgpt.com "React Flow 12.7.0"
[3]: https://github.com/xyflow/xyflow/discussions/4285?utm_source=chatgpt.com "Nodes and Edges Zindex Setting #4285"
[4]: https://reactflow.dev/api-reference/react-flow "The ReactFlow component - React Flow"
[5]: https://xyflow.com/blog/react-flow-12-release?utm_source=chatgpt.com "React Flow 12 release"
[6]: https://reactflow.dev/api-reference/components/viewport-portal "The ViewportPortal component - React Flow"
[7]: https://reactflow.dev/api-reference/components/edge-label-renderer "The EdgeLabelRenderer component - React Flow"
[8]: https://reactflow.dev/examples/nodes/intersections "Intersections - React Flow"
