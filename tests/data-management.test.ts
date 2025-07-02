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
  createNetworkResponse,
  createSuccessResponse,
} from './test-data-factory';

// テスト用ヘルパー関数 - 非同期処理の完了を待つ
const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

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
      const mockERData = createERData({
        entities: [
          createEntity({
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          }),
        ],
      });
      const mockData: MockData = {
        networkResponses: {
          '/api/reverse-engineer': createNetworkResponse({ data: mockERData }),
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
      const initialERData = createERData({
        entities: [
          createEntity({
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          }),
        ],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
          },
          rectangles: [],
          texts: [],
        },
      });

      // リバースエンジニアリング後：postsエンティティが追加される
      const updatedERData = createERData({
        entities: [
          createEntity({
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          }),
          createEntity({
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', key: 'PRI' },
              { name: 'user_id', type: 'int', key: 'MUL' },
            ],
          }),
        ],
        relationships: [
          {
            from: 'posts',
            fromColumn: 'user_id',
            to: 'users',
            toColumn: 'id',
          },
        ],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } }, // 既存の位置を保持
            // postsはpositionがない（クラスタリング対象）
          },
          rectangles: [],
          texts: [],
        },
      });

      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: initialERData }),
          '/api/reverse-engineer': createNetworkResponse({ data: updatedERData }),
          '/api/layout': createSuccessResponse(),
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // 初期データをロード
      await app.loadERData();
      await waitForAsync();

      // Act - 増分リバースエンジニアリングを実行
      await app.reverseEngineer();
      await waitForAsync();

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
      const initialERData = createERData({
        entities: [
          createEntity({
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          }),
          createEntity({
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', key: 'PRI' },
              { name: 'user_id', type: 'int', key: 'MUL' },
            ],
          }),
        ],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
            posts: { position: { x: 300, y: 200 } },
          },
          rectangles: [],
          texts: [],
        },
      });

      // リバースエンジニアリング後：postsエンティティが削除される
      const updatedERData = createERData({
        entities: [
          createEntity({
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          }),
        ],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
            // postsのレイウトは削除される
          },
          rectangles: [],
          texts: [],
        },
      });

      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: initialERData }),
          '/api/reverse-engineer': createNetworkResponse({ data: updatedERData }),
          '/api/layout': createSuccessResponse(),
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // 初期データをロード
      await app.loadERData();
      await waitForAsync();

      // Act - 増分リバースエンジニアリングを実行
      await app.reverseEngineer();
      await waitForAsync();

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
      const initialERData = createERData({
        entities: [
          createEntity({
            name: 'users',
            columns: [
              { name: 'id', type: 'int', key: 'PRI' },
              { name: 'name', type: 'varchar(100)', key: '' },
            ],
          }),
        ],
        layout: {
          entities: {
            users: { position: { x: 150, y: 250 } },
          },
          rectangles: [],
          texts: [],
        },
      });

      // リバースエンジニアリング後：usersにカラムが追加される
      const updatedERData = createERData({
        entities: [
          createEntity({
            name: 'users',
            columns: [
              { name: 'id', type: 'int', key: 'PRI' },
              { name: 'name', type: 'varchar(100)', key: '' },
              { name: 'email', type: 'varchar(255)', key: 'UNI' }, // 新しいカラム
            ],
          }),
        ],
        layout: {
          entities: {
            users: { position: { x: 150, y: 250 } }, // 既存の位置を保持
          },
          rectangles: [],
          texts: [],
        },
      });

      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: initialERData }),
          '/api/reverse-engineer': createNetworkResponse({ data: updatedERData }),
          '/api/layout': createSuccessResponse(),
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // 初期データをロード
      await app.loadERData();
      await waitForAsync();

      // Act - 増分リバースエンジニアリングを実行
      await app.reverseEngineer();
      await waitForAsync();

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
      const initialERData = createERData({
        entities: [
          createEntity({
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          }),
        ],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
          },
          rectangles: [],
          texts: [],
        },
      });

      // リバースエンジニアリング後：3つの新しいエンティティが追加される
      const updatedERData = createERData({
        entities: [
          createEntity({
            name: 'users',
            columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          }),
          createEntity({
            name: 'posts',
            columns: [
              { name: 'id', type: 'int', key: 'PRI' },
              { name: 'user_id', type: 'int', key: 'MUL' },
            ],
          }),
          createEntity({
            name: 'comments',
            columns: [
              { name: 'id', type: 'int', key: 'PRI' },
              { name: 'post_id', type: 'int', key: 'MUL' },
            ],
          }),
          createEntity({
            name: 'categories',
            columns: [{ name: 'id', type: 'int', key: 'PRI' }],
          }),
        ],
        relationships: [
          {
            from: 'posts',
            fromColumn: 'user_id',
            to: 'users',
            toColumn: 'id',
          },
          {
            from: 'comments',
            fromColumn: 'post_id',
            to: 'posts',
            toColumn: 'id',
          },
        ],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } }, // 既存の位置を保持
            // 他のエンティティはpositionがない（クラスタリング対象）
          },
          rectangles: [],
          texts: [],
        },
      });

      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: initialERData }),
          '/api/reverse-engineer': createNetworkResponse({ data: updatedERData }),
          '/api/layout': createSuccessResponse(),
        },
      };
      infrastructure.setupMockData(mockData);
      const app: any = new ERViewerApplication(infrastructure);

      // 初期データをロード
      await app.loadERData();
      await waitForAsync();

      // Act - 増分リバースエンジニアリングを実行
      await app.reverseEngineer();
      await waitForAsync();

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
      const mockERData = createERData({
        entities: [createUserEntity(), createPostEntity()],
        layout: createLayoutData({
          layers: [
            { id: 'layer-1', name: 'users', visible: true, zIndex: 0 },
            { id: 'layer-2', name: 'posts', visible: true, zIndex: 1 },
          ],
        }),
      });

      infrastructure.setupMockData({
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: mockERData }),
          '/api/layout': createSuccessResponse(),
        },
      });

      const app: any = new ERViewerApplication(infrastructure);

      // データ読み込みを待つ
      await waitForAsync();

      // Act - レイヤー順序を変更してから保存
      const newLayers = [
        { id: 'layer-2', name: 'posts', visible: true, zIndex: 0 },
        { id: 'layer-1', name: 'users', visible: true, zIndex: 1 },
      ];

      infrastructure.dom.dispatchEvent(infrastructure.dom.getDocumentElement(), 'layerOrderChanged', {
        layers: newLayers,
      });

      // イベント処理を待つ（最適化：不要と判断）
      // await waitForAsync();

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
  });
});
