import type DatabaseManager from '../database';
import type { components } from '../generated/api-types.js';

// TypeSpecから生成された型を使用
export type ViewModel = components['schemas']['ViewModel'];
export type EntityNodeViewModel = components['schemas']['EntityNodeViewModel'];
export type RelationshipEdgeViewModel = components['schemas']['RelationshipEdgeViewModel'];
export type Entity = components['schemas']['Entity'];
export type Relationship = components['schemas']['Relationship'];

export type ReverseEngineerDeps = {
  createDatabaseManager: () => DatabaseManager;
};

export function createReverseEngineerUsecase(deps: ReverseEngineerDeps) {
  return async (viewModel: ViewModel): Promise<ViewModel> => {
    const dbManager = deps.createDatabaseManager();
    try {
      await dbManager.connect();
      
      // データベースからER図を生成
      const erData = await dbManager.generateERData();
      
      await dbManager.disconnect();
      
      // EntityNodeViewModelのRecordを生成（レイアウトも統合）
      const nodes: Record<string, EntityNodeViewModel> = {};
      erData.entities.forEach((entity: Entity, index: number) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        
        nodes[entity.id] = {
          id: entity.id,
          name: entity.name,
          x: 50 + col * 300,
          y: 50 + row * 200,
          columns: entity.columns,
          ddl: entity.ddl,
        };
      });
      
      // RelationshipEdgeViewModelのRecordを生成
      const edges: Record<string, RelationshipEdgeViewModel> = {};
      erData.relationships.forEach((relationship: Relationship) => {
        edges[relationship.id] = {
          id: relationship.id,
          sourceEntityId: relationship.fromEntityId,
          sourceColumnId: relationship.fromColumnId,
          targetEntityId: relationship.toEntityId,
          targetColumnId: relationship.toColumnId,
          constraintName: relationship.constraintName,
        };
      });
      
      // ViewModelを更新して返却
      return {
        format: viewModel.format,
        version: viewModel.version,
        erDiagram: {
          ...viewModel.erDiagram,
          nodes,
          edges,
          loading: false,
        },
        ui: viewModel.ui, // UI状態は引き継ぐ
        buildInfo: viewModel.buildInfo, // BuildInfo状態は引き継ぐ
      };
    } catch (error) {
      await dbManager.disconnect();
      throw error;
    }
  };
}
