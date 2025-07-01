/**
 * レイヤー一覧のドラッグ&ドロップ機能のテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import { MockElement } from '../public/js/infrastructure/mocks/dom-mock';
import type { MockData } from '../public/js/types/infrastructure';

describe('レイヤー一覧のドラッグ&ドロップ', () => {
  let infrastructure: InfrastructureMock;
  let app: ERViewerApplication;

  beforeEach(() => {
    infrastructure = new InfrastructureMock();
    app = new ERViewerApplication(infrastructure);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  test('レイヤー一覧に複数のレイヤーが表示される', () => {
    // Arrange
    const layerList = infrastructure.dom.getElementById('layer-list') as MockElement;
    
    // Act - 矩形を追加してレイヤーを作成
    app.startRectangleDrawingMode();
    const canvas = infrastructure.dom.getElementById('er-canvas') as MockElement;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    // mousemoveはdocumentに対して発火する必要がある
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
    
    // Assert - レイヤーリストにレイヤーアイテムが存在する
    const layerItems = infrastructure.dom.querySelectorAll('.layer-item');
    expect(layerItems.length).toBeGreaterThanOrEqual(2); // デフォルトのER図 + 矩形1
    
    // 矩形レイヤーが追加されているか確認
    const rectangleLayer = Array.from(layerItems).find(item => {
      const innerHTML = (item as MockElement).innerHTML;
      return innerHTML.includes('矩形No');
    });
    expect(rectangleLayer).toBeTruthy();
  });

  test('レイヤーアイテムがドラッグ可能である', () => {
    // Arrange
    app.startRectangleDrawingMode();
    const canvas = infrastructure.dom.getElementById('er-canvas') as MockElement;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
    
    // Assert - レイヤーアイテムを取得してdraggable属性を確認
    const layerItems = infrastructure.dom.querySelectorAll('.layer-item');
    expect(layerItems.length).toBeGreaterThanOrEqual(2);
    
    // 各レイヤーアイテムがdraggable属性を持っているか確認
    layerItems.forEach(item => {
      const draggable = infrastructure.dom.getAttribute(item, 'draggable');
      expect(draggable).toBe('true');
    });
  });

  test('レイヤーアイテムをドラッグ&ドロップで順番を入れ替えられる', () => {
    // Arrange - 複数のレイヤーを作成
    // 矩形1を追加
    app.startRectangleDrawingMode();
    const canvas = infrastructure.dom.getElementById('er-canvas') as MockElement;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
    
    // 矩形2を追加
    app.startRectangleDrawingMode();
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 100 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 150 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
    
    // レイヤーアイテムを取得
    const layerItems = infrastructure.dom.querySelectorAll('.layer-item');
    expect(layerItems.length).toBeGreaterThanOrEqual(3); // ER図 + 矩形1 + 矩形2
    
    const firstItem = layerItems[1] as MockElement; // 矩形1
    const secondItem = layerItems[2] as MockElement; // 矩形2
    
    // Act - 最初のアイテムを2番目のアイテムの位置にドラッグ&ドロップ
    const dragEvent = new Event('dragstart') as any;
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: { effectAllowed: '', dropEffect: '' },
      writable: true
    });
    firstItem.dispatchEvent(dragEvent);
    
    const dragOverEvent = new Event('dragover') as any;
    Object.defineProperty(dragOverEvent, 'dataTransfer', {
      value: { dropEffect: '' },
      writable: true
    });
    secondItem.dispatchEvent(dragOverEvent);
    
    const dropEvent = new Event('drop') as any;
    secondItem.dispatchEvent(dropEvent);
    
    firstItem.dispatchEvent(new Event('dragend'));
    
    // Assert - レイヤーの順番が変更される
    const updatedLayerItems = infrastructure.dom.querySelectorAll('.layer-item');
    // ドラッグ&ドロップ後の順番を確認（内容で比較）
    expect((updatedLayerItems[1] as MockElement).innerHTML).toContain('矩形No2');
    expect((updatedLayerItems[2] as MockElement).innerHTML).toContain('矩形No1');
  });

  test('ドラッグ中にレイヤーアイテムに視覚的フィードバックがある', () => {
    // Arrange
    app.startRectangleDrawingMode();
    const canvas = infrastructure.dom.getElementById('er-canvas') as MockElement;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
    
    const layerItems = infrastructure.dom.querySelectorAll('.layer-item');
    const firstItem = layerItems[0] as MockElement;
    
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
    const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
    
    // Act - ドラッグ開始
    const dragEvent = new Event('dragstart') as any;
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: { effectAllowed: '' },
      writable: true
    });
    firstItem.dispatchEvent(dragEvent);
    
    // Assert - draggingクラスが追加される
    expect(addClassSpy).toHaveBeenCalledWith(firstItem, 'dragging');
    
    // Act - ドラッグ終了
    firstItem.dispatchEvent(new Event('dragend'));
    
    // Assert - draggingクラスが削除される
    expect(removeClassSpy).toHaveBeenCalledWith(firstItem, 'dragging');
  });

  test('レイヤー順序変更後にキャンバスが再描画される', () => {
    // Arrange - 複数のレイヤーを作成
    app.startRectangleDrawingMode();
    const canvas = infrastructure.dom.getElementById('er-canvas') as MockElement;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
    
    app.startRectangleDrawingMode();
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 100 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 150 }));
    infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
    
    const layerItems = infrastructure.dom.querySelectorAll('.layer-item');
    const firstItem = layerItems[1] as MockElement;
    const secondItem = layerItems[2] as MockElement;
    
    // DocumentにdispatchEventが呼ばれるかスパイ
    const dispatchEventSpy = jest.spyOn(infrastructure.dom.getDocumentElement(), 'dispatchEvent');
    
    // Act - ドラッグ&ドロップ
    const dragEvent = new Event('dragstart') as any;
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: { effectAllowed: '' },
      writable: true
    });
    firstItem.dispatchEvent(dragEvent);
    
    const dropEvent = new Event('drop') as any;
    secondItem.dispatchEvent(dropEvent);
    
    firstItem.dispatchEvent(new Event('dragend'));
    
    // Assert - layerOrderChangedイベントが発火される
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'layerOrderChanged'
      })
    );
  });
});