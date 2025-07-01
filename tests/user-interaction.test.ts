/**
 * ユーザーインタラクションのテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockData } from '../public/js/types/infrastructure';
import { MockElement } from '../public/js/infrastructure/mocks/dom-mock';
import { BrowserAPIMock } from '../public/js/infrastructure/mocks/browser-api-mock';
import { 
  createERData, 
  createEntity,
  createUserEntity, 
  createPostEntity, 
  createUserPostERData,
  createNetworkResponse,
  createDDLResponse
} from './test-data-factory';

// テスト用ヘルパー関数 - 非同期処理の完了を待つ
const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

interface MockERData {
  entities: any[];
  relationships: any[];
  layout: any;
}

describe('ユーザーインタラクション', () => {
  afterEach(() => {
    // タイマーのクリア
    jest.clearAllTimers();
    
    // 全モックのクリア
    jest.clearAllMocks();
  });

  describe('エンティティ選択', () => {
    test('エンティティクリックでテーブル詳細が表示される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/table/users/ddl': createDDLResponse('CREATE TABLE users (id INT PRIMARY KEY);')
        }
      };
      infrastructure.setupMockData(mockData);
      let app: any = new ERViewerApplication(infrastructure);
      
      // DOM操作をスパイ
      const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
      const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
      
      app.render();

      // usersエンティティをクリック
      app.showTableDetails('users');

      // ネットワークリクエストが送信されることを確認
      await waitForAsync();

      const history = infrastructure.getInteractionHistory();
      const requests = history.networkRequests;

      // 配列操作を使わずに最後のリクエストを確認
      expect(requests.length).toBeGreaterThan(0);
      
      // Network操作の詳細検証
      const ddlRequest = requests[requests.length - 1];
      expect(ddlRequest.url).toBe('/api/table/users/ddl');
      expect(ddlRequest.method).toBe('GET');
      expect(ddlRequest.headers).toBeDefined();
      expect(ddlRequest.body).toBeUndefined(); // GETリクエストなのでbodyは無い
      
      // DOM操作のMock検証
      expect(removeClassSpy).toHaveBeenCalledWith(expect.anything(), 'hidden');
      expect(setInnerHTMLSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('<h2>users</h2>')
      );
      
      // Cleanup
      app = null;
    });
  });

  describe('エンティティ移動', () => {
    describe('ドラッグ開始', () => {
    test('エンティティをドラッグできる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData: MockERData = {
        entities: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
              { name: 'name', type: 'varchar(255)', key: '', nullable: false, default: null, extra: '' },
              { name: 'email', type: 'varchar(255)', key: 'UNI', nullable: false, default: null, extra: '' },
            ],
            foreignKeys: [],
            ddl: '',
          },
        ],
        relationships: [],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } },
          },
          rectangles: [],
          texts: [],
          layers: [],
        },
      };

      infrastructure.setupMockData({
        networkResponses: {
          '/api/er-data': {
            status: 200,
            data: mockERData,
          },
        },
      });

      let app: any = new ERViewerApplication(infrastructure);
      await waitForAsync();
      app.render();
      
      // DOM操作をスパイ
      const getAttributeSpy = jest.spyOn(infrastructure.dom, 'getAttribute');

      // Act
      const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer') as unknown as MockElement;
      // usersエンティティは2番目の子要素であることを期待（最初はrelationshipsグループ）
      expect(dynamicLayer.children.length).toBeGreaterThan(1);
      const userEntity = dynamicLayer.children[1] as MockElement;
      expect(userEntity.getAttribute('data-table-name')).toBe('users');

      app.startEntityDrag(userEntity as unknown as Element, { x: 150, y: 150 });

      // Assert - ドラッグ開始時のDOM属性読み取りを検証
      expect(getAttributeSpy).toHaveBeenCalledWith(userEntity, 'data-table-name');
      expect(getAttributeSpy).toHaveBeenCalledWith(userEntity, 'transform');
    });
  });

  describe('レイアウト更新', () => {
    test('エンティティドラッグでレイアウトが更新される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData = createERData({
        entities: [createUserEntity()],
        layout: {
          entities: {
            users: { position: { x: 100, y: 100 } }
          }
        }
      });

      infrastructure.setupMockData({
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: mockERData })
        }
      });

      let app: any = new ERViewerApplication(infrastructure);
      await waitForAsync();
      app.render();
      
      // DOM操作をスパイ
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
      
      const mockEvent = {
        clientX: 250,
        clientY: 250,
      } as MouseEvent;

      // Act
      const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer') as unknown as MockElement;
      // usersエンティティは2番目の子要素であることを期待（最初はrelationshipsグループ）
      expect(dynamicLayer.children.length).toBeGreaterThan(1);
      const userEntity = dynamicLayer.children[1] as MockElement;
      expect(userEntity.getAttribute('data-table-name')).toBe('users');

      app.startEntityDrag(userEntity as unknown as Element, { x: 100, y: 100 });
      app.updateDrag(mockEvent);
      app.endInteraction();

      // Assert - transform属性の更新を検証
      expect(setAttributeSpy).toHaveBeenCalledWith(
        userEntity,
        'transform',
        expect.stringMatching(/translate\(\d+(?:\.\d+)?,\s*\d+(?:\.\d+)?\)/)
      );
    });
  });
  });

  describe('注釈追加', () => {
    test('矩形注釈を追加できる', () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    let app: any = new ERViewerApplication(infrastructure);
    const initialRectCount = app.state.layoutData.rectangles.length;

    // Act
    app.addRectangleAtPosition(200, 200);

    // Assert
    expect(app.state.layoutData.rectangles.length).toBe(initialRectCount + 1);
    const newRect = app.state.layoutData.rectangles[app.state.layoutData.rectangles.length - 1];
    expect(newRect.x).toBe(200);
    expect(newRect.y).toBe(200);
    expect(newRect.width).toBe(100);
    expect(newRect.height).toBe(60);
    
    // Cleanup
    app = null;
  });

  test('テキスト注釈を追加できる', () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      promptResponses: ['テストテキスト'], // prompt応答をセットアップ
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);
    const initialTextCount = app.state.layoutData.texts.length;
    
    // BrowserAPI操作をスパイ
    const promptSpy = jest.spyOn(infrastructure.browserAPI, 'prompt');

    // Act
    app.addTextAtPosition(300, 300);

    // Assert - BrowserAPI Mock検証
    expect(promptSpy).toHaveBeenCalledWith('テキストを入力してください:');
    expect(promptSpy).toHaveBeenCalledTimes(1);
    
    // BrowserAPI呼び出し履歴の詳細検証
    const prompts = (infrastructure.browserAPI as BrowserAPIMock).getPrompts();
    expect(prompts.length).toBe(1);
    expect(prompts[0].message).toBe('テキストを入力してください:');
    expect(prompts[0].response).toBe('テストテキスト');
    expect(prompts[0].timestamp).toBeDefined();
    
    // レイアウトデータの検証
    expect(app.state.layoutData.texts.length).toBe(initialTextCount + 1);
    const newText = app.state.layoutData.texts[app.state.layoutData.texts.length - 1];
    expect(newText.x).toBe(300);
    expect(newText.y).toBe(300);
    expect(newText.content).toBe('テストテキスト');
    
    // Cleanup
    app = null;
  });

  test('テキスト注釈追加をキャンセルできる', () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      promptResponses: [null], // promptがキャンセルされた場合
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);
    const initialTextCount = app.state.layoutData.texts.length;
    
    // BrowserAPI操作をスパイ
    const promptSpy = jest.spyOn(infrastructure.browserAPI, 'prompt');

    // Act
    app.addTextAtPosition(400, 400);

    // Assert - BrowserAPI Mock検証
    expect(promptSpy).toHaveBeenCalledWith('テキストを入力してください:');
    expect(promptSpy).toHaveBeenCalledTimes(1);
    
    // BrowserAPI呼び出し履歴の詳細検証
    const prompts = (infrastructure.browserAPI as BrowserAPIMock).getPrompts();
    expect(prompts.length).toBe(1);
    expect(prompts[0].message).toBe('テキストを入力してください:');
    expect(prompts[0].response).toBeNull(); // nullが正しく処理される
    expect(prompts[0].timestamp).toBeDefined();
    
    // レイアウトデータは変更されていないことを検証
    expect(app.state.layoutData.texts.length).toBe(initialTextCount);
    
    // Cleanup
    app = null;
  });
  });
});