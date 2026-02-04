# リサーチプロンプト

## リサーチ内容

Shift + ドラッグで複数のオブジェクトを選択し、更にそれをドラッグするとまとめて移動できるようにしたい。どのように実装すればよいか検討してほしい。

### 要件

* 現状はShift + ドラッグで複数のエンティティを選択はできる。（恐らくReact Flowの機能）。しかしその後、それらをドラッグするとドラッグ中は動かせるが、ドロップすると１つのエンティティだけ移動後の位置になり、他のエンティティは移動前の位置に戻ってしまう。
* 複数選択時は、DDL表示機能やテキストのプロパティ変更機能などは不要。ドラッグで位置だけ変更できればよい。
* 状態は可能な限りViewModelで管理する

## プロジェクト概要

ER Diagram Viewerは、RDBからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーションです。

### 技術スタック

* フロントエンド
  - React 19
  - TypeScript 5
  - @xyflow/react (React Flow) v12.10.0
  - Vite 5
* バックエンド
  - Node.js
  - TypeScript
* 状態管理
  - 自前Store + React useSyncExternalStore
  - ViewModelベースの単一状態ツリー

### アーキテクチャ

* フロントエンドは純粋関数Action（Flux風）で状態更新を実装
* すべての状態は`ViewModel`型で一元管理
* React Flowを使用してER図をレンダリング
* ノード（エンティティ）はReact Flowのノード

## 現状の実装状況

### 選択機能

* 単一エンティティの選択は実装済み
  - エンティティを個別に選択可能
  - 選択状態は`GlobalUIState.selectedItem: LayerItemRef | null`で管理
  - `LayerItemRef`は`{ kind: 'entity' | 'rectangle' | 'text', id: string }`

### React Flowの挙動

* Shift + ドラッグで複数のエンティティノードを選択できる（React Flowの機能）
* しかし、ドラッグすると以下の問題が発生：
  - ドラッグ中は複数のノードが一緒に動く
  - ドロップ時に`onNodeDragStop`イベントが発火
  - 現在の実装では1つのノードの位置のみをStoreに保存
  - その結果、1つのノードだけが移動し、他のノードは元の位置に戻る

```typescript
// 現在のonNodeDragStopの実装（ERCanvas.tsx より抜粋）
const onNodeDragStop = useCallback(
  (_event: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
    if (node.type === 'entityNode') {
      // 1つのノードの位置のみ更新
      dispatch(actionUpdateNodePositions, [{ 
        id: node.id, 
        x: node.position.x, 
        y: node.position.y 
      }])
      
      // ドラッグされたノードに接続されているエッジを抽出
      const connectedEdges = edges.filter(
        (edge) => edge.source === node.id || edge.target === node.id
      )

      if (connectedEdges.length === 0) {
        // ドラッグ終了をdispatch
        dispatch(actionStopEntityDrag)
        return
      }

      // エッジハンドル再計算...
      dispatch(actionStopEntityDrag)
    }
  },
  [edges, getNodes, setEdges, dispatch]
)
```

### エッジ再計算（単一ノード対応）

* 現状は1つのノードの移動に対してのみエッジハンドル位置を再計算
* 複数ノードを移動した場合、すべての関連エッジを再計算する必要がある

## 型定義（scheme/main.tsp より抜粋）

```typescript
// Layer management
enum LayerItemKind {
  entity,    // エンティティ（ER図レイヤー固定、編集不可）
  relation,  // リレーション（ER図レイヤー固定、編集不可）
  rectangle, // 矩形（前面・背面に配置可能）
  text,      // テキスト（前面・背面に配置可能）
}

model LayerItemRef {
  kind: LayerItemKind;
  id: string; // UUID
}

// Global UI state
model GlobalUIState {
  selectedItem: LayerItemRef | null; // 選択中のアイテム（現状は単一のみ）
  showBuildInfoModal: boolean;
  showLayerPanel: boolean;
  showDatabaseConnectionModal: boolean;
  showHistoryPanel: boolean;
  layoutOptimization: LayoutOptimizationState;
}

// Entity node view model (used by React Flow Node)
model EntityNodeViewModel {
  id: string; // UUID (エンティティID)
  name: string;
  x: float64;
  y: float64;
  width: float64;
  height: float64;
  columns: Column[];
  ddl: string;
}
```

## React Flowの設定

```typescript
// ERCanvas.tsx より抜粋
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onNodeDragStart={onNodeDragStart}
  onNodeDragStop={onNodeDragStop}
  onSelectionChange={handleSelectionChange}
  onPaneClick={handlePaneClick}
  onMoveStart={handleMoveStart}
  onMoveEnd={handleMoveEnd}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  elevateNodesOnSelect={false}
  elevateEdgesOnSelect={false}
  zIndexMode="manual"
  panOnDrag={true}
  nodesDraggable={!effectiveSpacePressed}
  fitView
>
```

## 関連Action

### actionUpdateNodePositions

```typescript
// 既に配列を受け取る設計（dataActions.ts より抜粋）
export function actionUpdateNodePositions(
  viewModel: ViewModel,
  updates: Array<{ id: string; x: number; y: number }>
): ViewModel {
  // 複数ノードの位置を一括更新
}
```

### actionStopEntityDrag

```typescript
// 現状は引数なし（hoverActions.ts より抜粋）
export function actionStopEntityDrag(viewModel: ViewModel): ViewModel {
  // ドラッグ終了処理
}
```

## 検討が必要な点

1. **複数選択時の位置保存**
   - ドロップ時に選択中の全ノードの位置を取得する方法
   - React Flowの`getNodes()`で全選択ノードの位置を取得できるか？
   - どのようにして選択中のノードを判別するか？

2. **エッジ再計算（複数ノード対応）**
   - 複数のエンティティを移動した場合、接続されているエッジのハンドル再計算をどうすべきか？
   - 現在は1つのノードの接続エッジのみ再計算しているが、複数ノードの場合は？

3. **状態管理**
   - 複数選択の状態をどう管理すべきか？
   - `selectedItem: LayerItemRef | null`を配列に変更すべきか？（今回のスコープ外かもしれない）

4. **パフォーマンス**
   - ドラッグ中はReact Flow内部状態を使用し、確定時のみStoreに反映（現状の方針を維持）

## React Flowの公式ドキュメントとの整合性

React Flow v12の公式ドキュメントを参照し、以下を検討してください：

* 複数選択されたノードをドラッグする際のベストプラクティス
* `onSelectionDragStop`などの専用イベントの有無と使い方
* `onNodeDragStop`で複数ノードの位置を取得する方法
* `getNodes()`での選択ノード取得方法（`node.selected`プロパティの利用など）

## 期待する調査結果

以下の点について、実装可能な具体的な方法を提示してください：

1. React Flowで複数選択されたノードをまとめてドラッグし、ドロップ時に全ノードの位置を保存する方法
2. 選択中のノードを判別する方法（React Flowの内部状態の活用方法）
3. 複数ノード移動時のエッジ再計算の実装方法
4. 必要に応じて、`actionStopEntityDrag`の変更案（移動したエンティティID配列を受け取るなど）
5. 考慮すべきエッジケースと制約事項

必要に応じて、React Flow v12のドキュメントやサンプルコードを参照してください。
