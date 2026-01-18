import type DatabaseManager from '../database';
import type { ERData, LayoutData } from '../database';

export interface ReverseEngineerResponse {
  erData: ERData;
  layoutData: LayoutData;
}

export type ReverseEngineerDeps = {
  createDatabaseManager: () => DatabaseManager;
};

export function createReverseEngineerUsecase(deps: ReverseEngineerDeps) {
  return async (): Promise<ReverseEngineerResponse> => {
    const dbManager = deps.createDatabaseManager();
    try {
      await dbManager.connect();
      const erData = await dbManager.generateERData();
      const layoutData = dbManager.generateDefaultLayoutData(erData.entities);
      await dbManager.disconnect();
      
      return {
        erData,
        layoutData,
      };
    } catch (error) {
      await dbManager.disconnect();
      throw error;
    }
  };
}
