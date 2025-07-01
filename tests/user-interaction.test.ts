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
    
    // DOM操作をスパイ
    const createElementSpy = jest.spyOn(infrastructure.dom, 'createElement');
    const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
    const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
    const getElementByIdSpy = jest.spyOn(infrastructure.dom, 'getElementById');
    const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');

    // Act
    app.addRectangleAtPosition(200, 200);

    // Assert - render()が呼ばれてannotation-layerがクリアされる
    expect(getElementByIdSpy).toHaveBeenCalledWith('annotation-layer');
    expect(setInnerHTMLSpy).toHaveBeenCalledWith(expect.anything(), '');
    
    // 矩形要素の作成を検証
    expect(createElementSpy).toHaveBeenCalledWith('rect', 'http://www.w3.org/2000/svg');
    
    // 矩形の属性設定を検証
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'class', 'annotation-rectangle');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'x', '200');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'y', '200');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'width', '100');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'height', '60');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'fill', '#e3f2fd');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'stroke', '#e3f2fd'); // colorが設定されているため同じ値
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'stroke-width', '2');
    
    // DOM要素の追加を検証
    expect(appendChildSpy).toHaveBeenCalledWith(
      expect.anything(), // annotation-layer
      expect.anything()  // rectElement
    );
    
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
    
    // BrowserAPI操作をスパイ
    const promptSpy = jest.spyOn(infrastructure.browserAPI, 'prompt');
    
    // DOM操作をスパイ
    const createElementSpy = jest.spyOn(infrastructure.dom, 'createElement');
    const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
    const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
    const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
    const getElementByIdSpy = jest.spyOn(infrastructure.dom, 'getElementById');

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
    
    // render()が呼ばれてannotation-layerがクリアされる
    expect(getElementByIdSpy).toHaveBeenCalledWith('annotation-layer');
    expect(setInnerHTMLSpy).toHaveBeenCalledWith(expect.anything(), '');
    
    // テキスト要素の作成を検証
    expect(createElementSpy).toHaveBeenCalledWith('text', 'http://www.w3.org/2000/svg');
    
    // テキストの属性設定を検証
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'class', 'annotation-text');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'x', '300');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'y', '300');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'fill', '#2c3e50');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'font-size', '14');
    expect(setInnerHTMLSpy).toHaveBeenCalledWith(expect.anything(), 'テストテキスト');
    
    // DOM要素の追加を検証
    expect(appendChildSpy).toHaveBeenCalledWith(
      expect.anything(), // annotation-layer
      expect.anything()  // textElement
    );
    
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
    
    // BrowserAPI操作をスパイ
    const promptSpy = jest.spyOn(infrastructure.browserAPI, 'prompt');
    
    // DOM操作をスパイ  
    const createElementSpy = jest.spyOn(infrastructure.dom, 'createElement');
    const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');

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
    
    // キャンセルされた場合、render()が呼ばれないことを検証
    // text要素が作成されないことを確認
    const textElementCalls = createElementSpy.mock.calls.filter(
      call => call[0] === 'text'
    );
    expect(textElementCalls.length).toBe(0);
    
    // annotation-layerにテキスト要素が追加されないことを確認
    const appendCalls = appendChildSpy.mock.calls;
    const textAppendCalls = appendCalls.filter(call => {
      const element = call[1];
      return element && element.tagName === 'text';
    });
    expect(textAppendCalls.length).toBe(0);
    
    // Cleanup
    app = null;
  });
  });
});