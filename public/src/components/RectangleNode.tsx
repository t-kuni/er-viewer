import React, { useCallback } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { useDispatch } from '../store/hooks';
import { actionUpdateRectangleBounds } from '../actions/rectangleActions';

interface RectangleNodeData {
  id: string;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

/**
 * 矩形ノードコンポーネント
 * @deprecated ViewportPortalで矩形を描画するため、このコンポーネントは使用されなくなりました
 */
const RectangleNode: React.FC<NodeProps<RectangleNodeData>> = ({ id, data, selected }) => {
  const dispatch = useDispatch();

  const handleResizeEnd = useCallback(
    (_event: any, params: { x: number; y: number; width: number; height: number }) => {
      dispatch(actionUpdateRectangleBounds, id, {
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
      });
    },
    [dispatch, id]
  );

  return (
    <div
      style={{
        width: `${data.width}px`,
        height: `${data.height}px`,
        border: `${data.strokeWidth}px solid ${data.stroke}`,
        backgroundColor: data.fill,
        opacity: data.opacity,
      }}
    >
      <NodeResizer
        minWidth={40}
        minHeight={40}
        isVisible={selected}
        onResizeEnd={handleResizeEnd}
      />
    </div>
  );
};

export default RectangleNode;
