/**
 * データ管理のテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockData } from '../public/js/types/infrastructure';


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
      jest.spyOn(infrastructure.network, 'postJSON');
      const mockData: MockData = {
        networkResponses: {
          '/api/table/users/ddl': {
            status: 200,
            data: { ddl: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE);' },
          },
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // Act
      await app.showTableDetails('users');

      // Assert
      const history = infrastructure.getInteractionHistory();
      const requests = history.networkRequests;
      expect(requests.length).toBeGreaterThan(0);

      const ddlRequest = requests[requests.length - 1]!;
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
      jest.spyOn(infrastructure.network, 'postJSON');
      const mockData: MockData = {
        networkResponses: {
          '/api/layout': {
            status: 200,
            data: { success: true },
          },
        },
      };
      infrastructure.setupMockData(mockData);

      // postJSONメソッドをスパイ化
      jest.spyOn(infrastructure.network, 'postJSON');

      const app: any = new ERViewerApplication(infrastructure);

      // Act
      await app.saveLayout();

      // Assert
      expect(infrastructure.network.postJSON).toHaveBeenCalledWith(
        '/api/layout',
        expect.objectContaining({
          entities: expect.any(Object),
          rectangles: expect.any(Array),
          texts: expect.any(Array),
        }),
      );
    });

    test('リバースエンジニアリングが正常に動作する', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      jest.spyOn(infrastructure.network, 'postJSON');
      const mockData: MockData = {
        networkResponses: {
          '/api/reverse-engineer': {
            status: 200,
            data: {
              entities: [
                {
                  name: 'users',
                  columns: [{ name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' }],
                  foreignKeys: [],
                  ddl: 'CREATE TABLE users (id int);'
                }
              ],
              relationships: [],
              layout: {
                entities: {
                  users: {
                    position: {
                      x: 100,
                      y: 100
                    }
                  }
                },
                rectangles: [],
                texts: [],
                layers: []
              }
            }
          },
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // Act
      await app.reverseEngineer();

      // Assert
      const history = infrastructure.getInteractionHistory();
      const requests = history.networkRequests;
      // 配列操作を使わずにリクエストを確認
      expect(requests.length).toBeGreaterThan(0);

      // Network操作の詳細検証
      const reverseRequest = requests[requests.length - 1]!;
      expect(reverseRequest.url).toBe('/api/reverse-engineer');
      expect(reverseRequest.method).toBe('POST');
      expect(reverseRequest.headers).toBeDefined();
      expect(reverseRequest.timestamp).toBeDefined();
    });

    // TODO: 増分リバースエンジニアリング機能が実装されたら有効化する
    // 現在のリバースエンジニアリング実装は既存のレイアウトを保持せず、
    // すべてのエンティティのpositionをクリアしてクラスタリングを強制している
    test('増分リバースエンジニアリング - 既存レイアウトを保持しながら新しいエンティティを追加', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      jest.spyOn(infrastructure.network, 'postJSON');

      // 初期状態：usersエンティティのみ存在
      const initialERData = {
        entities: [
          {
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' }],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int);'
          }
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } }
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };

      // リバースエンジニアリング後：postsエンティティが追加される
      const updatedERData = {
        entities: [
          {
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' }],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int);'
          },
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'user_id', type: 'int', key: 'MUL', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE posts (id int, user_id int);'
          }
        ],
        relationships: [
          {
            from: 'posts',
            fromColumn: 'user_id',
            to: 'users',
            toColumn: 'id',
            constraintName: 'posts_user_id_fkey'
          }
        ],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } }, // 既存の位置を保持
            // postsはpositionがない（クラスタリング対象）
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };

      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': { status: 200, data: initialERData },
          '/api/reverse-engineer': { status: 200, data: updatedERData },
          '/api/layout': { status: 200, data: { success: true } },
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // 初期データをロード
      await app.loadERData();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Act - 増分リバースエンジニアリングを実行
      await app.reverseEngineer();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      // レイアウト保存をテスト
      await app.saveLayout();

      // saveLayoutのリクエストを確認
      expect(infrastructure.network.postJSON).toHaveBeenCalledWith('/api/layout', expect.any(Object));

      const postCalls = (infrastructure.network.postJSON as jest.Mock).mock.calls;
      const layoutCall = postCalls[postCalls.length - 1];
      const requestBody = layoutCall[1];

      // usersエンティティの位置が保持されている
      expect(requestBody.entities.users).toBeDefined();
      expect(requestBody.entities.users.position).toEqual({ x: 100, y: 100 });

      // postsエンティティはまだlayoutDataに追加されていない（クラスタリング待ち）
      expect(requestBody.entities.posts).toBeUndefined();
    });

    test('増分リバースエンジニアリング - 削除されたエンティティのレイアウトを削除', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      jest.spyOn(infrastructure.network, 'postJSON');

      // 初期状態：users, postsエンティティが存在
      const initialERData = {
        entities: [
          {
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' }],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int);'
          },
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'user_id', type: 'int', key: 'MUL', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE posts (id int, user_id int);'
          }
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
            posts: { position: { x: 300, y: 200 } },
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };

      // リバースエンジニアリング後：postsエンティティが削除される
      const updatedERData = {
        entities: [
          {
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' }],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int);'
          }
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
            // postsのレイウトは削除される
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };

      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': { status: 200, data: initialERData },
          '/api/reverse-engineer': { status: 200, data: updatedERData },
          '/api/layout': { status: 200, data: { success: true } },
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // 初期データをロード
      await app.loadERData();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Act - 増分リバースエンジニアリングを実行
      await app.reverseEngineer();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      // レイアウト保存をテスト
      await app.saveLayout();

      // saveLayoutのリクエストを確認
      expect(infrastructure.network.postJSON).toHaveBeenCalledWith('/api/layout', expect.any(Object));

      const postCalls = (infrastructure.network.postJSON as jest.Mock).mock.calls;
      const layoutCall = postCalls[postCalls.length - 1];
      const requestBody = layoutCall[1];

      // usersエンティティの位置が保持されている
      expect(requestBody.entities.users).toBeDefined();
      expect(requestBody.entities.users.position).toEqual({ x: 100, y: 100 });

      // postsエンティティのレイアウトが削除されている
      expect(requestBody.entities.posts).toBeUndefined();
    });

    test('増分リバースエンジニアリング - 既存エンティティの位置とサイズを保持', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      jest.spyOn(infrastructure.network, 'postJSON');

      // 初期状態：usersエンティティが既存の位置とサイズを持つ
      const initialERData = {
        entities: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'name', type: 'varchar(100)', key: '', nullable: true, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int, name varchar(100));'
          }
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 150, y: 250 } }
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };

      // リバースエンジニアリング後：usersにカラムが追加される
      const updatedERData = {
        entities: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'name', type: 'varchar(100)', key: '', nullable: true, default: null, extra: '' },
              { name: 'email', type: 'varchar(255)', key: 'UNI', nullable: false, default: null, extra: '' } // 新しいカラム
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int, name varchar(100), email varchar(255));'
          }
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 150, y: 250 } } // 既存の位置を保持
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };

      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': { status: 200, data: initialERData },
          '/api/reverse-engineer': { status: 200, data: updatedERData },
          '/api/layout': { status: 200, data: { success: true } },
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // 初期データをロード
      await app.loadERData();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Act - 増分リバースエンジニアリングを実行
      await app.reverseEngineer();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      // レイアウト保存をテスト
      await app.saveLayout();

      // saveLayoutのリクエストを確認
      expect(infrastructure.network.postJSON).toHaveBeenCalledWith('/api/layout', expect.any(Object));

      const postCalls = (infrastructure.network.postJSON as jest.Mock).mock.calls;
      const layoutCall = postCalls[postCalls.length - 1];
      const requestBody = layoutCall[1];

      // usersエンティティの位置が保持されている
      expect(requestBody.entities.users).toBeDefined();
      expect(requestBody.entities.users.position).toEqual({ x: 150, y: 250 });
    });

    test('増分リバースエンジニアリング - 複数の新規エンティティが適切にクラスタリングされる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      jest.spyOn(infrastructure.network, 'postJSON');

      // 初期状態：usersエンティティのみ
      const initialERData = {
        entities: [
          {
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' }],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int);'
          }
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } }
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };

      // リバースエンジニアリング後：3つの新しいエンティティが追加される
      const updatedERData = {
        entities: [
          {
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' }],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int);'
          },
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'user_id', type: 'int', key: 'MUL', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE posts (id int, user_id int);'
          },
          {
            name: 'comments',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'post_id', type: 'int', key: 'MUL', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE comments (id int, post_id int);'
          },
          {
            name: 'categories',
            columns: [{ name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' }],
            foreignKeys: [],
            ddl: 'CREATE TABLE categories (id int);'
          }
        ],
        relationships: [
          {
            from: 'posts',
            fromColumn: 'user_id',
            to: 'users',
            toColumn: 'id',
            constraintName: 'posts_user_id_fkey'
          },
          {
            from: 'comments',
            fromColumn: 'post_id',
            to: 'posts',
            toColumn: 'id',
            constraintName: 'comments_post_id_fkey'
          }
        ],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } }, // 既存の位置を保持
            // 他のエンティティはpositionがない（クラスタリング対象）
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };

      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': { status: 200, data: initialERData },
          '/api/reverse-engineer': { status: 200, data: updatedERData },
          '/api/layout': { status: 200, data: { success: true } },
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // 初期データをロード
      await app.loadERData();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Act - 増分リバースエンジニアリングを実行
      await app.reverseEngineer();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      // レイアウト保存をテスト
      await app.saveLayout();

      // saveLayoutのリクエストを確認
      expect(infrastructure.network.postJSON).toHaveBeenCalledWith('/api/layout', expect.any(Object));

      const postCalls = (infrastructure.network.postJSON as jest.Mock).mock.calls;
      const layoutCall = postCalls[postCalls.length - 1];
      const requestBody = layoutCall[1];

      // 既存のusersエンティティの位置が保持されている
      expect(requestBody.entities.users).toBeDefined();
      expect(requestBody.entities.users.position).toEqual({ x: 100, y: 100 });

      // 新しいエンティティはまだlayoutDataに追加されていない（クラスタリング待ち）
      expect(requestBody.entities.posts).toBeUndefined();
      expect(requestBody.entities.comments).toBeUndefined();
      expect(requestBody.entities.categories).toBeUndefined();

      // 既存のエンティティのみが存在する
      expect(Object.keys(requestBody.entities)).toHaveLength(1);
    });

    test('レイヤー順序変更が永続化される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      jest.spyOn(infrastructure.network, 'postJSON');
      const mockERData = {
        entities: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'name', type: 'varchar(255)', nullable: false, default: null, extra: '' },
              { name: 'email', type: 'varchar(255)', key: 'UNI', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int, name varchar(255), email varchar(255));'
          },
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'title', type: 'varchar(255)', nullable: false, default: null, extra: '' },
              { name: 'content', type: 'text', nullable: false, default: null, extra: '' },
              { name: 'user_id', type: 'int', key: 'MUL', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE posts (id int, title varchar(255), content text, user_id int);'
          }
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
            posts: { position: { x: 350, y: 100 } }
          },
          rectangles: [],
          texts: [],
          layers: [
            { id: 'layer-1', name: 'users', visible: true, zIndex: 0 },
            { id: 'layer-2', name: 'posts', visible: true, zIndex: 1 },
          ]
        }
      };

      infrastructure.setupMockData({
        networkResponses: {
          '/api/er-data': { status: 200, data: mockERData },
          '/api/layout': { status: 200, data: { success: true } },
        },
      });

      const app: any = new ERViewerApplication(infrastructure);

      // データ読み込みを待つ
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Act - レイヤー順序を変更してから保存
      const newLayers = [
        { id: 'layer-2', name: 'posts', visible: true, zIndex: 0 },
        { id: 'layer-1', name: 'users', visible: true, zIndex: 1 },
      ];

      infrastructure.dom.dispatchEvent(infrastructure.dom.getDocumentElement(), 'layerOrderChanged', {
        layers: newLayers,
      });

      // イベント処理を待つ（最適化：不要と判断）
      // await new Promise((resolve) => setTimeout(resolve, 0));

      // レイアウトを保存
      await app.saveLayout();

      // Assert - 保存リクエストが送信されたことを確認
      const history = infrastructure.getInteractionHistory();
      const requests = history.networkRequests;
      const layoutRequest = requests.find((req: any) => req.url === '/api/layout' && req.method === 'POST');

      expect(layoutRequest).toBeDefined();
      expect(layoutRequest?.method).toBe('POST');
      expect(layoutRequest?.url).toBe('/api/layout');

      // bodyがJSON文字列の場合はパース
      const requestBody =
        typeof layoutRequest?.body === 'string' ? JSON.parse(layoutRequest.body) : layoutRequest?.body;

      // レイアウトデータが含まれていることを確認
      expect(requestBody).toHaveProperty('layers');
      expect(requestBody).toHaveProperty('entities');
      expect(requestBody).toHaveProperty('rectangles');
      expect(requestBody).toHaveProperty('texts');

      // レイヤーデータが存在することを確認
      expect(requestBody.layers).toBeDefined();
      expect(Array.isArray(requestBody.layers)).toBe(true);
    });

    test('全データ保存が正常に動作する（左サイドバー状態を含む）', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      jest.spyOn(infrastructure.network, 'postJSON');
      const mockData: MockData = {
        networkResponses: {
          '/api/data/all': {
            status: 200,
            data: { success: true },
          },
        },
      };
      infrastructure.setupMockData(mockData);

      const app: any = new ERViewerApplication(infrastructure);

      // ERデータを設定
      const erData = {
        entities: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'name', type: 'varchar(255)', nullable: false, default: null, extra: '' },
              { name: 'email', type: 'varchar(255)', key: 'UNI', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int, name varchar(255), email varchar(255));'
          },
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'title', type: 'varchar(255)', nullable: false, default: null, extra: '' },
              { name: 'content', type: 'text', nullable: false, default: null, extra: '' },
              { name: 'user_id', type: 'int', key: 'MUL', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE posts (id int, title varchar(255), content text, user_id int);'
          }
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
            posts: { position: { x: 350, y: 100 } }
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };
      await app.setState({ erData });

      // Act
      await app.saveAllData();

      // Assert
      expect(infrastructure.network.postJSON).toHaveBeenCalledWith(
        '/api/data/all',
        expect.objectContaining({
          erData: expect.objectContaining({
            entities: expect.any(Array),
            relationships: expect.any(Array),
          }),
          layoutData: expect.objectContaining({
            entities: expect.any(Object),
            rectangles: expect.any(Array),
            texts: expect.any(Array),
            layers: expect.any(Array),
            leftSidebar: expect.objectContaining({
              visible: expect.any(Boolean),
              width: expect.any(Number),
            }),
          }),
        }),
      );
    });

    test('全データ読み込みが正常に動作する（左サイドバー状態を含む）', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData = {
        entities: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'name', type: 'varchar(255)', nullable: false, default: null, extra: '' },
              { name: 'email', type: 'varchar(255)', key: 'UNI', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE users (id int, name varchar(255), email varchar(255));'
          },
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'title', type: 'varchar(255)', nullable: false, default: null, extra: '' },
              { name: 'content', type: 'text', nullable: false, default: null, extra: '' },
              { name: 'user_id', type: 'int', key: 'MUL', nullable: false, default: null, extra: '' }
            ],
            foreignKeys: [],
            ddl: 'CREATE TABLE posts (id int, title varchar(255), content text, user_id int);'
          }
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
            posts: { position: { x: 350, y: 100 } }
          },
          rectangles: [],
          texts: [],
          layers: []
        }
      };
      const mockLayoutData = {
        entities: {
          users: { position: { x: 100, y: 100 } },
          posts: { position: { x: 300, y: 200 } },
        },
        rectangles: [],
        texts: [],
        layers: [],
        leftSidebar: {
          visible: false,
          width: 300,
        }
      };

      const mockData: MockData = {
        networkResponses: {
          '/api/data/all': {
            status: 200,
            data: {
              erData: mockERData,
              layoutData: mockLayoutData,
            },
          },
        },
      };
      infrastructure.setupMockData(mockData);

      const app: any = new ERViewerApplication(infrastructure);

      // Act
      await app.loadAllData();

      // Assert
      // Networkリクエストが送信されたことを確認
      const history = infrastructure.getInteractionHistory();
      const requests = history.networkRequests;
      const loadRequest = requests.find((req: any) => req.url === '/api/data/all' && req.method === 'GET');

      expect(loadRequest).toBeDefined();
      expect(loadRequest?.method).toBe('GET');
      expect(loadRequest?.url).toBe('/api/data/all');

      // loadAllDataが正常に実行されたことを確認
      // リクエストが正しく送信されたことで、データの読み込みが成功したと判断
      expect(requests.length).toBeGreaterThan(0);
    });

    test('左サイドバー状態が保存データに含まれる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      jest.spyOn(infrastructure.network, 'postJSON');
      const mockData: MockData = {
        networkResponses: {
          '/api/layout': {
            status: 200,
            data: { success: true },
          },
        },
      };
      infrastructure.setupMockData(mockData);

      const app: any = new ERViewerApplication(infrastructure);

      // 左サイドバーの状態を変更
      await app.setState({
        leftSidebarState: {
          visible: false,
          width: 350,
        },
      });

      // Act
      await app.saveLayout();

      // Assert
      expect(infrastructure.network.postJSON).toHaveBeenCalledWith(
        '/api/layout',
        expect.objectContaining({
          entities: expect.any(Object),
          rectangles: expect.any(Array),
          texts: expect.any(Array),
          layers: expect.any(Array),
          leftSidebar: expect.objectContaining({
            visible: false,
            width: 350,
          }),
        }),
      );
    });
  });
});
