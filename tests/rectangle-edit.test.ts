import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';

describe('Rectangle Edit Functionality', () => {
  let app: any;
  let infrastructure: InfrastructureMock;

  beforeEach(() => {
    infrastructure = new InfrastructureMock();
    app = new ERViewerApplication(infrastructure);

    // Mock canvas element
    const canvasElement = infrastructure.dom.createElement('svg');
    infrastructure.dom.setAttribute(canvasElement, 'id', 'canvas');
    
    // Mock getElementById to return canvas
    jest.spyOn(infrastructure.dom, 'getElementById').mockImplementation((id) => {
      if (id === 'canvas') return canvasElement;
      return null;
    });

    // Setup initial state with a rectangle
    const erData = {
      entities: []
    };
    const layoutData = {
      entities: {},
      rectangles: [{
        id: 'rect-1',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        color: '#e3f2fd',
        stroke: '#1976d2',
        strokeWidth: 2,
      }],
      sidebarWidth: 0,
      scale: 1,
      translateX: 0,
      translateY: 0
    };

    // Set initial state using setState
    app.setState({
      erData: erData,
      layoutData: layoutData,
      canvas: canvasElement as unknown as SVGSVGElement,
    });
  });

  test('矩形をダブルクリックすると編集ダイアログが表示される', () => {
    // Arrange
    const rectElement = infrastructure.dom.createElement('rect');
    infrastructure.dom.setAttribute(rectElement, 'class', 'annotation-rectangle');
    infrastructure.dom.setAttribute(rectElement, 'data-rect-id', 'rect-1');
    infrastructure.dom.setAttribute(rectElement, 'data-rect-index', '0');
    
    // Mock prompt responses
    const promptSpy = jest.spyOn(infrastructure.browserAPI, 'prompt')
      .mockReturnValueOnce('#ff0000')     // color
      .mockReturnValueOnce('#00ff00')     // stroke
      .mockReturnValueOnce('4')           // strokeWidth
      .mockReturnValueOnce('300')         // width
      .mockReturnValueOnce('150');        // height

    // Act - Click to select
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    Object.defineProperty(mouseEvent, 'target', { value: rectElement });
    app.handleCanvasMouseDown(mouseEvent);

    // Act - Double click to edit
    app.editRectangleAnnotation('rect-1', 0);

    // Assert
    expect(promptSpy).toHaveBeenCalledWith('塗りつぶしの色を編集してください (例: #e3f2fd):', '#e3f2fd');
    expect(promptSpy).toHaveBeenCalledWith('線の色を編集してください (例: #1976d2):', '#1976d2');
    expect(promptSpy).toHaveBeenCalledWith('線の太さを編集してください (例: 2):', '2');
    expect(promptSpy).toHaveBeenCalledWith('幅を編集してください (例: 100):', '200');
    expect(promptSpy).toHaveBeenCalledWith('高さを編集してください (例: 60):', '100');
  });

  test('矩形をドラッグすると位置が更新される', () => {
    // Arrange
    // Initialize app properly
    jest.advanceTimersByTime(10);
    jest.runAllTimers();

    const rectElement = infrastructure.dom.createElement('rect');
    infrastructure.dom.setAttribute(rectElement, 'class', 'annotation-rectangle');
    infrastructure.dom.setAttribute(rectElement, 'data-rect-id', 'rect-1');
    infrastructure.dom.setAttribute(rectElement, 'data-rect-index', '0');
    infrastructure.dom.setAttribute(rectElement, 'x', '100');
    infrastructure.dom.setAttribute(rectElement, 'y', '100');

    // Mock hasClass to return true for annotation-rectangle
    jest.spyOn(infrastructure.dom, 'hasClass').mockImplementation((element, className) => {
      if (element === rectElement && className === 'annotation-rectangle') return true;
      return false;
    });

    // Spy on DOM methods
    const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
    const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');

    // Mock canvas getBoundingClientRect
    jest.spyOn(infrastructure.dom, 'getBoundingClientRect')
      .mockReturnValue({ left: 0, top: 0, width: 1000, height: 800 } as DOMRect);

    // Mock getAttribute to return correct values
    jest.spyOn(infrastructure.dom, 'getAttribute').mockImplementation((element, attr) => {
      if (element === rectElement && attr === 'x') return '100';
      if (element === rectElement && attr === 'y') return '100';
      if (element === rectElement && attr === 'data-rect-id') return 'rect-1';
      if (element === rectElement && attr === 'data-rect-index') return '0';
      return null;
    });

    // Act - Start drag
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    Object.defineProperty(mouseDownEvent, 'target', { value: rectElement });
    app.handleCanvasMouseDown(mouseDownEvent);

    // Act - Drag
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
    });
    app.handleDocumentMouseMove(mouseMoveEvent);

    // Assert - Rectangle position updated during drag
    expect(setAttributeSpy).toHaveBeenCalledWith(rectElement, 'x', '150');
    expect(setAttributeSpy).toHaveBeenCalledWith(rectElement, 'y', '150');

    // Act - End drag
    const mouseUpEvent = new MouseEvent('mouseup');
    app.handleDocumentMouseUp(mouseUpEvent);

    // Assert - Dragging class removed
    expect(removeClassSpy).toHaveBeenCalledWith(rectElement, 'dragging');
  });

  test('矩形選択時に視覚的フィードバックが表示される', () => {
    // Arrange
    // Initialize app properly
    jest.advanceTimersByTime(10);
    jest.runAllTimers();

    const rectElement = infrastructure.dom.createElement('rect');
    infrastructure.dom.setAttribute(rectElement, 'class', 'annotation-rectangle');
    infrastructure.dom.setAttribute(rectElement, 'data-rect-id', 'rect-1');
    infrastructure.dom.setAttribute(rectElement, 'data-rect-index', '0');

    // Mock hasClass to return true for annotation-rectangle
    jest.spyOn(infrastructure.dom, 'hasClass').mockImplementation((element, className) => {
      if (element === rectElement && className === 'annotation-rectangle') return true;
      return false;
    });

    // Spy on DOM methods
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');

    // Mock canvas getBoundingClientRect
    jest.spyOn(infrastructure.dom, 'getBoundingClientRect')
      .mockReturnValue({ left: 0, top: 0, width: 1000, height: 800 } as DOMRect);

    // Act
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    Object.defineProperty(mouseEvent, 'target', { value: rectElement });
    app.handleCanvasMouseDown(mouseEvent);

    // Assert
    expect(addClassSpy).toHaveBeenCalledWith(rectElement, 'selected');
  });

  test('矩形ドラッグ時に視覚的フィードバックが表示される', () => {
    // Arrange
    // Initialize app properly
    jest.advanceTimersByTime(10);
    jest.runAllTimers();

    const rectElement = infrastructure.dom.createElement('rect');
    infrastructure.dom.setAttribute(rectElement, 'class', 'annotation-rectangle');
    infrastructure.dom.setAttribute(rectElement, 'data-rect-id', 'rect-1');
    infrastructure.dom.setAttribute(rectElement, 'data-rect-index', '0');
    infrastructure.dom.setAttribute(rectElement, 'x', '100');
    infrastructure.dom.setAttribute(rectElement, 'y', '100');

    // Mock hasClass to return true for annotation-rectangle
    jest.spyOn(infrastructure.dom, 'hasClass').mockImplementation((element, className) => {
      if (element === rectElement && className === 'annotation-rectangle') return true;
      return false;
    });

    // Spy on DOM methods
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');

    // Mock canvas getBoundingClientRect
    jest.spyOn(infrastructure.dom, 'getBoundingClientRect')
      .mockReturnValue({ left: 0, top: 0, width: 1000, height: 800 } as DOMRect);

    // Mock getAttribute to return correct values
    jest.spyOn(infrastructure.dom, 'getAttribute').mockImplementation((element, attr) => {
      if (element === rectElement && attr === 'x') return '100';
      if (element === rectElement && attr === 'y') return '100';
      if (element === rectElement && attr === 'data-rect-id') return 'rect-1';
      if (element === rectElement && attr === 'data-rect-index') return '0';
      return null;
    });

    // Act
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    Object.defineProperty(mouseEvent, 'target', { value: rectElement });
    app.handleCanvasMouseDown(mouseEvent);

    // Assert
    expect(addClassSpy).toHaveBeenCalledWith(rectElement, 'dragging');
  });
});