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
        texts: {},
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
        texts: {},
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
        texts: {},
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
        texts: {},
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
        texts: {},
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

  // 増分リバースエンジニアリングのテストケース
  describe('増分リバースエンジニアリング', () => {
    it('既存エンティティの座標維持テスト', async () => {
      // 環境変数を設定
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '30177';
      process.env.DB_USER = 'root';
      process.env.DB_PASSWORD = 'rootpass';
      process.env.DB_NAME = 'erviewer';
      
      const usecase = createReverseEngineerUsecase({
        createDatabaseManager: () => new DatabaseManager(),
      });
      
      // 既存のViewModelにusersテーブルのノードを設定
      const inputViewModel: ViewModel = {
        format: "er-viewer",
        version: 1,
        erDiagram: {
          nodes: {
            'existing-users-id': {
              id: 'existing-users-id',
              name: 'users',
              x: 100,
              y: 200,
              columns: [], // 古いカラム情報
              ddl: 'old ddl',
            },
          },
          edges: {},
          rectangles: {},
          texts: {},
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
        password: 'rootpass',
      };
      
      const result = await usecase(request);
      
      // usersテーブルのノードが存在し、座標が維持されることを確認
      const usersNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'users');
      expect(usersNode).toBeDefined();
      expect(usersNode!.id).toBe('existing-users-id'); // IDが維持される
      expect(usersNode!.x).toBe(100); // x座標が維持される
      expect(usersNode!.y).toBe(200); // y座標が維持される
      
      // カラム情報が最新に更新されることを確認
      expect(usersNode!.columns.length).toBeGreaterThan(0);
      const idColumn = usersNode!.columns.find(c => c.name === 'id');
      expect(idColumn).toBeDefined();
      expect(idColumn!.key).toBe('PRI');
      
      // ddlが更新されることを確認
      expect(usersNode!.ddl).not.toBe('old ddl');
    });

    it('新規エンティティの追加テスト', async () => {
      // 環境変数を設定（erviewer-2スキーマを使用）
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '30177';
      process.env.DB_USER = 'root';
      process.env.DB_PASSWORD = 'rootpass';
      process.env.DB_NAME = 'erviewer-2';
      
      const usecase = createReverseEngineerUsecase({
        createDatabaseManager: () => new DatabaseManager(),
      });
      
      // 既存のViewModelに一部のテーブルのみ設定
      const inputViewModel: ViewModel = {
        format: "er-viewer",
        version: 1,
        erDiagram: {
          nodes: {
            'existing-users-id': {
              id: 'existing-users-id',
              name: 'users',
              x: 50,
              y: 50,
              columns: [],
              ddl: '',
            },
            'existing-roles-id': {
              id: 'existing-roles-id',
              name: 'roles',
              x: 350,
              y: 50,
              columns: [],
              ddl: '',
            },
          },
          edges: {},
          rectangles: {},
          texts: {},
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
        password: 'rootpass',
      };
      
      const result = await usecase(request);
      
      // 既存のノードが維持されることを確認
      const usersNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'users');
      expect(usersNode).toBeDefined();
      expect(usersNode!.x).toBe(50);
      expect(usersNode!.y).toBe(50);
      
      // 新規テーブル（task_comments）が追加されることを確認
      const taskCommentsNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'task_comments');
      expect(taskCommentsNode).toBeDefined();
      
      // 新規エンティティが既存エンティティの右側に配置されることを確認
      expect(taskCommentsNode!.x).toBeGreaterThan(350); // 既存の最大X座標よりも右側
      
      // データベースに存在するすべてのテーブルが含まれることを確認
      const nodeNames = Object.values(result.erDiagram.nodes).map(n => n.name);
      expect(nodeNames).toContain('subscriptions');
      expect(nodeNames).toContain('audit_logs');
      
      // 【追加】新規エンティティのリレーションシップが生成されることを確認
      const edges = Object.values(result.erDiagram.edges);
      
      // task_commentsからusersへのリレーションシップが存在することを確認
      const taskCommentsToUsersEdge = edges.find(e => 
        e.sourceEntityId === taskCommentsNode!.id && 
        e.targetEntityId === usersNode!.id
      );
      expect(taskCommentsToUsersEdge).toBeDefined();
      console.log('task_commentsからusersへのエッジ:', taskCommentsToUsersEdge);
      
      // subscriptionsからusersへのリレーションシップが存在することを確認
      const subscriptionsNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'subscriptions');
      expect(subscriptionsNode).toBeDefined();
      const subscriptionsToUsersEdge = edges.find(e => 
        e.sourceEntityId === subscriptionsNode!.id && 
        e.targetEntityId === usersNode!.id
      );
      expect(subscriptionsToUsersEdge).toBeDefined();
      console.log('subscriptionsからusersへのエッジ:', subscriptionsToUsersEdge);
    });

    it('削除エンティティの除外テスト', async () => {
      // 環境変数を設定（erviewer-2スキーマを使用）
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '30177';
      process.env.DB_USER = 'root';
      process.env.DB_PASSWORD = 'rootpass';
      process.env.DB_NAME = 'erviewer-2';
      
      const usecase = createReverseEngineerUsecase({
        createDatabaseManager: () => new DatabaseManager(),
      });
      
      // 既存のViewModelにactivitiesテーブルを設定（erviewer-2には存在しない）
      const inputViewModel: ViewModel = {
        format: "er-viewer",
        version: 1,
        erDiagram: {
          nodes: {
            'existing-users-id': {
              id: 'existing-users-id',
              name: 'users',
              x: 50,
              y: 50,
              columns: [],
              ddl: '',
            },
            'existing-activities-id': {
              id: 'existing-activities-id',
              name: 'activities',
              x: 350,
              y: 50,
              columns: [],
              ddl: '',
            },
          },
          edges: {},
          rectangles: {},
          texts: {},
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
        password: 'rootpass',
      };
      
      const result = await usecase(request);
      
      // usersテーブルは維持されることを確認
      const usersNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'users');
      expect(usersNode).toBeDefined();
      
      // activitiesテーブルが削除されることを確認
      const activitiesNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'activities');
      expect(activitiesNode).toBeUndefined();
    });

    it('カラム変更の反映テスト', async () => {
      // 環境変数を設定（erviewer-2スキーマを使用）
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '30177';
      process.env.DB_USER = 'root';
      process.env.DB_PASSWORD = 'rootpass';
      process.env.DB_NAME = 'erviewer-2';
      
      const usecase = createReverseEngineerUsecase({
        createDatabaseManager: () => new DatabaseManager(),
      });
      
      // 既存のViewModelにusersテーブルを設定（erviewerのカラム情報）
      const inputViewModel: ViewModel = {
        format: "er-viewer",
        version: 1,
        erDiagram: {
          nodes: {
            'existing-users-id': {
              id: 'existing-users-id',
              name: 'users',
              x: 100,
              y: 200,
              columns: [
                {
                  id: 'old-column-id-1',
                  name: 'first_name', // erviewer-2ではgiven_nameに変更されている
                  type: 'varchar(50)',
                  nullable: true,
                  key: '',
                  default: null,
                  extra: '',
                },
                {
                  id: 'old-column-id-2',
                  name: 'avatar_url', // erviewer-2では削除されている
                  type: 'varchar(255)',
                  nullable: true,
                  key: '',
                  default: null,
                  extra: '',
                },
              ],
              ddl: 'old ddl',
            },
          },
          edges: {},
          rectangles: {},
          texts: {},
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
        password: 'rootpass',
      };
      
      const result = await usecase(request);
      
      // usersテーブルが存在することを確認
      const usersNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'users');
      expect(usersNode).toBeDefined();
      
      // カラムが最新情報に更新されることを確認
      const givenNameColumn = usersNode!.columns.find(c => c.name === 'given_name');
      expect(givenNameColumn).toBeDefined(); // given_nameが存在する
      
      const firstNameColumn = usersNode!.columns.find(c => c.name === 'first_name');
      expect(firstNameColumn).toBeUndefined(); // first_nameは存在しない
      
      const avatarUrlColumn = usersNode!.columns.find(c => c.name === 'avatar_url');
      expect(avatarUrlColumn).toBeUndefined(); // avatar_urlは削除されている
      
      const phoneNumberColumn = usersNode!.columns.find(c => c.name === 'phone_number');
      expect(phoneNumberColumn).toBeDefined(); // phone_numberが追加されている
    });

    it('UI状態のクリアテスト', async () => {
      // 環境変数を設定
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '30177';
      process.env.DB_USER = 'root';
      process.env.DB_PASSWORD = 'rootpass';
      process.env.DB_NAME = 'erviewer';
      
      const usecase = createReverseEngineerUsecase({
        createDatabaseManager: () => new DatabaseManager(),
      });
      
      // 既存のViewModelにハイライト状態を設定
      const inputViewModel: ViewModel = {
        format: "er-viewer",
        version: 1,
        erDiagram: {
          nodes: {
            'existing-users-id': {
              id: 'existing-users-id',
              name: 'users',
              x: 100,
              y: 200,
              columns: [],
              ddl: '',
            },
          },
          edges: {},
          rectangles: {},
          texts: {},
          ui: {
            hover: { type: 'entity', id: 'existing-users-id' },
            highlightedNodeIds: ['existing-users-id'],
            highlightedEdgeIds: ['some-edge-id'],
            highlightedColumnIds: ['some-column-id'],
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
        password: 'rootpass',
      };
      
      const result = await usecase(request);
      
      // すべてのハイライト状態がクリアされることを確認
      expect(result.erDiagram.ui.hover).toBeNull();
      expect(result.erDiagram.ui.highlightedNodeIds).toEqual([]);
      expect(result.erDiagram.ui.highlightedEdgeIds).toEqual([]);
      expect(result.erDiagram.ui.highlightedColumnIds).toEqual([]);
    });

    it('レイヤー順序の更新テスト', async () => {
      // 環境変数を設定（erviewer-2スキーマを使用）
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '30177';
      process.env.DB_USER = 'root';
      process.env.DB_PASSWORD = 'rootpass';
      process.env.DB_NAME = 'erviewer-2';
      
      const usecase = createReverseEngineerUsecase({
        createDatabaseManager: () => new DatabaseManager(),
      });
      
      // 既存のViewModelにレイヤー順序を設定
      const inputViewModel: ViewModel = {
        format: "er-viewer",
        version: 1,
        erDiagram: {
          nodes: {
            'existing-users-id': {
              id: 'existing-users-id',
              name: 'users',
              x: 50,
              y: 50,
              columns: [],
              ddl: '',
            },
            'existing-activities-id': {
              id: 'existing-activities-id',
              name: 'activities',
              x: 350,
              y: 50,
              columns: [],
              ddl: '',
            },
          },
          edges: {},
          rectangles: {
            'rect-1': {
              id: 'rect-1',
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              backgroundColor: '#ffffff',
              borderColor: '#000000',
              borderWidth: 1,
              borderRadius: 0,
              dropShadow: {
                enabled: false,
                offsetX: 0,
                offsetY: 0,
                blur: 0,
                spread: 0,
                color: '#000000',
                opacity: 0.5,
              },
            },
          },
          texts: {},
          ui: {
            hover: null,
            highlightedNodeIds: [],
            highlightedEdgeIds: [],
            highlightedColumnIds: [],
            layerOrder: {
              backgroundItems: [
                { kind: 'rectangle', id: 'rect-1' },
                { kind: 'entity', id: 'existing-activities-id' }, // 削除予定
              ],
              foregroundItems: [
                { kind: 'entity', id: 'existing-users-id' },
              ],
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
        password: 'rootpass',
      };
      
      const result = await usecase(request);
      
      // 削除されたエンティティがレイヤー順序から除外されることを確認
      const backgroundEntityIds = result.erDiagram.ui.layerOrder.backgroundItems
        .filter(item => item.kind === 'entity')
        .map(item => item.id);
      expect(backgroundEntityIds).not.toContain('existing-activities-id');
      
      // 矩形の参照は維持されることを確認
      const backgroundRectIds = result.erDiagram.ui.layerOrder.backgroundItems
        .filter(item => item.kind === 'rectangle')
        .map(item => item.id);
      expect(backgroundRectIds).toContain('rect-1');
      
      // 残存するエンティティの参照は維持されることを確認
      const foregroundEntityIds = result.erDiagram.ui.layerOrder.foregroundItems
        .filter(item => item.kind === 'entity')
        .map(item => item.id);
      expect(foregroundEntityIds).toContain('existing-users-id');
    });

    it('矩形・テキストの維持テスト', async () => {
      // 環境変数を設定
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '30177';
      process.env.DB_USER = 'root';
      process.env.DB_PASSWORD = 'rootpass';
      process.env.DB_NAME = 'erviewer';
      
      const usecase = createReverseEngineerUsecase({
        createDatabaseManager: () => new DatabaseManager(),
      });
      
      // 既存のViewModelに矩形とテキストを設定
      const inputViewModel: ViewModel = {
        format: "er-viewer",
        version: 1,
        erDiagram: {
          nodes: {
            'existing-users-id': {
              id: 'existing-users-id',
              name: 'users',
              x: 100,
              y: 200,
              columns: [],
              ddl: '',
            },
          },
          edges: {},
          rectangles: {
            'rect-1': {
              id: 'rect-1',
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              backgroundColor: '#ffffff',
              borderColor: '#000000',
              borderWidth: 1,
              borderRadius: 0,
              dropShadow: {
                enabled: false,
                offsetX: 0,
                offsetY: 0,
                blur: 0,
                spread: 0,
                color: '#000000',
                opacity: 0.5,
              },
            },
          },
          texts: {
            'text-1': {
              id: 'text-1',
              x: 50,
              y: 50,
              content: 'テストテキスト',
              fontSize: 14,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              color: '#000000',
              textAlign: 'left',
              autoSizeMode: 'fitContent',
              width: 100,
              height: 30,
              verticalAlign: 'top',
              lineHeight: 1.5,
              letterSpacing: 0,
              overflow: 'clip',
              dropShadow: {
                enabled: false,
                offsetX: 0,
                offsetY: 0,
                blur: 0,
                spread: 0,
                color: '#000000',
                opacity: 0.5,
              },
            },
          },
          ui: {
            hover: null,
            highlightedNodeIds: [],
            highlightedEdgeIds: [],
            highlightedColumnIds: [],
            layerOrder: {
              backgroundItems: [
                { kind: 'rectangle', id: 'rect-1' },
              ],
              foregroundItems: [
                { kind: 'text', id: 'text-1' },
              ],
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
        password: 'rootpass',
      };
      
      const result = await usecase(request);
      
      // 矩形がそのまま維持されることを確認
      expect(result.erDiagram.rectangles['rect-1']).toBeDefined();
      expect(result.erDiagram.rectangles['rect-1'].x).toBe(100);
      expect(result.erDiagram.rectangles['rect-1'].y).toBe(100);
      expect(result.erDiagram.rectangles['rect-1'].width).toBe(200);
      expect(result.erDiagram.rectangles['rect-1'].height).toBe(150);
      
      // テキストがそのまま維持されることを確認
      expect(result.erDiagram.texts['text-1']).toBeDefined();
      expect(result.erDiagram.texts['text-1'].content).toBe('テストテキスト');
      expect(result.erDiagram.texts['text-1'].x).toBe(50);
      expect(result.erDiagram.texts['text-1'].y).toBe(50);
      
      // レイヤー順序も維持されることを確認
      expect(result.erDiagram.ui.layerOrder.backgroundItems).toContainEqual({ kind: 'rectangle', id: 'rect-1' });
      expect(result.erDiagram.ui.layerOrder.foregroundItems).toContainEqual({ kind: 'text', id: 'text-1' });
    });
  });
});
