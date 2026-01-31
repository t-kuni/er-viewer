import type { 
  ERDiagramIndex, 
  EntityNodeViewModel, 
  RelationshipEdgeViewModel,
  Column
} from '../api/client';

/**
 * ER図の逆引きインデックスを構築する
 * 
 * @param nodes エンティティノードのRecord
 * @param edges リレーションシップエッジのRecord
 * @returns 逆引きインデックス
 */
export function buildERDiagramIndex(
  nodes: Record<string, EntityNodeViewModel>,
  edges: Record<string, RelationshipEdgeViewModel>
): ERDiagramIndex {
  // エンティティごとに接続されているエッジのリスト
  const entityToEdges: Record<string, string[]> = {};
  
  // カラムごとに所属するエンティティ
  const columnToEntity: Record<string, string> = {};
  
  // カラムごとに接続されているエッジのリスト
  const columnToEdges: Record<string, string[]> = {};
  
  // columnToEntityを構築（ノードを走査）
  Object.values(nodes).forEach(node => {
    node.columns.forEach((column: Column) => {
      columnToEntity[column.id] = node.id;
    });
  });
  
  // entityToEdgesとcolumnToEdgesを構築（エッジを走査）
  Object.values(edges).forEach(edge => {
    const { id: edgeId, sourceEntityId, targetEntityId, sourceColumnId, targetColumnId } = edge;
    
    // entityToEdgesに追加
    if (!entityToEdges[sourceEntityId]) {
      entityToEdges[sourceEntityId] = [];
    }
    entityToEdges[sourceEntityId].push(edgeId);
    
    if (!entityToEdges[targetEntityId]) {
      entityToEdges[targetEntityId] = [];
    }
    entityToEdges[targetEntityId].push(edgeId);
    
    // columnToEdgesに追加
    if (!columnToEdges[sourceColumnId]) {
      columnToEdges[sourceColumnId] = [];
    }
    columnToEdges[sourceColumnId].push(edgeId);
    
    if (!columnToEdges[targetColumnId]) {
      columnToEdges[targetColumnId] = [];
    }
    columnToEdges[targetColumnId].push(edgeId);
  });
  
  return {
    entityToEdges,
    columnToEntity,
    columnToEdges,
  };
}
