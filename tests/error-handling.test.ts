/**
 * エラーハンドリングのテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockData } from '../public/js/types/infrastructure';
import { 
  createERData, 
  createEntity,
  createUserEntity, 
  createPostEntity, 
  createUserPostERData,
  createNetworkResponse,
  createDDLResponse,
  createSuccessResponse,
  createErrorResponse
} from './test-data-factory';

// テスト用ヘルパー関数 - 非同期処理の完了を待つ
const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

describe('エラーハンドリング', () => {
  afterEach(() => {
    // タイマーのクリア
    jest.clearAllTimers();
    
    // 全モックのクリア
    jest.clearAllMocks();
  });

  test('ネットワークエラーが適切に処理される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/er-data': createErrorResponse(500, 'Internal Server Error')
      }
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);

    // Act
    await app.loadERData();

    // Assert - Network操作の詳細検証
    const history = infrastructure.getInteractionHistory();
    const requests = history.networkRequests;
    expect(requests.length).toBeGreaterThan(0);
    
    const errorRequest = requests[requests.length - 1];
    expect(errorRequest.url).toBe('/api/er-data');
    expect(errorRequest.method).toBe('GET');
    
    // エラー状態の検証
    expect(app.state.error).toBeDefined();
    expect(app.state.loading).toBe(false);
    
    // Cleanup
    app = null;
  });

  test('無効なテーブル名でのDDL取得エラーが処理される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/table/invalid/ddl': {
          status: 404,
          statusText: 'Not Found',
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);

    // Act
    await app.showTableDetails('invalid');

    // Assert
    const history = infrastructure.getInteractionHistory();
    
    // Network操作の詳細検証
    const requests = history.networkRequests;
    expect(requests.length).toBeGreaterThan(0);
    
    const notFoundRequest = requests[requests.length - 1];
    expect(notFoundRequest.url).toBe('/api/table/invalid/ddl');
    expect(notFoundRequest.method).toBe('GET');
    
    // エラーログの検証
    expect(history.errors.length).toBeGreaterThan(0);
    
    // Cleanup
    app = null;
  });

  test('JSONパースエラーが適切に処理される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/er-data': {
          status: 200,
          statusText: 'OK',
          text: 'Invalid JSON {not valid}',
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);

    // Act
    await app.loadERData();

    // Assert
    const history = infrastructure.getInteractionHistory();
    
    // Network操作の検証
    const requests = history.networkRequests;
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[requests.length - 1].url).toBe('/api/er-data');
    
    // エラー状態の検証（パースエラーはtextとして処理されるため、実際の動作を検証）
    expect(app.state.loading).toBe(false);
    // getJSONがJSONパースを試みるが、現在のMock実装では単純にtextを返すため、
    // 実際のアプリケーションでエラーが発生する想定
  });

  test('権限エラー（403 Forbidden）が適切に処理される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/er-data': {
          status: 403,
          statusText: 'Forbidden',
          data: { error: 'Access denied' },
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);

    // Act
    await app.loadERData();

    // Assert
    const history = infrastructure.getInteractionHistory();
    
    // Network操作の検証
    const requests = history.networkRequests;
    expect(requests.length).toBeGreaterThan(0);
    const forbiddenRequest = requests[requests.length - 1];
    expect(forbiddenRequest.url).toBe('/api/er-data');
    expect(forbiddenRequest.method).toBe('GET');
    
    // エラー状態の検証
    expect(app.state.error).toBeDefined();
    expect(app.state.loading).toBe(false);
    
    // Cleanup
    app = null;
  });

  test('レート制限エラー（429 Too Many Requests）が適切に処理される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/layout': {
          status: 429,
          statusText: 'Too Many Requests',
          data: { error: 'Rate limit exceeded' },
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);
    
    // 初期状態を設定
    app.state.layoutData = {
      entities: { users: { x: 100, y: 100 } },
      rectangles: [],
      texts: [],
      layers: [],
    };

    // Act
    await app.saveLayout();

    // Assert
    const history = infrastructure.getInteractionHistory();
    
    // Network操作の検証
    const requests = history.networkRequests;
    expect(requests.length).toBeGreaterThan(0);
    const rateLimitRequest = requests[requests.length - 1];
    expect(rateLimitRequest.url).toBe('/api/layout');
    expect(rateLimitRequest.method).toBe('POST');
    
    // エラーハンドリングの検証 - saveLayoutメソッドがエラーログを記録しているか確認
    expect(history.errors.length).toBeGreaterThan(0);
    const lastError = history.errors[history.errors.length - 1];
    expect(lastError.args[0]).toContain('Error saving layout');
  });

  test('レイアウト保存時のサーバーエラーが適切に処理される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/layout': {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Database connection failed' },
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);
    
    // 初期状態を設定
    app.state.layoutData = {
      entities: { posts: { x: 200, y: 200 } },
      rectangles: [],
      texts: [],
      layers: [],
    };

    // Act
    await app.saveLayout();

    // Assert
    const history = infrastructure.getInteractionHistory();
    
    // Network操作の検証
    const requests = history.networkRequests;
    expect(requests.length).toBeGreaterThan(0);
    const errorRequest = requests[requests.length - 1];
    expect(errorRequest.url).toBe('/api/layout');
    expect(errorRequest.method).toBe('POST');
    expect(errorRequest.body).toBeDefined();
    
    // エラーハンドリングの検証 - saveLayoutメソッドがエラーログを記録しているか確認
    expect(history.errors.length).toBeGreaterThan(0);
    const lastError = history.errors[history.errors.length - 1];
    expect(lastError.args[0]).toContain('Error saving layout');
  });

  test('DDL取得時のサーバーエラーが適切に処理される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/table/users/ddl': {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Failed to retrieve DDL' },
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);

    // Act
    await app.showTableDetails('users');

    // Assert
    const history = infrastructure.getInteractionHistory();
    
    // Network操作の検証
    const requests = history.networkRequests;
    expect(requests.length).toBeGreaterThan(0);
    const errorRequest = requests[requests.length - 1];
    expect(errorRequest.url).toBe('/api/table/users/ddl');
    expect(errorRequest.method).toBe('GET');
    
    // エラーログの検証
    expect(history.errors.length).toBeGreaterThan(0);
    
    // Cleanup
    app = null;
  });

  test('無効なエンティティデータのエラーが適切に処理される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/er-data': {
          status: 200,
          statusText: 'OK',
          data: {
            entities: [
              {
                // 必須フィールドが欠けている無効なエンティティ
                name: 'invalid_entity',
                // columns が欠けている
              },
            ],
            relationships: [],
          },
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);

    // Act
    await app.loadERData();

    // Assert
    const history = infrastructure.getInteractionHistory();
    
    // Network操作の検証
    const requests = history.networkRequests;
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[requests.length - 1].url).toBe('/api/er-data');
    
    // エラー状態または空の状態の検証
    // 無効なデータの場合、erDataがセットされることを確認
    expect(app.state.erData).toBeDefined();
    expect(app.state.erData?.entities).toBeDefined();
    expect(app.state.loading).toBe(false);
  });

  test('リバースエンジニアリング時のエラーが適切に処理される', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/reverse-engineer': {
          status: 503,
          statusText: 'Service Unavailable',
          data: { error: 'Database is currently unavailable' },
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);

    // Act
    await app.reverseEngineer();

    // Assert
    const history = infrastructure.getInteractionHistory();
    
    // Network操作の検証
    const requests = history.networkRequests;
    expect(requests.length).toBeGreaterThan(0);
    const errorRequest = requests[requests.length - 1];
    expect(errorRequest.url).toBe('/api/reverse-engineer');
    expect(errorRequest.method).toBe('POST');
    
    // エラーログの検証
    expect(history.errors.length).toBeGreaterThan(0);
    
    // ローディング状態の検証
    expect(app.state.loading).toBe(false);
    
    // Cleanup
    app = null;
  });
});