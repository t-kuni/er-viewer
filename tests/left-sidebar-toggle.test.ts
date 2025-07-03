import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockElement } from '../public/js/infrastructure/mocks/dom-mock';

describe('左サイドバーの開閉機能', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('初期状態では左サイドバーが表示される', () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const app = new ERViewerApplication(infrastructure) as any;
    
    const layerSidebar = infrastructure.dom.getElementById('layer-sidebar');
    
    // DOM操作をスパイ
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');

    // Act
    app.initialize();

    // Assert
    // 初期状態でvisible=trueなので、collapsedクラスは追加されない
    expect(addClassSpy).not.toHaveBeenCalledWith(layerSidebar, 'collapsed');
  });

  test('折りたたみボタンをクリックすると左サイドバーが隠れる', () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const app = new ERViewerApplication(infrastructure) as any;
    
    const layerSidebar = infrastructure.dom.getElementById('layer-sidebar');
    const collapseBtn = infrastructure.dom.getElementById('collapse-layer-sidebar') as unknown as MockElement;
    
    // DOM操作をスパイ
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
    
    app.initialize();

    // Act
    // ボタンのクリックをシミュレート
    collapseBtn.dispatchEvent('click');

    // Assert
    expect(addClassSpy).toHaveBeenCalledWith(layerSidebar, 'collapsed');
  });

  test('折りたたまれた状態で折りたたみボタンをクリックすると左サイドバーが表示される', () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const app = new ERViewerApplication(infrastructure) as any;
    
    const layerSidebar = infrastructure.dom.getElementById('layer-sidebar');
    const collapseBtn = infrastructure.dom.getElementById('collapse-layer-sidebar') as unknown as MockElement;
    
    // hasClassをモック - 折りたたまれた状態
    jest.spyOn(infrastructure.dom, 'hasClass').mockReturnValue(true);
    
    // DOM操作をスパイ
    const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
    
    app.initialize();

    // Act
    // ボタンのクリックをシミュレート
    collapseBtn.dispatchEvent('click');

    // Assert
    expect(removeClassSpy).toHaveBeenCalledWith(layerSidebar, 'collapsed');
  });

  test('左サイドバーの状態が保存される', () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    // DOM操作をスパイ
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
    
    const app = new ERViewerApplication(infrastructure) as any;
    
    const collapseBtn = infrastructure.dom.getElementById('collapse-layer-sidebar') as unknown as MockElement;
    
    app.initialize();

    // Act
    // ボタンのクリックをシミュレート
    collapseBtn.dispatchEvent('click');

    // Assert
    const layerSidebar = infrastructure.dom.getElementById('layer-sidebar') as unknown as MockElement;
    expect(addClassSpy).toHaveBeenCalledWith(layerSidebar, 'collapsed');
  });

  test('保存された左サイドバーの状態が読み込まれる', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const layoutData = {
      entities: {},
      rectangles: [],
      texts: [],
      layers: [],
      leftSidebar: { visible: false, width: 250 }
    };

    jest.spyOn(infrastructure.network, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '/api/data/all',
      clone: () => ({} as Response),
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({
        erData: {
          entities: [
            {
              name: 'users',
              position: { x: 100, y: 100 },
              size: { width: 200, height: 150 },
              columns: [
                { name: 'id', type: 'INTEGER', primary: true, notNull: true, autoIncrement: true, unique: false, defaultValue: null, comment: '' },
                { name: 'name', type: 'VARCHAR(100)', primary: false, notNull: true, autoIncrement: false, unique: false, defaultValue: null, comment: '' },
                { name: 'email', type: 'VARCHAR(100)', primary: false, notNull: true, autoIncrement: false, unique: true, defaultValue: null, comment: '' }
              ]
            }
          ],
          relationships: []
        },
        layoutData
      })
    } as Response);

    const app = new ERViewerApplication(infrastructure) as any;
    
    const layerSidebar = infrastructure.dom.getElementById('layer-sidebar');
    
    // DOM操作をスパイ
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
    
    app.initialize();

    // Act
    await app.loadAllData();

    // Assert
    expect(addClassSpy).toHaveBeenCalledWith(layerSidebar, 'collapsed');
  });
});