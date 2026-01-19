import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
import type { components } from '../../../lib/generated/api-types';

type EntityNodeViewModel = components['schemas']['EntityNodeViewModel'];
type RelationshipEdgeViewModel = components['schemas']['RelationshipEdgeViewModel'];

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
 * @returns React Flowのエッジ配列
 */
export function convertToReactFlowEdges(
  edges: { [key: string]: RelationshipEdgeViewModel }
): Edge[] {
  return Object.values(edges).map((edge) => ({
    id: edge.id,
    type: 'relationshipEdge',
    source: edge.source,
    target: edge.target,
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
    data: {
      fromColumn: edge.fromColumn,
      toColumn: edge.toColumn,
      constraintName: edge.constraintName,
    },
  }));
}
