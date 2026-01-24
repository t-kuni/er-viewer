import type { components } from '../../../lib/generated/api-types';

type ERData = components['schemas']['ERData'];
type LayoutData = components['schemas']['LayoutData'];
type Entity = components['schemas']['Entity'];
type EntityNodeViewModel = components['schemas']['EntityNodeViewModel'];
type RelationshipEdgeViewModel = components['schemas']['RelationshipEdgeViewModel'];
type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];

/**
 * ERDataとLayoutDataからERDiagramViewModelを構築する
 * @param erData リバースエンジニアリングで取得したER図データ
 * @param layoutData レイアウト情報（座標など）
 * @returns ERDiagramViewModel（nodesとedgesをRecord形式で保持）
 */
export function buildERDiagramViewModel(
  erData: ERData,
  layoutData: LayoutData
): ERDiagramViewModel {
  // EntityNodeViewModelのRecord形式を構築
  const nodes: { [key: string]: EntityNodeViewModel } = {};
  
  for (const entity of erData.entities) {
    const layoutItem = layoutData.entities[entity.id];
    
    if (!layoutItem) {
      console.warn(`Layout data not found for entity: ${entity.id}`);
      continue;
    }
    
    nodes[entity.id] = {
      id: entity.id,
      name: entity.name,
      x: layoutItem.x,
      y: layoutItem.y,
      columns: entity.columns,
      ddl: entity.ddl,
    };
  }
  
  // RelationshipEdgeViewModelのRecord形式を構築
  const edges: { [key: string]: RelationshipEdgeViewModel } = {};
  
  for (const relationship of erData.relationships) {
    edges[relationship.id] = {
      id: relationship.id,
      sourceEntityId: relationship.fromEntityId,
      targetEntityId: relationship.toEntityId,
      sourceColumnId: relationship.fromColumnId,
      targetColumnId: relationship.toColumnId,
      constraintName: relationship.constraintName,
    };
  }
  
  return {
    nodes,
    edges,
    rectangles: {},
    ui: {
      hover: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      highlightedColumnIds: [],
      layerOrder: { backgroundItems: [], foregroundItems: [] },
    },
    loading: false,
  };
}
