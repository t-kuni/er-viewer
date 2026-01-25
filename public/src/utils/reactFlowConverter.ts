import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { components } from '../../../lib/generated/api-types';
import type { TextBox } from '../api/client';

type EntityNodeViewModel = components['schemas']['EntityNodeViewModel'];
type RelationshipEdgeViewModel = components['schemas']['RelationshipEdgeViewModel'];
type Rectangle = components['schemas']['Rectangle'];

type Side = 'top' | 'right' | 'bottom' | 'left';

/**
 * 2つのノードの中心座標から、最適なハンドルペアを計算する
 * @param sourceCenter sourceノードの中心座標 {x, y}
 * @param targetCenter targetノードの中心座標 {x, y}
 * @returns sourceHandleとtargetHandleのID { sourceHandle: string, targetHandle: string }
 */
export function computeOptimalHandles(
  sourceCenter: { x: number; y: number },
  targetCenter: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  let sourceHandle: string;
  let targetHandle: string;

  // 左右方向が優勢な場合
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx >= 0) {
      sourceHandle = 's-right';
      targetHandle = 't-left';
    } else {
      sourceHandle = 's-left';
      targetHandle = 't-right';
    }
  } else {
    // 上下方向が優勢な場合
    if (dy >= 0) {
      sourceHandle = 's-bottom';
      targetHandle = 't-top';
    } else {
      sourceHandle = 's-top';
      targetHandle = 't-bottom';
    }
  }

  return { sourceHandle, targetHandle };
}

/**
 * ERDiagramViewModelのnodesをReact Flow形式に変換する
 * @param nodes EntityNodeViewModelのRecord
 * @returns React Flowのノード配列
 */
export function convertToReactFlowNodes(
  nodes: { [key: string]: EntityNodeViewModel }
): Node[] {
  return Object.values(nodes).map((node) => ({
    id: node.id,
    type: 'entityNode',
    position: { x: node.x, y: node.y },
    zIndex: 0, // エンティティはz-index 0固定
    data: {
      id: node.id,
      name: node.name,
      columns: node.columns,
      ddl: node.ddl,
    },
  }));
}

/**
 * ERDiagramViewModelのedgesをReact Flow形式に変換する
 * @param edges RelationshipEdgeViewModelのRecord
 * @param nodes EntityNodeViewModelのRecord
 * @returns React Flowのエッジ配列
 */
export function convertToReactFlowEdges(
  edges: { [key: string]: RelationshipEdgeViewModel },
  nodes: { [key: string]: EntityNodeViewModel }
): Edge[] {
  return Object.values(edges).map((edge) => {
    // ノードの中心座標を計算（初回レンダリング時はデフォルトサイズを使用）
    const sourceNode = nodes[edge.sourceEntityId];
    const targetNode = nodes[edge.targetEntityId];

    // デフォルトサイズ（width: 200, height: 100）
    const defaultWidth = 200;
    const defaultHeight = 100;

    const sourceCenter = {
      x: sourceNode.x + defaultWidth / 2,
      y: sourceNode.y + defaultHeight / 2,
    };
    const targetCenter = {
      x: targetNode.x + defaultWidth / 2,
      y: targetNode.y + defaultHeight / 2,
    };

    // 最適なハンドルを計算
    const { sourceHandle, targetHandle } = computeOptimalHandles(sourceCenter, targetCenter);

    return {
      id: edge.id,
      type: 'relationshipEdge',
      source: edge.sourceEntityId,
      target: edge.targetEntityId,
      sourceHandle,
      targetHandle,
      zIndex: -100, // エッジは背後に配置
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      data: {
        sourceColumnId: edge.sourceColumnId,
        targetColumnId: edge.targetColumnId,
        constraintName: edge.constraintName,
      },
    };
  });
}

/**
 * @deprecated ViewportPortalで矩形を描画するため、この関数は使用されなくなりました
 */
export function convertToReactFlowRectangles(
  rectangles: { [key: string]: Rectangle }
): Node[] {
  return Object.values(rectangles).map((rect) => ({
    id: rect.id,
    type: 'rectangleNode',
    position: { x: rect.x, y: rect.y },
    width: rect.width,
    height: rect.height,
    style: { zIndex: 0 },
    data: {
      id: rect.id,
      width: rect.width,
      height: rect.height,
      fill: rect.fill,
      stroke: rect.stroke,
      strokeWidth: rect.strokeWidth,
      opacity: rect.opacity,
    },
  }));
}

/**
 * ERDiagramViewModelのtextsをReact Flow形式に変換する
 * @param texts TextBoxのRecord
 * @returns React Flowのノード配列
 */
export function convertToReactFlowTexts(
  texts: { [key: string]: TextBox }
): Node[] {
  return Object.values(texts).map((text) => ({
    id: text.id,
    type: 'textNode',
    position: { x: text.x, y: text.y },
    width: text.width,
    height: text.height,
    data: text,
  }));
}
