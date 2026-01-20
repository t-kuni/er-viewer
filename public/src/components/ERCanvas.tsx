import React, { useState, useCallback } from 'react'
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
import { DefaultService } from '../api/client'
import EntityNode from './EntityNode'
import RelationshipEdge from './RelationshipEdge'
import { buildERDiagramViewModel } from '../utils/viewModelConverter'
import { convertToReactFlowNodes, convertToReactFlowEdges, computeOptimalHandles } from '../utils/reactFlowConverter'
import { HoverProvider } from '../contexts/HoverContext'
import type { components } from '../../../lib/generated/api-types'

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel']

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
  setEdges 
}: { 
  nodes: Node[], 
  edges: Edge[], 
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>, 
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>> 
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
    [edges, getNodes, setEdges]
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
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [viewModel, setViewModel] = useState<ERDiagramViewModel>({ nodes: {}, edges: {} })
  const [loading, setLoading] = useState(false)
  
  const handleReverseEngineer = async () => {
    setLoading(true)
    try {
      const response = await DefaultService.apiReverseEngineer()
      
      // エラーレスポンスのチェック
      if ('error' in response) {
        throw new Error(response.error)
      }
      
      // ERDataとLayoutDataからERDiagramViewModelを構築
      const vm = buildERDiagramViewModel(response.erData, response.layoutData)
      setViewModel(vm)
      
      // ERDiagramViewModelをReact Flow形式に変換
      const newNodes = convertToReactFlowNodes(vm.nodes)
      const newEdges = convertToReactFlowEdges(vm.edges, vm.nodes)
      
      setNodes(newNodes)
      setEdges(newEdges)
    } catch (error) {
      console.error('リバースエンジニアに失敗しました:', error)
      alert('リバースエンジニアに失敗しました')
    } finally {
      setLoading(false)
    }
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
      <HoverProvider viewModel={viewModel}>
        <ReactFlowProvider>
          <ERCanvasInner nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />
        </ReactFlowProvider>
      </HoverProvider>
    </div>
  )
}

export default ERCanvas
