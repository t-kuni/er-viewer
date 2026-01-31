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
export type LayerItemRef = components['schemas']['LayerItemRef'];

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
      
      // 既存のnodesが空かどうかで処理を分岐
      const existingNodes = viewModel.erDiagram.nodes;
      const isIncrementalMode = Object.keys(existingNodes).length > 0;
      
      let nodes: Record<string, EntityNodeViewModel>;
      let edges: Record<string, RelationshipEdgeViewModel>;
      let layerOrder = viewModel.erDiagram.ui.layerOrder;
      
      if (isIncrementalMode) {
        // 増分更新モード
        
        // エンティティのマッチング処理
        const existingEntitiesByName = new Map<string, { id: string; x: number; y: number }>();
        Object.values(existingNodes).forEach(node => {
          existingEntitiesByName.set(node.name, { id: node.id, x: node.x, y: node.y });
        });
        
        // 既存エンティティの最大座標を取得（新規エンティティの配置に使用）
        let maxX = 50;
        let maxY = 50;
        Object.values(existingNodes).forEach(node => {
          if (node.x > maxX) maxX = node.x;
          if (node.y > maxY) maxY = node.y;
        });
        
        // データベースから取得したテーブル名のセット
        const dbTableNames = new Set(erData.entities.map((e: Entity) => e.name));
        
        // 削除されたエンティティのIDを収集
        const deletedEntityIds = new Set<string>();
        Object.values(existingNodes).forEach(node => {
          if (!dbTableNames.has(node.name)) {
            deletedEntityIds.add(node.id);
          }
        });
        
        // データベースのエンティティID → ViewModelのノードID のマッピング
        const dbEntityIdToNodeId = new Map<string, string>();
        
        // EntityNodeViewModelのRecordを生成
        nodes = {};
        let newEntityIndex = 0;
        erData.entities.forEach((entity: Entity) => {
          const existing = existingEntitiesByName.get(entity.name);
          
          if (existing) {
            // 既存エンティティ: id、x、yを維持し、カラム情報とddlを更新（width/heightは0にリセット）
            nodes[existing.id] = {
              id: existing.id,
              name: entity.name,
              x: existing.x,
              y: existing.y,
              width: 0,
              height: 0,
              columns: entity.columns,
              ddl: entity.ddl,
            };
            // マッピングに追加
            dbEntityIdToNodeId.set(entity.id, existing.id);
          } else {
            // 新規エンティティ: 新しいidと座標を生成
            const col = newEntityIndex % 4;
            const row = Math.floor(newEntityIndex / 4);
            
            nodes[entity.id] = {
              id: entity.id,
              name: entity.name,
              x: maxX + 300 + col * 300, // 既存エンティティの右側から配置
              y: maxY + row * 200, // 既存エンティティの最大Y座標から配置
              width: 0,
              height: 0,
              columns: entity.columns,
              ddl: entity.ddl,
            };
            // マッピングに追加（新規エンティティはIDが一致）
            dbEntityIdToNodeId.set(entity.id, entity.id);
            newEntityIndex++;
          }
        });
        
        // RelationshipEdgeViewModelのRecordを生成（全件置き換え）
        edges = {};
        erData.relationships.forEach((relationship: Relationship) => {
          // マッピングを使用してエンティティIDを変換
          const sourceNodeId = dbEntityIdToNodeId.get(relationship.fromEntityId);
          const targetNodeId = dbEntityIdToNodeId.get(relationship.toEntityId);
          
          // エンティティIDが見つからない場合はスキップ（削除されたエンティティへの参照）
          if (!sourceNodeId || !targetNodeId) {
            return;
          }
          
          edges[relationship.id] = {
            id: relationship.id,
            sourceEntityId: sourceNodeId,
            sourceColumnId: relationship.fromColumnId,
            targetEntityId: targetNodeId,
            targetColumnId: relationship.toColumnId,
            constraintName: relationship.constraintName,
          };
        });
        
        // レイヤー順序から削除されたエンティティの参照を削除
        const filterDeletedEntities = (items: LayerItemRef[]): LayerItemRef[] => {
          return items.filter(item => {
            if (item.kind === 'entity' && deletedEntityIds.has(item.id)) {
              return false;
            }
            return true;
          });
        };
        
        layerOrder = {
          backgroundItems: filterDeletedEntities(viewModel.erDiagram.ui.layerOrder.backgroundItems),
          foregroundItems: filterDeletedEntities(viewModel.erDiagram.ui.layerOrder.foregroundItems),
        };
      } else {
        // 新規作成モード（従来の処理）
        nodes = {};
        erData.entities.forEach((entity: Entity, index: number) => {
          const col = index % 4;
          const row = Math.floor(index / 4);
          
          nodes[entity.id] = {
            id: entity.id,
            name: entity.name,
            x: 50 + col * 300,
            y: 50 + row * 200,
            width: 0,
            height: 0,
            columns: entity.columns,
            ddl: entity.ddl,
          };
        });
        
        edges = {};
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
      }
      
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
          nodes,
          edges,
          rectangles: viewModel.erDiagram.rectangles, // 矩形を維持
          texts: viewModel.erDiagram.texts, // テキストを維持
          ui: {
            hover: null, // hoverはクリア
            highlightedNodeIds: [], // クリア
            highlightedEdgeIds: [], // クリア
            highlightedColumnIds: [], // クリア
            layerOrder,
          },
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
