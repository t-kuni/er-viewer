import React from 'react'
import { EdgeProps, getSmoothStepPath } from 'reactflow'

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
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  
  return (
    <>
      <path
        id={id}
        d={edgePath}
        style={{
          stroke: '#333',
          strokeWidth: 2,
          fill: 'none',
        }}
      />
      {data?.constraintName && (
        <text>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {data.constraintName}
          </textPath>
        </text>
      )}
    </>
  )
}

export default RelationshipEdge
