# 矩形描画機能 実装タスク

本タスクは、`spec/rectangle_drawing_feature.md`に基づき、ER図上に矩形を描画・編集する機能を実装するものです。

## 参照する仕様書

- `spec/rectangle_drawing_feature.md`: 矩形描画機能の仕様
- `spec/frontend_state_management.md`: フロントエンドの状態管理
- `spec/frontend_er_rendering.md`: ER図のレンダリング
- `scheme/main.tsp`: 型定義（TypeSpec）

## 前提条件

- TypeSpec (`scheme/main.tsp`) には既に以下の変更が適用されています：
  - `Rectangle`型に`strokeWidth`と`opacity`フィールドを追加
  - `ERDiagramViewModel`に`rectangles: Record<Rectangle>`フィールドを追加
- `lib/generated/api-types.ts` が最新の型定義で生成されていること（`npm run generate`実行済み）

---

## タスク一覧

### [ ] 1. 型生成の確認とストア初期状態の更新

**目的**: TypeSpecの変更が正しく反映されていることを確認し、Storeの初期状態を更新する

**対象ファイル**: 
- `lib/generated/api-types.ts` (確認のみ)
- `public/src/store/erDiagramStore.ts`

**変更内容**:
- `npm run generate`を実行して型が最新であることを確認
- `erDiagramStore.ts`の`initialState`に`rectangles: {}`を追加

```typescript
const initialState: ERDiagramViewModel = {
  nodes: {},
  edges: {},
  rectangles: {}, // 追加
  ui: {
    hover: null,
    highlightedNodeIds: [],
    highlightedEdgeIds: [],
    highlightedColumnIds: [],
  },
  loading: false,
};
```

---

### [ ] 2. 矩形操作用Actionの実装

**目的**: 矩形の追加・削除・位置更新・サイズ更新・スタイル更新を行う純粋関数を実装

**対象ファイル**: `public/src/actions/rectangleActions.ts` (新規作成)

**実装するAction**:

- `actionAddRectangle(vm, rectangle)`: 新規矩形を追加
  - `vm.rectangles`に矩形を追加（`id`をキーとして）
  - 同一参照チェック（変化がない場合は同一参照を返す）

- `actionRemoveRectangle(vm, rectangleId)`: 矩形を削除
  - `vm.rectangles`から指定IDの矩形を削除
  - 同一参照チェック

- `actionUpdateRectanglePosition(vm, rectangleId, x, y)`: 矩形の位置を更新
  - 指定IDの矩形の`x`と`y`を更新
  - 同一参照チェック

- `actionUpdateRectangleSize(vm, rectangleId, width, height)`: 矩形のサイズを更新
  - 指定IDの矩形の`width`と`height`を更新
  - 同一参照チェック

- `actionUpdateRectangleBounds(vm, rectangleId, {x, y, width, height})`: 矩形の座標とサイズを一括更新
  - リサイズ時に使用（左上からのリサイズで位置も変わるため）
  - 同一参照チェック

- `actionUpdateRectangleStyle(vm, rectangleId, stylePatch)`: 矩形のスタイルを部分更新
  - `stylePatch`は`{fill?, stroke?, strokeWidth?, opacity?}`の形式
  - 指定されたプロパティのみ更新
  - 同一参照チェック

**インポート**:
```typescript
import type { components } from '../../../lib/generated/api-types';

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];
type Rectangle = components['schemas']['Rectangle'];
```

**注意事項**:
- すべてのActionは純粋関数として実装（副作用なし）
- 状態に変化がない場合は同一参照を返す（再レンダリング抑制のため）
- 既存の`dataActions.ts`や`hoverActions.ts`と同じパターンで実装

---

### [ ] 3. RectangleNodeコンポーネントの実装

**目的**: React Flowのカスタムノードとして矩形を表示し、リサイズ可能にする

**対象ファイル**: `public/src/components/RectangleNode.tsx` (新規作成)

**実装内容**:

- `NodeResizer`を使用してリサイズハンドルを表示
  - 最小サイズ: `minWidth={40}`, `minHeight={40}`
  - `onResizeEnd`でリサイズ完了時に`actionUpdateRectangleBounds`をdispatch

- スタイル:
  - `fill`: 背景色（`data.fill`から取得）
  - `stroke`: 枠線色（`data.stroke`から取得）
  - `strokeWidth`: 枠線幅（`data.strokeWidth`から取得）
  - `opacity`: 透明度（`data.opacity`から取得）
  - `border`: `${strokeWidth}px solid ${stroke}`
  - `backgroundColor`: `fill`
  - `opacity`: `opacity`

- z-index制御:
  - デフォルトで`zIndex: 0`（エンティティより背景）
  - `style`プロパティで明示的に設定

**インポート**:
```typescript
import React, { useCallback } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { useERDispatch } from '../store/hooks';
import { actionUpdateRectangleBounds } from '../actions/rectangleActions';
```

**NodePropsのdata型**:
```typescript
interface RectangleNodeData {
  id: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}
```

**注意事項**:
- `NodeResizer`の`onResizeEnd`は`(event, params) => void`の形式
  - `params`には`{x, y, width, height}`が含まれる
- イベントハンドラは`useCallback`で安定させる
- 選択中のみリサイズハンドルが表示される（React Flowの標準動作）

---

### [ ] 4. reactFlowConverterの拡張

**目的**: `ERDiagramViewModel.rectangles`をReact Flowノードに変換する関数を追加

**対象ファイル**: `public/src/utils/reactFlowConverter.ts`

**追加する関数**:

- `convertToReactFlowRectangles(rectangles): Node[]`
  - `rectangles`（Record型）を配列に変換し、React Flowノード形式にマッピング
  - ノードタイプ: `rectangleNode`
  - ノードの`width`と`height`プロパティでサイズを指定
  - ノードの`data`にスタイル情報を含める
  - z-indexを`0`に設定（エンティティより背景）

**実装例**:
```typescript
export function convertToReactFlowRectangles(
  rectangles: { [key: string]: Rectangle }
): Node[] {
  return Object.values(rectangles).map((rect) => ({
    id: rect.id,
    type: 'rectangleNode',
    position: { x: rect.x, y: rect.y },
    width: rect.width,
    height: rect.height,
    style: { zIndex: 0 },
    data: {
      id: rect.id,
      fill: rect.fill,
      stroke: rect.stroke,
      strokeWidth: rect.strokeWidth,
      opacity: rect.opacity,
    },
  }));
}
```

**型のインポート**:
```typescript
type Rectangle = components['schemas']['Rectangle'];
```

---

### [ ] 5. ERCanvasの修正

**目的**: 矩形ノードの登録、変換、ドラッグ/リサイズハンドリング、ツールバーボタンの追加

**対象ファイル**: `public/src/components/ERCanvas.tsx`

**変更内容**:

1. **nodeTypesに`rectangleNode`を追加**:
```typescript
import RectangleNode from './RectangleNode';

const nodeTypes = {
  entityNode: EntityNode,
  rectangleNode: RectangleNode, // 追加
};
```

2. **Storeから`rectangles`を購読**:
```typescript
const viewModelRectangles = useERViewModel((vm) => vm.rectangles);
```

3. **ViewModelをReact Flow形式に変換する際に矩形も変換**:
```typescript
import { convertToReactFlowRectangles } from '../utils/reactFlowConverter';

useEffect(() => {
  const entityNodes = convertToReactFlowNodes(viewModelNodes);
  const rectangleNodes = convertToReactFlowRectangles(viewModelRectangles);
  const newNodes = [...rectangleNodes, ...entityNodes]; // 矩形を先に追加（背景に表示）
  const newEdges = convertToReactFlowEdges(viewModelEdges, viewModelNodes);
  setNodes(newNodes);
  setEdges(newEdges);
}, [viewModelNodes, viewModelEdges, viewModelRectangles]);
```

4. **ツールバー「矩形追加」ボタンを追加**:
```typescript
import { actionAddRectangle } from '../actions/rectangleActions';

const handleAddRectangle = () => {
  const newRectangle: Rectangle = {
    id: crypto.randomUUID(),
    x: 0, // viewport中央に配置する実装は後回し、まずは固定座標
    y: 0,
    width: 200,
    height: 150,
    fill: '#E3F2FD',
    stroke: '#90CAF9',
    strokeWidth: 2,
    opacity: 0.5,
  };
  dispatch(actionAddRectangle, newRectangle);
};

// ボタン追加
<button onClick={handleAddRectangle}>矩形追加</button>
```

5. **`onNodeDragStop`で矩形の位置更新も処理**:
```typescript
import { actionUpdateRectanglePosition } from '../actions/rectangleActions';

const onNodeDragStop: NodeDragHandler = useCallback(
  (_event, node) => {
    if (node.type === 'rectangleNode') {
      // 矩形の位置を更新
      dispatch(actionUpdateRectanglePosition, node.id, node.position.x, node.position.y);
    } else if (node.type === 'entityNode') {
      // 既存のエンティティ位置更新処理
      dispatch(actionUpdateNodePositions, [{ 
        id: node.id, 
        x: node.position.x, 
        y: node.position.y 
      }]);
      // エッジハンドル再計算
      // ... (既存コード)
    }
  },
  [edges, getNodes, setEdges, dispatch]
);
```

6. **React Flowに`elevateNodesOnSelect={false}`を設定**:
```typescript
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onNodeDragStop={onNodeDragStop}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  elevateNodesOnSelect={false} // 追加
  fitView
>
```

**注意事項**:
- viewport中央への配置はMVPでは後回し（まずは固定座標でOK）
- 矩形のz-index制御は`convertToReactFlowRectangles`で`style.zIndex: 0`を設定することで実現
- エンティティノードのデフォルトz-indexは100なので、矩形が背景に表示される

---

### [ ] 6. react-colorfulのインストール

**目的**: カラーピッカーライブラリをインストール

**対象ディレクトリ**: `public/`

**コマンド**:
```bash
cd public && npm install react-colorful
```

---

### [ ] 7. プロパティパネルの実装（MVP段階では後回し可）

**目的**: 選択中の矩形のスタイルを編集可能にする

**対象ファイル**: `public/src/components/RectanglePropertyPanel.tsx` (新規作成)

**実装内容**:

- 選択中のノードを取得し、`rectangleNode`タイプの場合のみ表示
- 以下のUI要素を提供:
  - **背景色（fill）**: `HexColorPicker` + `HexColorInput` + プリセット8色
  - **枠線色（stroke）**: `HexColorPicker` + `HexColorInput` + プリセット8色
  - **透明度（opacity）**: `<input type="range" min="0" max="1" step="0.01" />`
  - **枠線幅（strokeWidth）**: `<input type="number" min="0" step="1" />`

- 値変更時に`actionUpdateRectangleStyle`をdispatch

**プリセット色**:
```typescript
const PRESET_COLORS = [
  '#E3F2FD', // 青
  '#E0F7FA', // シアン
  '#E0F2F1', // ティール
  '#E8F5E9', // 緑
  '#FFFDE7', // 黄
  '#FFF3E0', // オレンジ
  '#FCE4EC', // ピンク
  '#F5F5F5', // グレー
];
```

**注意事項**:
- MVP段階ではプロパティパネルは後回しにして、デフォルト色で矩形が追加できることを優先
- 実装する場合は、サイドバーまたはモーダルとして配置
- `react-colorful`のインポート: `import { HexColorPicker, HexColorInput } from 'react-colorful';`

---

### [ ] 8. rectangleActionsのテストコード作成

**目的**: 矩形操作Actionの動作を検証する単体テストを作成

**対象ファイル**: `public/tests/actions/rectangleActions.test.ts` (新規作成)

**テストケース**:

- `actionAddRectangle`のテスト:
  - 矩形が正しく追加されること
  - 既存の矩形が保持されること

- `actionRemoveRectangle`のテストf:
  - 矩形が正しく削除されること
  - 存在しないIDを削除しようとした場合、同一参照を返すこと

- `actionUpdateRectanglePosition`のテスト:
  - 位置が正しく更新されること
  - 変化がない場合、同一参照を返すこと

- `actionUpdateRectangleBounds`のテスト:
  - 座標とサイズが一括で更新されること

- `actionUpdateRectangleStyle`のテスト:
  - スタイルが部分更新されること
  - 未指定のプロパティは保持されること

**テストフレームワーク**: Vitest（既存と統一）

**実装パターン**: 既存の`dataActions.test.ts`や`hoverActions.test.ts`と同じパターンで実装

---

### [ ] 9. ビルドの確認

**目的**: 実装したコードが正しくビルドできることを確認

**コマンド**:
```bash
# 型生成
npm run generate

# フロントエンドビルド
cd public && npm run build

# バックエンドビルド（必要に応じて）
npm run build
```

**確認事項**:
- エラーが発生しないこと
- 型エラーが発生しないこと

---

### [ ] 10. テストの実行

**目的**: 実装したテストコードを実行し、すべて成功することを確認

**コマンド**:
```bash
npm run test
```

**確認事項**:
- すべてのテストがパスすること
- 特に`rectangleActions.test.ts`のテストがすべて成功すること

---

## 指示者宛ての懸念事項（作業対象外）

### 技術的懸念

1. **React FlowのNodeResizerの動作確認**
   - 実装完了後に指示者側で確認予定

2. **z-index制御の効果**
   - 実装完了後に指示者側で確認予定
   - もし`elevateNodesOnSelect={false}`で抑制できない場合は、`zIndexMode="manual"`の使用を検討

3. **viewport中央への配置**
   - 現在のタスクでは矩形を固定座標（0, 0）に配置していますが、将来的にはviewportの中央に配置する実装が必要です
   - React Flowの`project`APIを使用して、viewport座標をワールド座標に変換する必要があります

4. **LayoutDataの保存・読み込み**
   - まだ未実装のため、本タスクでは考慮不要

### UX観点の確認

1. **カラーピッカーのUI**
   - `react-colorful`のデフォルトUIがER図編集の操作感に馴染むか、実装後に確認が必要です

2. **非ハイライト要素の透明度**
   - 矩形がホバーハイライトの対象になる場合、非ハイライト時の透明度（opacity: 0.2）が適切か確認が必要です

---

## 事前修正提案

特になし。現在の仕様で実装可能です。
