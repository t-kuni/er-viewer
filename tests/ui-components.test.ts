/**
 * UIコンポーネントのテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockData } from '../public/js/types/infrastructure';
import { MockElement } from '../public/js/infrastructure/mocks/dom-mock';
import { StorageMock } from '../public/js/infrastructure/mocks/storage-mock';
import { 
  createERData, 
  createEntity,
  createUserEntity, 
  createPostEntity, 
  createUserPostERData,
  createNetworkResponse,
  createDDLResponse,
  createSuccessResponse
} from './test-data-factory';

// テスト用ヘルパー関数 - 非同期処理の完了を待つ
const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

describe('UIコンポーネント', () => {
  afterEach(() => {
    // タイマーのクリア
    jest.clearAllTimers();
    
    // 全モックのクリア
    jest.clearAllMocks();
  });

  describe('ヘルプパネル', () => {
    test('ヘルプパネルの初期化時にStorageから折りたたみ状態を読み込む', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
    
    // Storage操作をスパイ（アプリケーション作成前に設定）
    const getItemSpy = jest.spyOn(infrastructure.storage, 'getItem');
    
    // Act - アプリケーションを初期化（コンストラクタ内でsetupHelpPanelEventsが呼ばれる）
    let app: any = new ERViewerApplication(infrastructure);
    
    // Assert - Storageから折りたたみ状態を読み込む
    expect(getItemSpy).toHaveBeenCalledWith('helpPanelCollapsed');
    // layerSidebarCollapsedも読み込まれるため、2回呼ばれる
    expect(getItemSpy).toHaveBeenCalledTimes(2);
  });

  test('ヘルプパネルを展開時にStorageに状態が保存される', () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    let app: any = new ERViewerApplication(infrastructure);
    
    // Storage操作をスパイ
    const setItemSpy = jest.spyOn(infrastructure.storage, 'setItem');
    
    // helpToggleとhelpContentを取得
    const helpToggle = infrastructure.dom.getElementById('help-toggle') as unknown as MockElement;
    const helpContent = infrastructure.dom.getElementById('help-content') as unknown as MockElement;
    
    // ヘルプパネルを折りたたみ状態に設定
    infrastructure.dom.addClass(helpContent, 'collapsed');
    infrastructure.dom.addClass(helpToggle, 'collapsed');
    
    // Act - トグルボタンをクリック（展開する）
    const clickEvent = new Event('click');
    helpToggle.dispatchEvent(clickEvent);
    
    // Assert - Storageに展開状態（false）が保存される
    expect(setItemSpy).toHaveBeenCalledWith('helpPanelCollapsed', false);
    
    // Storage内容の検証
    const storageContents = (infrastructure.storage as StorageMock).getStorageContents();
    expect(storageContents.helpPanelCollapsed).toBe('false');
  });

  test('ヘルプパネルを折りたたみ時にStorageに状態が保存される', () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    let app: any = new ERViewerApplication(infrastructure);
    
    // Storage操作をスパイ
    const setItemSpy = jest.spyOn(infrastructure.storage, 'setItem');
    
    // helpToggleとhelpContentを取得
    const helpToggle = infrastructure.dom.getElementById('help-toggle') as unknown as MockElement;
    const helpContent = infrastructure.dom.getElementById('help-content') as unknown as MockElement;
    
    // ヘルプパネルを展開状態に設定（collapsedクラスなし）
    infrastructure.dom.removeClass(helpContent, 'collapsed');
    infrastructure.dom.removeClass(helpToggle, 'collapsed');
    
    // Act - トグルボタンをクリック（折りたたむ）
    const clickEvent = new Event('click');
    helpToggle.dispatchEvent(clickEvent);
    
    // Assert - Storageに折りたたみ状態（true）が保存される
    expect(setItemSpy).toHaveBeenCalledWith('helpPanelCollapsed', true);
    
    // Storage内容の検証
    const storageContents = (infrastructure.storage as StorageMock).getStorageContents();
    expect(storageContents.helpPanelCollapsed).toBe('true');
  });
  });

  describe('サイドバー', () => {
    test('サイドバーの開閉が正常に動作する', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
    const mockData: MockData = {
      networkResponses: {
        '/api/table/users/ddl': {
          status: 200,
          data: { ddl: 'CREATE TABLE users (id INT PRIMARY KEY);' },
        },
      },
    };
    infrastructure.setupMockData(mockData);
    let app: any = new ERViewerApplication(infrastructure);
    
    // DOM操作をスパイ
    const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
    const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');

    // Act - サイドバーを開く
    await app.showTableDetails('users');

    // Assert - サイドバー表示のDOM操作を検証
    expect(removeClassSpy).toHaveBeenCalledWith(expect.anything(), 'hidden');
    expect(setInnerHTMLSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('<h2>users</h2>')
    );

    // Act - サイドバーを閉じる
    app.closeSidebar();

    // Assert - サイドバー非表示のDOM操作を検証
    expect(addClassSpy).toHaveBeenCalledWith(expect.anything(), 'hidden');
  });
  });

  describe('オーバーレイ', () => {
    describe('コンテキストメニュー', () => {
      test('コンテキストメニューが表示される', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
    let app: any = new ERViewerApplication(infrastructure);
    
    // DOM操作をスパイ
    const createElementSpy = jest.spyOn(infrastructure.dom, 'createElement');
    const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
    const removeElementSpy = jest.spyOn(infrastructure.dom, 'removeElement');
    const setStylesSpy = jest.spyOn(infrastructure.dom, 'setStyles');

    // Act - コンテキストメニューを表示
    app.showContextMenu(200, 200, { x: 100, y: 100 }, null);

    // Assert - コンテキストメニュー作成のDOM操作を検証
    expect(createElementSpy).toHaveBeenCalledWith('div');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(setStylesSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        position: 'fixed',
        left: '200px',
        top: '200px'
      })
    );

    // Act - コンテキストメニューを非表示
    app.hideContextMenu();

    // Assert - コンテキストメニュー削除のDOM操作を検証
    expect(removeElementSpy).toHaveBeenCalled();
    });
    });

    describe('ローディング表示', () => {
      test('ローディング表示が正常に動作する', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
    let app: any = new ERViewerApplication(infrastructure);
    
    // DOM操作をスパイ
    const createElementSpy = jest.spyOn(infrastructure.dom, 'createElement');
    const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
    const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
    const removeElementSpy = jest.spyOn(infrastructure.dom, 'removeElement');
    const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');

    // Act - ローディングを表示
    app.showLoading('テスト中...');

    // Assert - ローディング要素作成のDOM操作を検証
    expect(createElementSpy).toHaveBeenCalledWith('div');
    expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'id', 'loading-overlay');
    expect(setInnerHTMLSpy).toHaveBeenCalledWith(expect.anything(), 'テスト中...');
    expect(appendChildSpy).toHaveBeenCalledWith(expect.anything(), expect.anything());

    // Act - ローディングを非表示
    app.hideLoading();

    // Assert - ローディング要素削除のDOM操作を検証
    expect(removeElementSpy).toHaveBeenCalled();
  });
  });
  });

  describe('左サイドバー', () => {
    test('左サイドバーの折りたたみボタンをクリックすると折りたたまれる', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const app = new ERViewerApplication(infrastructure);
      
      const layerSidebar = infrastructure.dom.getElementById('layer-sidebar');
      const collapseBtn = infrastructure.dom.getElementById('collapse-layer-sidebar') as MockElement;
      
      // DOM操作をスパイ
      const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
      const setItemSpy = jest.spyOn(infrastructure.storage, 'setItem');
      
      // Act - 折りたたみボタンをクリック
      collapseBtn.dispatchEvent('click');
      
      // Assert - layer-sidebarにcollapsedクラスが追加される
      expect(addClassSpy).toHaveBeenCalledWith(
        layerSidebar,
        'collapsed'
      );
      // Storageに折りたたみ状態が保存される
      expect(setItemSpy).toHaveBeenCalledWith(
        'layerSidebarCollapsed',
        'true'
      );
    });

    test('折りたたまれた左サイドバーの折りたたみボタンをクリックすると展開される', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      
      // 初期状態を折りたたみ状態に設定（StorageMockはJSON.stringifyするので、文字列で設定）
      infrastructure.storage.setItem('layerSidebarCollapsed', 'true');
      
      // DOM操作をスパイ（初期化前に設定）
      const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
      const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
      const setItemSpy = jest.spyOn(infrastructure.storage, 'setItem');
      
      const app = new ERViewerApplication(infrastructure);
      
      const layerSidebar = infrastructure.dom.getElementById('layer-sidebar');
      const collapseBtn = infrastructure.dom.getElementById('collapse-layer-sidebar') as MockElement;
      
      // 折りたたみ状態にあることを確認
      expect(addClassSpy).toHaveBeenCalledWith(
        layerSidebar,
        'collapsed'
      );
      
      // スパイをクリア
      addClassSpy.mockClear();
      setItemSpy.mockClear();
      
      // Act - 折りたたみボタンをクリック
      collapseBtn.dispatchEvent('click');
      
      // Assert - layer-sidebarからcollapsedクラスが削除される
      expect(removeClassSpy).toHaveBeenCalledWith(
        layerSidebar,
        'collapsed'
      );
      // Storageに展開状態が保存される
      expect(setItemSpy).toHaveBeenCalledWith(
        'layerSidebarCollapsed',
        'false'
      );
    });

    test('初期化時にStorageから左サイドバーの折りたたみ状態を読み込む', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      
      // 折りたたみ状態をStorageに設定
      infrastructure.storage.setItem('layerSidebarCollapsed', 'true');
      
      // Storage操作をスパイ
      const getItemSpy = jest.spyOn(infrastructure.storage, 'getItem');
      const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
      
      // Act - アプリケーションを初期化
      const app = new ERViewerApplication(infrastructure);
      
      const layerSidebar = infrastructure.dom.getElementById('layer-sidebar');
      
      // Assert - Storageから折りたたみ状態を読み込んで適用
      expect(getItemSpy).toHaveBeenCalledWith('layerSidebarCollapsed');
      expect(addClassSpy).toHaveBeenCalledWith(
        layerSidebar,
        'collapsed'
      );
    });
  });

  describe('矩形描画', () => {
    test('矩形描画モードを開始できる', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const app = new ERViewerApplication(infrastructure);
      const setStylesSpy = jest.spyOn(infrastructure.dom, 'setStyles');
      
      // Act - 矩形描画モードを開始
      app.startRectangleDrawingMode();
      
      // Assert - 描画モードが有効になっている（カーソルが変更される）
      expect(setStylesSpy).toHaveBeenCalledWith(
        expect.any(Object),
        { cursor: 'crosshair' }
      );
    });

    test('矩形描画モードを終了できる', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const app = new ERViewerApplication(infrastructure);
      const setStylesSpy = jest.spyOn(infrastructure.dom, 'setStyles');
      app.startRectangleDrawingMode();
      
      // Act - 矩形描画モードを終了
      app.endDrawingMode();
      
      // Assert - 描画モードが無効になっている（カーソルがリセットされる）
      expect(setStylesSpy).toHaveBeenCalledWith(
        expect.any(Object),
        { cursor: 'default' }
      );
    });

    test('マウスドラッグで矩形を描画できる', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const app = new ERViewerApplication(infrastructure);
      const createElementSvgSpy = jest.spyOn(infrastructure.dom, 'createElementSvg');
      const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
      
      app.startRectangleDrawingMode();
      
      // Act - マウスドラッグで矩形を描画
      const canvas = infrastructure.dom.getElementById('er-canvas') as MockElement;
      
      // マウスダウン
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
      canvas.dispatchEvent(mouseDownEvent);
      
      // マウスムーブ（キャンバスレベルで）
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 150 });
      canvas.dispatchEvent(mouseMoveEvent);
      
      // マウスアップ（ドキュメントレベルで）
      const mouseUpEvent = new MouseEvent('mouseup', { clientX: 200, clientY: 150 });
      infrastructure.dom.getDocumentElement().dispatchEvent(mouseUpEvent);
      
      // Assert - 矩形要素が作成される
      expect(createElementSvgSpy).toHaveBeenCalledWith('rect');
      expect(appendChildSpy).toHaveBeenCalled();
      
      // 矩形の属性が設定される
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'x', '100');
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'y', '100');
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'width', '100');
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'height', '50');
      
      // 矩形の透明度が1に設定される（完成時）
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'opacity', '1');
      // 矩形にclassが設定される
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'class', 'annotation-rectangle');
    });

    test('矩形の色を変更できる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        erData: createERData({
          entities: [],
          layout: {
            entities: {},
            rectangles: [{
              id: 'rect-1',
              x: 100,
              y: 100,
              width: 100,
              height: 50,
              color: '#ffffff',
              stroke: '#000000',
              strokeWidth: 1
            }],
            texts: []
          }
        })
      };
      infrastructure.setupMockData(mockData);
      
      const app = new ERViewerApplication(infrastructure);
      await app.loadERData();
      await waitForAsync();
      
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
      
      // Act - 矩形の色を変更
      app.updateRectangle('rect-1', {
        color: '#ff0000',
        stroke: '#00ff00'
      });
      
      // Assert - DOM要素の属性が更新される
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'fill', '#ff0000');
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'stroke', '#00ff00');
    });

    test('矩形のサイズと位置を変更できる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        erData: createERData({
          entities: [],
          layout: {
            entities: {},
            rectangles: [{
              id: 'rect-1',
              x: 100,
              y: 100,
              width: 100,
              height: 50,
              color: '#ffffff',
              stroke: '#000000',
              strokeWidth: 1
            }],
            texts: []
          }
        })
      };
      infrastructure.setupMockData(mockData);
      
      const app = new ERViewerApplication(infrastructure);
      await app.loadERData();
      await waitForAsync();
      
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
      
      // Act - 矩形のサイズと位置を変更
      app.updateRectangle('rect-1', {
        x: 150,
        y: 120,
        width: 200,
        height: 80
      });
      
      // Assert - DOM要素の属性が更新される
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'x', '150');
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'y', '120');
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'width', '200');
      expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'height', '80');
    });

    test('矩形データがレイアウトデータに含まれて保存される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/layout': createSuccessResponse()
        }
      };
      infrastructure.setupMockData(mockData);
      
      const app = new ERViewerApplication(infrastructure);
      const postJSONSpy = jest.spyOn(infrastructure.network, 'postJSON');
      
      // 矩形描画モードを開始
      app.startRectangleDrawingMode();
      
      // マウス操作で矩形を描画
      const canvas = infrastructure.dom.getElementById('er-canvas') as MockElement;
      
      // マウスダウン
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
      canvas.dispatchEvent(mouseDownEvent);
      
      // マウスムーブ
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 150 });
      canvas.dispatchEvent(mouseMoveEvent);
      
      // マウスアップ
      const mouseUpEvent = new MouseEvent('mouseup', { clientX: 200, clientY: 150 });
      infrastructure.dom.getDocumentElement().dispatchEvent(mouseUpEvent);
      
      // Act - レイアウトを保存
      await app.saveLayout();
      
      // Assert - 矩形データが保存データに含まれる
      expect(postJSONSpy).toHaveBeenCalledWith(
        '/api/layout',
        expect.objectContaining({
          rectangles: expect.arrayContaining([
            expect.objectContaining({
              x: 100,
              y: 100,
              width: 100,
              height: 50
            })
          ])
        })
      );
    });
    
    test('テキストデータがレイアウトデータに含まれて保存される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/layout': createSuccessResponse()
        }
      };
      infrastructure.setupMockData(mockData);
      
      const app = new ERViewerApplication(infrastructure);
      const postJSONSpy = jest.spyOn(infrastructure.network, 'postJSON');
      
      // テキストモードを開始
      app.startTextDrawingMode();
      
      // テキストを作成
      const canvas = infrastructure.dom.getElementById('er-canvas') as MockElement;
      const clickEvent = new MouseEvent('click', { clientX: 200, clientY: 150 });
      canvas.dispatchEvent(clickEvent);
      
      // テキスト入力フォームが表示されるので、入力して保存
      const textInput = infrastructure.dom.getElementById('text-input') as MockElement;
      (textInput as any).value = 'サンプルテキスト';
      
      const saveTextBtn = infrastructure.dom.getElementById('save-text-btn') as MockElement;
      saveTextBtn.dispatchEvent(new Event('click'));
      
      // Act - レイアウトを保存
      await app.saveLayout();
      
      // Assert - テキストデータが保存データに含まれる
      expect(postJSONSpy).toHaveBeenCalledWith(
        '/api/layout',
        expect.objectContaining({
          texts: expect.arrayContaining([
            expect.objectContaining({
              content: 'サンプルテキスト'
            })
          ])
        })
      );
    });
  });
});