import React, { useState, useCallback, useEffect, useRef } from 'react'
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
  useNodesInitialized,
  useKeyPress,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import EntityNode from './EntityNode'
import RelationshipEdge from './RelationshipEdge'
import SelfRelationshipEdge from './SelfRelationshipEdge'
import { convertToReactFlowNodes, convertToReactFlowEdges, computeOptimalHandles } from '../utils/reactFlowConverter'
import { calculateZIndex } from '../actions/layerActions'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionUpdateNodePositions, actionUpdateNodeSizes } from '../actions/dataActions'
import { actionAddRectangle, actionUpdateRectanglePosition, actionUpdateRectangleBounds, actionRemoveRectangle } from '../actions/rectangleActions'
import { actionAddText, actionRemoveText, actionUpdateTextPosition, actionUpdateTextBounds, actionSetTextAutoSizeMode, actionUpdateTextContent } from '../actions/textActions'
import { actionSelectItem } from '../actions/layerActions'
import { actionStartEntityDrag, actionStopEntityDrag, actionClearHover } from '../actions/hoverActions'
import type { Rectangle, TextBox, LayerItemRef, TextAlign, TextVerticalAlign, TextOverflowMode, TextAutoSizeMode } from '../api/client'

const nodeTypes = {
  entityNode: EntityNode,
} as NodeTypes

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
  selfRelationshipEdge: SelfRelationshipEdge,
}

// HEXカラーをRGBAに変換するヘルパー関数
function hexToRgba(hex: string, alpha: number): string {
  // "#RRGGBB" 形式を想定
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// リサイズハンドルコンポーネント
function ResizeHandles({ 
  rectangleId, 
  width, 
  height,
  x,
  y,
  onResize 
}: { 
  rectangleId: string
  width: number
  height: number
  x: number
  y: number
  onResize: (rectangleId: string, newBounds: { x: number; y: number; width: number; height: number }) => void
}) {
  const handleMouseDown = (e: React.MouseEvent, position: string) => {
    e.stopPropagation()
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = width
    const startHeight = height
    const startRectX = x
    const startRectY = y

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
  onSelectionChange,
  onNodesInitialized
}: { 
  nodes: Node[], 
  edges: Edge[], 
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>, 
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  dispatch: ReturnType<typeof useDispatch>,
  onSelectionChange?: (rectangleId: string | null) => void,
  onNodesInitialized?: (initialized: boolean) => void
}) {
  const { getNodes } = useReactFlow()
  const viewport = useViewport()
  const nodesInitialized = useNodesInitialized()
  
  // ノード初期化状態を親に通知
  useEffect(() => {
    if (onNodesInitialized) {
      onNodesInitialized(nodesInitialized)
    }
  }, [nodesInitialized, onNodesInitialized])
  
  // ノードサイズ計測・更新処理
  const [hasMeasuredSizes, setHasMeasuredSizes] = useState(false)
  
  useEffect(() => {
    // 初期化完了時（false → true）に一度だけ計測
    if (nodesInitialized && !hasMeasuredSizes) {
      const currentNodes = getNodes()
      const updates = currentNodes
        .filter(node => node.type === 'entityNode' && node.measured)
        .map(node => ({
          id: node.id,
          width: node.measured!.width || 0,
          height: node.measured!.height || 0,
        }))
        .filter(update => update.width > 0 && update.height > 0)
      
      if (updates.length > 0) {
        dispatch(actionUpdateNodeSizes, updates)
        setHasMeasuredSizes(true)
      }
    }
  }, [nodesInitialized, hasMeasuredSizes, getNodes, dispatch])
  
  // Store購読
  const layerOrder = useViewModel((vm) => vm.erDiagram.ui.layerOrder)
  const rectangles = useViewModel((vm) => vm.erDiagram.rectangles)
  const texts = useViewModel((vm) => vm.erDiagram.texts)
  const selectedItem = useViewModel((vm) => vm.ui.selectedItem)
  
  // 空テキストの自動削除
  const prevSelectedItem = useRef<typeof selectedItem>(null)
  
  useEffect(() => {
    const prev = prevSelectedItem.current
    
    // 前回選択されていたアイテムがテキストで、現在は別のアイテム（またはnull）が選択されている場合
    if (prev && prev.kind === 'text' && 
        (!selectedItem || selectedItem.kind !== prev.kind || selectedItem.id !== prev.id)) {
      const text = texts[prev.id]
      if (text && text.content === '') {
        dispatch(actionRemoveText, prev.id)
      }
    }
    
    prevSelectedItem.current = selectedItem
  }, [selectedItem, texts, dispatch])
  
  // ESCキーで選択解除
  const escPressed = useKeyPress('Escape')
  
  useEffect(() => {
    if (escPressed) {
      dispatch(actionSelectItem, null)
    }
  }, [escPressed, dispatch])
  
  // テキスト編集状態管理（スペースキー処理で使用するため、先に宣言）
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [draftContent, setDraftContent] = useState<string>('')
  
  // スペースキー押下状態の管理（パンスクロール機能用）
  const spacePressed = useKeyPress('Space')
  // テキスト編集中のスペースキー無効化
  const effectiveSpacePressed = spacePressed && editingTextId === null
  
  // パン中状態の管理（カーソル制御用）
  const [isPanning, setIsPanning] = useState(false)
  
  // スペースキー押下時にホバー状態をクリア
  useEffect(() => {
    if (effectiveSpacePressed) {
      dispatch(actionClearHover)
    }
  }, [effectiveSpacePressed, dispatch])
  
  // ドラッグ状態管理
  const [draggingRect, setDraggingRect] = useState<{ id: string; startX: number; startY: number; rectStartX: number; rectStartY: number } | null>(null)
  const [draggingText, setDraggingText] = useState<{ id: string; startX: number; startY: number; textStartX: number; textStartY: number } | null>(null)
  
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  )
  
  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
      if (node.type === 'entityNode') {
        dispatch(actionStartEntityDrag)
      }
    },
    [dispatch]
  )

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
      if (node.type === 'entityNode') {
        // 1) 選択中のentityNodeを全取得
        const selectedEntityNodes = getNodes().filter(
          (n) => n.type === 'entityNode' && n.selected
        )
        
        // フォールバック: 選択が取れていないケースは、ドラッグ対象ノードだけ確定
        const movedNodes = selectedEntityNodes.length > 0 ? selectedEntityNodes : [node]
        
        // 2) Store(ViewModel)へ一括確定
        dispatch(
          actionUpdateNodePositions,
          movedNodes.map((n) => ({
            id: n.id,
            x: n.position.x,
            y: n.position.y,
          }))
        )
        
        // 3) 影響を受けるエッジを抽出
        const movedIds = new Set(movedNodes.map((n) => n.id))
        const connectedEdges = edges.filter(
          (edge) => movedIds.has(edge.source) || movedIds.has(edge.target)
        )

        if (connectedEdges.length === 0) {
          // ドラッグ終了をdispatch
          dispatch(actionStopEntityDrag)
          return
        }

        // 4) 全ノードの現在位置とサイズを取得
        const currentNodes = getNodes()

        // 5) 接続エッジのハンドルを再計算
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
        
        // ドラッグ終了をdispatch
        dispatch(actionStopEntityDrag)
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
  
  // 空白部分クリック時の処理
  const handlePaneClick = useCallback(() => {
    // 空白部分がクリックされたら選択を解除
    dispatch(actionSelectItem, null)
  }, [dispatch])
  
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
  
  // マウスムーブ時のドラッグ処理（矩形）
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
  
  // マウスムーブ時のドラッグ処理（テキスト）
  useEffect(() => {
    if (!draggingText) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - draggingText.startX) / viewport.zoom
      const dy = (e.clientY - draggingText.startY) / viewport.zoom
      
      const newX = draggingText.textStartX + dx
      const newY = draggingText.textStartY + dy
      
      dispatch(actionUpdateTextPosition, draggingText.id, newX, newY)
    }
    
    const handleMouseUp = () => {
      setDraggingText(null)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingText, viewport.zoom, dispatch])
  
  // F2キーでテキスト編集モード開始
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && selectedItem?.kind === 'text' && !editingTextId) {
        const text = texts[selectedItem.id]
        if (text) {
          setEditingTextId(selectedItem.id)
          setDraftContent(text.content)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedItem, editingTextId, texts])
  
  // リサイズハンドラー（矩形）
  const handleResize = useCallback((rectangleId: string, newBounds: { x: number; y: number; width: number; height: number }) => {
    dispatch(actionUpdateRectangleBounds, rectangleId, newBounds)
  }, [dispatch])
  
  // テキストのドラッグ処理
  const handleTextMouseDown = useCallback((e: React.MouseEvent, textId: string) => {
    e.stopPropagation()
    
    const text = texts[textId]
    if (!text) return
    
    // 選択状態を更新
    dispatch(actionSelectItem, { kind: 'text', id: textId } as LayerItemRef)
    
    setDraggingText({
      id: textId,
      startX: e.clientX,
      startY: e.clientY,
      textStartX: text.x,
      textStartY: text.y,
    })
  }, [texts, dispatch])
  
  // リサイズハンドラー（テキスト）
  const handleTextResize = useCallback((textId: string, newBounds: { x: number; y: number; width: number; height: number }) => {
    dispatch(actionUpdateTextBounds, textId, newBounds)
    dispatch(actionSetTextAutoSizeMode, textId, 'manual')
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
              x={rectangle.x}
              y={rectangle.y}
              onResize={handleResize}
            />
          )}
        </div>
      )
    })
  }
  
  // テキストの描画（ViewportPortal使用）
  const renderTexts = (items: readonly any[]) => {
    return items.map((item) => {
      if (item.kind !== 'text') return null
      
      const text = texts[item.id]
      if (!text) return null
      
      const zIndex = calculateZIndex(layerOrder as any, item as LayerItemRef)
      const isSelected = selectedItem?.kind === 'text' && selectedItem.id === item.id
      
      // 文字のドロップシャドウ（textShadow、spreadなし）
      const textShadow = text.textShadow.enabled
        ? (() => {
            const shadowColor = hexToRgba(text.textShadow.color, text.textShadow.opacity);
            return `${text.textShadow.offsetX}px ${text.textShadow.offsetY}px ${text.textShadow.blur}px ${shadowColor}`;
          })()
        : 'none';
      
      // 背景矩形のドロップシャドウ（boxShadow）
      const boxShadow = text.backgroundShadow.enabled && text.backgroundEnabled
        ? (() => {
            const shadowColor = hexToRgba(text.backgroundShadow.color, text.backgroundShadow.opacity);
            return `${text.backgroundShadow.offsetX}px ${text.backgroundShadow.offsetY}px ${text.backgroundShadow.blur}px ${text.backgroundShadow.spread}px ${shadowColor}`;
          })()
        : 'none';
      
      // 文字色（透明度を含む）
      const textColor = hexToRgba(text.textColor, text.opacity);
      
      // 背景色（透明度を含む）
      const backgroundColor = text.backgroundEnabled
        ? hexToRgba(text.backgroundColor, text.backgroundOpacity)
        : 'transparent';
      
      // 垂直配置の設定
      const justifyContent = text.textVerticalAlign === 'top' ? 'flex-start'
        : text.textVerticalAlign === 'middle' ? 'center'
        : 'flex-end';
      
      return (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: text.x,
            top: text.y,
            width: text.width,
            height: text.height,
            backgroundColor,
            boxShadow,
            cursor: 'move',
            boxSizing: 'border-box',
            outline: isSelected ? '2px solid #1976d2' : 'none',
            outlineOffset: '2px',
            pointerEvents: 'auto',
            zIndex,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: justifyContent,
            overflow: text.overflow === 'scroll' ? 'auto' : 'hidden',
          }}
          onMouseDown={(e) => handleTextMouseDown(e, item.id)}
          onClick={(e) => {
            e.stopPropagation()
            dispatch(actionSelectItem, item)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setEditingTextId(item.id)
            setDraftContent(text.content)
          }}
        >
          <div
            style={{
              color: textColor,
              padding: `${text.paddingY}px ${text.paddingX}px`,
              textAlign: text.textAlign,
              whiteSpace: 'pre-wrap',
              overflowWrap: text.wrap ? 'anywhere' : 'normal',
              wordBreak: text.wrap ? 'break-word' : 'normal',
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
              fontSize: `${text.fontSize}px`,
              lineHeight: `${text.lineHeight}px`,
              textShadow,
            }}
          >
            {text.content}
          </div>
          {isSelected && (
            <ResizeHandles 
              rectangleId={item.id} 
              width={text.width} 
              height={text.height}
              x={text.x}
              y={text.y}
              onResize={handleTextResize}
            />
          )}
        </div>
      )
    })
  }
  
  // テキスト編集確定処理
  const handleEditConfirm = useCallback(() => {
    if (editingTextId) {
      dispatch(actionUpdateTextContent, editingTextId, draftContent)
      
      // autoSizeModeに応じてDOM測定を実行
      const text = texts[editingTextId]
      if (text && (text.autoSizeMode === 'fitContent' || text.autoSizeMode === 'fitWidth')) {
        // DOM測定
        const measureDiv = document.createElement('div')
        measureDiv.style.position = 'absolute'
        measureDiv.style.visibility = 'hidden'
        measureDiv.style.fontSize = `${text.fontSize}px`
        measureDiv.style.lineHeight = `${text.lineHeight}px`
        measureDiv.style.padding = `${text.paddingY}px ${text.paddingX}px`
        measureDiv.style.whiteSpace = 'pre-wrap'
        measureDiv.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif'
        
        if (text.wrap) {
          measureDiv.style.overflowWrap = 'anywhere'
          measureDiv.style.wordBreak = 'break-word'
          if (text.autoSizeMode === 'fitWidth') {
            measureDiv.style.width = `${text.width}px`
          }
        }
        
        measureDiv.textContent = draftContent || ' '
        document.body.appendChild(measureDiv)
        
        const measuredWidth = measureDiv.scrollWidth
        const measuredHeight = measureDiv.scrollHeight
        
        document.body.removeChild(measureDiv)
        
        if (text.autoSizeMode === 'fitContent') {
          dispatch(actionUpdateTextBounds, editingTextId, {
            x: text.x,
            y: text.y,
            width: Math.max(40, measuredWidth),
            height: Math.max(20, measuredHeight),
          })
        } else if (text.autoSizeMode === 'fitWidth') {
          dispatch(actionUpdateTextBounds, editingTextId, {
            x: text.x,
            y: text.y,
            width: text.width,
            height: Math.max(20, measuredHeight),
          })
        }
      }
      
      setEditingTextId(null)
      setDraftContent('')
    }
  }, [editingTextId, draftContent, texts, dispatch])
  
  // パン開始・終了イベントハンドラー（カーソル制御用）
  const handleMoveStart = useCallback(() => {
    if (effectiveSpacePressed) {
      setIsPanning(true)
    }
  }, [effectiveSpacePressed])
  
  const handleMoveEnd = useCallback(() => {
    setIsPanning(false)
  }, [])
  
  // カーソルスタイルの決定
  const cursorStyle = effectiveSpacePressed ? (isPanning ? 'grabbing' : 'grab') : undefined
  
  return (
    <div style={{ width: '100%', height: '100%', cursor: cursorStyle }}>
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
        {/* 背面レイヤー */}
        <ViewportPortal>
          {renderRectangles(layerOrder.backgroundItems)}
          {renderTexts(layerOrder.backgroundItems)}
        </ViewportPortal>
        
        {/* 前面レイヤー */}
        <ViewportPortal>
          {renderRectangles(layerOrder.foregroundItems)}
          {renderTexts(layerOrder.foregroundItems)}
        </ViewportPortal>
        
        {/* テキスト編集UI */}
        {editingTextId && texts[editingTextId] && (
          <ViewportPortal>
            {(() => {
              const text = texts[editingTextId]
              const textShadow = text.textShadow.enabled
                ? (() => {
                    const shadowColor = hexToRgba(text.textShadow.color, text.textShadow.opacity);
                    return `${text.textShadow.offsetX}px ${text.textShadow.offsetY}px ${text.textShadow.blur}px ${shadowColor}`;
                  })()
                : 'none';
              
              const boxShadow = text.backgroundShadow.enabled && text.backgroundEnabled
                ? (() => {
                    const shadowColor = hexToRgba(text.backgroundShadow.color, text.backgroundShadow.opacity);
                    return `${text.backgroundShadow.offsetX}px ${text.backgroundShadow.offsetY}px ${text.backgroundShadow.blur}px ${text.backgroundShadow.spread}px ${shadowColor}`;
                  })()
                : 'none';
              
              const textColor = hexToRgba(text.textColor, text.opacity);
              const backgroundColor = text.backgroundEnabled
                ? hexToRgba(text.backgroundColor, text.backgroundOpacity)
                : 'rgba(255, 255, 255, 0.95)';
              
              return (
                <textarea
                  autoFocus
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  onBlur={handleEditConfirm}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingTextId(null)
                      setDraftContent('')
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      handleEditConfirm()
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: text.x,
                    top: text.y,
                    width: text.width,
                    height: text.height,
                    padding: `${text.paddingY}px ${text.paddingX}px`,
                    fontSize: `${text.fontSize}px`,
                    lineHeight: `${text.lineHeight}px`,
                    color: textColor,
                    textAlign: text.textAlign,
                    outline: '2px solid #3b82f6',
                    backgroundColor,
                    boxShadow,
                    resize: 'none',
                    overflow: 'auto',
                    boxSizing: 'border-box',
                    zIndex: 10000,
                    border: 'none',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
                    textShadow,
                  }}
                />
              )
            })()}
          </ViewportPortal>
        )}
        
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}

interface ERCanvasProps {
  onSelectionChange?: (rectangleId: string | null) => void
  onNodesInitialized?: (initialized: boolean) => void
}

function ERCanvas({ onSelectionChange, onNodesInitialized }: ERCanvasProps = {}) {
  const dispatch = useDispatch()
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  
  // Storeから状態を購読
  const viewModelNodes = useViewModel((vm) => vm.erDiagram.nodes)
  const viewModelEdges = useViewModel((vm) => vm.erDiagram.edges)
  const highlightedEdgeIds = useViewModel((vm) => vm.erDiagram.ui.highlightedEdgeIds)
  
  // ホバー状態を購読（真偽値のみ）
  const hasHover = useViewModel(
    (vm) => vm.erDiagram.ui.hover !== null,
    (a, b) => a === b
  )
  
  // エンティティノードを更新
  useEffect(() => {
    const entityNodes = convertToReactFlowNodes(viewModelNodes)
    setNodes(entityNodes)
  }, [viewModelNodes])
  
  // エッジを更新（highlightedEdgeIds変更時も再構築）
  useEffect(() => {
    const newEdges = convertToReactFlowEdges(viewModelEdges, viewModelNodes, highlightedEdgeIds)
    setEdges(newEdges)
  }, [viewModelEdges, viewModelNodes, highlightedEdgeIds])
  
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
      opacity: 1.0,
    }
    dispatch(actionAddRectangle, newRectangle)
  }
  
  const handleAddText = () => {
    const newText: TextBox = {
      id: crypto.randomUUID(),
      x: 0, // viewport中央に配置する実装は後回し、まずは固定座標
      y: 0,
      width: 200,
      height: 80,
      content: 'テキスト',
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'left' as TextAlign,
      textVerticalAlign: 'top' as TextVerticalAlign,
      textColor: '#000000',
      opacity: 1.0,
      paddingX: 8,
      paddingY: 8,
      wrap: true,
      overflow: 'clip' as TextOverflowMode,
      autoSizeMode: 'manual' as TextAutoSizeMode,
      backgroundColor: '#FFFFFF',
      backgroundEnabled: false,
      backgroundOpacity: 1.0,
      textShadow: {
        enabled: false,
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        spread: 0,
        color: '#000000',
        opacity: 0.3,
      },
      backgroundShadow: {
        enabled: false,
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        spread: 0,
        color: '#000000',
        opacity: 0.3,
      },
    }
    const newViewModel = dispatch(actionAddText, newText)
    dispatch(actionSelectItem, { kind: 'text', id: newText.id })
  }
  
  return (
    <div className={hasHover ? 'er-canvas has-hover' : 'er-canvas'} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '0.5rem' }}>
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
        <button 
          onClick={handleAddText}
          style={{
            padding: '0.5rem 1rem',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          テキスト追加
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
          onNodesInitialized={onNodesInitialized}
        />
      </ReactFlowProvider>
    </div>
  )
}

export default ERCanvas
