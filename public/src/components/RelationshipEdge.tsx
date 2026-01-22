import React from 'react'
import { EdgeProps, getSmoothStepPath } from 'reactflow'
import { useERViewModel, useERDispatch } from '../store/hooks'
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
  const dispatch = useERDispatch()
  
  // UIステートから必要な部分だけ購読
  const highlightedEdgeIds = useERViewModel((vm) => vm.ui.highlightedEdgeIds)
  const hasHover = useERViewModel((vm) => vm.ui.hover !== null)
  
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  
  // このエッジがハイライト対象かどうか
  const isHighlighted = highlightedEdgeIds.includes(id)
  // 他の要素がホバー中でこのエッジがハイライト対象でない場合
  const isDimmed = hasHover && !isHighlighted
  
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
          opacity: isDimmed ? 0.2 : 1,
          transition: 'all 0.2s ease-in-out',
        }}
      />
    </g>
  )
}

export default RelationshipEdge
