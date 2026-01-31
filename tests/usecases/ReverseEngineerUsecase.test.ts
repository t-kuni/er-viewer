import { describe, it, expect, beforeAll } from 'vitest';
import { createReverseEngineerUsecase, type ReverseEngineerRequest, type ReverseEngineerResponse } from '../../lib/usecases/ReverseEngineerUsecase';
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

  it('接続情報を直接指定してER図を生成する', async () => {
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    // ReverseEngineerRequestを作成（接続情報を直接指定）
    const request: ReverseEngineerRequest = {
      type: 'mysql',
      host: 'localhost',
      port: 30177,
      user: 'root',
      password: 'rootpass',
      database: 'erviewer',
    };
    
    const result: ReverseEngineerResponse = await usecase(request);
    
    // ReverseEngineerResponseの構造を検証
    expect(result.erData).toBeDefined();
    expect(result.connectionInfo).toBeDefined();
    
    // ERDataの検証
    expect(result.erData.entities).toBeDefined();
    expect(Array.isArray(result.erData.entities)).toBe(true);
    expect(result.erData.entities.length).toBeGreaterThan(0);
    
    // init.sqlで作成されたテーブル（users）が含まれることを確認
    const usersEntity = result.erData.entities.find(e => e.name === 'users');
    expect(usersEntity).toBeDefined();
    expect(usersEntity!.columns).toBeDefined();
    expect(usersEntity!.columns.length).toBeGreaterThan(0);
    
    // idカラムが存在することを確認
    const idColumn = usersEntity!.columns.find(c => c.name === 'id');
    expect(idColumn).toBeDefined();
    expect(idColumn!.key).toBe('PRI');
    
    // relationshipsの検証
    expect(result.erData.relationships).toBeDefined();
    expect(Array.isArray(result.erData.relationships)).toBe(true);
    
    // Relationshipが存在する場合の検証
    const relationships = result.erData.relationships;
    if (relationships.length > 0) {
      const firstRelationship = relationships[0];
      expect(firstRelationship.id).toBeDefined();
      expect(firstRelationship.fromEntityId).toBeDefined();
      expect(firstRelationship.toEntityId).toBeDefined();
      expect(firstRelationship.fromColumnId).toBeDefined();
      expect(firstRelationship.toColumnId).toBeDefined();
    }
    
    // connectionInfoの検証（パスワードを除く）
    expect(result.connectionInfo.type).toBe('mysql');
    expect(result.connectionInfo.host).toBe('localhost');
    expect(result.connectionInfo.port).toBe(30177);
    expect(result.connectionInfo.user).toBe('root');
    expect(result.connectionInfo.database).toBe('erviewer');
    // パスワードが含まれていないことを確認
    expect((result.connectionInfo as any).password).toBeUndefined();
  });

  it('パスワードが空文字列の場合、環境変数からフォールバックする', async () => {
    // 環境変数を設定
    process.env.DB_PASSWORD = 'rootpass';
    
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    const request: ReverseEngineerRequest = {
      type: 'mysql',
      host: 'localhost',
      port: 30177,
      user: 'root',
      password: '', // 空文字列
      database: 'erviewer',
    };
    
    const result: ReverseEngineerResponse = await usecase(request);
    
    // ER図が生成されることを確認
    expect(result.erData.entities.length).toBeGreaterThan(0);
    
    // connectionInfoが返却されることを確認
    expect(result.connectionInfo.host).toBe('localhost');
    expect(result.connectionInfo.port).toBe(30177);
  });

  it('接続情報が不足している場合にエラーを投げる', async () => {
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    // hostが空の場合
    const requestWithoutHost: ReverseEngineerRequest = {
      type: 'mysql',
      host: '',
      port: 30177,
      user: 'root',
      password: 'rootpass',
      database: 'erviewer',
    };
    
    await expect(usecase(requestWithoutHost)).rejects.toThrow('Database connection information is incomplete');
  });

  it('パスワードが不足している場合にエラーを投げる', async () => {
    // 環境変数をクリア
    delete process.env.DB_PASSWORD;
    
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    // passwordが空文字列で、環境変数もない場合
    const request: ReverseEngineerRequest = {
      type: 'mysql',
      host: 'localhost',
      port: 30177,
      user: 'root',
      password: '', // 空文字列
      database: 'erviewer',
    };
    
    await expect(usecase(request)).rejects.toThrow('Database password is not specified');
  });

  it('接続エラーが発生した場合にエラーを投げる', async () => {
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    // 誤ったポートを指定
    const request: ReverseEngineerRequest = {
      type: 'mysql',
      host: 'localhost',
      port: 99999, // 存在しないポート
      user: 'root',
      password: 'rootpass',
      database: 'erviewer',
    };
    
    await expect(usecase(request)).rejects.toThrow();
  });
});
