import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import type { Column } from '../api/client'
import { useHover } from '../contexts/HoverContext'

interface EntityNodeData {
  id: string
  name: string
  columns: Column[]
  ddl: string
}

function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const { hoverState, setHoverEntity, setHoverColumn, clearHover } = useHover()
  
  // このノードがハイライト対象かどうか
  const isHighlighted = hoverState.highlightedNodes.has(data.id)
  // 他の要素がホバー中でこのノードがハイライト対象でない場合
  const isDimmed = hoverState.elementType !== null && !isHighlighted
  
  // カラムホバーハンドラー
  const handleColumnMouseEnter = (e: React.MouseEvent, columnName: string) => {
    e.stopPropagation()
    setHoverColumn(data.id, columnName)
  }
  
  const handleColumnMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearHover()
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
      onMouseEnter={() => setHoverEntity(data.id)}
      onMouseLeave={clearHover}
    >
      <Handle type="target" position={Position.Top} />
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
          const isColumnHighlighted = 
            hoverState.highlightedColumns.get(data.id)?.has(col.name) || false
          
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
              onMouseEnter={(e) => handleColumnMouseEnter(e, col.name)}
              onMouseLeave={handleColumnMouseLeave}
            >
              {col.key === 'PRI' && '🔑 '}
              {col.key === 'MUL' && '🔗 '}
              {col.name}: {col.type}
            </div>
          )
        })}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default EntityNode
