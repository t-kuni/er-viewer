import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import { ERViewerApplication } from '../public/js/er-viewer-application';
import type { MockElement } from '../public/js/infrastructure/mocks/dom-mock';

describe('左サイドバーのリサイズ機能', () => {
  let infrastructure: InfrastructureMock;
  let app: ERViewerApplication;

  beforeEach(() => {
    infrastructure = new InfrastructureMock();
    app = new ERViewerApplication(infrastructure);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('リサイズハンドルのmousedownでリサイズが開始される', async () => {
    // Arrange
    const resizeHandle = infrastructure.dom.querySelector('.layer-sidebar-resize-handle') as unknown as MockElement;
    
    // DOM操作をスパイ
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
    const setStylesSpy = jest.spyOn(infrastructure.dom, 'setStyles');

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 20));

    // Act
    // リサイズハンドルのmousedownイベントをシミュレート
    const mouseDownEvent = new MouseEvent('mousedown', { clientX: 250 });
    resizeHandle.dispatchEvent(mouseDownEvent);

    // Assert
    expect(addClassSpy).toHaveBeenCalledWith(resizeHandle, 'dragging');
    expect(setStylesSpy).toHaveBeenCalledWith(expect.any(Object), { cursor: 'col-resize' });
  });

  test('保存されたレイアウトデータから幅が復元される', async () => {
    // Arrange
    const layoutData = {
      entities: {},
      rectangles: [],
      texts: [],
      layers: [],
      leftSidebar: { visible: true, width: 320 }
    };
    
    jest.spyOn(infrastructure.network, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ erData: null, layoutData })
    } as Response);
    
    const layerSidebar = infrastructure.dom.getElementById('layer-sidebar');
    
    // DOM操作をスパイ
    const setStylesSpy = jest.spyOn(infrastructure.dom, 'setStyles');

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 20));

    // Act
    await app.loadAllData();

    // Assert
    expect(setStylesSpy).toHaveBeenCalledWith(layerSidebar, {
      width: '320px',
      minWidth: '320px'
    });
  });
});