import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import type { Column } from '../api/client'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionHoverEntity, actionHoverColumn, actionClearHover } from '../actions/hoverActions'

interface EntityNodeData {
  id: string
  name: string
  columns: Column[]
  ddl: string
}

function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const dispatch = useDispatch()
  
  // UIステートから必要な部分だけ購読
  const highlightedNodeIds = useViewModel((vm) => vm.erDiagram.ui.highlightedNodeIds)
  const highlightedColumnIds = useViewModel((vm) => vm.erDiagram.ui.highlightedColumnIds)
  const hasHover = useViewModel((vm) => vm.erDiagram.ui.hover !== null)
  
  // このノードがハイライト対象かどうか
  const isHighlighted = highlightedNodeIds.includes(data.id)
  // 他の要素がホバー中でこのノードがハイライト対象でない場合
  const isDimmed = hasHover && !isHighlighted
  
  // カラムホバーハンドラー
  const handleColumnMouseEnter = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation()
    dispatch(actionHoverColumn, columnId)
  }
  
  const handleColumnMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(actionClearHover)
  }
  
  return (
    <div 
      style={{ 
        border: isHighlighted ? '3px solid #007bff' : '1px solid #333', 
        borderRadius: '4px', 
        background: 'white',
        minWidth: '200px',
        opacity: isDimmed ? 0.2 : 1,
        boxShadow: isHighlighted ? '0 4px 12px rgba(0, 123, 255, 0.4)' : 'none',
        zIndex: isHighlighted ? 1000 : 1,
        transition: 'all 0.2s ease-in-out',
      }}
      onMouseEnter={() => dispatch(actionHoverEntity, data.id)}
      onMouseLeave={() => dispatch(actionClearHover)}
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
        {data.columns.map((col, index) => {
          const isColumnHighlighted = highlightedColumnIds.includes(col.id)
          
          return (
            <div 
              key={index} 
              style={{ 
                padding: '4px',
                borderBottom: '1px solid #eee',
                fontSize: '12px',
                backgroundColor: isColumnHighlighted ? '#e3f2fd' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease-in-out',
              }}
              onMouseEnter={(e) => handleColumnMouseEnter(e, col.id)}
              onMouseLeave={handleColumnMouseLeave}
            >
              {col.key === 'PRI' && '🔑 '}
              {col.key === 'MUL' && '🔗 '}
              {col.name}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EntityNode
