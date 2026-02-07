import type DatabaseManager from '../database/DatabaseManager.js';
import type { components } from '../generated/api-types.js';
import type { DatabaseConfig } from '../database/DatabaseManager.js';

// TypeSpecから生成された型を使用
export type ReverseEngineerRequest = components['schemas']['ReverseEngineerRequest'];
export type ReverseEngineerResponse = components['schemas']['ReverseEngineerResponse'];
export type ERData = components['schemas']['ERData'];
export type DatabaseConnectionState = components['schemas']['DatabaseConnectionState'];

export type ReverseEngineerDeps = {
  createDatabaseManager: () => DatabaseManager;
};

export function createReverseEngineerUsecase(deps: ReverseEngineerDeps) {
  return async (request: ReverseEngineerRequest): Promise<ReverseEngineerResponse> => {
    const dbManager = deps.createDatabaseManager();
    
    // リクエストから直接接続情報を取得
    const { type, host, port, user, password, database, schema } = request;
    
    // 接続情報の検証
    if (!host || !port || !user || !database) {
      throw new Error('Database connection information is incomplete. Please provide all required fields.');
    }
    
    // パスワードが空文字列の場合のみ環境変数をフォールバック
    const resolvedPassword = (password === '') ? process.env.DB_PASSWORD : password;
    
    if (!resolvedPassword) {
      throw new Error('Database password is not specified.');
    }
    
    const connectionConfig: DatabaseConfig = {
      type,
      host,
      port,
      user,
      password: resolvedPassword,
      database,
      schema,
    };
    
    try {
      await dbManager.connect(connectionConfig);
      
      // データベースからER図を生成
      const erData: ERData = await dbManager.generateERData();
      
      await dbManager.disconnect();
      
      // 接続情報を返却（パスワードを除く）
      const connectionInfo: DatabaseConnectionState = {
        type,
        host,
        port,
        user,
        database,
        schema,
      };
      
      // ReverseEngineerResponseを返却
      return {
        erData,
        connectionInfo,
      };
    } catch (error) {
      await dbManager.disconnect();
      throw error;
    }
  };
}
