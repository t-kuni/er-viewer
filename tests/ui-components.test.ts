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
  createDDLResponse
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
    expect(getItemSpy).toHaveBeenCalledTimes(1);
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
});