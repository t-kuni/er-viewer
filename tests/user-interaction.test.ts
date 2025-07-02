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
      const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
      const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
      
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
      expect(ddlRequest).toBeDefined();
      expect(ddlRequest!.url).toBe('/api/table/users/ddl');
      expect(ddlRequest!.method).toBe('GET');
      expect(ddlRequest!.headers).toBeDefined();
      expect(ddlRequest!.body).toBeUndefined(); // GETリクエストなのでbodyは無い
      
      // DOM操作のMock検証
      expect(addClassSpy).toHaveBeenCalledWith(expect.anything(), 'open');
      expect(setInnerHTMLSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('<h2>users</h2>')
      );
      
      // Cleanup
      app = null;
    });

    test('エンティティ要素をクリックするとhandleCanvasClickが正しく動作する', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/table/users/ddl': createDDLResponse('CREATE TABLE users (id INT PRIMARY KEY);')
        }
      };
      infrastructure.setupMockData(mockData);
      let app: any = new ERViewerApplication(infrastructure);
      
      // クリックターゲットのモック要素を作成
      const mockEntityElement = new MockElement('g');
      mockEntityElement.setAttribute('class', 'entity');
      mockEntityElement.setAttribute('data-table-name', 'users');
      
      // closest メソッドのモック
      const closestSpy = jest.spyOn(infrastructure.dom, 'closest')
        .mockReturnValue(mockEntityElement as unknown as Element);
      
      // getAttribute メソッドのモック
      const getAttributeSpy = jest.spyOn(infrastructure.dom, 'getAttribute')
        .mockImplementation((element, attrName) => {
          if ((element as any) === mockEntityElement && attrName === 'data-table-name') {
            return 'users';
          }
          return null;
        });
      
      app.render();
      
      // クリックイベントをシミュレート
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      
      // イベントターゲットを設定
      Object.defineProperty(clickEvent, 'target', {
        value: mockEntityElement,
        writable: false
      });
      
      // handleCanvasClickを直接呼び出す
      app.handleCanvasClick(clickEvent);
      
      // 非同期処理を待つ
      await waitForAsync();
      
      // closest が正しく呼ばれたことを確認
      expect(closestSpy).toHaveBeenCalledWith(mockEntityElement, '.entity');
      
      // getAttribute が呼ばれたことを確認
      expect(getAttributeSpy).toHaveBeenCalledWith(mockEntityElement, 'data-table-name');
      
      // ネットワークリクエストが送信されることを確認
      const history = infrastructure.getInteractionHistory();
      const requests = history.networkRequests;
      expect(requests.length).toBeGreaterThan(0);
      
      const ddlRequest = requests[requests.length - 1];
      expect(ddlRequest).toBeDefined();
      expect(ddlRequest!.url).toBe('/api/table/users/ddl');
      
      // Cleanup
      app = null;
    });

    test('DDL表示時にsyntax highlightが適用される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/table/users/ddl': createDDLResponse(`CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`)
        }
      };
      infrastructure.setupMockData(mockData);
      
      // Prismモックをwindowに追加
      const highlightElementSpy = jest.fn();
      (global as any).window.Prism = {
        highlightElement: highlightElementSpy
      };
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // querySelector spyの設定
      const mockCodeElement = new MockElement('code');
      const querySelectorSpy = jest.spyOn(infrastructure.dom, 'querySelector')
        .mockReturnValue(mockCodeElement);
      
      app.render();

      // エンティティクリックをシミュレート
      app.showTableDetails('users');

      // 非同期処理を待つ
      await waitForAsync();

      // querySelector が正しいセレクタで呼ばれたことを確認
      expect(querySelectorSpy).toHaveBeenCalledWith('#sidebar-content code');
      
      // Prism.highlightElement が呼ばれたことを確認
      expect(highlightElementSpy).toHaveBeenCalledWith(mockCodeElement);
      
      // Cleanup
      app = null;
      delete (global as any).window.Prism;
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
    expect(createElementSpy).not.toHaveBeenCalledWith('text');
    
    // DOM要素の表示が変更されないことを確認
    const setStylesSpy = jest.spyOn(infrastructure.dom, 'setStyles');
    expect(setStylesSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ tagName: 'text' }),
      expect.any(Object)
    );
    
    // Cleanup
    app = null;
  });
  });

  describe('エンティティホバー時のハイライト', () => {
    test('エンティティにホバーすると関連エンティティとリレーションがハイライトされる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData = createUserPostERData();
      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: mockERData })
        }
      };
      infrastructure.setupMockData(mockData);
      
      // DOM操作をスパイ (アプリケーション初期化前に設定)
      const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
      const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
      const getElementByIdSpy = jest.spyOn(infrastructure.dom, 'getElementById');
      const closestSpy = jest.spyOn(infrastructure.dom, 'closest');
      const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
      const addEventListenerSpy = jest.spyOn(infrastructure.dom, 'addEventListener');
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // 初期データロード完了を待つ
      await waitForAsync();
      
      // モックエンティティ要素を作成
      const mockUserEntity = new MockElement('g');
      mockUserEntity.setAttribute('class', 'entity');
      mockUserEntity.setAttribute('data-table-name', 'users');
      
      // closest()がエンティティを返すようにモック
      closestSpy.mockReturnValue(mockUserEntity);
      
      // ハイライトレイヤーのモック - getElementByIdSpy.mockImplementationは削除
      // InfrastructureMockが自動的にハイライトレイヤーを提供する
      const mockHighlightLayer = infrastructure.dom.getElementById('highlight-layer');
      
      // Act - mousemoveイベントをトリガー
      const mockEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      Object.defineProperty(mockEvent, 'target', {
        value: mockUserEntity,
        writable: false
      });
      
      // カンバスのイベントリスナーを探して呼び出し
      const canvasElement = infrastructure.dom.getElementById('er-canvas');
      const mousemoveHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === canvasElement && call[1] === 'mousemove'
      );
      if (mousemoveHandler && mousemoveHandler[2]) {
        mousemoveHandler[2](mockEvent);
      }
      
      // Assert
      // ハイライトレイヤーがクリアされる
      expect(setInnerHTMLSpy).toHaveBeenCalledWith(mockHighlightLayer, '');
      
      // エンティティにハイライトクラスが追加される
      expect(addClassSpy).toHaveBeenCalledWith(mockUserEntity, 'highlighted');
      
      // 関連エンティティも含めてハイライト状態が更新される
      const appState = app.getApplicationState();
      expect(appState.highlightedEntities.has('users')).toBeTruthy();
      
      // Cleanup
      app = null;
    });

    test('リレーションにホバーすると両端のエンティティとカラムがハイライトされる', async () => {
      // Arrange  
      const infrastructure = new InfrastructureMock();
      const mockERData = createUserPostERData();
      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: mockERData })
        }
      };
      infrastructure.setupMockData(mockData);
      
      // DOM操作をスパイ (アプリケーション初期化前に設定)
      const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
      const hasClassSpy = jest.spyOn(infrastructure.dom, 'hasClass');
      const getAttributeSpy = jest.spyOn(infrastructure.dom, 'getAttribute');
      const getElementByIdSpy = jest.spyOn(infrastructure.dom, 'getElementById');
      const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
      const addEventListenerSpy = jest.spyOn(infrastructure.dom, 'addEventListener');
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // 初期データロード完了を待つ
      await waitForAsync();
      
      // モックリレーション要素を作成
      const mockRelationship = new MockElement('path');
      mockRelationship.setAttribute('class', 'relationship');
      mockRelationship.setAttribute('data-from-table', 'posts');
      mockRelationship.setAttribute('data-to-table', 'users');
      mockRelationship.setAttribute('data-from-column', 'user_id');
      mockRelationship.setAttribute('data-to-column', 'id');
      
      // hasClass()がtrueを返すようにモック
      hasClassSpy.mockImplementation((element: Element, className: string) => {
        return element === mockRelationship && className === 'relationship';
      });
      
      // getAttribute()の実装
      getAttributeSpy.mockImplementation((element: Element, attr: string) => {
        return (element as MockElement).getAttribute(attr);
      });
      
      // ハイライトレイヤーのモック - getElementByIdSpy.mockImplementationは削除
      // InfrastructureMockが自動的にハイライトレイヤーを提供する
      const mockHighlightLayer = infrastructure.dom.getElementById('highlight-layer');
      
      // Act - mousemoveイベントをトリガー
      const mockEvent = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 200,
        bubbles: true
      });
      Object.defineProperty(mockEvent, 'target', {
        value: mockRelationship,
        writable: false
      });
      
      // カンバスのイベントリスナーを探して呼び出し
      const canvasElement = infrastructure.dom.getElementById('er-canvas');
      const mousemoveHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === canvasElement && call[1] === 'mousemove'
      );
      if (mousemoveHandler && mousemoveHandler[2]) {
        mousemoveHandler[2](mockEvent);
      }
      
      // Assert
      // ハイライトレイヤーがクリアされる
      expect(setInnerHTMLSpy).toHaveBeenCalledWith(mockHighlightLayer, '');
      
      // リレーションにハイライトクラスが追加される
      expect(addClassSpy).toHaveBeenCalledWith(mockRelationship, 'highlighted');
      
      // リレーションのハイライト状態が更新される
      const appState = app.getApplicationState();
      expect(appState.highlightedRelationships.has('posts-users')).toBeTruthy();
      
      // Cleanup
      app = null;
    });

    test('ホバーを外すとハイライトがクリアされる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockERData = createUserPostERData();
      const mockData: MockData = {
        networkResponses: {
          '/api/er-data': createNetworkResponse({ data: mockERData })
        }
      };
      infrastructure.setupMockData(mockData);
      
      // DOM操作をスパイ (アプリケーション初期化前に設定)
      const getElementByIdSpy = jest.spyOn(infrastructure.dom, 'getElementById');
      const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
      const closestSpy = jest.spyOn(infrastructure.dom, 'closest');
      const hasClassSpy = jest.spyOn(infrastructure.dom, 'hasClass');
      const addEventListenerSpy = jest.spyOn(infrastructure.dom, 'addEventListener');
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // 初期データロード完了を待つ
      await waitForAsync();
      
      // ハイライトレイヤーのモック - getElementByIdSpy.mockImplementationは削除
      // InfrastructureMockが自動的にハイライトレイヤーを提供する
      const mockHighlightLayer = infrastructure.dom.getElementById('highlight-layer');
      
      // 空の領域（エンティティでもリレーションでもない）のモック
      const mockEmptyArea = new MockElement('svg');
      closestSpy.mockReturnValue(null); // エンティティではない
      hasClassSpy.mockReturnValue(false); // リレーションでもない
      
      // 事前にハイライト状態を設定
      app.setState({ 
        highlightedEntities: new Set(['users']), 
        highlightedRelationships: new Set(['posts-users']) 
      });
      
      // Act - 空の領域でmousemoveイベントをトリガー
      const mockEvent = new MouseEvent('mousemove', {
        clientX: 300,
        clientY: 300,
        bubbles: true
      });
      Object.defineProperty(mockEvent, 'target', {
        value: mockEmptyArea,
        writable: false
      });
      
      // カンバスのイベントリスナーを探して呼び出し
      const canvasElement = infrastructure.dom.getElementById('er-canvas');
      const mousemoveHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === canvasElement && call[1] === 'mousemove'
      );
      if (mousemoveHandler && mousemoveHandler[2]) {
        mousemoveHandler[2](mockEvent);
      }
      
      // Assert
      // ハイライトレイヤーがクリアされる
      expect(setInnerHTMLSpy).toHaveBeenCalledWith(mockHighlightLayer, '');
      
      // ハイライト状態がクリアされる
      const appState = app.getApplicationState();
      expect(appState.highlightedEntities.size).toBe(0);
      expect(appState.highlightedRelationships.size).toBe(0);
      
      // Cleanup
      app = null;
    });
  });

  describe('マウスホイールによる拡大縮小', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('マウスホイールを上に回すと拡大される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/tables': createNetworkResponse(createUserPostERData())
        }
      };
      infrastructure.setupMockData(mockData);
      
      // イベントリスナーをスパイ（アプリ作成前に設定）
      const addEventListenerSpy = jest.spyOn(infrastructure.dom, 'addEventListener');
      const getBoundingClientRectSpy = jest.spyOn(infrastructure.dom, 'getBoundingClientRect');
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // 初期化タイマーを実行
      jest.advanceTimersByTime(10);
      
      // 初期データロード完了を待つ（fakeTimersを使用）
      jest.runAllTimers();
      
      // カンバスの矩形情報をモック
      getBoundingClientRectSpy.mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });
      
      // 初期スケールが反映されたトランスフォームが設定される
      expect(setAttributeSpy).toHaveBeenCalledWith(
        expect.anything(),
        'transform',
        expect.stringContaining('scale(1)')
      );
      
      // Act - wheelイベントをトリガー（deltaY < 0 で上方向）
      const mockWheelEvent = new WheelEvent('wheel', {
        clientX: 400,
        clientY: 300,
        deltaY: -100,
        bubbles: true,
        cancelable: true
      });
      
      // カンバスのイベントリスナーを探して呼び出し
      const canvasElement = infrastructure.dom.getElementById('er-canvas');
      const wheelHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === canvasElement && call[1] === 'wheel'
      );
      if (wheelHandler && wheelHandler[2]) {
        wheelHandler[2](mockWheelEvent);
      }
      
      // Assert - ズームイン後のスケールがトランスフォームに反映される
      expect(setAttributeSpy).toHaveBeenCalledWith(
        expect.anything(),
        'transform',
        expect.stringContaining('scale(1.1)')
      );
      
      // Cleanup
      app = null;
    });

    test('マウスホイールを下に回すと縮小される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/tables': createNetworkResponse(createUserPostERData())
        }
      };
      infrastructure.setupMockData(mockData);
      
      // イベントリスナーをスパイ（アプリ作成前に設定）
      const addEventListenerSpy = jest.spyOn(infrastructure.dom, 'addEventListener');
      const getBoundingClientRectSpy = jest.spyOn(infrastructure.dom, 'getBoundingClientRect');
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // 初期化タイマーを実行
      jest.advanceTimersByTime(10);
      
      // 初期データロード完了を待つ（fakeTimersを使用）
      jest.runAllTimers();
      
      // カンバスの矩形情報をモック
      getBoundingClientRectSpy.mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });
      
      // 初期スケールが設定される
      expect(setAttributeSpy).toHaveBeenCalledWith(
        expect.anything(),
        'transform',
        expect.stringContaining('scale(1)')
      );
      
      // Act - wheelイベントをトリガー（deltaY > 0 で下方向）
      const mockWheelEvent = new WheelEvent('wheel', {
        clientX: 400,
        clientY: 300,
        deltaY: 100,
        bubbles: true,
        cancelable: true
      });
      
      // カンバスのイベントリスナーを探して呼び出し
      const canvasElement = infrastructure.dom.getElementById('er-canvas');
      const wheelHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === canvasElement && call[1] === 'wheel'
      );
      if (wheelHandler && wheelHandler[2]) {
        wheelHandler[2](mockWheelEvent);
      }
      
      // Assert - ズームアウト後のスケールがトランスフォームに反映される
      expect(setAttributeSpy).toHaveBeenCalledWith(
        expect.anything(),
        'transform',
        expect.stringContaining('scale(0.9)')
      );
      
      // Cleanup
      app = null;
    });

    test('ズームの最小値と最大値が制限される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/tables': createNetworkResponse(createUserPostERData())
        }
      };
      infrastructure.setupMockData(mockData);
      
      // イベントリスナーをスパイ（アプリ作成前に設定）
      const addEventListenerSpy = jest.spyOn(infrastructure.dom, 'addEventListener');
      const getBoundingClientRectSpy = jest.spyOn(infrastructure.dom, 'getBoundingClientRect');
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // 初期化タイマーを実行
      jest.advanceTimersByTime(10);
      
      // 初期データロード完了を待つ（fakeTimersを使用）
      jest.runAllTimers();
      
      // カンバスの矩形情報をモック
      getBoundingClientRectSpy.mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });
      
      // カンバスのイベントリスナーを探す
      const canvasElement = infrastructure.dom.getElementById('er-canvas');
      const wheelHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === canvasElement && call[1] === 'wheel'
      );
      
      // Act - 大幅にズームアウト（縮小）
      // 複数回ズームアウトして最小スケールに到達させる
      for (let i = 0; i < 30; i++) {
        const mockWheelEvent = new WheelEvent('wheel', {
          clientX: 400,
          clientY: 300,
          deltaY: 100, // 正の値でズームアウト
          bubbles: true,
          cancelable: true
        });
        if (wheelHandler && wheelHandler[2]) {
          wheelHandler[2](mockWheelEvent);
        }
      }
      
      // Assert - 最小値0.1を下回らない
      expect(setAttributeSpy).toHaveBeenCalledWith(
        expect.anything(),
        'transform',
        expect.stringContaining('scale(0.1)')
      );
      
      // Act - 大幅にズームイン（拡大）
      // 複数回ズームインして最大スケールに到達させる
      for (let i = 0; i < 50; i++) {
        const mockWheelEvent = new WheelEvent('wheel', {
          clientX: 400,
          clientY: 300,
          deltaY: -100, // 負の値でズームイン
          bubbles: true,
          cancelable: true
        });
        if (wheelHandler && wheelHandler[2]) {
          wheelHandler[2](mockWheelEvent);
        }
      }
      
      // Assert - 最大値5.0を上回らない
      expect(setAttributeSpy).toHaveBeenCalledWith(
        expect.anything(),
        'transform',
        expect.stringContaining('scale(5)')
      );
      
      // Cleanup
      app = null;
    });
  });

  describe('スペースキーとドラッグによるスクロール', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('スペースキーを押しながらドラッグするとスクロールできる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/tables': createNetworkResponse(createUserPostERData())
        }
      };
      infrastructure.setupMockData(mockData);
      
      // イベントリスナーをスパイ（アプリ作成前に設定）
      const addEventListenerSpy = jest.spyOn(infrastructure.dom, 'addEventListener');
      const getBoundingClientRectSpy = jest.spyOn(infrastructure.dom, 'getBoundingClientRect');
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // 初期化タイマーを実行
      jest.advanceTimersByTime(10);
      
      // 初期データロード完了を待つ（fakeTimersを使用）
      jest.runAllTimers();
      
      // カンバスの矩形情報をモック
      getBoundingClientRectSpy.mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });
      
      // 初期のパン位置を確認
      let state = app.getState();
      const initialPanX = state.viewport.panX;
      const initialPanY = state.viewport.panY;
      
      // Act 1 - スペースキーを押す
      const mockKeyDownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true
      });
      
      // ドキュメントのイベントリスナーを探して呼び出し
      const documentElement = infrastructure.dom.getDocumentElement();
      const keydownHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === documentElement && call[1] === 'keydown'
      );
      if (keydownHandler && keydownHandler[2]) {
        keydownHandler[2](mockKeyDownEvent);
      }
      
      // Act 2 - マウスダウンイベント（スペースキーが押されている状態）
      const canvasElement = infrastructure.dom.getElementById('er-canvas');
      const mockMouseDownEvent = new MouseEvent('mousedown', {
        clientX: 400,
        clientY: 300,
        button: 0,
        bubbles: true
      });
      
      // MouseEventのtargetを設定
      Object.defineProperty(mockMouseDownEvent, 'target', {
        value: canvasElement,
        writable: false
      });
      
      const mousedownHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === canvasElement && call[1] === 'mousedown'
      );
      if (mousedownHandler && mousedownHandler[2]) {
        mousedownHandler[2](mockMouseDownEvent);
      }
      
      // Act 3 - マウスムーブイベント（ドラッグ）
      const mockMouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 500,
        clientY: 350,
        bubbles: true
      });
      
      const mousemoveHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === documentElement && call[1] === 'mousemove'
      );
      if (mousemoveHandler && mousemoveHandler[2]) {
        mousemoveHandler[2](mockMouseMoveEvent);
      }
      
      // Assert - パン位置が変更されている
      state = app.getState();
      expect(state.viewport.panX).toBe(initialPanX + 100); // 500 - 400 = 100
      expect(state.viewport.panY).toBe(initialPanY + 50);  // 350 - 300 = 50
      
      // Act 4 - マウスアップイベント
      const mockMouseUpEvent = new MouseEvent('mouseup', {
        clientX: 500,
        clientY: 350,
        bubbles: true
      });
      
      const mouseupHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === documentElement && call[1] === 'mouseup'
      );
      if (mouseupHandler && mouseupHandler[2]) {
        mouseupHandler[2](mockMouseUpEvent);
      }
      
      // Act 5 - スペースキーを離す
      const mockKeyUpEvent = new KeyboardEvent('keyup', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true
      });
      
      const keyupHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === documentElement && call[1] === 'keyup'
      );
      if (keyupHandler && keyupHandler[2]) {
        keyupHandler[2](mockKeyUpEvent);
      }
      
      // Assert - ドラッグ状態が終了している
      state = app.getState();
      expect(state.interactionMode).toBe('default');
      expect(state.dragState).toBeNull();
      
      // Cleanup
      app = null;
    });

    test('マウスホイール押し込みながらドラッグでもスクロールできる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/tables': createNetworkResponse(createUserPostERData())
        }
      };
      infrastructure.setupMockData(mockData);
      
      // イベントリスナーをスパイ（アプリ作成前に設定）
      const addEventListenerSpy = jest.spyOn(infrastructure.dom, 'addEventListener');
      const getBoundingClientRectSpy = jest.spyOn(infrastructure.dom, 'getBoundingClientRect');
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // 初期化タイマーを実行
      jest.advanceTimersByTime(10);
      
      // 初期データロード完了を待つ（fakeTimersを使用）
      jest.runAllTimers();
      
      // カンバスの矩形情報をモック
      getBoundingClientRectSpy.mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });
      
      // 初期のパン位置を確認
      let state = app.getState();
      const initialPanX = state.viewport.panX;
      const initialPanY = state.viewport.panY;
      
      // Act 1 - 中央マウスボタンダウンイベント
      const canvasElement = infrastructure.dom.getElementById('er-canvas');
      const mockMouseDownEvent = new MouseEvent('mousedown', {
        clientX: 200,
        clientY: 200,
        button: 1, // 中央ボタン
        bubbles: true
      });
      
      // MouseEventのtargetを設定
      Object.defineProperty(mockMouseDownEvent, 'target', {
        value: canvasElement,
        writable: false
      });
      
      const mousedownHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === canvasElement && call[1] === 'mousedown'
      );
      if (mousedownHandler && mousedownHandler[2]) {
        mousedownHandler[2](mockMouseDownEvent);
      }
      
      // Act 2 - マウスムーブイベント（ドラッグ）
      const mockMouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 250,
        bubbles: true
      });
      
      const mousemoveHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === infrastructure.dom.getDocumentElement() && call[1] === 'mousemove'
      );
      if (mousemoveHandler && mousemoveHandler[2]) {
        mousemoveHandler[2](mockMouseMoveEvent);
      }
      
      // Assert - パン位置が変更されている
      state = app.getState();
      expect(state.viewport.panX).toBe(initialPanX - 50); // 150 - 200 = -50
      expect(state.viewport.panY).toBe(initialPanY + 50); // 250 - 200 = 50
      
      // Cleanup
      app = null;
    });
  });
  
  describe('テキスト描画機能', () => {
    beforeEach(() => {
      // フェイクタイマーを有効化
      jest.useFakeTimers();
    });

    afterEach(() => {
      // フェイクタイマーをリセット
      jest.useRealTimers();
    });

    test('テキスト描画モードでクリックするとテキストが追加される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        promptResponses: ['テストテキスト'] // prompt応答をセットアップ
      };
      infrastructure.setupMockData(mockData);
      
      // BrowserAPI操作をスパイ
      const promptSpy = jest.spyOn(infrastructure.browserAPI, 'prompt');
      
      // DOM操作をスパイ（アプリ作成前に設定）
      const createElementSpy = jest.spyOn(infrastructure.dom, 'createElement');
      const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
      const setStylesSpy = jest.spyOn(infrastructure.dom, 'setStyles');
      const getElementByIdSpy = jest.spyOn(infrastructure.dom, 'getElementById');
      const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // テキスト描画モードを開始
      app.startTextDrawingMode();
      
      // 状態を確認
      const state = app.getState();
      expect(state.drawingMode).toBe('text');
      
      // カーソルが変更されたことを確認
      expect(setStylesSpy).toHaveBeenCalledWith(
        expect.anything(),
        { cursor: 'text' }
      );
      
      // Act - handleCanvasMouseDownをシミュレート
      const rect = { left: 0, top: 0 };
      jest.spyOn(infrastructure.dom, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });
      
      const mockEvent = {
        preventDefault: jest.fn(),
        clientX: 100,
        clientY: 100,
        target: infrastructure.dom.getElementById('er-canvas')
      } as any;
      
      app.handleCanvasMouseDown(mockEvent);
      
      // Assert - promptが呼ばれたことを確認
      expect(promptSpy).toHaveBeenCalledWith('テキストを入力してください:');
      expect(promptSpy).toHaveBeenCalledTimes(1);
      
      // render()が呼ばれてannotation-layerがクリアされる
      expect(getElementByIdSpy).toHaveBeenCalledWith('annotation-layer');
      expect(setInnerHTMLSpy).toHaveBeenCalledWith(expect.anything(), '');
      
      // Assert - テキスト要素が作成される
      expect(createElementSpy).toHaveBeenCalledWith('text', 'http://www.w3.org/2000/svg');
      
      // テキストの内容が設定される
      expect(setInnerHTMLSpy).toHaveBeenCalledWith(
        expect.anything(),
        'テストテキスト'
      );
      
      // DOM要素の追加を検証
      expect(appendChildSpy).toHaveBeenCalledWith(
        expect.anything(), // annotation-layer
        expect.anything()  // textElement
      );
      
      // モードが終了している（カーソルがリセットされる）
      expect(setStylesSpy).toHaveBeenCalledWith(
        expect.anything(),
        { cursor: 'default' }
      );
      
      // Cleanup
      app = null;
    });

    test('テキスト描画モードでESCキーを押すとモードが終了する', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/tables': createNetworkResponse(createUserPostERData())
        }
      };
      infrastructure.setupMockData(mockData);
      
      let app: any = new ERViewerApplication(infrastructure);
      
      // 初期化タイマーを実行
      jest.advanceTimersByTime(10);
      jest.runAllTimers();
      
      // スパイを先に設定
      const setStylesSpy = jest.spyOn(infrastructure.dom, 'setStyles');
      
      // テキスト描画モードを開始
      app.startTextDrawingMode();
      
      // テキストモードが開始されたことを確認（カーソルが変更される）
      expect(setStylesSpy).toHaveBeenCalledWith(
        expect.anything(),
        { cursor: 'text' }
      );
      
      // Act - ESCキーを押す
      app.endDrawingMode();
      
      // Assert - モードが終了している（カーソルがリセットされる）
      expect(setStylesSpy).toHaveBeenCalledWith(
        expect.anything(),
        { cursor: 'default' }
      );
      
      // Cleanup
      app = null;
    });
  });
});