import React from 'react'
import type { Column } from '../api/client'
import { useViewModel } from '../store/hooks'

interface EntityColumnProps {
  column: Column
  onMouseEnter: (e: React.MouseEvent, columnId: string) => void
  onMouseLeave: (e: React.MouseEvent) => void
}

function EntityColumn({ column, onMouseEnter, onMouseLeave }: EntityColumnProps) {
  // このカラムがハイライトされているかどうかだけを購読
  const isHighlighted = useViewModel(
    (vm) => vm.erDiagram.ui.highlightedColumnIds.includes(column.id),
    (a, b) => a === b
  )
  
  return (
    <div 
      style={{ 
        padding: '4px',
        borderBottom: '1px solid #eee',
        fontSize: '12px',
        backgroundColor: isHighlighted ? '#e3f2fd' : 'transparent',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => onMouseEnter(e, column.id)}
      onMouseLeave={onMouseLeave}
    >
      {column.key === 'PRI' && '🔑 '}
      {column.key === 'MUL' && '🔗 '}
      {column.name}
    </div>
  )
}

export default React.memo(EntityColumn)
