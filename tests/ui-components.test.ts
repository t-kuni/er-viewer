/**
 * UIコンポーネントのテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockData } from '../public/js/types/infrastructure';
import { MockElement } from '../public/js/infrastructure/mocks/dom-mock';
import { StorageMock } from '../public/js/infrastructure/mocks/storage-mock';
import { createERData, createSuccessResponse } from './test-data-factory';

// テスト用ヘルパー関数 - 非同期処理の完了を待つ
const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

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
      new ERViewerApplication(infrastructure);

      // Assert - Storageから折りたたみ状態を読み込む
      expect(getItemSpy).toHaveBeenCalledWith('helpPanelCollapsed');
      // 現在の実装では左サイドバーの状態はlocalStorageから読み込まれない
      expect(getItemSpy).toHaveBeenCalledTimes(1);
    });

    test('ヘルプパネルを展開時にStorageに状態が保存される', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      new ERViewerApplication(infrastructure);

      // Storage操作をスパイ
      const setItemSpy = jest.spyOn(infrastructure.storage, 'setItem');

      // helpToggleとhelpContentを取得
      const helpToggle = infrastructure.dom.getElementById('help-toggle') as unknown as MockElement;
      const helpContent = infrastructure.dom.getElementById('help-content') as unknown as MockElement;

      // ヘルプパネルを折りたたみ状態に設定
      infrastructure.dom.addClass(helpContent as unknown as Element, 'collapsed');
      infrastructure.dom.addClass(helpToggle as unknown as Element, 'collapsed');

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
      new ERViewerApplication(infrastructure);

      // Storage操作をスパイ
      const setItemSpy = jest.spyOn(infrastructure.storage, 'setItem');

      // helpToggleとhelpContentを取得
      const helpToggle = infrastructure.dom.getElementById('help-toggle') as unknown as MockElement;
      const helpContent = infrastructure.dom.getElementById('help-content') as unknown as MockElement;

      // ヘルプパネルを展開状態に設定（collapsedクラスなし）
      infrastructure.dom.removeClass(helpContent as unknown as Element, 'collapsed');
      infrastructure.dom.removeClass(helpToggle as unknown as Element, 'collapsed');

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
      const app: any = new ERViewerApplication(infrastructure);

      // DOM操作をスパイ
      const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
      const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
      const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');

      // Act - サイドバーを開く
      await app.showTableDetails('users');

      // Assert - サイドバー表示のDOM操作を検証
      expect(addClassSpy).toHaveBeenCalledWith(expect.anything(), 'open');
      expect(setInnerHTMLSpy).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('<h2>users</h2>'));

      // Act - サイドバーを閉じる
      app.closeSidebar();

      // Assert - サイドバー非表示のDOM操作を検証
      expect(removeClassSpy).toHaveBeenCalledWith(expect.anything(), 'open');
    });
  });

  describe('オーバーレイ', () => {
    describe('コンテキストメニュー', () => {
      test('コンテキストメニューが表示される', () => {
        // Arrange
        const infrastructure = new InfrastructureMock();
        const app: any = new ERViewerApplication(infrastructure);

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
            top: '200px',
          }),
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
        const app: any = new ERViewerApplication(infrastructure);

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
      new ERViewerApplication(infrastructure);

      const layerSidebar = infrastructure.dom.getElementById('layer-sidebar');
      const collapseBtn = infrastructure.dom.getElementById('collapse-layer-sidebar') as unknown as MockElement;

      // DOM操作をスパイ
      const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');

      // Act - 折りたたみボタンをクリック
      collapseBtn.dispatchEvent('click');

      // Assert - layer-sidebarにcollapsedクラスが追加される
      expect(addClassSpy).toHaveBeenCalledWith(layerSidebar, 'collapsed');
    });

    test('折りたたまれた左サイドバーの折りたたみボタンをクリックすると展開される', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      new ERViewerApplication(infrastructure);

      const layerSidebar = infrastructure.dom.getElementById('layer-sidebar') as unknown as MockElement;
      const collapseBtn = infrastructure.dom.getElementById('collapse-layer-sidebar') as unknown as MockElement;

      // 初期状態を折りたたみ状態に設定
      layerSidebar.classList.add('collapsed');

      // DOM操作をスパイ
      const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');

      // Act - 折りたたみボタンをクリック
      collapseBtn.dispatchEvent('click');

      // Assert - layer-sidebarからcollapsedクラスが削除される
      expect(removeClassSpy).toHaveBeenCalledWith(layerSidebar, 'collapsed');
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
      expect(setStylesSpy).toHaveBeenCalledWith(expect.any(Object), { cursor: 'crosshair' });
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
      expect(setStylesSpy).toHaveBeenCalledWith(expect.any(Object), { cursor: 'default' });
    });

    test('マウスドラッグで矩形を描画できる', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const app = new ERViewerApplication(infrastructure);
      const createElementSpy = jest.spyOn(infrastructure.dom, 'createElement');
      const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');

      app.startRectangleDrawingMode();

      // Act - マウスドラッグで矩形を描画
      const canvas = infrastructure.dom.getElementById('er-canvas') as unknown as MockElement;

      // マウスダウン
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
      canvas.dispatchEvent(mouseDownEvent);

      // マウスムーブ（ドキュメントレベルで）
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 150 });
      infrastructure.dom.getDocumentElement().dispatchEvent(mouseMoveEvent);

      // マウスアップ（ドキュメントレベルで）
      const mouseUpEvent = new MouseEvent('mouseup', { clientX: 200, clientY: 150 });
      infrastructure.dom.getDocumentElement().dispatchEvent(mouseUpEvent);

      // Assert - 矩形要素が作成される
      expect(createElementSpy).toHaveBeenCalledWith('rect', 'http://www.w3.org/2000/svg');
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

      // Mock the network getJSON to return ER data with rectangles
      const mockERData = createERData({
        entities: [],
        layout: {
          entities: {},
          rectangles: [
            {
              id: 'rect-1',
              x: 100,
              y: 100,
              width: 100,
              height: 50,
              color: '#ffffff',
              stroke: '#000000',
              strokeWidth: 1,
            },
          ],
          texts: [],
        },
      });

      jest.spyOn(infrastructure.network, 'getJSON').mockResolvedValue(mockERData);

      // Create spy BEFORE any setAttribute calls
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');

      // Create mock rectangle element that will be found by querySelector
      const mockRectElement = infrastructure.dom.createElement('rect', 'http://www.w3.org/2000/svg');
      infrastructure.dom.setAttribute(mockRectElement, 'data-rect-id', 'rect-1');

      // Mock querySelector to return our element
      jest.spyOn(infrastructure.dom, 'querySelector').mockImplementation((selector) => {
        if (selector === '[data-rect-id="rect-1"]') {
          return mockRectElement;
        }
        return null;
      });

      const app = new ERViewerApplication(infrastructure);

      // Manually call initialize to ensure canvas is set up
      (app as any).initialize();

      await app.loadERData();
      await waitForAsync();

      // Clear previous calls from setup
      setAttributeSpy.mockClear();

      // Act - 矩形の色を変更
      app.updateRectangle('rect-1', {
        color: '#ff0000',
        stroke: '#00ff00',
      });

      // Assert - DOM要素の属性が更新される
      expect(setAttributeSpy).toHaveBeenCalledWith(mockRectElement, 'fill', '#ff0000');
      expect(setAttributeSpy).toHaveBeenCalledWith(mockRectElement, 'stroke', '#00ff00');
    });

    test('矩形のサイズと位置を変更できる', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();

      // Mock the network getJSON to return ER data with rectangles
      const mockERData = createERData({
        entities: [],
        layout: {
          entities: {},
          rectangles: [
            {
              id: 'rect-1',
              x: 100,
              y: 100,
              width: 100,
              height: 50,
              color: '#ffffff',
              stroke: '#000000',
              strokeWidth: 1,
            },
          ],
          texts: [],
        },
      });

      jest.spyOn(infrastructure.network, 'getJSON').mockResolvedValue(mockERData);

      // Create spy BEFORE any setAttribute calls
      const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');

      // Create mock rectangle element that will be found by querySelector
      const mockRectElement = infrastructure.dom.createElement('rect', 'http://www.w3.org/2000/svg');
      infrastructure.dom.setAttribute(mockRectElement, 'data-rect-id', 'rect-1');

      // Mock querySelector to return our element
      jest.spyOn(infrastructure.dom, 'querySelector').mockImplementation((selector) => {
        if (selector === '[data-rect-id="rect-1"]') {
          return mockRectElement;
        }
        return null;
      });

      const app = new ERViewerApplication(infrastructure);
      await app.loadERData();
      await waitForAsync();

      // Clear previous calls from setup
      setAttributeSpy.mockClear();

      // Act - 矩形のサイズと位置を変更
      app.updateRectangle('rect-1', {
        x: 150,
        y: 120,
        width: 200,
        height: 80,
      });

      // Assert - DOM要素の属性が更新される
      expect(setAttributeSpy).toHaveBeenCalledWith(mockRectElement, 'x', '150');
      expect(setAttributeSpy).toHaveBeenCalledWith(mockRectElement, 'y', '120');
      expect(setAttributeSpy).toHaveBeenCalledWith(mockRectElement, 'width', '200');
      expect(setAttributeSpy).toHaveBeenCalledWith(mockRectElement, 'height', '80');
    });

    test('矩形データがレイアウトデータに含まれて保存される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/layout': createSuccessResponse(),
        },
      };
      infrastructure.setupMockData(mockData);

      const app = new ERViewerApplication(infrastructure);

      // Initialize app to set up canvas
      (app as any).initialize();

      const postJSONSpy = jest.spyOn(infrastructure.network, 'postJSON');

      // 矩形描画モードを開始
      app.startRectangleDrawingMode();

      // マウス操作で矩形を描画
      const canvas = infrastructure.dom.getElementById('er-canvas') as unknown as MockElement;

      // Setup getBoundingClientRect mock to return proper values
      jest.spyOn(infrastructure.dom, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      // マウスダウン
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
      canvas.dispatchEvent(mouseDownEvent);

      // マウスムーブ (to make the rectangle have size)
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 150 });
      infrastructure.dom.getDocumentElement().dispatchEvent(mouseMoveEvent);

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
              height: 50,
            }),
          ]),
        }),
      );
    });

    test('テキストデータがレイアウトデータに含まれて保存される', async () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      const mockData: MockData = {
        networkResponses: {
          '/api/layout': createSuccessResponse(),
        },
      };
      infrastructure.setupMockData(mockData);

      // Mock prompt to return text
      jest.spyOn(infrastructure.browserAPI, 'prompt').mockReturnValue('サンプルテキスト');

      const app = new ERViewerApplication(infrastructure);

      // Initialize app to set up canvas
      (app as any).initialize();

      const postJSONSpy = jest.spyOn(infrastructure.network, 'postJSON');

      // Setup getBoundingClientRect mock
      jest.spyOn(infrastructure.dom, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      // テキストモードを開始
      app.startTextDrawingMode();

      // テキストを作成 - mousedown instead of click
      const canvas = infrastructure.dom.getElementById('er-canvas') as unknown as MockElement;
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 200, clientY: 150 });
      canvas.dispatchEvent(mouseDownEvent);

      // Act - レイアウトを保存
      await app.saveLayout();

      // Assert - テキストデータが保存データに含まれる
      expect(postJSONSpy).toHaveBeenCalledWith(
        '/api/layout',
        expect.objectContaining({
          texts: expect.arrayContaining([
            expect.objectContaining({
              content: 'サンプルテキスト',
              x: 200,
              y: 150,
            }),
          ]),
        }),
      );
    });
  });
});
