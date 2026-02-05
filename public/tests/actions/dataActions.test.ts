import { describe, it, expect } from 'vitest';
import {
  actionSetViewModel,
  actionSetData,
  actionUpdateNodePositions,
  actionSetLoading,
  actionMergeERData,
} from '../../src/actions/dataActions';
import type { 
  ViewModel, 
  EntityNodeViewModel, 
  RelationshipEdgeViewModel, 
  ERDiagramViewModel,
  ERData,
  DatabaseConnectionState,
  Entity,
  Relationship,
  Column
} from '../../src/api/client';
import { LayerItemKind, DatabaseType, TextAlign, TextAutoSizeMode, TextOverflowMode } from '../../src/api/client';

describe('dataActions', () => {
  // テスト用のViewModelを作成
  const createMockViewModel = (): ViewModel => ({
    format: 'er-viewer',
    version: 1,
    erDiagram: {
      nodes: {
        'entity-1': {
          id: 'entity-1',
          name: 'users',
          x: 100,
          y: 200,
          width: 0,
          height: 0,
          columns: [],
          ddl: 'CREATE TABLE users...',
        },
      },
      edges: {},
      rectangles: {},
      texts: {},
      index: {
        entityToEdges: {},
        columnToEntity: {},
        columnToEdges: {},
      },
      ui: {
        hover: null,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        highlightedColumnIds: [],
        layerOrder: { backgroundItems: [], foregroundItems: [] },
        isDraggingEntity: false,
      },
      loading: false,
    },
    ui: {
      selectedItem: null,
      showBuildInfoModal: false,
      showLayerPanel: false,
      showDatabaseConnectionModal: false,
      layoutOptimization: {
        isRunning: false,
        progress: 0,
        currentStage: null,
      },
    },
    settings: {
      lastDatabaseConnection: undefined,
    },
    buildInfo: {
      data: null,
      loading: false,
      error: null,
    },
  });

  describe('actionSetViewModel', () => {
    it('ViewModel全体が正しく置き換えられる', () => {
      const oldViewModel = createMockViewModel();
      
      const newViewModel: ViewModel = {
        erDiagram: {
          nodes: {
            'entity-new': {
              id: 'entity-new',
              name: 'products',
              x: 1000,
              y: 2000,
              columns: [],
              ddl: 'CREATE TABLE products...',
            },
          },
          edges: {},
          rectangles: {},
          ui: {
            hover: null,
            highlightedNodeIds: [],
            highlightedEdgeIds: [],
            highlightedColumnIds: [],
            layerOrder: { backgroundItems: [], foregroundItems: [] },
          },
          loading: false,
        },
        ui: {
          selectedItem: { kind: 'rectangle', id: 'rect-1' },
          showBuildInfoModal: true,
          showLayerPanel: true,
        },
        buildInfo: {
          data: {
            name: 'er-viewer',
            version: '1.0.0',
            buildTime: '2026-01-25T00:00:00Z',
            git: {
              commitHash: 'abc123',
              commitShort: 'abc123',
              branch: 'main',
            },
            nodeVersion: 'v18.0.0',
            platform: 'linux',
            arch: 'x64',
          },
          loading: false,
          error: null,
        },
      };
      
      const result = actionSetViewModel(oldViewModel, newViewModel);

      // 新しいViewModelがそのまま返される
      expect(result).toBe(newViewModel);
      expect(result).not.toBe(oldViewModel);
      expect(result.erDiagram).toEqual(newViewModel.erDiagram);
      expect(result.ui).toEqual(newViewModel.ui);
      expect(result.buildInfo).toEqual(newViewModel.buildInfo);
    });
  });

  describe('actionSetData', () => {
    it('ERDiagramViewModelが正しく設定される', () => {
      const viewModel = createMockViewModel();
      
      const newERDiagram: ERDiagramViewModel = {
        nodes: {
          'entity-2': {
            id: 'entity-2',
            name: 'posts',
            x: 300,
            y: 400,
            columns: [],
            ddl: 'CREATE TABLE posts...',
          },
        },
        edges: {
          'edge-1': {
            id: 'edge-1',
            sourceEntityId: 'entity-2',
            sourceColumnId: 'col-1',
            targetEntityId: 'entity-1',
            targetColumnId: 'col-2',
            constraintName: 'fk_posts_user_id',
          },
        },
        rectangles: {},
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: { backgroundItems: [], foregroundItems: [] },
        },
        loading: false,
      };
      
      const result = actionSetData(viewModel, newERDiagram);

      expect(result.erDiagram.nodes).toEqual(newERDiagram.nodes);
      expect(result.erDiagram.edges).toEqual(newERDiagram.edges);
      expect(result.erDiagram.rectangles).toEqual(newERDiagram.rectangles);
      expect(result.erDiagram.ui).toEqual(newERDiagram.ui);
      expect(result.erDiagram.loading).toBe(newERDiagram.loading);
    });
  });

  describe('actionUpdateNodePositions', () => {
    it('ノード位置が正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'entity-1', x: 500, y: 600 },
      ]);

      expect(result.erDiagram.nodes['entity-1'].x).toBe(500);
      expect(result.erDiagram.nodes['entity-1'].y).toBe(600);
      // 他のプロパティは保持される
      expect(result.erDiagram.nodes['entity-1'].name).toBe('users');
    });

    it('複数のノード位置を同時に更新できる', () => {
      const viewModel: ViewModel = {
        erDiagram: {
          nodes: {
            'entity-1': {
              id: 'entity-1',
              name: 'users',
              x: 100,
              y: 200,
              columns: [],
              ddl: '',
            },
            'entity-2': {
              id: 'entity-2',
              name: 'posts',
              x: 300,
              y: 400,
              columns: [],
              ddl: '',
            },
          },
          edges: {},
          rectangles: {},
          ui: {
            hover: null,
            highlightedNodeIds: [],
            highlightedEdgeIds: [],
            highlightedColumnIds: [],
            layerOrder: { backgroundItems: [], foregroundItems: [] },
          },
          loading: false,
        },
        ui: {
          selectedItem: null,
          showBuildInfoModal: false,
          showLayerPanel: false,
        },
        buildInfo: {
          data: null,
          loading: false,
          error: null,
        },
      };
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'entity-1', x: 500, y: 600 },
        { id: 'entity-2', x: 700, y: 800 },
      ]);

      expect(result.erDiagram.nodes['entity-1'].x).toBe(500);
      expect(result.erDiagram.nodes['entity-1'].y).toBe(600);
      expect(result.erDiagram.nodes['entity-2'].x).toBe(700);
      expect(result.erDiagram.nodes['entity-2'].y).toBe(800);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'entity-1', x: 100, y: 200 }, // 同じ位置
      ]);

      expect(result).toBe(viewModel);
    });

    it('存在しないノードIDの場合は無視される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'non-existent', x: 500, y: 600 },
      ]);

      expect(result).toBe(viewModel);
    });

    it('一部のノードのみ更新できる', () => {
      const viewModel: ViewModel = {
        erDiagram: {
          nodes: {
            'entity-1': {
              id: 'entity-1',
              name: 'users',
              x: 100,
              y: 200,
              columns: [],
              ddl: '',
            },
            'entity-2': {
              id: 'entity-2',
              name: 'posts',
              x: 300,
              y: 400,
              columns: [],
              ddl: '',
            },
            'entity-3': {
              id: 'entity-3',
              name: 'comments',
              x: 500,
              y: 600,
              columns: [],
              ddl: '',
            },
          },
          edges: {},
          rectangles: {},
          ui: {
            hover: null,
            highlightedNodeIds: [],
            highlightedEdgeIds: [],
            highlightedColumnIds: [],
            layerOrder: { backgroundItems: [], foregroundItems: [] },
          },
          loading: false,
        },
        ui: {
          selectedItem: null,
          showBuildInfoModal: false,
          showLayerPanel: false,
        },
        buildInfo: {
          data: null,
          loading: false,
          error: null,
        },
      };
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'entity-1', x: 150, y: 250 },
        { id: 'entity-2', x: 350, y: 450 },
      ]);

      // 指定したノードのみ更新される
      expect(result.erDiagram.nodes['entity-1'].x).toBe(150);
      expect(result.erDiagram.nodes['entity-1'].y).toBe(250);
      expect(result.erDiagram.nodes['entity-2'].x).toBe(350);
      expect(result.erDiagram.nodes['entity-2'].y).toBe(450);
      
      // 指定しなかったノードは変更されない
      expect(result.erDiagram.nodes['entity-3'].x).toBe(500);
      expect(result.erDiagram.nodes['entity-3'].y).toBe(600);
    });

    it('存在するノードと存在しないノードIDを含む場合、存在するノードのみ更新される', () => {
      const viewModel: ViewModel = {
        erDiagram: {
          nodes: {
            'entity-1': {
              id: 'entity-1',
              name: 'users',
              x: 100,
              y: 200,
              columns: [],
              ddl: '',
            },
            'entity-2': {
              id: 'entity-2',
              name: 'posts',
              x: 300,
              y: 400,
              columns: [],
              ddl: '',
            },
          },
          edges: {},
          rectangles: {},
          ui: {
            hover: null,
            highlightedNodeIds: [],
            highlightedEdgeIds: [],
            highlightedColumnIds: [],
            layerOrder: { backgroundItems: [], foregroundItems: [] },
          },
          loading: false,
        },
        ui: {
          selectedItem: null,
          showBuildInfoModal: false,
          showLayerPanel: false,
        },
        buildInfo: {
          data: null,
          loading: false,
          error: null,
        },
      };
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'entity-1', x: 150, y: 250 },
        { id: 'non-existent', x: 999, y: 999 },
      ]);

      // 存在するノードのみ更新される
      expect(result.erDiagram.nodes['entity-1'].x).toBe(150);
      expect(result.erDiagram.nodes['entity-1'].y).toBe(250);
      
      // 他のノードは変更されない
      expect(result.erDiagram.nodes['entity-2'].x).toBe(300);
      expect(result.erDiagram.nodes['entity-2'].y).toBe(400);
      
      // エラーが発生しない
      expect(result.erDiagram.nodes['non-existent']).toBeUndefined();
    });

    it('空配列を渡した場合、ViewModelが変更されない', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateNodePositions(viewModel, []);

      // 同一参照が返される
      expect(result).toBe(viewModel);
    });
  });

  describe('actionSetLoading', () => {
    it('ローディング状態が正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetLoading(viewModel, true);

      expect(result.erDiagram.loading).toBe(true);
      // 他の状態は保持される
      expect(result.erDiagram.nodes).toEqual(viewModel.erDiagram.nodes);
      expect(result.erDiagram.edges).toEqual(viewModel.erDiagram.edges);
      expect(result.erDiagram.ui).toEqual(viewModel.erDiagram.ui);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetLoading(viewModel, false); // 既にfalse

      expect(result).toBe(viewModel);
    });
  });

  describe('actionMergeERData', () => {
    const createMockERData = (): ERData => ({
      entities: [
        {
          id: 'db-entity-1',
          name: 'users',
          columns: [
            {
              id: 'db-col-1',
              name: 'id',
              type: 'INT',
              nullable: false,
              key: 'PRI',
              default: null,
              extra: 'auto_increment',
              isForeignKey: false,
            },
            {
              id: 'db-col-2',
              name: 'name',
              type: 'VARCHAR(255)',
              nullable: false,
              key: '',
              default: null,
              extra: '',
              isForeignKey: false,
            },
          ],
          foreignKeys: [],
          ddl: 'CREATE TABLE users...',
        },
        {
          id: 'db-entity-2',
          name: 'posts',
          columns: [
            {
              id: 'db-col-3',
              name: 'id',
              type: 'INT',
              nullable: false,
              key: 'PRI',
              default: null,
              extra: 'auto_increment',
              isForeignKey: false,
            },
            {
              id: 'db-col-4',
              name: 'user_id',
              type: 'INT',
              nullable: false,
              key: 'MUL',
              default: null,
              extra: '',
              isForeignKey: false,
            },
          ],
          foreignKeys: [],
          ddl: 'CREATE TABLE posts...',
        },
      ],
      relationships: [
        {
          id: 'db-rel-1',
          fromEntityId: 'db-entity-2',
          fromColumnId: 'db-col-4',
          toEntityId: 'db-entity-1',
          toColumnId: 'db-col-1',
          constraintName: 'fk_posts_user_id',
        },
      ],
    });

    const createConnectionInfo = (): DatabaseConnectionState => ({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      user: 'root',
      database: 'testdb',
    });

    describe('通常モード（新規作成）', () => {
      it('空のViewModelに対してERDataをマージする', () => {
        const viewModel: ViewModel = {
          ...createMockViewModel(),
          erDiagram: {
            ...createMockViewModel().erDiagram,
            nodes: {}, // 空のノード
          },
        };
        
        const erData = createMockERData();
        const connectionInfo = createConnectionInfo();
        
        const result = actionMergeERData(viewModel, erData, connectionInfo);

        // ノードが作成される
        expect(Object.keys(result.erDiagram.nodes)).toHaveLength(2);
        
        // エンティティ1: users
        const usersNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'users');
        expect(usersNode).toBeDefined();
        expect(usersNode!.x).toBe(50); // グリッドレイアウトの開始X
        expect(usersNode!.y).toBe(50); // グリッドレイアウトの開始Y
        expect(usersNode!.columns).toHaveLength(2);
        
        // エンティティ2: posts
        const postsNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'posts');
        expect(postsNode).toBeDefined();
        expect(postsNode!.x).toBe(350); // 50 + 300
        expect(postsNode!.y).toBe(50);
        
        // エッジが作成される
        expect(Object.keys(result.erDiagram.edges)).toHaveLength(1);
        const edge = result.erDiagram.edges['db-rel-1'];
        expect(edge).toBeDefined();
        expect(edge.sourceEntityId).toBe(postsNode!.id);
        expect(edge.targetEntityId).toBe(usersNode!.id);
        
        // インデックスが再計算される
        expect(result.erDiagram.index.entityToEdges[usersNode!.id]).toContain('db-rel-1');
        expect(result.erDiagram.index.entityToEdges[postsNode!.id]).toContain('db-rel-1');
        
        // 接続情報が更新される
        expect(result.settings.lastDatabaseConnection).toEqual(connectionInfo);
      });
    });

    describe('増分更新モード', () => {
      it('既存エンティティの座標とIDを維持する', () => {
        const viewModel: ViewModel = {
          ...createMockViewModel(),
          erDiagram: {
            ...createMockViewModel().erDiagram,
            nodes: {
              'existing-entity-1': {
                id: 'existing-entity-1',
                name: 'users',
                x: 1000,
                y: 2000,
                width: 200,
                height: 300,
                columns: [], // 古いカラム情報
                ddl: 'old ddl',
              },
            },
          },
        };
        
        const erData = createMockERData();
        const connectionInfo = createConnectionInfo();
        
        const result = actionMergeERData(viewModel, erData, connectionInfo);

        // 既存エンティティのIDと座標が維持される
        const usersNode = result.erDiagram.nodes['existing-entity-1'];
        expect(usersNode).toBeDefined();
        expect(usersNode.id).toBe('existing-entity-1');
        expect(usersNode.x).toBe(1000);
        expect(usersNode.y).toBe(2000);
        
        // カラム情報は最新データで置き換えられる
        expect(usersNode.columns).toHaveLength(2);
        expect(usersNode.columns[0].id).toBe('db-col-1');
        expect(usersNode.columns[0].name).toBe('id');
        
        // DDLは更新される
        expect(usersNode.ddl).toBe('CREATE TABLE users...');
        
        // 幅と高さは維持される
        expect(usersNode.width).toBe(200);
        expect(usersNode.height).toBe(300);
        
        // 新規エンティティは既存の右側に配置される
        const postsNode = Object.values(result.erDiagram.nodes).find(n => n.name === 'posts');
        expect(postsNode).toBeDefined();
        expect(postsNode!.x).toBe(1300); // 1000 + 300
        expect(postsNode!.y).toBe(2000);
      });

      it('削除されたエンティティをレイヤー順序から除外する', () => {
        const viewModel: ViewModel = {
          ...createMockViewModel(),
          erDiagram: {
            ...createMockViewModel().erDiagram,
            nodes: {
              'entity-users': {
                id: 'entity-users',
                name: 'users',
                x: 100,
                y: 100,
                width: 0,
                height: 0,
                columns: [],
                ddl: '',
              },
              'entity-deleted': {
                id: 'entity-deleted',
                name: 'deleted_table',
                x: 400,
                y: 100,
                width: 0,
                height: 0,
                columns: [],
                ddl: '',
              },
            },
            ui: {
              ...createMockViewModel().erDiagram.ui,
              layerOrder: {
                backgroundItems: [
                  { kind: 'rectangle', id: 'rect-1' },
                ],
                foregroundItems: [
                  { kind: 'entity', id: 'entity-users' },
                  { kind: 'entity', id: 'entity-deleted' },
                  { kind: 'text', id: 'text-1' },
                ],
              },
            },
          },
        };
        
        const erData = createMockERData();
        const connectionInfo = createConnectionInfo();
        
        const result = actionMergeERData(viewModel, erData, connectionInfo);

        // 削除されたエンティティがレイヤー順序から除外される
        expect(result.erDiagram.ui.layerOrder.foregroundItems).toHaveLength(2);
        expect(result.erDiagram.ui.layerOrder.foregroundItems.some(item => item.id === 'entity-deleted')).toBe(false);
        expect(result.erDiagram.ui.layerOrder.foregroundItems.some(item => item.id === 'entity-users')).toBe(true);
        expect(result.erDiagram.ui.layerOrder.foregroundItems.some(item => item.id === 'text-1')).toBe(true);
        
        // 矩形は維持される
        expect(result.erDiagram.ui.layerOrder.backgroundItems).toHaveLength(1);
        expect(result.erDiagram.ui.layerOrder.backgroundItems[0].id).toBe('rect-1');
      });

      it('UI状態をクリアする', () => {
        const viewModel: ViewModel = {
          ...createMockViewModel(),
          erDiagram: {
            ...createMockViewModel().erDiagram,
            nodes: {
              'entity-1': {
                id: 'entity-1',
                name: 'users',
                x: 100,
                y: 100,
                width: 0,
                height: 0,
                columns: [],
                ddl: '',
              },
            },
            ui: {
              ...createMockViewModel().erDiagram.ui,
              highlightedNodeIds: ['entity-1'],
              highlightedEdgeIds: ['edge-1'],
              highlightedColumnIds: ['col-1'],
            },
          },
        };
        
        const erData = createMockERData();
        const connectionInfo = createConnectionInfo();
        
        const result = actionMergeERData(viewModel, erData, connectionInfo);

        // UI状態がクリアされる
        expect(result.erDiagram.ui.highlightedNodeIds).toEqual([]);
        expect(result.erDiagram.ui.highlightedEdgeIds).toEqual([]);
        expect(result.erDiagram.ui.highlightedColumnIds).toEqual([]);
      });

      it('矩形とテキストを維持する', () => {
        const viewModel: ViewModel = {
          ...createMockViewModel(),
          erDiagram: {
            ...createMockViewModel().erDiagram,
            nodes: {
              'entity-1': {
                id: 'entity-1',
                name: 'users',
                x: 100,
                y: 100,
                width: 0,
                height: 0,
                columns: [],
                ddl: '',
              },
            },
            rectangles: {
              'rect-1': {
                id: 'rect-1',
                x: 50,
                y: 50,
                width: 500,
                height: 300,
                backgroundColor: '#ff0000',
                backgroundOpacity: 0.5,
                borderColor: '#000000',
                borderWidth: 2,
                borderRadius: 5,
                shadow: {
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
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                content: 'Test text',
                fontSize: 14,
                lineHeight: 1.5,
                textAlign: 'left',
                textColor: '#000000',
                opacity: 1,
                backgroundColor: 'transparent',
                backgroundOpacity: 0,
                borderColor: 'transparent',
                borderWidth: 0,
                borderRadius: 0,
                autoSizeMode: 'none',
                overflowMode: 'wrap',
                shadow: {
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
          },
        };
        
        const erData = createMockERData();
        const connectionInfo = createConnectionInfo();
        
        const result = actionMergeERData(viewModel, erData, connectionInfo);

        // 矩形とテキストが維持される
        expect(result.erDiagram.rectangles).toEqual(viewModel.erDiagram.rectangles);
        expect(result.erDiagram.texts).toEqual(viewModel.erDiagram.texts);
      });
    });

    describe('履歴記録機能', () => {
      it('初回リバース時にtype: "initial"の履歴エントリが作成される', () => {
        const viewModel: ViewModel = {
          ...createMockViewModel(),
          erDiagram: {
            ...createMockViewModel().erDiagram,
            nodes: {}, // 空のノード（初回）
            history: [],
          },
        };
        
        const erData = createMockERData();
        const connectionInfo = createConnectionInfo();
        
        const result = actionMergeERData(viewModel, erData, connectionInfo);

        // 履歴エントリが1件作成される
        expect(result.erDiagram.history).toHaveLength(1);
        
        const historyEntry = result.erDiagram.history![0];
        expect(historyEntry.type).toBe('initial');
        expect(historyEntry.timestamp).toBeGreaterThan(0);
        
        // サマリー情報が含まれる
        expect(historyEntry.summary).toBeDefined();
        expect(historyEntry.summary!.addedTables).toBe(0);
        expect(historyEntry.summary!.removedTables).toBe(0);
        expect(historyEntry.summary!.totalTables).toBe(2);
        expect(historyEntry.summary!.totalColumns).toBe(4); // users: 2, posts: 2
        expect(historyEntry.summary!.totalRelationships).toBe(1);
      });

      it('増分リバース時にtype: "incremental"の履歴エントリが作成される', () => {
        const viewModel: ViewModel = {
          ...createMockViewModel(),
          erDiagram: {
            ...createMockViewModel().erDiagram,
            nodes: {
              'existing-entity-1': {
                id: 'existing-entity-1',
                name: 'users',
                x: 100,
                y: 100,
                width: 0,
                height: 0,
                columns: [{
                  id: 'col-1',
                  name: 'id',
                  type: 'INT',
                  nullable: false,
                  key: 'PRI',
                  default: null,
                  extra: 'auto_increment',
                  isForeignKey: false,
                }],
                ddl: 'old ddl',
              },
            },
            history: [],
          },
        };
        
        const erData = createMockERData();
        const connectionInfo = createConnectionInfo();
        
        const result = actionMergeERData(viewModel, erData, connectionInfo);

        // 履歴エントリが1件追加される
        expect(result.erDiagram.history).toHaveLength(1);
        
        const historyEntry = result.erDiagram.history![0];
        expect(historyEntry.type).toBe('incremental');
        expect(historyEntry.timestamp).toBeGreaterThan(0);
        
        // サマリー情報が含まれる
        expect(historyEntry.summary).toBeDefined();
        expect(historyEntry.summary!.addedTables).toBe(1); // posts
        expect(historyEntry.summary!.removedTables).toBe(0);
        expect(historyEntry.summary!.addedColumns).toBe(1); // users.name
        expect(historyEntry.summary!.addedRelationships).toBe(1);
      });

      it('変更がない場合でも履歴エントリが作成される', () => {
        const viewModel: ViewModel = {
          ...createMockViewModel(),
          erDiagram: {
            ...createMockViewModel().erDiagram,
            nodes: {
              'entity-1': {
                id: 'entity-1',
                name: 'users',
                x: 100,
                y: 100,
                width: 0,
                height: 0,
                columns: [
                  {
                    id: 'col-1',
                    name: 'id',
                    type: 'INT',
                    nullable: false,
                    key: 'PRI',
                    default: null,
                    extra: 'auto_increment',
                    isForeignKey: false,
                  },
                  {
                    id: 'col-2',
                    name: 'name',
                    type: 'VARCHAR(255)',
                    nullable: false,
                    key: '',
                    default: null,
                    extra: '',
                    isForeignKey: false,
                  },
                ],
                ddl: 'CREATE TABLE users...',
              },
              'entity-2': {
                id: 'entity-2',
                name: 'posts',
                x: 300,
                y: 100,
                width: 0,
                height: 0,
                columns: [
                  {
                    id: 'col-3',
                    name: 'id',
                    type: 'INT',
                    nullable: false,
                    key: 'PRI',
                    default: null,
                    extra: 'auto_increment',
                    isForeignKey: false,
                  },
                  {
                    id: 'col-4',
                    name: 'user_id',
                    type: 'INT',
                    nullable: false,
                    key: 'MUL',
                    default: null,
                    extra: '',
                    isForeignKey: false,
                  },
                ],
                ddl: 'CREATE TABLE posts...',
              },
            },
            edges: {
              'edge-1': {
                id: 'edge-1',
                sourceEntityId: 'entity-2',
                sourceColumnId: 'col-4',
                targetEntityId: 'entity-1',
                targetColumnId: 'col-1',
                constraintName: 'fk_posts_user_id',
              },
            },
            history: [],
          },
        };
        
        const erData = createMockERData();
        const connectionInfo = createConnectionInfo();
        
        const result = actionMergeERData(viewModel, erData, connectionInfo);

        // 履歴エントリが1件作成される
        expect(result.erDiagram.history).toHaveLength(1);
        
        const historyEntry = result.erDiagram.history![0];
        expect(historyEntry.type).toBe('incremental');
        
        // サマリーがすべて0
        expect(historyEntry.summary!.addedTables).toBe(0);
        expect(historyEntry.summary!.removedTables).toBe(0);
        expect(historyEntry.summary!.addedColumns).toBe(0);
        expect(historyEntry.summary!.removedColumns).toBe(0);
        expect(historyEntry.summary!.modifiedColumns).toBe(0);
        expect(historyEntry.summary!.addedRelationships).toBe(0);
        expect(historyEntry.summary!.removedRelationships).toBe(0);
      });
    });
  });
});
