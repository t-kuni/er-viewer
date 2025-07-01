/**
 * 初期化とセットアップのテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockData } from '../public/js/types/infrastructure';
import { MockElement } from '../public/js/infrastructure/mocks/dom-mock';
import { 
  createERData, 
  createEntity,
  createUserEntity, 
  createPostEntity, 
  createUserPostERData,
  createNetworkResponse
} from './test-data-factory';

// テスト用ヘルパー関数 - 非同期処理の完了を待つ
const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

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
      const mockERData = createUserPostERData();
      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: mockERData })
        }
      };
      infrastructure.setupMockData(mockData);
      
      // Act
      let app: any = new ERViewerApplication(infrastructure);
      
      // Assert
      expect(app).toBeDefined();
      expect(app.state).toBeDefined();
      expect(app.state.canvas).toBeDefined();
      expect(app.state.sidebar).toBeDefined();
      
      // Cleanup
      app = null;
    });

    test('キャンバスが正しく初期化される', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData = createUserPostERData();
      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: mockERData })
        }
      };
      infrastructure.setupMockData(mockData);
      
      // Act
      let app: any = new ERViewerApplication(infrastructure);
      
      // Assert
      const canvas = infrastructure.dom.getElementById('er-canvas') as unknown as MockElement;
      expect(canvas).toBeDefined();
      expect(canvas.getAttribute('width')).toBe('800');
      expect(canvas.getAttribute('height')).toBe('600');
      
      // Cleanup
      app = null;
    });
  });

  describe('初期データロード', () => {
    test('初期データがロードされる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData = createERData({
        entities: [createUserEntity(), createPostEntity()],
        relationships: [{
          from: 'posts',
          fromColumn: 'user_id',
          to: 'users',
          toColumn: 'id'
        }]
      });
      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: mockERData })
        }
      };
      infrastructure.setupMockData(mockData);
      
      // Act
      let app: any = new ERViewerApplication(infrastructure);
      await waitForAsync();
      
      // Assert
      const history = infrastructure.getInteractionHistory();
      const requests = history.networkRequests;

      // 配列操作を使わずに最初のリクエストを確認
      expect(requests.length).toBeGreaterThan(0);
      
      // Network操作の詳細検証
      const firstRequest = requests[0];
      expect(firstRequest.url).toBe('/api/er-data');
      expect(firstRequest.method).toBe('GET');
      expect(firstRequest.headers).toBeDefined();
      expect(firstRequest.timestamp).toBeDefined();
      
      // レスポンスの検証
      expect(app.state.erData).toBeDefined();
      expect(app.state.erData?.entities).toHaveLength(2);
      
      // Cleanup
      app = null;
    });
  });
});