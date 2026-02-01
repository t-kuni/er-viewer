import React from 'react'
import { EdgeProps, BaseEdge, EdgeLabelRenderer } from '@xyflow/react'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionHoverEdge, actionClearHover } from '../actions/hoverActions'

function SelfRelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps) {
  const dispatch = useDispatch()
  
  // このエッジがハイライトされているかどうかだけを購読（最適化）
  const isHighlighted = useViewModel(
    (vm) => vm.erDiagram.ui.highlightedEdgeIds.includes(id),
    (a, b) => a === b
  )
  
  // cubic-bezier曲線のパスを生成
  // ノード幅のデフォルト値を使用してオフセットを計算
  const defaultNodeWidth = 200
  const offset = defaultNodeWidth * 0.6 // ノード幅の60%
  
  // 制御点の計算
  const cp1x = sourceX + offset
  const cp1y = sourceY - offset / 2
  const cp2x = targetX + offset
  const cp2y = targetY + offset / 2
  
  // SVGパス文字列を生成
  const edgePath = `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`
  
  // ラベル位置（ループの外側中央）
  const labelX = sourceX + offset
  const labelY = (sourceY + targetY) / 2
  
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isHighlighted ? '#007bff' : '#333',
          strokeWidth: isHighlighted ? 4 : 2,
        }}
      />
      <g
        onMouseEnter={() => dispatch(actionHoverEdge, id)}
        onMouseLeave={() => dispatch(actionClearHover)}
        style={{ cursor: 'pointer' }}
      >
        <path
          d={edgePath}
          style={{
            stroke: 'transparent',
            strokeWidth: 20,
            fill: 'none',
          }}
        />
      </g>
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            fontSize: 10,
            opacity: isHighlighted ? 1.0 : 0.6,
            pointerEvents: 'none',
          }}
        >
          ↺
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const MemoizedSelfRelationshipEdge = React.memo(SelfRelationshipEdge)
export default MemoizedSelfRelationshipEdge
