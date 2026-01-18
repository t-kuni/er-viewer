import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface EntityNodeData {
  id: string
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    key: string
    default: string | null
    extra: string
  }>
  ddl: string
}

function EntityNode({ data }: NodeProps<EntityNodeData>) {
  return (
    <div style={{ 
      border: '1px solid #333', 
      borderRadius: '4px', 
      background: 'white',
      minWidth: '200px',
    }}>
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
        {data.columns.map((col, index) => (
          <div key={index} style={{ 
            padding: '4px',
            borderBottom: '1px solid #eee',
            fontSize: '12px',
          }}>
            {col.key === 'PRI' && '🔑 '}
            {col.key === 'MUL' && '🔗 '}
            {col.name}: {col.type}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default EntityNode
