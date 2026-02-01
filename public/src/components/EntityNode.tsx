import React, { useCallback } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import type { Column } from '../api/client'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionHoverEntity, actionHoverColumn, actionClearHover } from '../actions/hoverActions'
import { actionSelectItem } from '../actions/layerActions'
import EntityColumn from './EntityColumn'

interface EntityNodeData {
  id: string
  name: string
  columns: Column[]
  ddl: string
}

function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const dispatch = useDispatch()
  
  // このノードがハイライトされているかどうかだけを購読（最適化）
  const isHighlighted = useViewModel(
    (vm) => vm.erDiagram.ui.highlightedNodeIds.includes(data.id),
    (a, b) => a === b
  )
  const isDraggingEntity = useViewModel((vm) => vm.erDiagram.ui.isDraggingEntity)
  
  // 選択状態の購読
  const isSelected = useViewModel(
    (vm) => vm.ui.selectedItem?.kind === 'entity' && vm.ui.selectedItem.id === data.id,
    (a, b) => a === b
  )
  
  // クリックイベントハンドラー
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(actionSelectItem, { kind: 'entity', id: data.id })
  }, [dispatch, data.id])
  
  // カラムホバーハンドラー
  const handleColumnMouseEnter = useCallback((e: React.MouseEvent, columnId: string) => {
    e.stopPropagation()
    dispatch(actionHoverColumn, columnId)
  }, [dispatch])
  
  const handleColumnMouseLeave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(actionClearHover)
  }, [dispatch])
  
  return (
    <div 
      className={(isHighlighted || isSelected) ? 'entity-node is-highlighted' : 'entity-node'}
      style={{ 
        border: (isHighlighted || isSelected) ? '3px solid #007bff' : '1px solid #333', 
        borderRadius: '4px', 
        background: 'white',
        minWidth: '200px',
        boxShadow: (isHighlighted || isSelected) ? '0 4px 12px rgba(0, 123, 255, 0.4)' : 'none',
        zIndex: (isHighlighted || isSelected) ? 1000 : 1,
      }}
      onMouseEnter={() => dispatch(actionHoverEntity, data.id)}
      onMouseLeave={() => dispatch(actionClearHover)}
      onClick={handleClick}
    >
      {/* Target handles (4 directions) */}
      <Handle type="target" id="t-top" position={Position.Top} style={{ width: 8, height: 8, opacity: 0 }} />
      <Handle type="target" id="t-right" position={Position.Right} style={{ width: 8, height: 8, opacity: 0 }} />
      <Handle type="target" id="t-bottom" position={Position.Bottom} style={{ width: 8, height: 8, opacity: 0 }} />
      <Handle type="target" id="t-left" position={Position.Left} style={{ width: 8, height: 8, opacity: 0 }} />

      {/* Source handles (4 directions) */}
      <Handle type="source" id="s-top" position={Position.Top} style={{ width: 8, height: 8, opacity: 0 }} />
      <Handle type="source" id="s-right" position={Position.Right} style={{ width: 8, height: 8, opacity: 0 }} />
      <Handle type="source" id="s-bottom" position={Position.Bottom} style={{ width: 8, height: 8, opacity: 0 }} />
      <Handle type="source" id="s-left" position={Position.Left} style={{ width: 8, height: 8, opacity: 0 }} />

      <div style={{ 
        background: '#333', 
        color: 'white', 
        padding: '8px',
        fontWeight: 'bold',
      }}>
        {data.name}
      </div>
      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        padding: '4px',
      }}>
        {data.columns.map((col, index) => (
          <EntityColumn
            key={index}
            column={col}
            onMouseEnter={handleColumnMouseEnter}
            onMouseLeave={handleColumnMouseLeave}
          />
        ))}
      </div>
    </div>
  )
}

const MemoizedEntityNode = React.memo(EntityNode)
export default MemoizedEntityNode
