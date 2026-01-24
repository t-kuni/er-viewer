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
  OnSelectionChangeParams,
  NodeDragHandler,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import EntityNode from './EntityNode'
import RectangleNode from './RectangleNode'
import RelationshipEdge from './RelationshipEdge'
import { convertToReactFlowNodes, convertToReactFlowEdges, convertToReactFlowRectangles, computeOptimalHandles } from '../utils/reactFlowConverter'
import { useViewModel, useDispatch } from '../store/hooks'
import { commandReverseEngineer } from '../commands/reverseEngineerCommand'
import { actionUpdateNodePositions } from '../actions/dataActions'
import { actionAddRectangle, actionUpdateRectanglePosition, actionRemoveRectangle } from '../actions/rectangleActions'
import type { components } from '../../../lib/generated/api-types'

type Rectangle = components['schemas']['Rectangle']

const nodeTypes = {
  entityNode: EntityNode,
  rectangleNode: RectangleNode,
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
  dispatch,
  onSelectionChange
}: { 
  nodes: Node[], 
  edges: Edge[], 
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>, 
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  dispatch: ReturnType<typeof useDispatch>,
  onSelectionChange?: (rectangleId: string | null) => void
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
      if (node.type === 'rectangleNode') {
        // 矩形の位置を更新
        dispatch(actionUpdateRectanglePosition, node.id, node.position.x, node.position.y)
      } else if (node.type === 'entityNode') {
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
      }
    },
    [edges, getNodes, setEdges, dispatch]
  )
  
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      // 矩形ノードのみを抽出
      const selectedRectangles = params.nodes.filter(node => node.type === 'rectangleNode')
      
      // 矩形が1つだけ選択されている場合は親に通知
      if (selectedRectangles.length === 1) {
        onSelectionChange?.(selectedRectangles[0].id)
      } else {
        // 0個または2個以上の場合はnullを通知
        onSelectionChange?.(null)
      }
    },
    [onSelectionChange]
  )
  
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        if (node.type === 'rectangleNode') {
          dispatch(actionRemoveRectangle, node.id)
        }
      })
    },
    [dispatch]
  )
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onSelectionChange={handleSelectionChange}
      onNodesDelete={onNodesDelete}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      elevateNodesOnSelect={false}
      fitView
    >
      <Controls />
      <Background />
    </ReactFlow>
  )
}

interface ERCanvasProps {
  onSelectionChange?: (rectangleId: string | null) => void
}

function ERCanvas({ onSelectionChange }: ERCanvasProps = {}) {
  const dispatch = useDispatch()
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  
  // Storeから状態を購読
  const viewModelNodes = useViewModel((vm) => vm.erDiagram.nodes)
  const viewModelEdges = useViewModel((vm) => vm.erDiagram.edges)
  const viewModelRectangles = useViewModel((vm) => vm.erDiagram.rectangles)
  const loading = useViewModel((vm) => vm.erDiagram.loading)
  
  // エンティティとエッジを更新
  useEffect(() => {
    const entityNodes = convertToReactFlowNodes(viewModelNodes)
    const newEdges = convertToReactFlowEdges(viewModelEdges, viewModelNodes)
    
    // 既存の矩形ノードを保持しながらエンティティノードを更新
    setNodes(currentNodes => {
      const rectangleNodes = currentNodes.filter(n => n.type === 'rectangleNode')
      return [...rectangleNodes, ...entityNodes]
    })
    setEdges(newEdges)
  }, [viewModelNodes, viewModelEdges])
  
  // 矩形が追加・削除・更新されたら、矩形ノードを更新（選択状態を保持するため部分更新）
  useEffect(() => {
    setNodes(currentNodes => {
      const rectangleIds = Object.keys(viewModelRectangles)
      const currentRectangleIds = currentNodes.filter(n => n.type === 'rectangleNode').map(n => n.id)
      
      // 矩形の追加・削除があった場合は全体を再構築
      const added = rectangleIds.filter(id => !currentRectangleIds.includes(id))
      const removed = currentRectangleIds.filter(id => !rectangleIds.includes(id))
      
      if (added.length > 0 || removed.length > 0) {
        const entityNodes = currentNodes.filter(n => n.type === 'entityNode')
        const rectangleNodes = convertToReactFlowRectangles(viewModelRectangles)
        return [...rectangleNodes, ...entityNodes]
      }
      
      // スタイルまたは位置の更新のみの場合は、該当ノードだけを更新
      return currentNodes.map(node => {
        if (node.type === 'rectangleNode') {
          const rectangle = viewModelRectangles[node.id]
          if (rectangle) {
            return {
              ...node,
              position: { x: rectangle.x, y: rectangle.y },
              width: rectangle.width,
              height: rectangle.height,
              data: {
                width: rectangle.width,
                height: rectangle.height,
                fill: rectangle.fill,
                stroke: rectangle.stroke,
                strokeWidth: rectangle.strokeWidth,
                opacity: rectangle.opacity,
              }
            }
          }
        }
        return node
      })
    })
  }, [viewModelRectangles])
  
  const handleReverseEngineer = async () => {
    await commandReverseEngineer(dispatch)
  }
  
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
    }
    dispatch(actionAddRectangle, newRectangle)
  }
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '0.5rem' }}>
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
        <button 
          onClick={handleAddRectangle}
          style={{
            padding: '0.5rem 1rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          矩形追加
        </button>
      </div>
      <ReactFlowProvider>
        <ERCanvasInner 
          nodes={nodes} 
          edges={edges} 
          setNodes={setNodes} 
          setEdges={setEdges} 
          dispatch={dispatch}
          onSelectionChange={onSelectionChange}
        />
      </ReactFlowProvider>
    </div>
  )
}

export default ERCanvas
