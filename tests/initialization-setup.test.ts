/**
 * 初期化とセットアップのテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockData } from '../public/js/types/infrastructure';
import { MockElement } from '../public/js/infrastructure/mocks/dom-mock';


describe('初期化とセットアップ', () => {
  afterEach(() => {
    // タイマーのクリア
    jest.clearAllTimers();

    // 全モックのクリア
    jest.clearAllMocks();
  });

  describe('アプリケーション初期化', () => {
    test('アプリケーションが正常に初期化される', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData = {
        entities: [
          {
            name: 'users',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 200 },
            columns: [
              { name: 'id', type: 'INTEGER', primary: true, notNull: true },
              { name: 'name', type: 'VARCHAR(255)', primary: false, notNull: true },
              { name: 'email', type: 'VARCHAR(255)', primary: false, notNull: true },
              { name: 'created_at', type: 'TIMESTAMP', primary: false, notNull: true },
            ],
          },
          {
            name: 'posts',
            position: { x: 400, y: 100 },
            size: { width: 200, height: 200 },
            columns: [
              { name: 'id', type: 'INTEGER', primary: true, notNull: true },
              { name: 'user_id', type: 'INTEGER', primary: false, notNull: true },
              { name: 'title', type: 'VARCHAR(255)', primary: false, notNull: true },
              { name: 'content', type: 'TEXT', primary: false, notNull: true },
              { name: 'created_at', type: 'TIMESTAMP', primary: false, notNull: true },
            ],
          },
        ],
        relationships: [
          {
            from: 'posts',
            fromColumn: 'user_id',
            to: 'users',
            toColumn: 'id',
          },
        ],
      };
      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': {
            data: mockERData,
            status: 200,
            statusText: 'OK',
          },
        },
      };
      infrastructure.setupMockData(mockData);

      // Act
      const _app: any = new ERViewerApplication(infrastructure);

      // Assert
      expect(_app).toBeDefined();

      // キャンバスが初期化されたことを検証
      const canvas = infrastructure.dom.getElementById('er-canvas');
      expect(canvas).toBeDefined();

      // サイドバーが初期化されたことを検証
      const sidebar = infrastructure.dom.getElementById('sidebar');
      expect(sidebar).toBeDefined();

      // ヘルプボタンが初期化されたことを検証
      const helpButton = infrastructure.dom.getElementById('help-button');
      expect(helpButton).toBeDefined();

      // DOM要素が正しく作成されたことを検証
      const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer');
      expect(dynamicLayer).toBeDefined();

      // エラー表示エリアが作成されたことを検証
      const errorContainer = infrastructure.dom.getElementById('error-container');
      expect(errorContainer).toBeDefined();
    });

    test('キャンバスが正しく初期化される', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData = {
        entities: [
          {
            name: 'users',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 200 },
            columns: [
              { name: 'id', type: 'INTEGER', primary: true, notNull: true },
              { name: 'name', type: 'VARCHAR(255)', primary: false, notNull: true },
              { name: 'email', type: 'VARCHAR(255)', primary: false, notNull: true },
              { name: 'created_at', type: 'TIMESTAMP', primary: false, notNull: true },
            ],
          },
          {
            name: 'posts',
            position: { x: 400, y: 100 },
            size: { width: 200, height: 200 },
            columns: [
              { name: 'id', type: 'INTEGER', primary: true, notNull: true },
              { name: 'user_id', type: 'INTEGER', primary: false, notNull: true },
              { name: 'title', type: 'VARCHAR(255)', primary: false, notNull: true },
              { name: 'content', type: 'TEXT', primary: false, notNull: true },
              { name: 'created_at', type: 'TIMESTAMP', primary: false, notNull: true },
            ],
          },
        ],
        relationships: [
          {
            from: 'posts',
            fromColumn: 'user_id',
            to: 'users',
            toColumn: 'id',
          },
        ],
      };
      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': {
            data: mockERData,
            status: 200,
            statusText: 'OK',
          },
        },
      };
      infrastructure.setupMockData(mockData);

      // Act
      new ERViewerApplication(infrastructure);

      // Assert
      const canvas = infrastructure.dom.getElementById('er-canvas') as unknown as MockElement;
      expect(canvas).toBeDefined();
      expect(canvas.getAttribute('width')).toBe('800');
      expect(canvas.getAttribute('height')).toBe('600');
    });
  });

  describe('初期データロード', () => {
    test('初期データがロードされる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData = {
        entities: [
          {
            name: 'users',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 200 },
            columns: [
              { name: 'id', type: 'INTEGER', primary: true, notNull: true },
              { name: 'name', type: 'VARCHAR(255)', primary: false, notNull: true },
              { name: 'email', type: 'VARCHAR(255)', primary: false, notNull: true },
              { name: 'created_at', type: 'TIMESTAMP', primary: false, notNull: true },
            ],
          },
          {
            name: 'posts',
            position: { x: 400, y: 100 },
            size: { width: 200, height: 200 },
            columns: [
              { name: 'id', type: 'INTEGER', primary: true, notNull: true },
              { name: 'user_id', type: 'INTEGER', primary: false, notNull: true },
              { name: 'title', type: 'VARCHAR(255)', primary: false, notNull: true },
              { name: 'content', type: 'TEXT', primary: false, notNull: true },
              { name: 'created_at', type: 'TIMESTAMP', primary: false, notNull: true },
            ],
          },
        ],
        relationships: [
          {
            from: 'posts',
            fromColumn: 'user_id',
            to: 'users',
            toColumn: 'id',
          },
        ],
      };
      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': {
            data: mockERData,
            status: 200,
            statusText: 'OK',
          },
        },
      };
      infrastructure.setupMockData(mockData);

      // Act
      new ERViewerApplication(infrastructure);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      const history = infrastructure.getInteractionHistory();
      const requests = history.networkRequests;

      // 配列操作を使わずに最初のリクエストを確認
      expect(requests.length).toBeGreaterThan(0);

      // Network操作の詳細検証
      const firstRequest = requests[0]!;
      expect(firstRequest.url).toBe('/api/er-data');
      expect(firstRequest.method).toBe('GET');
      expect(firstRequest.headers).toBeDefined();
      expect(firstRequest.timestamp).toBeDefined();

      // dynamic-layerにエンティティが作成されたことを検証
      const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer') as unknown as MockElement;
      expect(dynamicLayer).toBeDefined();
      expect(dynamicLayer.children.length).toBeGreaterThan(0);

      // DOM要素の属性が正しく設定されたことを確認
      const history2 = infrastructure.getInteractionHistory();
      expect(history2.networkRequests.length).toBe(1);
    });
  });
});
