import React, { useState, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnSelectionChangeParams,
  useReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  useViewport,
  NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import EntityNode from './EntityNode'
import RelationshipEdge from './RelationshipEdge'
import { convertToReactFlowNodes, convertToReactFlowEdges, computeOptimalHandles } from '../utils/reactFlowConverter'
import { calculateZIndex } from '../utils/zIndexCalculator'
import { useViewModel, useDispatch } from '../store/hooks'
import { commandReverseEngineer } from '../commands/reverseEngineerCommand'
import { actionUpdateNodePositions } from '../actions/dataActions'
import { actionAddRectangle, actionUpdateRectanglePosition, actionUpdateRectangleBounds, actionRemoveRectangle } from '../actions/rectangleActions'
import { actionSelectItem } from '../actions/layerActions'
import type { Rectangle, LayerItemRef } from '../api/client'

const nodeTypes = {
  entityNode: EntityNode,
} as NodeTypes

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
}

// リサイズハンドルコンポーネント
function ResizeHandles({ 
  rectangleId, 
  width, 
  height, 
  onResize 
}: { 
  rectangleId: string
  width: number
  height: number
  onResize: (rectangleId: string, newBounds: { x: number; y: number; width: number; height: number }) => void
}) {
  const dispatch = useDispatch()
  const rectangles = useViewModel((vm) => vm.erDiagram.rectangles)
  const rectangle = rectangles[rectangleId]

  const handleMouseDown = (e: React.MouseEvent, position: string) => {
    e.stopPropagation()
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = width
    const startHeight = height
    const startRectX = rectangle.x
    const startRectY = rectangle.y

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY

      let newBounds = {
        x: startRectX,
        y: startRectY,
        width: startWidth,
        height: startHeight,
      }

      // 各リサイズハンドルの処理
      if (position.includes('right')) {
        newBounds.width = Math.max(50, startWidth + dx)
      }
      if (position.includes('left')) {
        const newWidth = Math.max(50, startWidth - dx)
        newBounds.x = startRectX + (startWidth - newWidth)
        newBounds.width = newWidth
      }
      if (position.includes('bottom')) {
        newBounds.height = Math.max(50, startHeight + dy)
      }
      if (position.includes('top')) {
        const newHeight = Math.max(50, startHeight - dy)
        newBounds.y = startRectY + (startHeight - newHeight)
        newBounds.height = newHeight
      }

      onResize(rectangleId, newBounds)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    background: '#1976d2',
    border: '1px solid white',
    zIndex: 10,
  }

  const cornerSize = 8
  const edgeSize = 6

  return (
    <>
      {/* 四隅のハンドル */}
      <div
        style={{ ...handleStyle, width: cornerSize, height: cornerSize, top: -cornerSize / 2, left: -cornerSize / 2, cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'top-left')}
      />
      <div
        style={{ ...handleStyle, width: cornerSize, height: cornerSize, top: -cornerSize / 2, right: -cornerSize / 2, cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'top-right')}
      />
      <div
        style={{ ...handleStyle, width: cornerSize, height: cornerSize, bottom: -cornerSize / 2, left: -cornerSize / 2, cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
      />
      <div
        style={{ ...handleStyle, width: cornerSize, height: cornerSize, bottom: -cornerSize / 2, right: -cornerSize / 2, cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
      />
      {/* 四辺のハンドル */}
      <div
        style={{ ...handleStyle, width: edgeSize, height: '50%', top: '25%', left: -edgeSize / 2, cursor: 'ew-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'left')}
      />
      <div
        style={{ ...handleStyle, width: edgeSize, height: '50%', top: '25%', right: -edgeSize / 2, cursor: 'ew-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'right')}
      />
      <div
        style={{ ...handleStyle, width: '50%', height: edgeSize, left: '25%', top: -edgeSize / 2, cursor: 'ns-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'top')}
      />
      <div
        style={{ ...handleStyle, width: '50%', height: edgeSize, left: '25%', bottom: -edgeSize / 2, cursor: 'ns-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'bottom')}
      />
    </>
  )
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
  const viewport = useViewport()
  
  // Store購読
  const layerOrder = useViewModel((vm) => vm.erDiagram.ui.layerOrder)
  const rectangles = useViewModel((vm) => vm.erDiagram.rectangles)
  const selectedItem = useViewModel((vm) => vm.ui.selectedItem)
  
  // ドラッグ状態管理
  const [draggingRect, setDraggingRect] = useState<{ id: string; startX: number; startY: number; rectStartX: number; rectStartY: number } | null>(null)
  
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  )
  
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
      if (node.type === 'entityNode') {
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
      // エンティティノードが選択された場合は選択解除
      if (params.nodes.length > 0) {
        dispatch(actionSelectItem, null)
      }
    },
    [dispatch]
  )
  
  // 矩形のドラッグ処理
  const handleRectangleMouseDown = useCallback((e: React.MouseEvent, rectangleId: string) => {
    e.stopPropagation()
    
    const rectangle = rectangles[rectangleId]
    if (!rectangle) return
    
    // 選択状態を更新
    dispatch(actionSelectItem, { kind: 'rectangle', id: rectangleId } as LayerItemRef)
    
    setDraggingRect({
      id: rectangleId,
      startX: e.clientX,
      startY: e.clientY,
      rectStartX: rectangle.x,
      rectStartY: rectangle.y,
    })
  }, [rectangles, dispatch])
  
  // マウスムーブ時のドラッグ処理
  useEffect(() => {
    if (!draggingRect) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - draggingRect.startX) / viewport.zoom
      const dy = (e.clientY - draggingRect.startY) / viewport.zoom
      
      const newX = draggingRect.rectStartX + dx
      const newY = draggingRect.rectStartY + dy
      
      dispatch(actionUpdateRectanglePosition, draggingRect.id, newX, newY)
    }
    
    const handleMouseUp = () => {
      setDraggingRect(null)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingRect, viewport.zoom, dispatch])
  
  // リサイズハンドラー
  const handleResize = useCallback((rectangleId: string, newBounds: { x: number; y: number; width: number; height: number }) => {
    dispatch(actionUpdateRectangleBounds, rectangleId, newBounds)
  }, [dispatch])
  
  // 矩形の描画（ViewportPortal使用）
  const renderRectangles = (items: readonly any[]) => {
    return items.map((item) => {
      if (item.kind !== 'rectangle') return null
      
      const rectangle = rectangles[item.id]
      if (!rectangle) return null
      
      const zIndex = calculateZIndex(layerOrder as any, item as LayerItemRef)
      const isSelected = selectedItem?.kind === 'rectangle' && selectedItem.id === item.id
      
      return (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: rectangle.x,
            top: rectangle.y,
            width: rectangle.width,
            height: rectangle.height,
            border: `${rectangle.strokeWidth}px solid ${rectangle.stroke}`,
            backgroundColor: rectangle.fill,
            opacity: rectangle.opacity,
            zIndex,
            cursor: 'move',
            boxSizing: 'border-box',
            outline: isSelected ? '2px solid #1976d2' : 'none',
            outlineOffset: '2px',
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => handleRectangleMouseDown(e, item.id)}
          onClick={(e) => {
            e.stopPropagation()
            dispatch(actionSelectItem, item)
          }}
        >
          {isSelected && (
            <ResizeHandles 
              rectangleId={item.id} 
              width={rectangle.width} 
              height={rectangle.height}
              onResize={handleResize}
            />
          )}
        </div>
      )
    })
  }
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onSelectionChange={handleSelectionChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      elevateNodesOnSelect={false}
      elevateEdgesOnSelect={false}
      fitView
    >
      {/* 背面矩形 */}
      <ViewportPortal>
        {renderRectangles(layerOrder.backgroundItems)}
      </ViewportPortal>
      
      {/* 前面矩形 */}
      <ViewportPortal>
        {renderRectangles(layerOrder.foregroundItems)}
      </ViewportPortal>
      
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
  const loading = useViewModel((vm) => vm.erDiagram.loading)
  
  // エンティティとエッジを更新
  useEffect(() => {
    const entityNodes = convertToReactFlowNodes(viewModelNodes)
    const newEdges = convertToReactFlowEdges(viewModelEdges, viewModelNodes)
    
    setNodes(entityNodes)
    setEdges(newEdges)
  }, [viewModelNodes, viewModelEdges])
  
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
