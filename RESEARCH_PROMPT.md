# Fluxアーキテクチャ的なアクション層によるフロントエンド状態管理のリサーチ

## リサーチ要件

以下を実現する方法を調査して

* ER図の描画に関する状態をERDiagramViewModelに集約している
* 状態に対する操作を集約するactionレイヤーを設ける
* actionはactionA(大きな１つの状態, パラメータA, パラメータB, ...)のような純粋関数を想定
* ブラウザ上からの操作は可能な限りactionを通す
* actionに対してテストコードを作成したい
* フロントのロジックを可能な限りactionレイヤーに集約したい（テストコードの効果を最大化したい）
* レンダリングは可能な限りERDiagramViewModelをシンプルに描画するだけにしたい
* マウスの移動などもactionMouseMove(状態, x, y)などになる想定
    * ここでカーソルがエンティティにホバーしたかの判定なども行う想定
    * ERDiagramViewModelのエンティティにホバーフラグやwidth, height, highlightフラグなどの変数も必要になる見込み
* エンティティのwidth, heightについてはDOMのレンダリング直後のイベントでactionUpdateDOM的なものを定義してそこで状態に引き渡す見込み
* Fluxアーキテクチャ的なものを想定
* 現実的に可能か？
* 何かしらライブラリを導入したほうがよいか？

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite + React + React Flow
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec

### 現状のフェーズ

- アプリケーションを丸ごと作り直そうとしているので不要なコードが残っているケースあり
- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- 後方互換も考慮しない
- 不要になったコードは捨てる
- AIが作業するため学習コストは考慮不要

## 現在のフロントエンド実装状況

### 使用ライブラリ

- **React**: UIフレームワーク
- **React Flow**: ER図のレンダリングとインタラクティブ機能（ドラッグ&ドロップ、ズーム、パンなど）に使用
- React Flow公式サイト: https://reactflow.dev/

### ディレクトリ構造

```
/er-viewer/public/src/
├─ components/
│   ├─ App.tsx              （メインアプリケーション）
│   ├─ EntityNode.tsx       （エンティティノードコンポーネント）
│   ├─ RelationshipEdge.tsx （リレーションエッジコンポーネント）
│   ├─ ERCanvas.tsx         （React Flowキャンバス）
│   └─ BuildInfoModal.tsx   （ビルド情報モーダル）
├─ contexts/
│   └─ HoverContext.tsx     （ホバー状態管理）
├─ utils/
│   ├─ viewModelConverter.ts （ViewModelへの変換）
│   └─ reactFlowConverter.ts （React Flow形式への変換）
└─ api/
    └─ client/              （TypeSpecから生成されたAPIクライアント）
```

### データ構造（TypeSpecで定義）

#### ERDiagramViewModel（現在の状態モデル）

```typescript
// フロントエンド全体の状態を表すViewModel
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;  // エンティティノードの連想配列（UUIDがキー）
  edges: Record<RelationshipEdgeViewModel>;  // リレーションエッジの連想配列（UUIDがキー）
}

// エンティティノードのViewModel
model EntityNodeViewModel {
  id: string;
  name: string;
  x: float64;
  y: float64;
  columns: Column[];
  ddl: string;
}

// リレーションエッジのViewModel
model RelationshipEdgeViewModel {
  id: string;
  source: string; // entity id
  target: string; // entity id
  fromColumn: string;
  toColumn: string;
  constraintName: string;
}

// カラム情報
model Column {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  key: string; // 'PRI', 'MUL', ''など
  default: string | null;
  extra: string;
}
```

**重要な点**:
- `ERDiagramViewModel`が現在の状態の中心
- `nodes`と`edges`はRecord型（連想配列）でIDによる高速検索が可能（O(1)）
- React Flowに渡す際は`Object.values()`で配列に変換している

### 現在の状態管理方法

#### React Flowの状態管理

`ERCanvas.tsx`でReact Flowのノードとエッジを管理：

```typescript
function ERCanvas() {
  const [nodes, setNodes] = useState<Node[]>([])  // React Flow用のノード配列
  const [edges, setEdges] = useState<Edge[]>([])  // React Flow用のエッジ配列
  const [viewModel, setViewModel] = useState<ERDiagramViewModel>({ nodes: {}, edges: {} })
  
  // リバースエンジニア実行時
  const handleReverseEngineer = async () => {
    const response = await DefaultService.apiReverseEngineer()
    // ERDataとLayoutDataからERDiagramViewModelを構築
    const vm = buildERDiagramViewModel(response.erData, response.layoutData)
    setViewModel(vm)
    // ERDiagramViewModelをReact Flow形式に変換
    const newNodes = convertToReactFlowNodes(vm.nodes)
    const newEdges = convertToReactFlowEdges(vm.edges, vm.nodes)
    setNodes(newNodes)
    setEdges(newEdges)
  }
  
  // ノードのドラッグ完了時にエッジのハンドルを再計算
  const onNodeDragStop: NodeDragHandler = useCallback(
    (_event, node) => {
      // ... エッジのハンドル（接続点）を動的に再計算
      setEdges(updatedEdges)
    },
    [edges, getNodes, setEdges]
  )
}
```

**問題点**:
- React Flowの`Node[]`と`Edge[]`が状態として管理されている
- `ERDiagramViewModel`と`Node[]`/`Edge[]`が二重管理状態になっている
- 状態更新ロジックがコンポーネント内に散在している

#### ホバー状態管理（React Context）

`HoverContext.tsx`でホバーインタラクションの状態を管理：

```typescript
interface HoverState {
  elementType: 'entity' | 'edge' | 'column' | null;
  elementId: string | null;
  columnName: string | null;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  highlightedColumns: Map<string, Set<string>>;
}

export function HoverProvider({ children, viewModel }: HoverProviderProps) {
  const [hoverState, setHoverState] = useState<HoverState>(initialHoverState);

  // エンティティホバー時の処理
  const setHoverEntity = useCallback(
    (entityId: string) => {
      const highlightedNodes = new Set<string>([entityId]);
      const highlightedEdges = new Set<string>();
      // エンティティに接続されている全エッジを検索
      Object.values(viewModel.edges).forEach((edge) => {
        if (edge.source === entityId) {
          highlightedEdges.add(edge.id);
          highlightedNodes.add(edge.target);
        } else if (edge.target === entityId) {
          highlightedEdges.add(edge.id);
          highlightedNodes.add(edge.source);
        }
      });
      setHoverState({ ... });
    },
    [viewModel]
  );

  const setHoverEdge = useCallback((edgeId: string) => { ... }, [viewModel]);
  const setHoverColumn = useCallback((entityId: string, columnName: string) => { ... }, [viewModel]);
  const clearHover = useCallback(() => { setHoverState(initialHoverState); }, []);
}
```

**問題点**:
- ホバーのロジックがContext内に実装されている
- `HoverContext`は`ERDiagramViewModel`を受け取り、それを基にハイライト対象を計算している
- ロジックが複数の関数（`setHoverEntity`, `setHoverEdge`, `setHoverColumn`）に分散している

### 現在のインタラクション実装

#### EntityNode.tsx（エンティティノードコンポーネント）

```typescript
function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const { hoverState, setHoverEntity, setHoverColumn, clearHover } = useHover()
  
  const isHighlighted = hoverState.highlightedNodes.has(data.id)
  const isDimmed = hoverState.elementType !== null && !isHighlighted
  
  const handleColumnMouseEnter = (e: React.MouseEvent, columnName: string) => {
    e.stopPropagation()
    setHoverColumn(data.id, columnName)
  }
  
  return (
    <div 
      style={{ 
        border: isHighlighted ? '3px solid #007bff' : '1px solid #333',
        opacity: isDimmed ? 0.2 : 1,
        // ... その他のスタイル
      }}
      onMouseEnter={() => setHoverEntity(data.id)}
      onMouseLeave={clearHover}
    >
      {/* エンティティの内容 */}
    </div>
  )
}
```

**問題点**:
- コンポーネントが直接Contextの関数を呼び出している
- スタイル計算（ハイライト判定など）がコンポーネント内にある
- `isHighlighted`や`isDimmed`の計算ロジックがテストできない

#### RelationshipEdge.tsx（リレーションエッジコンポーネント）

```typescript
function RelationshipEdge({ id, sourceX, sourceY, targetX, targetY, ... }: EdgeProps) {
  const { hoverState, setHoverEdge, clearHover } = useHover()
  
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, ... })
  
  const isHighlighted = hoverState.highlightedEdges.has(id)
  const isDimmed = hoverState.elementType !== null && !isHighlighted
  
  return (
    <g
      onMouseEnter={() => setHoverEdge(id)}
      onMouseLeave={clearHover}
    >
      <path
        d={edgePath}
        style={{
          stroke: isHighlighted ? '#007bff' : '#333',
          strokeWidth: isHighlighted ? 4 : 2,
          opacity: isDimmed ? 0.2 : 1,
        }}
      />
    </g>
  )
}
```

**問題点**:
- エッジコンポーネントも直接Contextの関数を呼び出している
- スタイル計算がコンポーネント内にある

### 現在の変換処理

#### viewModelConverter.ts（ERDataとLayoutDataからERDiagramViewModelへ）

```typescript
export function buildERDiagramViewModel(
  erData: ERData,
  layoutData: LayoutData
): ERDiagramViewModel {
  const nodes: { [key: string]: EntityNodeViewModel } = {};
  
  for (const entity of erData.entities) {
    const layoutItem = layoutData.entities[entity.id];
    nodes[entity.id] = {
      id: entity.id,
      name: entity.name,
      x: layoutItem.x,
      y: layoutItem.y,
      columns: entity.columns,
      ddl: entity.ddl,
    };
  }
  
  const edges: { [key: string]: RelationshipEdgeViewModel } = {};
  for (const relationship of erData.relationships) {
    edges[relationship.id] = {
      id: relationship.id,
      source: relationship.fromId,
      target: relationship.toId,
      fromColumn: relationship.fromColumn,
      toColumn: relationship.toColumn,
      constraintName: relationship.constraintName,
    };
  }
  
  return { nodes, edges };
}
```

#### reactFlowConverter.ts（ERDiagramViewModelからReact Flow形式へ）

```typescript
export function convertToReactFlowNodes(
  nodes: Record<string, EntityNodeViewModel>
): Node[] {
  return Object.values(nodes).map((node) => ({
    id: node.id,
    type: 'entityNode',
    position: { x: node.x, y: node.y },
    data: {
      id: node.id,
      name: node.name,
      columns: node.columns,
      ddl: node.ddl,
    },
  }));
}

export function convertToReactFlowEdges(
  edges: Record<string, RelationshipEdgeViewModel>,
  nodes: Record<string, EntityNodeViewModel>
): Edge[] {
  return Object.values(edges).map((edge) => {
    const sourceNode = nodes[edge.source];
    const targetNode = nodes[edge.target];
    
    // ノード位置からハンドルを計算
    const { sourceHandle, targetHandle } = computeOptimalHandles(
      { x: sourceNode.x, y: sourceNode.y },
      { x: targetNode.x, y: targetNode.y }
    );
    
    return {
      id: edge.id,
      type: 'relationshipEdge',
      source: edge.source,
      target: edge.target,
      sourceHandle,
      targetHandle,
      data: {
        fromColumn: edge.fromColumn,
        toColumn: edge.toColumn,
        constraintName: edge.constraintName,
      },
    };
  });
}

// ノード間の位置関係から最適なハンドル（接続点）を計算
export function computeOptimalHandles(
  sourceCenter: { x: number; y: number },
  targetCenter: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // 水平方向の距離が大きい
    if (dx > 0) {
      return { sourceHandle: 's-right', targetHandle: 't-left' };
    } else {
      return { sourceHandle: 's-left', targetHandle: 't-right' };
    }
  } else {
    // 垂直方向の距離が大きい
    if (dy > 0) {
      return { sourceHandle: 's-bottom', targetHandle: 't-top' };
    } else {
      return { sourceHandle: 's-top', targetHandle: 't-bottom' };
    }
  }
}
```

## 現在の実装の課題

### 1. 状態管理の分散

- `ERDiagramViewModel`（連想配列形式）と`Node[]`/`Edge[]`（React Flow形式）の二重管理
- `HoverState`が別のContextで管理されている
- 状態の正規化が不十分で、複数の状態間で整合性を保つのが困難

### 2. ロジックの散在

- ホバーのロジックが`HoverContext`内にある
- ハイライト判定などがコンポーネント内にある
- ドラッグ完了時のエッジハンドル再計算ロジックが`ERCanvas`内にある
- テストが困難（コンポーネント全体をマウントしないとテストできない）

### 3. React Flowへの依存

- React Flowの`Node`と`Edge`型に直接依存している
- React Flowから別のライブラリに移行する場合、大きな変更が必要

### 4. 不足している状態情報

現在の`ERDiagramViewModel`には以下の情報が含まれていない：
- エンティティノードの`width`, `height`（DOMレンダリング後に取得する必要がある）
- ホバー状態（`isHovered`, `isHighlighted`, `isDimmed`など）
- 選択状態（将来的に必要）

## 理想的なアーキテクチャ（検討中）

### 目指す設計

1. **単一の状態ツリー**
   - `ERDiagramViewModel`が全ての状態を保持
   - ホバー状態、選択状態、レイアウト情報（width, height）も含める

2. **Actionレイヤー**
   - 状態に対する全ての操作をAction関数として定義
   - 純粋関数：`action(state, ...params) => newState`
   - 例：`actionMouseMove(state, x, y)`、`actionHoverEntity(state, entityId)`、`actionUpdateNodeSize(state, nodeId, width, height)`

3. **ロジックの集約**
   - ホバー判定、ハイライト計算などの全ロジックをActionに集約
   - コンポーネントはActionを呼び出すだけ
   - レンダリングは状態を読み取って描画するだけ

4. **テスタビリティ**
   - Action関数は純粋関数なので単体テストが容易
   - ロジックのテストカバレッジを最大化

### 想定されるAction例

```typescript
// マウス移動イベント
// x, y座標からホバー中のエンティティを判定し、状態を更新
actionMouseMove(state: ERDiagramViewModel, x: number, y: number): ERDiagramViewModel

// エンティティホバー
// 指定されたエンティティとその関連要素をハイライト
actionHoverEntity(state: ERDiagramViewModel, entityId: string): ERDiagramViewModel

// ホバー解除
actionClearHover(state: ERDiagramViewModel): ERDiagramViewModel

// エンティティドラッグ
actionDragEntity(state: ERDiagramViewModel, entityId: string, x: number, y: number): ERDiagramViewModel

// ノードサイズ更新（DOMレンダリング後）
actionUpdateNodeSize(state: ERDiagramViewModel, nodeId: string, width: number, height: number): ERDiagramViewModel
```

### 拡張されたERDiagramViewModelのイメージ

```typescript
model EntityNodeViewModel {
  id: string;
  name: string;
  x: float64;
  y: float64;
  width: float64;   // 追加：DOMレンダリング後に取得
  height: float64;  // 追加：DOMレンダリング後に取得
  columns: Column[];
  ddl: string;
  
  // 追加：UI状態
  isHovered: boolean;      // このノードがホバー中か
  isHighlighted: boolean;  // このノードがハイライト対象か
  isDimmed: boolean;       // このノードが暗くなっているか
}

model RelationshipEdgeViewModel {
  id: string;
  source: string;
  target: string;
  fromColumn: string;
  toColumn: string;
  constraintName: string;
  
  // 追加：エッジの接続ハンドル
  sourceHandle: string;  // 's-top', 's-right', 's-bottom', 's-left'
  targetHandle: string;  // 't-top', 't-right', 't-bottom', 't-left'
  
  // 追加：UI状態
  isHovered: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
}

model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  
  // 追加：グローバルなUI状態
  hoverState: {
    elementType: 'entity' | 'edge' | 'column' | null;
    elementId: string | null;
    columnName: string | null;
  }
}
```

### レンダリングのイメージ

```typescript
function EntityNode({ data }: NodeProps<EntityNodeData>) {
  // コンポーネントはActionを呼び出すだけ
  const dispatch = useDispatch();
  
  // viewModelから状態を取得（すでに計算済み）
  const node = viewModel.nodes[data.id];
  
  return (
    <div 
      style={{ 
        border: node.isHighlighted ? '3px solid #007bff' : '1px solid #333',
        opacity: node.isDimmed ? 0.2 : 1,
      }}
      onMouseEnter={() => dispatch(actionHoverEntity(node.id))}
      onMouseLeave={() => dispatch(actionClearHover())}
    >
      {/* エンティティの内容 */}
    </div>
  )
}
```

## 期待する回答

以下の観点から、このアーキテクチャの実現可能性と実装方法について提案してください：

### 1. Fluxアーキテクチャの適用

- **単一方向データフロー**: View → Action → State → View
- **純粋関数によるAction**: `action(state, ...params) => newState`
- このアプローチはReactアプリケーションで現実的に実現可能か？
- Fluxの原則を守りながらReact Flowのような複雑なライブラリと統合できるか？

### 2. 状態管理ライブラリの検討

- **Redux**: 最も一般的なFlux実装、ミドルウェアエコシステムが充実
  - Redux Toolkitによる簡潔な記述
  - Reducerが純粋関数なのでテストが容易
  - 学習コストは高いが、AIが実装するため問題ない
  
- **Zustand**: 軽量でシンプルな状態管理
  - ボイラープレートが少ない
  - Fluxアーキテクチャとの親和性は？
  
- **useReducer（React組み込み）**: 追加ライブラリ不要
  - シンプルだが、大規模アプリケーションでは管理が困難？
  - ミドルウェアやデバッグツールの不足
  
- **その他の選択肢**: Jotai, Recoil, MobX など
  - それぞれの特徴と、このプロジェクトとの相性

どのライブラリが最も適しているか？理由は？

### 3. マウスイベントの状態化

- **actionMouseMove(state, x, y)のような設計の妥当性**
  - マウス移動のような頻繁なイベントを全て状態更新として扱うのは現実的か？
  - パフォーマンスへの影響は？（MVPフェーズでは許容範囲か？）
  - React Flowのイベントハンドラー（onMouseMove）との統合方法
  
- **ホバー判定をActionで行う**
  - マウス座標からホバー中のエンティティを判定するロジックをAction内に実装
  - エンティティの位置（x, y）とサイズ（width, height）から矩形を計算し、マウス座標が含まれるか判定
  - これは現実的なアプローチか？

### 4. DOMサイズの状態への反映

- **エンティティのwidth, heightの取得**
  - React Flowのノードは動的にサイズが決まる（カラム数に依存）
  - DOMレンダリング後に`ResizeObserver`や`useEffect`でサイズを取得
  - `actionUpdateNodeSize(state, nodeId, width, height)`で状態に反映
  
- **レンダリングとサイズ取得のタイミング**
  - 初回レンダリング後にサイズを取得し、状態を更新すると再レンダリングが発生
  - これは避けられないオーバーヘッドか？
  - より効率的な方法はあるか？

### 5. React Flowとの統合

- **React Flowの内部状態との分離**
  - React Flowは独自の状態管理（ノード位置、ズーム、パンなど）を持つ
  - `ERDiagramViewModel`で全状態を管理する場合、React Flowの状態とどう統合するか？
  - React FlowのonNodesChange, onEdgesChangeイベントをActionに変換する方法
  
- **ノードドラッグ時の処理**
  - React Flowのドラッグは内部で管理される
  - ドラッグ完了時（onNodeDragStop）にActionを発行して状態を同期？
  - リアルタイムなドラッグ中の状態更新は必要か？

### 6. ロジックのActionへの集約

- **ハイライト計算のActionへの移動**
  - 現在`HoverContext`内にあるロジック（関連エンティティ・エッジの検索）をAction関数に移動
  - `actionHoverEntity(state, entityId)`内で関連要素を検索し、各要素の`isHighlighted`フラグを更新
  - これは純粋関数として実装可能か？（副作用なしで実現できるか？）
  
- **エッジハンドル計算のActionへの移動**
  - 現在`reactFlowConverter.ts`や`ERCanvas.tsx`にあるロジックをAction関数に移動
  - ノードの位置・サイズから最適なハンドルを計算し、エッジの`sourceHandle`, `targetHandle`を更新

### 7. テスト戦略

- **Action関数の単体テスト**
  - 純粋関数なので入力（state, params）から出力（newState）を検証するだけ
  - Jest等のテストフレームワークで容易にテスト可能
  
- **テストカバレッジの最大化**
  - ロジックがAction層に集約されていれば、Actionのテストでほぼ全ロジックをカバー可能
  - コンポーネントのテストは最小限（Actionの呼び出しと状態の表示のみ）
  
- **テストの具体例**
  - `actionHoverEntity`のテスト: 特定のエンティティをホバーした時、関連エンティティとエッジが正しくハイライトされるか
  - `actionDragEntity`のテスト: エンティティを移動した時、エッジのハンドルが正しく再計算されるか

### 8. 実装の複雑さとトレードオフ

- **MVPフェーズに適しているか**
  - このアーキテクチャは実装コストが高いか？
  - プロトタイピング段階で導入すべきか、後回しにすべきか？
  
- **保守性と拡張性**
  - ロジックがAction層に集約されることで、保守性は向上するか？
  - 新機能追加時（例：エンティティの複数選択、グルーピングなど）の拡張性は？
  
- **React Flowからの移行リスク**
  - 将来的にReact Flowから別のライブラリに移行する場合、このアーキテクチャは有利か？
  - React Flow依存部分をどこまで隔離できるか？

### 9. 代替アプローチ

- **現在のアーキテクチャの改善案**
  - Fluxアーキテクチャを採用せず、現在のContext + useStateベースのアプローチを改善する方法
  - ロジックをカスタムフック（useHover, useDrag等）に集約する
  
- **部分的なFluxの導入**
  - 全ての状態をFluxで管理するのではなく、一部（例：ホバー状態のみ）をFluxで管理
  - React Flowのノード位置などはReact Flow側に任せる
  
- **段階的な移行**
  - まず`HoverContext`をAction層に移行
  - その後、徐々に他の状態もAction層に移行

### 10. 具体的な実装例・サンプルコード

- **Fluxアーキテクチャでのマウスホバー処理**
  - `actionHoverEntity`の実装例
  - 関連エンティティ・エッジの検索ロジック
  - 状態のイミュータブルな更新
  
- **DOMサイズの状態への反映**
  - `ResizeObserver`や`useEffect`でサイズ取得
  - `actionUpdateNodeSize`を呼び出して状態を更新
  
- **React Flowとの統合**
  - React FlowのイベントハンドラーとActionの連携
  - `onNodeDragStop`でActionを発行

### 重視する点

- **テスタビリティ**: ロジックを純粋関数として実装し、単体テストが容易
- **ロジックの集約**: フロントエンドのロジックをAction層に集約し、コンポーネントはシンプルに保つ
- **実現可能性**: MVPフェーズで現実的に実装できる範囲
- **明確な設計**: AIが実装する前提で、学習コストは考慮しないが、設計の明確さは重要

### 重視しない点

- **パフォーマンスの極端な最適化**: MVPフェーズでは過度な最適化は不要（ただし、マウス移動のような頻繁なイベントは考慮が必要）
- **学習コストの低減**: AIが実装するため、複雑なライブラリでも問題ない
- **後方互換性**: 考慮不要

## まとめ

現在のER Diagram Viewerのフロントエンドは、状態管理が分散し、ロジックがコンポーネントやContext内に散在しているため、テストが困難で保守性に課題がある。

以下のFluxアーキテクチャ的なアプローチを検討している：
- 単一の状態ツリー（`ERDiagramViewModel`）で全状態を管理
- 純粋関数のAction（`action(state, ...params) => newState`）でロジックを集約
- マウスイベント（ホバー、ドラッグなど）もActionを通して処理
- DOMサイズなどの実行時情報も`actionUpdateNodeSize`で状態に反映
- レンダリングはERDiagramViewModelをシンプルに描画するだけ

このアプローチが現実的に実現可能かどうか、どのような状態管理ライブラリ（Redux, Zustand, useReducer等）を使うべきか、React Flowとどう統合するか、マウス移動のような頻繁なイベントをどう扱うか、テスト戦略はどうあるべきか、などについて具体的な提案とサンプルコードを提供してください。
