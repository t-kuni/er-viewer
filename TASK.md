# タスク一覧

## 概要

仕様書 `spec/frontend_er_rendering.md` に基づき、リレーション線の動的な接続ポイント最適化機能を実装する。
リサーチ結果 `research/20260120_2312_dynamic_edge_connection_optimization.md` に記載されたMVP向けアプローチ（4方向ハンドル + 動的選択）を採用する。

## 仕様変更の内容

**変更前**:
- ノードのポート（上下左右のいずれか）から接続
- ポート位置はカラム位置に基づいて決定

**変更後**:
- 各エンティティノードに4方向（Top/Right/Bottom/Left）のハンドルを配置
- エンティティ間の位置関係に応じて最適なハンドルを自動選択
- ノード移動時（ドラッグ完了時）に接続ポイントを動的に再計算

参照: `spec/frontend_er_rendering.md` 84-87行目、`research/20260120_2312_dynamic_edge_connection_optimization.md`

---

## 実装タスク

### タスク1: EntityNodeに8個のハンドルを追加

**対象ファイル**: `public/src/components/EntityNode.tsx`

**変更内容**:
- 現在は `Handle` が2個（`type="target" position={Position.Top}` と `type="source" position={Position.Bottom}`）のみ
- 4方向×source/target の計8個のハンドルを配置する
- 各ハンドルに一意なIDを付与する（`id="s-top"`, `id="s-right"`, `id="s-bottom"`, `id="s-left"`, `id="t-top"`, `id="t-right"`, `id="t-bottom"`, `id="t-left"`）
- ハンドルのスタイルを調整し、視覚的に目立たないようにする（`opacity: 0` または小さいサイズ）

**参考実装**:
リサーチレポートのセクション「2. 動的なハンドル選択（位置関係から最適化）」の「Node側（8個：4方向× source/target）」を参照。

```tsx
<Handle type="target" id="t-top"    position={Position.Top}    style={{ width: 8, height: 8, opacity: 0 }} />
<Handle type="target" id="t-right"  position={Position.Right}  style={{ width: 8, height: 8, opacity: 0 }} />
<Handle type="target" id="t-bottom" position={Position.Bottom} style={{ width: 8, height: 8, opacity: 0 }} />
<Handle type="target" id="t-left"   position={Position.Left}   style={{ width: 8, height: 8, opacity: 0 }} />

<Handle type="source" id="s-top"    position={Position.Top}    style={{ width: 8, height: 8, opacity: 0 }} />
<Handle type="source" id="s-right"  position={Position.Right}  style={{ width: 8, height: 8, opacity: 0 }} />
<Handle type="source" id="s-bottom" position={Position.Bottom} style={{ width: 8, height: 8, opacity: 0 }} />
<Handle type="source" id="s-left"   position={Position.Left}   style={{ width: 8, height: 8, opacity: 0 }} />
```

---

### タスク2: ハンドル選択ロジックを実装

**対象ファイル**: `public/src/utils/reactFlowConverter.ts` （新規関数を追加）

**変更内容**:
- 2つのノード位置から最適なハンドルペア（sourceHandle/targetHandle）を計算する関数を追加
- リサーチレポートの「方式A（MVP向け）：相対位置で4方向を選ぶ（軽い）」を採用
- 中心差分 `dx, dy` の優勢軸で決定するアルゴリズムを実装

**追加する関数インタフェース**:

```typescript
type Side = 'top' | 'right' | 'bottom' | 'left';

/**
 * 2つのノードの中心座標から、最適なハンドルペアを計算する
 * @param sourceCenter sourceノードの中心座標 {x, y}
 * @param targetCenter targetノードの中心座標 {x, y}
 * @returns sourceHandleとtargetHandleのID { sourceHandle: string, targetHandle: string }
 */
export function computeOptimalHandles(
  sourceCenter: { x: number; y: number },
  targetCenter: { x: number; y: number }
): { sourceHandle: string; targetHandle: string }
```

**実装ロジック**:
- `dx = targetCenter.x - sourceCenter.x`
- `dy = targetCenter.y - sourceCenter.y`
- `Math.abs(dx) > Math.abs(dy)` の場合、左右方向を選択
  - `dx >= 0` なら `sourceHandle = 's-right'`, `targetHandle = 't-left'`
  - `dx < 0` なら `sourceHandle = 's-left'`, `targetHandle = 't-right'`
- それ以外の場合、上下方向を選択
  - `dy >= 0` なら `sourceHandle = 's-bottom'`, `targetHandle = 't-top'`
  - `dy < 0` なら `sourceHandle = 's-top'`, `targetHandle = 't-bottom'`

**参考実装**:
リサーチレポートのセクション「2. 動的なハンドル選択（位置関係から最適化）」の「Edge側（計算結果を反映）」を参照。

---

### タスク3: convertToReactFlowEdges関数を修正してsourceHandle/targetHandleを設定

**対象ファイル**: `public/src/utils/reactFlowConverter.ts`

**変更内容**:
- `convertToReactFlowEdges` 関数の引数に `nodes` （EntityNodeViewModelのRecord）を追加
- 各エッジの変換時に、sourceノードとtargetノードの座標を取得
- タスク2で実装した `computeOptimalHandles` 関数を使用してハンドルを計算
- 計算したハンドルIDを `sourceHandle` と `targetHandle` プロパティに設定

**修正後の関数シグネチャ**:

```typescript
export function convertToReactFlowEdges(
  edges: { [key: string]: RelationshipEdgeViewModel },
  nodes: { [key: string]: EntityNodeViewModel }
): Edge[]
```

**実装のポイント**:
- ノードの中心座標は `EntityNodeViewModel` の `x`, `y` を基準に計算
- 初回レンダリング時は `measured` プロパティが未定義のため、デフォルトサイズ（width: 200, height: 100）を使用
- 中心座標の計算: `centerX = node.x + 100`, `centerY = node.y + 50`（デフォルトサイズの半分）
- ドラッグ完了時（タスク5）は `measured` プロパティから実際のサイズを取得して再計算

---

### タスク4: ERCanvas.tsxでconvertToReactFlowEdgesの呼び出しを修正

**対象ファイル**: `public/src/components/ERCanvas.tsx`

**変更内容**:
- `convertToReactFlowEdges` の呼び出しに `vm.nodes` を追加で渡す
- 62-63行目の以下のコードを修正:

```typescript
// 修正前
const newEdges = convertToReactFlowEdges(vm.edges)

// 修正後
const newEdges = convertToReactFlowEdges(vm.edges, vm.nodes)
```

---

### タスク5: ノードドラッグ完了時のハンドル再計算処理を実装

**対象ファイル**: `public/src/components/ERCanvas.tsx`

**変更内容**:
- `onNodeDragStop` ハンドラーを追加
- ドラッグ完了したノードに接続されているエッジを抽出
- それらのエッジの `sourceHandle` と `targetHandle` を再計算
- `setEdges` で更新

**実装のポイント**:
- React Flowの `useReactFlow` フックを使用して `getNodes()` でノード情報を取得
- ドラッグされたノードのIDから、そのノードに接続されているエッジを `edges.filter()` で抽出（`source === nodeId` または `target === nodeId`）
- 抽出したエッジそれぞれに対して `computeOptimalHandles` を再計算
- エッジの更新には `edges.map()` を使用し、対象エッジのみ `sourceHandle/targetHandle` を更新
- ノードの中心座標は `measured` プロパティから実際のサイズを取得して計算

**実装例の骨格**:

```typescript
import { useReactFlow, OnNodeDragStop } from 'reactflow'

const { getNodes } = useReactFlow()

const onNodeDragStop: OnNodeDragStop = useCallback(
  (event, node) => {
    // ドラッグされたノードに接続されているエッジを抽出
    const connectedEdges = edges.filter(
      (edge) => edge.source === node.id || edge.target === node.id
    )

    if (connectedEdges.length === 0) return

    // 全ノードの現在位置とサイズを取得
    const currentNodes = getNodes()

    // 接続エッジのハンドルを再計算
    const updatedEdges = edges.map((edge) => {
      if (!connectedEdges.find((e) => e.id === edge.id)) {
        return edge // 変更不要
      }

      const sourceNode = currentNodes.find((n) => n.id === edge.source)
      const targetNode = currentNodes.find((n) => n.id === edge.target)

      if (!sourceNode || !targetNode) return edge

      // ノードの中心座標を計算（measured プロパティから実際のサイズを取得）
      const sourceWidth = sourceNode.measured?.width ?? 200
      const sourceHeight = sourceNode.measured?.height ?? 100
      const targetWidth = targetNode.measured?.width ?? 200
      const targetHeight = targetNode.measured?.height ?? 100
      
      const sourceCenter = { 
        x: sourceNode.position.x + sourceWidth / 2, 
        y: sourceNode.position.y + sourceHeight / 2 
      }
      const targetCenter = { 
        x: targetNode.position.x + targetWidth / 2, 
        y: targetNode.position.y + targetHeight / 2 
      }

      const { sourceHandle, targetHandle } = computeOptimalHandles(sourceCenter, targetCenter)

      return {
        ...edge,
        sourceHandle,
        targetHandle,
      }
    })

    setEdges(updatedEdges)
  },
  [edges, getNodes]
)

// ReactFlowコンポーネントに追加
<ReactFlow
  // ...
  onNodeDragStop={onNodeDragStop}
/>
```

---

### タスク6: TypeSpecのRelationshipEdgeViewModelにsourceHandle/targetHandleを追加（任意）

**対象ファイル**: `scheme/main.tsp`

**変更内容**:
- `RelationshipEdgeViewModel` に `sourceHandle` と `targetHandle` プロパティを追加
- これらは任意（optional）プロパティとする
- TypeSpec生成後、型定義が正しく反映されることを確認

**修正内容**:

```typescript
// Relationship edge view model (used by React Flow Edge)
model RelationshipEdgeViewModel {
  id: string;
  source: string; // entity id
  target: string; // entity id
  fromColumn: string;
  toColumn: string;
  constraintName: string;
  sourceHandle?: string; // optional: handle ID for source node
  targetHandle?: string; // optional: handle ID for target node
}
```

**備考**:
- この変更は、将来的にバックエンドでハンドル情報を保存する場合に備えたもの
- MVPフェーズではフロントエンドで動的に計算するため、必須ではない
- 型定義を明確にしておくことで、React FlowのEdge型との互換性が向上

---

## テスト・確認タスク

### タスク7: コード生成とビルドの確認

**実行コマンド**:
```bash
npm run generate
cd public && npm run build
```

**確認内容**:
- TypeSpec定義の変更が正しく `lib/generated/api-types.ts` に反映されているか
- ビルドエラーが発生しないか


---

## 指示者宛ての懸念事項（作業対象外）

なし

---

## 事前修正提案

なし（現在の実装は仕様変更に対応可能な状態）
