import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import { createUserPostERData } from './test-data-factory';

describe('Text Drag Functionality', () => {
  let app: any;
  let infrastructure: InfrastructureMock;

  beforeEach(() => {
    infrastructure = new InfrastructureMock();
    const mockData = {
      networkResponses: {
        '/api/tables': { status: 200, data: createUserPostERData() },
      },
    };
    infrastructure.setupMockData(mockData);
    app = new ERViewerApplication(infrastructure);
  });

  test('テキストをドラッグすると位置が更新される', () => {
    // Arrange
    const textElement = infrastructure.dom.createElement('text', 'http://www.w3.org/2000/svg');
    infrastructure.dom.setAttribute(textElement, 'class', 'annotation-text');
    infrastructure.dom.setAttribute(textElement, 'data-text-id', 'text-1');
    infrastructure.dom.setAttribute(textElement, 'data-text-index', '0');
    infrastructure.dom.setAttribute(textElement, 'x', '100');
    infrastructure.dom.setAttribute(textElement, 'y', '100');
    infrastructure.dom.setInnerHTML(textElement, 'Test Text');

    // Mock hasClass to return true for annotation-text
    jest.spyOn(infrastructure.dom, 'hasClass').mockImplementation((element, className) => {
      if (element === textElement && className === 'annotation-text') return true;
      return false;
    });

    // Spy on DOM methods
    const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
    const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');

    // Mock canvas getBoundingClientRect
    jest.spyOn(infrastructure.dom, 'getBoundingClientRect')
      .mockReturnValue({ left: 0, top: 0, width: 1000, height: 800 } as DOMRect);

    // Mock getAttribute to return correct values
    jest.spyOn(infrastructure.dom, 'getAttribute').mockImplementation((element, attr) => {
      if (element === textElement && attr === 'x') return '100';
      if (element === textElement && attr === 'y') return '100';
      if (element === textElement && attr === 'data-text-id') return 'text-1';
      if (element === textElement && attr === 'data-text-index') return '0';
      return null;
    });

    // Act - Start drag
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    Object.defineProperty(mouseDownEvent, 'target', { value: textElement });
    app.handleCanvasMouseDown(mouseDownEvent);

    // Assert - Text element gets dragging class
    expect(addClassSpy).toHaveBeenCalledWith(textElement, 'dragging');

    // Act - Move mouse
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
    });
    app.handleDocumentMouseMove(mouseMoveEvent);

    // Assert - Text position updated during drag
    expect(setAttributeSpy).toHaveBeenCalledWith(textElement, 'x', '150');
    expect(setAttributeSpy).toHaveBeenCalledWith(textElement, 'y', '150');

    // Act - End drag
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 150,
      clientY: 150,
    });
    app.handleDocumentMouseUp(mouseUpEvent);

    // Assert - Dragging class removed
    expect(removeClassSpy).toHaveBeenCalledWith(textElement, 'dragging');
  });

  test('テキスト選択時に視覚的フィードバックが表示される', () => {
    // Arrange
    const textElement = infrastructure.dom.createElement('text', 'http://www.w3.org/2000/svg');
    infrastructure.dom.setAttribute(textElement, 'class', 'annotation-text');
    infrastructure.dom.setAttribute(textElement, 'data-text-id', 'text-1');
    infrastructure.dom.setAttribute(textElement, 'data-text-index', '0');
    infrastructure.dom.setInnerHTML(textElement, 'Test Text');

    // Mock hasClass to return true for annotation-text
    jest.spyOn(infrastructure.dom, 'hasClass').mockImplementation((element, className) => {
      if (element === textElement && className === 'annotation-text') return true;
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
    Object.defineProperty(mouseEvent, 'target', { value: textElement });
    app.handleCanvasMouseDown(mouseEvent);

    // Assert
    expect(addClassSpy).toHaveBeenCalledWith(textElement, 'selected');
  });
});