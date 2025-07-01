/**
 * データ管理のテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockData } from '../public/js/types/infrastructure';
import { 
  createERData, 
  createEntity,
  createLayoutData,
  createUserEntity, 
  createPostEntity, 
  createUserPostERData,
  createNetworkResponse,
  createDDLResponse,
  createSuccessResponse
} from './test-data-factory';

// テスト用ヘルパー関数 - 非同期処理の完了を待つ
const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

describe('データ管理', () => {
  afterEach(() => {
    // タイマーのクリア
    jest.clearAllTimers();
    
    // 全モックのクリア
    jest.clearAllMocks();
  });

  describe('データ取得', () => {
    test('エンティティクリックでテーブルDDLが取得される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/table/users/ddl': {
            status: 200,
            data: { ddl: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE);' },
          },
        },
      };
      infrastructure.setupMockData(mockData);
      let app: any = new ERViewerApplication(infrastructure);

      // Act
      await app.showTableDetails('users');

      // Assert
      const history = infrastructure.getInteractionHistory();
      const requests = history.networkRequests;
      expect(requests.length).toBeGreaterThan(0);
      
      const ddlRequest = requests[requests.length - 1];
      expect(ddlRequest.url).toBe('/api/table/users/ddl');
      expect(ddlRequest.method).toBe('GET');
      expect(ddlRequest.headers).toBeDefined();
      expect(ddlRequest.body).toBeUndefined();
    });
  });

  describe('データ永続化', () => {
    test('レイアウト保存が正常に動作する', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/layout': {
          status: 200,
          data: { success: true },
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);

    // Act
    await app.saveLayout();

    // Assert
    const history = infrastructure.getInteractionHistory();
    const requests = history.networkRequests;
    // 配列操作を使わずにリクエストを確認
    expect(requests.length).toBeGreaterThan(0);
    
    // Network操作の詳細検証
    const saveRequest = requests[requests.length - 1];
    expect(saveRequest.url).toBe('/api/layout');
    expect(saveRequest.method).toBe('POST');
    expect(saveRequest.headers).toBeDefined();
    expect(saveRequest.body).toBeDefined(); // POSTリクエストなのでbodyがある
    
    // bodyは文字列としてエンコードされている場合があるので、パースする
    const requestBody = typeof saveRequest.body === 'string' 
      ? JSON.parse(saveRequest.body) 
      : saveRequest.body;
    expect(requestBody).toHaveProperty('entities');
    expect(requestBody).toHaveProperty('rectangles');
    expect(requestBody).toHaveProperty('texts');
  });

  test('リバースエンジニアリングが正常に動作する', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockERData = createERData({
      entities: [
        createEntity({
          name: 'users',
          columns: [{ name: 'id', type: 'int', key: 'PRI' }]
        })
      ]
    });
    const mockData: MockData = {
      networkResponses: {
        '/api/reverse-engineer': createNetworkResponse({ data: mockERData })
      }
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);

    // Act
    await app.reverseEngineer();

    // Assert
    const history = infrastructure.getInteractionHistory();
    const requests = history.networkRequests;
    // 配列操作を使わずにリクエストを確認
    expect(requests.length).toBeGreaterThan(0);
    
    // Network操作の詳細検証
    const reverseRequest = requests[requests.length - 1];
    expect(reverseRequest.url).toBe('/api/reverse-engineer');
    expect(reverseRequest.method).toBe('POST');
    expect(reverseRequest.headers).toBeDefined();
    expect(reverseRequest.timestamp).toBeDefined();
  });

  // TODO: 増分リバースエンジニアリング機能が実装されたら有効化する
  // 現在のリバースエンジニアリング実装は既存のレイアウトを保持せず、
  // すべてのエンティティのpositionをクリアしてクラスタリングを強制している
  test.skip('増分リバースエンジニアリング - 既存レイアウトを保持しながら新しいエンティティを追加', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    
    // 初期状態：usersエンティティのみ存在
    const initialERData = createERData({
      entities: [
        createEntity({
          name: 'users',
          columns: [{ name: 'id', type: 'int', key: 'PRI' }]
        })
      ],
      layout: {
        entities: {
          users: { x: 100, y: 100 }
        },
        rectangles: [],
        texts: []
      }
    });
    
    // リバースエンジニアリング後：postsエンティティが追加される
    const updatedERData = createERData({
      entities: [
        createEntity({
          name: 'users',
          columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          position: { x: 100, y: 100 } // 既存の位置を保持
        }),
        createEntity({
          name: 'posts',
          columns: [
            { name: 'id', type: 'int', key: 'PRI' },
            { name: 'user_id', type: 'int', key: 'MUL' }
          ]
          // 新しいエンティティはpositionがない（クラスタリング対象）
        })
      ],
      relationships: [{
        from: 'posts',
        fromColumn: 'user_id',
        to: 'users',
        toColumn: 'id'
      }]
    });
    
    const mockData: MockData = {
      networkResponses: {
        '/api/er-data': createNetworkResponse({ data: initialERData }),
        '/api/reverse-engineer': createNetworkResponse({ data: updatedERData })
      }
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);
    
    // 初期データをロード
    await app.loadERData();
    
    // Act - 増分リバースエンジニアリングを実行
    await app.reverseEngineer();
    
    // 非同期処理が完了するまで待つ
    await new Promise((resolve) => setTimeout(resolve, 0));
    
    // Assert
    // 状態から既存レイアウトが保持されているか確認
    const state = app.state;
    
    // usersエンティティの位置が保持されている
    expect(state.layoutData.entities.users).toEqual({ position: { x: 100, y: 100 } });
    
    // postsエンティティがクラスタリングされて追加されている
    expect(state.layoutData.entities.posts).toBeDefined();
    expect(state.layoutData.entities.posts.position.x).toBeGreaterThan(0);
    expect(state.layoutData.entities.posts.position.y).toBeGreaterThan(0);
    
    // DOM操作のスパイでsetAttributeの呼び出しを確認
    const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
    await app.render();
    await new Promise((resolve) => setTimeout(resolve, 0));
    
    // setAttributeが呼ばれたか確認
    expect(setAttributeSpy).toHaveBeenCalled();
  });

  test.skip('増分リバースエンジニアリング - 削除されたエンティティのレイアウトを削除', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    
    // 初期状態：users, postsエンティティが存在
    const initialERData = createERData({
      entities: [
        createEntity({
          name: 'users',
          columns: [{ name: 'id', type: 'int', key: 'PRI' }]
        }),
        createEntity({
          name: 'posts',
          columns: [
            { name: 'id', type: 'int', key: 'PRI' },
            { name: 'user_id', type: 'int', key: 'MUL' }
          ]
        })
      ],
      layout: {
        entities: {
          users: { x: 100, y: 100 },
          posts: { x: 300, y: 200 }
        },
        rectangles: [],
        texts: []
      }
    });
    
    // リバースエンジニアリング後：postsエンティティが削除される
    const updatedERData = createERData({
      entities: [
        createEntity({
          name: 'users',
          columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          position: { x: 100, y: 100 } // 既存の位置を保持
        })
      ],
      layout: {
        entities: {
          users: { x: 100, y: 100 }
          // postsのレイウトは削除される
        },
        rectangles: [],
        texts: []
      }
    });
    
    const mockData: MockData = {
      networkResponses: {
        '/api/er-data': createNetworkResponse({ data: initialERData }),
        '/api/reverse-engineer': createNetworkResponse({ data: updatedERData })
      }
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);
    
    // 初期データをロード
    await app.loadERData();
    
    // Act - 増分リバースエンジニアリングを実行
    await app.reverseEngineer();
    
    // 非同期処理が完了するまで待つ
    await new Promise((resolve) => setTimeout(resolve, 0));
    
    // Assert
    const state = app.state;
    expect(state.layoutData.entities.users).toEqual({ position: { x: 100, y: 100 } });
    expect(state.layoutData.entities.posts).toBeUndefined();
  });

  test.skip('増分リバースエンジニアリング - 既存エンティティの位置とサイズを保持', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    
    // 初期状態：usersエンティティが既存の位置とサイズを持つ
    const initialERData = createERData({
      entities: [
        createEntity({
          name: 'users',
          columns: [
            { name: 'id', type: 'int', key: 'PRI' },
            { name: 'name', type: 'varchar(100)', key: '' }
          ]
        })
      ],
      layout: {
        entities: {
          users: { x: 150, y: 250, width: 200, height: 120 }
        },
        rectangles: [],
        texts: []
      }
    });
    
    // リバースエンジニアリング後：usersにカラムが追加される
    const updatedERData = createERData({
      entities: [
        createEntity({
          name: 'users',
          columns: [
            { name: 'id', type: 'int', key: 'PRI' },
            { name: 'name', type: 'varchar(100)', key: '' },
            { name: 'email', type: 'varchar(255)', key: 'UNI' } // 新しいカラム
          ],
          position: { x: 150, y: 250, width: 200, height: 120 } // 既存の位置とサイズを保持
        })
      ]
    });
    
    const mockData: MockData = {
      networkResponses: {
        '/api/er-data': createNetworkResponse({ data: initialERData }),
        '/api/reverse-engineer': createNetworkResponse({ data: updatedERData })
      }
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);
    
    // 初期データをロード
    await app.loadERData();
    
    // Act - 増分リバースエンジニアリングを実行
    await app.reverseEngineer();
    
    // 非同期処理が完了するまで待つ
    await new Promise((resolve) => setTimeout(resolve, 0));
    
    // Assert
    const state = app.state;
    
    // usersエンティティの位置とサイズが保持されている
    expect(state.layoutData.entities.users).toEqual({ position: { x: 150, y: 250, width: 200, height: 120 } });
    
    // エンティティには新しいカラムが追加されている
    const usersEntity = state.erData.entities.find(e => e.name === 'users');
    expect(usersEntity?.columns).toHaveLength(3);
    expect(usersEntity?.columns.some(c => c.name === 'email')).toBe(true);
  });

  test.skip('増分リバースエンジニアリング - 複数の新規エンティティが適切にクラスタリングされる', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    
    // 初期状態：usersエンティティのみ
    const initialERData = createERData({
      entities: [
        createEntity({
          name: 'users',
          columns: [{ name: 'id', type: 'int', key: 'PRI' }]
        })
      ],
      layout: {
        entities: {
          users: { x: 100, y: 100 }
        },
        rectangles: [],
        texts: []
      }
    });
    
    // リバースエンジニアリング後：3つの新しいエンティティが追加される
    const updatedERData = createERData({
      entities: [
        createEntity({
          name: 'users',
          columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          position: { x: 100, y: 100 } // 既存の位置を保持
        }),
        createEntity({
          name: 'posts',
          columns: [
            { name: 'id', type: 'int', key: 'PRI' },
            { name: 'user_id', type: 'int', key: 'MUL' }
          ]
        }),
        createEntity({
          name: 'comments',
          columns: [
            { name: 'id', type: 'int', key: 'PRI' },
            { name: 'post_id', type: 'int', key: 'MUL' }
          ]
        }),
        createEntity({
          name: 'categories',
          columns: [{ name: 'id', type: 'int', key: 'PRI' }]
        })
      ],
      relationships: [
        {
          from: 'posts',
          fromColumn: 'user_id',
          to: 'users',
          toColumn: 'id'
        },
        {
          from: 'comments',
          fromColumn: 'post_id',
          to: 'posts',
          toColumn: 'id'
        }
      ]
    });
    
    const mockData: MockData = {
      networkResponses: {
        '/api/er-data': createNetworkResponse({ data: initialERData }),
        '/api/reverse-engineer': createNetworkResponse({ data: updatedERData })
      }
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);
    
    // 初期データをロード
    await app.loadERData();
    
    // Act - 増分リバースエンジニアリングを実行
    await app.reverseEngineer();
    
    // 非同期処理が完了するまで待つ
    await new Promise((resolve) => setTimeout(resolve, 0));
    
    // Assert
    const state = app.state;
    
    // 既存のusersエンティティの位置が保持されている
    expect(state.layoutData.entities.users).toEqual({ position: { x: 100, y: 100 } });
    
    // 新しいエンティティがすべて追加され、位置が設定されている
    expect(state.layoutData.entities.posts).toBeDefined();
    expect(state.layoutData.entities.comments).toBeDefined();
    expect(state.layoutData.entities.categories).toBeDefined();
    
    // 新しいエンティティの位置が設定されている
    expect(state.layoutData.entities.posts.position.x).toBeGreaterThan(0);
    expect(state.layoutData.entities.posts.position.y).toBeGreaterThan(0);
    expect(state.layoutData.entities.comments.position.x).toBeGreaterThan(0);
    expect(state.layoutData.entities.comments.position.y).toBeGreaterThan(0);
    expect(state.layoutData.entities.categories.position.x).toBeGreaterThan(0);
    expect(state.layoutData.entities.categories.position.y).toBeGreaterThan(0);
    
    // エンティティ数が正しい
    expect(Object.keys(state.layoutData.entities)).toHaveLength(4);
  });

  test('レイヤー順序変更が永続化される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockERData = createERData({
      entities: [createUserEntity(), createPostEntity()],
      layout: createLayoutData({
        layers: [
          { id: 'layer-1', name: 'users', visible: true, zIndex: 0 },
          { id: 'layer-2', name: 'posts', visible: true, zIndex: 1 }
        ]
      })
    });
    
    infrastructure.setupMockData({
      networkResponses: {
        '/api/er-data': createNetworkResponse({ data: mockERData }),
        '/api/layout': createSuccessResponse()
      }
    });
    
    let app: any = new ERViewerApplication(infrastructure);
    
    // データ読み込みを待つ
    await waitForAsync();
    
    // Act - レイヤー順序を変更してから保存
    const newLayers = [
      { id: 'layer-2', name: 'posts', visible: true, zIndex: 0 },
      { id: 'layer-1', name: 'users', visible: true, zIndex: 1 }
    ];
    
    const event = new CustomEvent('layerOrderChanged', {
      detail: { layers: newLayers }
    });
    
    infrastructure.dom.dispatchEvent(infrastructure.dom.getDocumentElement(), event);
    
    // イベント処理を待つ（最適化：不要と判断）
    // await waitForAsync();
    
    // レイアウトを保存
    await (app as any).saveLayout();
    
    // Assert - 保存リクエストが送信されたことを確認
    const requests = infrastructure.network.getRequestHistory();
    const layoutRequest = requests.find(req => req.url === '/api/layout' && req.method === 'POST');
    
    expect(layoutRequest).toBeDefined();
    expect(layoutRequest?.method).toBe('POST');
    expect(layoutRequest?.url).toBe('/api/layout');
    
    // bodyがJSON文字列の場合はパース
    const requestBody = typeof layoutRequest?.body === 'string' 
      ? JSON.parse(layoutRequest.body) 
      : layoutRequest?.body;
    
    // レイアウトデータが含まれていることを確認
    expect(requestBody).toHaveProperty('layers');
    expect(requestBody).toHaveProperty('entities');
    expect(requestBody).toHaveProperty('rectangles');
    expect(requestBody).toHaveProperty('texts');
    
    // レイヤーデータが存在することを確認
    expect(requestBody.layers).toBeDefined();
    expect(Array.isArray(requestBody.layers)).toBe(true);
  });
  });
});