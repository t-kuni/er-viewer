import type DatabaseManager from '../database';
import type { components } from '../generated/api-types.js';
import type { DatabaseConfig } from '../database.js';

// TypeSpecから生成された型を使用
export type ViewModel = components['schemas']['ViewModel'];
export type ReverseEngineerRequest = components['schemas']['ReverseEngineerRequest'];
export type EntityNodeViewModel = components['schemas']['EntityNodeViewModel'];
export type RelationshipEdgeViewModel = components['schemas']['RelationshipEdgeViewModel'];
export type Entity = components['schemas']['Entity'];
export type Relationship = components['schemas']['Relationship'];
export type DatabaseConnectionState = components['schemas']['DatabaseConnectionState'];

export type ReverseEngineerDeps = {
  createDatabaseManager: () => DatabaseManager;
};

export function createReverseEngineerUsecase(deps: ReverseEngineerDeps) {
  return async (request: ReverseEngineerRequest): Promise<ViewModel> => {
    const viewModel = request.viewModel;
    const dbManager = deps.createDatabaseManager();
    
    // 接続情報の解決
    const lastConnection = viewModel.settings?.lastDatabaseConnection;
    const host = lastConnection?.host ?? process.env.DB_HOST;
    const port = lastConnection?.port ?? (process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined);
    const user = lastConnection?.user ?? process.env.DB_USER;
    const database = lastConnection?.database ?? process.env.DB_NAME;
    
    if (!host || !port || !user || !database) {
      throw new Error('Database connection information is incomplete. Please provide all required fields.');
    }
    
    // パスワードの解決
    const password = (request.password && request.password.trim() !== '') ? request.password : process.env.DB_PASSWORD;
    
    if (!password) {
      throw new Error('Database password is not specified.');
    }
    
    const connectionConfig: DatabaseConfig = {
      host,
      port,
      user,
      password,
      database,
    };
    
    try {
      await dbManager.connect(connectionConfig);
      
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
      
      // 接続情報を保存（パスワードを除く）
      const lastDatabaseConnection: DatabaseConnectionState = {
        type: 'mysql', // 現在はMySQLのみサポート
        host,
        port,
        user,
        database,
      };
      
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
        settings: {
          ...viewModel.settings,
          lastDatabaseConnection,
        },
      };
    } catch (error) {
      await dbManager.disconnect();
      throw error;
    }
  };
}
