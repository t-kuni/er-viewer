import { describe, it, expect, beforeAll } from 'vitest';
import { createReverseEngineerUsecase, type ViewModel, type ReverseEngineerRequest } from '../../lib/usecases/ReverseEngineerUsecase';
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

  it('環境変数から接続情報を取得してER図を生成する', async () => {
    // 環境変数を設定
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '30177';
    process.env.DB_USER = 'root';
    process.env.DB_PASSWORD = 'rootpass';
    process.env.DB_NAME = 'erviewer';
    
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    // 入力用のViewModelを作成
    const inputViewModel: ViewModel = {
      format: "er-viewer",
      version: 1,
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: {
            backgroundItems: [],
            foregroundItems: [],
          },
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: true, // UI状態を設定
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
      },
      buildInfo: {
        data: {
          version: '1.0.0',
          name: 'test',
          buildTime: '2026-01-25T12:00:00Z',
          buildTimestamp: 1737806400000,
          buildDate: '2026-01-25',
          git: {
            commit: 'abc123',
            commitShort: 'abc',
            branch: 'main',
            tag: null,
          },
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          arch: 'x64',
        },
        loading: false,
        error: null,
      },
    };
    
    // ReverseEngineerRequestを作成
    const request: ReverseEngineerRequest = {
      viewModel: inputViewModel,
      password: 'rootpass',
    };
    
    const result = await usecase(request);
    
    // formatとversionが維持されることを検証
    expect(result.format).toBe("er-viewer");
    expect(result.version).toBe(1);
    
    // ViewModelの構造を検証
    expect(result.erDiagram).toBeDefined();
    expect(result.ui).toBeDefined();
    expect(result.buildInfo).toBeDefined();
    
    // nodesの検証
    expect(result.erDiagram.nodes).toBeDefined();
    expect(typeof result.erDiagram.nodes).toBe('object');
    expect(Object.keys(result.erDiagram.nodes).length).toBeGreaterThan(0);
    
    // init.sqlで作成されたテーブル（users）が含まれることを確認
    const usersNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'users');
    expect(usersNode).toBeDefined();
    expect(usersNode!.columns).toBeDefined();
    expect(usersNode!.columns.length).toBeGreaterThan(0);
    expect(typeof usersNode!.x).toBe('number');
    expect(typeof usersNode!.y).toBe('number');
    
    // idカラムが存在することを確認
    const idColumn = usersNode!.columns.find(c => c.name === 'id');
    expect(idColumn).toBeDefined();
    expect(idColumn!.key).toBe('PRI');
    
    // edgesの検証
    expect(result.erDiagram.edges).toBeDefined();
    expect(typeof result.erDiagram.edges).toBe('object');
    
    // Edgeが存在する場合の検証
    const edges = Object.values(result.erDiagram.edges);
    if (edges.length > 0) {
      const firstEdge = edges[0];
      expect(firstEdge.id).toBeDefined();
      expect(firstEdge.sourceEntityId).toBeDefined();
      expect(firstEdge.targetEntityId).toBeDefined();
      expect(firstEdge.sourceColumnId).toBeDefined();
      expect(firstEdge.targetColumnId).toBeDefined();
    }
    
    // UI状態とBuildInfo状態が引き継がれることを確認
    expect(result.ui.showBuildInfoModal).toBe(true); // 入力と同じ値
    expect(result.ui.showLayerPanel).toBe(false);
    expect(result.buildInfo.data).toEqual(inputViewModel.buildInfo.data);
    expect(result.buildInfo.loading).toBe(false);
    expect(result.buildInfo.error).toBeNull();
    
    // settingsに接続情報が保存されることを確認
    expect(result.settings).toBeDefined();
    expect(result.settings!.lastDatabaseConnection).toBeDefined();
    expect(result.settings!.lastDatabaseConnection!.type).toBe('mysql');
    expect(result.settings!.lastDatabaseConnection!.host).toBe('localhost');
    expect(result.settings!.lastDatabaseConnection!.port).toBe(30177);
    expect(result.settings!.lastDatabaseConnection!.user).toBe('root');
    expect(result.settings!.lastDatabaseConnection!.database).toBe('erviewer');
  });

  it('viewModel.settings.lastDatabaseConnectionから接続情報を取得する', async () => {
    // 環境変数をクリア
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_NAME;
    // パスワードのみ環境変数で設定
    process.env.DB_PASSWORD = 'rootpass';
    
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    const inputViewModel: ViewModel = {
      format: "er-viewer",
      version: 1,
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: {
            backgroundItems: [],
            foregroundItems: [],
          },
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
      },
      buildInfo: {
        data: {
          version: '1.0.0',
          name: 'test',
          buildTime: '2026-01-25T12:00:00Z',
          buildTimestamp: 1737806400000,
          buildDate: '2026-01-25',
          git: {
            commit: 'abc123',
            commitShort: 'abc',
            branch: 'main',
            tag: null,
          },
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          arch: 'x64',
        },
        loading: false,
        error: null,
      },
      settings: {
        lastDatabaseConnection: {
          type: 'mysql',
          host: 'localhost',
          port: 30177,
          user: 'root',
          database: 'erviewer',
        },
      },
    };
    
    const request: ReverseEngineerRequest = {
      viewModel: inputViewModel,
      password: 'rootpass',
    };
    
    const result = await usecase(request);
    
    // ER図が生成されることを確認
    expect(Object.keys(result.erDiagram.nodes).length).toBeGreaterThan(0);
    
    // settingsが維持されることを確認
    expect(result.settings!.lastDatabaseConnection!.host).toBe('localhost');
    expect(result.settings!.lastDatabaseConnection!.port).toBe(30177);
  });

  it('request.passwordからパスワードを取得する', async () => {
    // 環境変数を設定（パスワード以外）
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '30177';
    process.env.DB_USER = 'root';
    process.env.DB_NAME = 'erviewer';
    delete process.env.DB_PASSWORD; // パスワード環境変数をクリア
    
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    const inputViewModel: ViewModel = {
      format: "er-viewer",
      version: 1,
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: {
            backgroundItems: [],
            foregroundItems: [],
          },
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
      },
      buildInfo: {
        data: {
          version: '1.0.0',
          name: 'test',
          buildTime: '2026-01-25T12:00:00Z',
          buildTimestamp: 1737806400000,
          buildDate: '2026-01-25',
          git: {
            commit: 'abc123',
            commitShort: 'abc',
            branch: 'main',
            tag: null,
          },
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          arch: 'x64',
        },
        loading: false,
        error: null,
      },
    };
    
    const request: ReverseEngineerRequest = {
      viewModel: inputViewModel,
      password: 'rootpass', // パスワードをリクエストで指定
    };
    
    const result = await usecase(request);
    
    // ER図が生成されることを確認
    expect(Object.keys(result.erDiagram.nodes).length).toBeGreaterThan(0);
  });

  it('接続情報が不足している場合にエラーを投げる', async () => {
    // 環境変数をクリア
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
    
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    const inputViewModel: ViewModel = {
      format: "er-viewer",
      version: 1,
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: {
            backgroundItems: [],
            foregroundItems: [],
          },
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
      },
      buildInfo: {
        data: {
          version: '1.0.0',
          name: 'test',
          buildTime: '2026-01-25T12:00:00Z',
          buildTimestamp: 1737806400000,
          buildDate: '2026-01-25',
          git: {
            commit: 'abc123',
            commitShort: 'abc',
            branch: 'main',
            tag: null,
          },
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          arch: 'x64',
        },
        loading: false,
        error: null,
      },
    };
    
    const request: ReverseEngineerRequest = {
      viewModel: inputViewModel,
    };
    
    await expect(usecase(request)).rejects.toThrow('Database connection information is incomplete');
  });

  it('パスワードが不足している場合にエラーを投げる', async () => {
    // 環境変数を設定（パスワード以外）
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '30177';
    process.env.DB_USER = 'root';
    process.env.DB_NAME = 'erviewer';
    delete process.env.DB_PASSWORD;
    
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => new DatabaseManager(),
    });
    
    const inputViewModel: ViewModel = {
      format: "er-viewer",
      version: 1,
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: {
            backgroundItems: [],
            foregroundItems: [],
          },
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
      },
      buildInfo: {
        data: {
          version: '1.0.0',
          name: 'test',
          buildTime: '2026-01-25T12:00:00Z',
          buildTimestamp: 1737806400000,
          buildDate: '2026-01-25',
          git: {
            commit: 'abc123',
            commitShort: 'abc',
            branch: 'main',
            tag: null,
          },
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          arch: 'x64',
        },
        loading: false,
        error: null,
      },
    };
    
    const request: ReverseEngineerRequest = {
      viewModel: inputViewModel,
      // passwordなし
    };
    
    await expect(usecase(request)).rejects.toThrow('Database password is not specified');
  });
});
