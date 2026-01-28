import React from 'react'
import { EdgeProps, getSmoothStepPath } from '@xyflow/react'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionHoverEdge, actionClearHover } from '../actions/hoverActions'

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
  const dispatch = useDispatch()
  
  // このエッジがハイライトされているかどうかだけを購読（最適化）
  const isHighlighted = useViewModel(
    (vm) => vm.erDiagram.ui.highlightedEdgeIds.includes(id),
    (a, b) => a === b
  )
  
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  
  return (
    <g
      onMouseEnter={() => dispatch(actionHoverEdge, id)}
      onMouseLeave={() => dispatch(actionClearHover)}
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
        }}
      />
    </g>
  )
}

const MemoizedRelationshipEdge = React.memo(RelationshipEdge)
export default MemoizedRelationshipEdge
