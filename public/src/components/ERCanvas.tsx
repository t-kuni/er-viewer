import React, { useState, useCallback, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  NodeDragHandler,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import EntityNode from './EntityNode'
import RelationshipEdge from './RelationshipEdge'
import { convertToReactFlowNodes, convertToReactFlowEdges, computeOptimalHandles } from '../utils/reactFlowConverter'
import { useERViewModel, useERDispatch } from '../store/hooks'
import { commandReverseEngineer } from '../commands/reverseEngineerCommand'
import { actionUpdateNodePositions } from '../actions/dataActions'

const nodeTypes = {
  entityNode: EntityNode,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
}

// ReactFlow内で使用する内部コンポーネント
function ERCanvasInner({ 
  nodes, 
  edges, 
  setNodes, 
  setEdges,
  dispatch
}: { 
  nodes: Node[], 
  edges: Edge[], 
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>, 
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  dispatch: ReturnType<typeof useERDispatch>
}) {
  const { getNodes } = useReactFlow()
  
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  )
  
  const onNodeDragStop: NodeDragHandler = useCallback(
    (_event, node) => {
      // Storeのノード位置を更新
      dispatch(actionUpdateNodePositions, [{ 
        id: node.id, 
        x: node.position.x, 
        y: node.position.y 
      }])
      
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

        // ノードの中心座標を計算（width/height プロパティから実際のサイズを取得）
        const sourceWidth = sourceNode.width ?? 200
        const sourceHeight = sourceNode.height ?? 100
        const targetWidth = targetNode.width ?? 200
        const targetHeight = targetNode.height ?? 100
        
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
    [edges, getNodes, setEdges, dispatch]
  )
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
    >
      <Controls />
      <Background />
    </ReactFlow>
  )
}

function ERCanvas() {
  const dispatch = useERDispatch()
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  
  // Storeから状態を購読
  const viewModelNodes = useERViewModel((vm) => vm.nodes)
  const viewModelEdges = useERViewModel((vm) => vm.edges)
  const loading = useERViewModel((vm) => vm.loading)
  
  // ViewModelが更新されたらReact Flow形式に変換
  useEffect(() => {
    const newNodes = convertToReactFlowNodes(viewModelNodes)
    const newEdges = convertToReactFlowEdges(viewModelEdges, viewModelNodes)
    setNodes(newNodes)
    setEdges(newEdges)
  }, [viewModelNodes, viewModelEdges])
  
  const handleReverseEngineer = async () => {
    await commandReverseEngineer(dispatch)
  }
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        <button 
          onClick={handleReverseEngineer}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '処理中...' : 'リバースエンジニア'}
        </button>
      </div>
      <ReactFlowProvider>
        <ERCanvasInner nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} dispatch={dispatch} />
      </ReactFlowProvider>
    </div>
  )
}

export default ERCanvas
