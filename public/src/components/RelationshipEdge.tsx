import React from 'react'
import { EdgeProps, getSmoothStepPath } from 'reactflow'
import { useHover } from '../contexts/HoverContext'

function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const { hoverState, setHoverEdge, clearHover } = useHover()
  
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  
  // このエッジがハイライト対象かどうか
  const isHighlighted = hoverState.highlightedEdges.has(id)
  // 他の要素がホバー中でこのエッジがハイライト対象でない場合
  const isDimmed = hoverState.elementType !== null && !isHighlighted
  
  return (
    <g
      onMouseEnter={() => setHoverEdge(id)}
      onMouseLeave={clearHover}
      style={{ 
        cursor: 'pointer',
        zIndex: isHighlighted ? 999 : 0,
      }}
    >
      <path
        id={id}
        d={edgePath}
        style={{
          stroke: isHighlighted ? '#007bff' : '#333',
          strokeWidth: isHighlighted ? 4 : 2,
          fill: 'none',
          opacity: isDimmed ? 0.2 : 1,
          transition: 'all 0.2s ease-in-out',
        }}
      />
      {data?.constraintName && (
        <text style={{ opacity: isDimmed ? 0.2 : 1 }}>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {data.constraintName}
          </textPath>
        </text>
      )}
    </g>
  )
}

export default RelationshipEdge
