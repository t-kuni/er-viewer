import { describe, it, expect } from 'vitest';
import { actionMergeERData } from '../../src/actions/dataActions';
import type { 
  ViewModel, 
  ERData,
} from '../../src/api/client';
import { DatabaseConnectionState, LayerItemRef, TextBox } from '../../src/api/client';

describe('actionMergeERData', () => {
  const createEmptyViewModel = (): ViewModel => ({
    format: 'relavue-er',
    version: 1,
    erDiagram: {
      nodes: {},
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
          },
          {
            id: 'db-col-2',
            name: 'name',
            type: 'VARCHAR(255)',
            nullable: false,
            key: '',
            default: null,
            extra: '',
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
          },
          {
            id: 'db-col-4',
            name: 'user_id',
            type: 'INT',
            nullable: false,
            key: 'MUL',
            default: null,
            extra: '',
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
    type: DatabaseConnectionState.type.MYSQL,
    host: 'localhost',
    port: 3306,
    user: 'root',
    database: 'testdb',
  });

  describe('通常モード（新規作成）', () => {
    it('空のViewModelに対してERDataをマージする', () => {
      const viewModel = createEmptyViewModel();
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
      expect(result.settings!.lastDatabaseConnection).toEqual(connectionInfo);
    });
  });

  describe('増分更新モード', () => {
    it('既存エンティティの座標とIDを維持する', () => {
      const viewModel: ViewModel = {
        ...createEmptyViewModel(),
        erDiagram: {
          ...createEmptyViewModel().erDiagram,
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
        ...createEmptyViewModel(),
        erDiagram: {
          ...createEmptyViewModel().erDiagram,
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
            ...createEmptyViewModel().erDiagram.ui,
            layerOrder: {
              backgroundItems: [
                { kind: LayerItemRef.kind.RECTANGLE, id: 'rect-1' },
              ],
              foregroundItems: [
                { kind: LayerItemRef.kind.ENTITY, id: 'entity-users' },
                { kind: LayerItemRef.kind.ENTITY, id: 'entity-deleted' },
                { kind: LayerItemRef.kind.TEXT, id: 'text-1' },
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
        ...createEmptyViewModel(),
        erDiagram: {
          ...createEmptyViewModel().erDiagram,
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
            ...createEmptyViewModel().erDiagram.ui,
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
        ...createEmptyViewModel(),
        erDiagram: {
          ...createEmptyViewModel().erDiagram,
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
              fill: '#ff0000',
              stroke: '#000000',
              strokeWidth: 2,
              opacity: 0.5,
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
              textAlign: TextBox.textAlign.LEFT,
              textColor: '#000000',
              opacity: 1,
              paddingX: 10,
              paddingY: 5,
              wrap: true,
              overflow: TextBox.overflow.CLIP,
              autoSizeMode: TextBox.autoSizeMode.MANUAL,
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
});
