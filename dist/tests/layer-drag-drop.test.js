/**
 * レイヤー一覧のドラッグ&ドロップ機能のテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
describe('レイヤー一覧のドラッグ&ドロップ', () => {
    let infrastructure;
    let app;
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
        const layerList = infrastructure.dom.getElementById('layer-list');
        // Act - 矩形を追加してレイヤーを作成
        app.startRectangleDrawingMode();
        const canvas = infrastructure.dom.getElementById('er-canvas');
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
        infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
        // Assert - レイヤーリストに新しいレイヤーアイテムが追加される
        const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
        // レイヤーリストにレイヤーアイテムが追加されているか確認
        const layerItemCalls = appendChildSpy.mock.calls.filter(call => call[0] === layerList && call[1]?.className?.includes('layer-item'));
        expect(layerItemCalls.length).toBeGreaterThan(0);
    });
    test('レイヤーアイテムがドラッグ可能である', () => {
        // Arrange
        app.startRectangleDrawingMode();
        const canvas = infrastructure.dom.getElementById('er-canvas');
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
        infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
        // レイヤーアイテムを取得
        const layerList = infrastructure.dom.getElementById('layer-list');
        const layerItems = infrastructure.dom.querySelectorAll('.layer-item');
        // Assert - レイヤーアイテムにdraggable属性が設定されている
        layerItems.forEach(item => {
            const setAttributeCalls = jest.spyOn(infrastructure.dom, 'setAttribute').mock.calls;
            const draggableCall = setAttributeCalls.find(call => call[0] === item && call[1] === 'draggable' && call[2] === 'true');
            expect(draggableCall).toBeDefined();
        });
    });
    test('レイヤーアイテムをドラッグ&ドロップで順番を入れ替えられる', () => {
        // Arrange - 複数のレイヤーを作成
        // 矩形1を追加
        app.startRectangleDrawingMode();
        const canvas = infrastructure.dom.getElementById('er-canvas');
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
        infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
        // 矩形2を追加
        app.startRectangleDrawingMode();
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 100 }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 150 }));
        infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
        // レイヤーアイテムを取得
        const layerItems = infrastructure.dom.querySelectorAll('.layer-item');
        expect(layerItems.length).toBeGreaterThanOrEqual(3); // ER図 + 矩形1 + 矩形2
        const firstItem = layerItems[1]; // 矩形1
        const secondItem = layerItems[2]; // 矩形2
        // Act - 最初のアイテムを2番目のアイテムの位置にドラッグ&ドロップ
        const dragEvent = new Event('dragstart');
        Object.defineProperty(dragEvent, 'dataTransfer', {
            value: { effectAllowed: '', dropEffect: '' },
            writable: true
        });
        firstItem.dispatchEvent(dragEvent);
        const dragOverEvent = new Event('dragover');
        Object.defineProperty(dragOverEvent, 'dataTransfer', {
            value: { dropEffect: '' },
            writable: true
        });
        secondItem.dispatchEvent(dragOverEvent);
        const dropEvent = new Event('drop');
        secondItem.dispatchEvent(dropEvent);
        firstItem.dispatchEvent(new Event('dragend'));
        // Assert - レイヤーの順番が変更される
        const updatedLayerItems = infrastructure.dom.querySelectorAll('.layer-item');
        // ドラッグ&ドロップ後の順番を確認
        expect(updatedLayerItems[1]).toBe(secondItem);
        expect(updatedLayerItems[2]).toBe(firstItem);
    });
    test('ドラッグ中にレイヤーアイテムに視覚的フィードバックがある', () => {
        // Arrange
        app.startRectangleDrawingMode();
        const canvas = infrastructure.dom.getElementById('er-canvas');
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
        infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
        const layerItems = infrastructure.dom.querySelectorAll('.layer-item');
        const firstItem = layerItems[0];
        const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
        const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
        // Act - ドラッグ開始
        const dragEvent = new Event('dragstart');
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
        const canvas = infrastructure.dom.getElementById('er-canvas');
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 150 }));
        infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
        app.startRectangleDrawingMode();
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 100 }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 150 }));
        infrastructure.dom.getDocumentElement().dispatchEvent(new MouseEvent('mouseup'));
        const layerItems = infrastructure.dom.querySelectorAll('.layer-item');
        const firstItem = layerItems[1];
        const secondItem = layerItems[2];
        // DocumentにdispatchEventが呼ばれるかスパイ
        const dispatchEventSpy = jest.spyOn(infrastructure.dom.getDocumentElement(), 'dispatchEvent');
        // Act - ドラッグ&ドロップ
        const dragEvent = new Event('dragstart');
        Object.defineProperty(dragEvent, 'dataTransfer', {
            value: { effectAllowed: '' },
            writable: true
        });
        firstItem.dispatchEvent(dragEvent);
        const dropEvent = new Event('drop');
        secondItem.dispatchEvent(dropEvent);
        firstItem.dispatchEvent(new Event('dragend'));
        // Assert - layerOrderChangedイベントが発火される
        const layerOrderChangedEvent = dispatchEventSpy.mock.calls.find(call => call[0] instanceof CustomEvent && call[0].type === 'layerOrderChanged');
        expect(layerOrderChangedEvent).toBeDefined();
    });
});
//# sourceMappingURL=layer-drag-drop.test.js.map