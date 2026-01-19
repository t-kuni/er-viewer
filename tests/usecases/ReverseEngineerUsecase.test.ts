import { describe, it, expect, beforeAll } from 'vitest';
import { createReverseEngineerUsecase } from '../../lib/usecases/ReverseEngineerUsecase';
import DatabaseManager from '../../lib/database';

describe('ReverseEngineerUsecase', () => {
  // DB接続確認
  beforeAll(async () => {
    const dbManager = new DatabaseManager();
    
    // 環境変数を設定
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '30177';
    process.env.DB_USER = 'root';
    process.env.DB_PASSWORD = 'rootpass';
    process.env.DB_NAME = 'erviewer';
    
    try {
      await dbManager.connect();
      await dbManager.disconnect();
    } catch (error) {
      throw new Error(`DBに接続できません。Docker Composeが起動していることを確認してください: ${error}`);
    }
  });

  it('ERDataとLayoutDataを返す（正常系）', async () => {
    // 環境変数を設定
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '30177';
    process.env.DB_USER = 'root';
    process.env.DB_PASSWORD = 'rootpass';
    process.env.DB_NAME = 'erviewer';
    
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    const result = await usecase();
    
    // ERDataの検証
    expect(result.erData).toBeDefined();
    expect(result.erData.entities).toBeDefined();
    expect(Array.isArray(result.erData.entities)).toBe(true);
    expect(result.erData.entities.length).toBeGreaterThan(0);
    
    // init.sqlで作成されたテーブル（users）が含まれることを確認
    const usersTable = result.erData.entities.find(e => e.name === 'users');
    expect(usersTable).toBeDefined();
    expect(usersTable!.columns).toBeDefined();
    expect(usersTable!.columns.length).toBeGreaterThan(0);
    
    // idカラムが存在することを確認
    const idColumn = usersTable!.columns.find(c => c.name === 'id');
    expect(idColumn).toBeDefined();
    expect(idColumn!.key).toBe('PRI');
    
    // relationshipsの検証
    expect(result.erData.relationships).toBeDefined();
    expect(Array.isArray(result.erData.relationships)).toBe(true);
    
    // LayoutDataの検証
    expect(result.layoutData).toBeDefined();
    expect(result.layoutData.entities).toBeDefined();
    expect(Object.keys(result.layoutData.entities).length).toBeGreaterThan(0);
    
    // entitiesの各エントリが正しい構造を持つことを確認
    Object.values(result.layoutData.entities).forEach(entity => {
      expect(entity.id).toBeDefined();
      expect(entity.name).toBeDefined();
      expect(typeof entity.x).toBe('number');
      expect(typeof entity.y).toBe('number');
    });
    
    // Columnにidが存在することを確認
    const firstColumn = usersTable!.columns[0];
    expect(firstColumn.id).toBeDefined();
    expect(typeof firstColumn.id).toBe('string');
    
    // ForeignKeyにidが存在することを確認（もしFKがあれば）
    if (usersTable!.foreignKeys.length > 0) {
      const firstFK = usersTable!.foreignKeys[0];
      expect(firstFK.id).toBeDefined();
      expect(typeof firstFK.id).toBe('string');
    }
    
    // Relationshipにid, fromId, toIdが存在することを確認
    if (result.erData.relationships.length > 0) {
      const firstRelationship = result.erData.relationships[0];
      expect(firstRelationship.id).toBeDefined();
      expect(typeof firstRelationship.id).toBe('string');
      expect(firstRelationship.fromId).toBeDefined();
      expect(typeof firstRelationship.fromId).toBe('string');
      expect(firstRelationship.toId).toBeDefined();
      expect(typeof firstRelationship.toId).toBe('string');
      
      // fromId/toIdが実際のエンティティIDと一致することを確認
      const fromEntity = result.erData.entities.find(e => e.id === firstRelationship.fromId);
      expect(fromEntity).toBeDefined();
      expect(fromEntity!.name).toBe(firstRelationship.from);
      
      const toEntity = result.erData.entities.find(e => e.id === firstRelationship.toId);
      expect(toEntity).toBeDefined();
      expect(toEntity!.name).toBe(firstRelationship.to);
    }
  });
});
