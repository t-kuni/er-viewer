/**
 * Test suite for text annotation functionality
 * Covers text creation, editing, dragging, and interaction features
 */

// Mock jest-canvas-mock for SVG manipulation
import 'jest-canvas-mock';

// Import required modules
import { EventController } from '../public/js/events/event-controller.js';
import { StateManager } from '../public/js/state/state-manager.js';
import { CoordinateTransform } from '../public/js/utils/coordinate-transform.js';
import { HighlightManager } from '../public/js/highlighting/highlight-manager.js';
import { CanvasRenderer } from '../public/js/rendering/canvas-renderer.js';
import { AnnotationController } from '../public/js/annotations/annotation-controller.js';
import { UIController } from '../public/js/ui/ui-controller.js';
import LayerManager from '../public/js/layer-manager.js';

// Mock DOM environment
global.prompt = jest.fn();
global.alert = jest.fn();

describe('Text Annotation Functionality Tests', () => {
    let canvas, stateManager, coordinateTransform, highlightManager, eventController, canvasRenderer, annotationController, uiController, layerManager;

    beforeEach(() => {
        // Mock DOM elements needed for LayerManager
        const mockLayerSidebar = document.createElement('div');
        mockLayerSidebar.id = 'layer-sidebar';
        const mockLayerList = document.createElement('div');
        mockLayerList.id = 'layer-list';
        const mockCollapseBtn = document.createElement('button');
        mockCollapseBtn.id = 'collapse-layer-sidebar';
        document.body.appendChild(mockLayerSidebar);
        document.body.appendChild(mockLayerList);
        document.body.appendChild(mockCollapseBtn);

        // Create mock canvas
        canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        canvas.id = 'er-canvas';
        canvas.style.width = '800px';
        canvas.style.height = '600px';
        document.body.appendChild(canvas);

        // Initialize core components
        stateManager = new StateManager();
        coordinateTransform = new CoordinateTransform();
        highlightManager = new HighlightManager();
        layerManager = new LayerManager(stateManager);
        eventController = new EventController(canvas, stateManager, coordinateTransform, highlightManager, layerManager);
        canvasRenderer = new CanvasRenderer(canvas, coordinateTransform);
        annotationController = new AnnotationController(stateManager, coordinateTransform);
        uiController = new UIController(stateManager);

        // Initialize state
        stateManager.setState({
            erData: { entities: [], relationships: [] },
            layoutData: { entities: {}, rectangles: [], texts: [] },
            viewport: { panX: 0, panY: 0, scale: 1 },
            interactionMode: 'default'
        });

        // Mock prompt for text input
        global.prompt.mockReset();
        global.alert.mockReset();
    });

    afterEach(() => {
        document.body.removeChild(canvas);
        eventController.removeEventListeners();
    });

    describe('Text Creation', () => {
        test('should create text annotation at click position', () => {
            global.prompt.mockReturnValue('Test Text');

            const mockEvent = {
                clientX: 200,
                clientY: 150,
                preventDefault: jest.fn()
            };

            // Set interaction mode to creating-text
            stateManager.setInteractionMode('creating-text');

            // Simulate mousedown for text creation
            eventController.handleMouseDown(mockEvent);

            // Check if text was added to state
            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(1);
            expect(currentState.layoutData.texts[0]).toMatchObject({
                content: 'Test Text',
                color: '#2c3e50',
                size: 14
            });

            // Check if coordinates are reasonable (within canvas bounds)
            expect(currentState.layoutData.texts[0].x).toBeGreaterThan(0);
            expect(currentState.layoutData.texts[0].y).toBeGreaterThan(0);
        });

        test('should not create text if user cancels prompt', () => {
            global.prompt.mockReturnValue(null);

            const mockEvent = {
                clientX: 200,
                clientY: 150,
                preventDefault: jest.fn()
            };

            stateManager.setInteractionMode('creating-text');
            eventController.handleMouseDown(mockEvent);

            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(0);
        });

        test('should not create text for empty input', () => {
            global.prompt.mockReturnValue('   '); // Only whitespace

            const mockEvent = {
                clientX: 200,
                clientY: 150,
                preventDefault: jest.fn()
            };

            stateManager.setInteractionMode('creating-text');
            eventController.handleMouseDown(mockEvent);

            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(0);
        });

        test('should create layer when text is added', () => {
            global.prompt.mockReturnValue('Test Layer Text');

            const mockEvent = {
                clientX: 200,
                clientY: 150,
                preventDefault: jest.fn()
            };

            // Get initial layer count
            const initialLayerCount = layerManager.layers.length;

            stateManager.setInteractionMode('creating-text');
            eventController.handleMouseDown(mockEvent);

            // Check if text was added to state
            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(1);

            // Check if layer was added
            expect(layerManager.layers.length).toBe(initialLayerCount + 1);
            const newLayer = layerManager.layers[layerManager.layers.length - 1];
            expect(newLayer.type).toBe('text');
            expect(newLayer.name).toBe('テキスト "Test Layer Text"');
            expect(newLayer.icon).toBe('📝');
        });

        test('should create multiple text layers without duplication', () => {
            // Create first text
            global.prompt.mockReturnValue('First Text');
            const mockEvent1 = {
                clientX: 100,
                clientY: 100,
                preventDefault: jest.fn()
            };

            stateManager.setInteractionMode('creating-text');
            eventController.handleMouseDown(mockEvent1);

            // Create second text
            global.prompt.mockReturnValue('Second Text');
            const mockEvent2 = {
                clientX: 200,
                clientY: 200,
                preventDefault: jest.fn()
            };

            stateManager.setInteractionMode('creating-text');
            eventController.handleMouseDown(mockEvent2);

            // Check if both texts were added
            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(2);

            // Check if both layers were added (+ 1 for default ER diagram layer)
            expect(layerManager.layers.length).toBe(3);
            
            const textLayers = layerManager.layers.filter(l => l.type === 'text');
            expect(textLayers).toHaveLength(2);
            expect(textLayers[0].name).toBe('テキスト "First Text"');
            expect(textLayers[1].name).toBe('テキスト "Second Text"');
        });
    });

    describe('Text Rendering', () => {
        test('should render text annotations with correct attributes', () => {
            const testTexts = [
                { x: 100, y: 50, content: 'First Text', color: '#ff0000', size: 16 },
                { x: 200, y: 100, content: 'Second Text', color: '#00ff00', size: 12 }
            ];

            // Initialize canvas structure first
            canvasRenderer.initializeCanvas();
            
            // Render texts
            canvasRenderer.renderAnnotations([], testTexts);

            // Check if text elements were created
            const textElements = canvas.querySelectorAll('.annotation-text');
            expect(textElements).toHaveLength(2);

            // Check first text element attributes
            expect(textElements[0].getAttribute('class')).toBe('annotation-text');
            expect(textElements[0].getAttribute('data-index')).toBe('0');
            expect(textElements[0].getAttribute('data-type')).toBe('text');
            expect(textElements[0].getAttribute('x')).toBe('100');
            expect(textElements[0].getAttribute('y')).toBe('50');
            expect(textElements[0].getAttribute('fill')).toBe('#ff0000');
            expect(textElements[0].getAttribute('font-size')).toBe('16');
            expect(textElements[0].textContent).toBe('First Text');

            // Check second text element attributes
            expect(textElements[1].getAttribute('data-index')).toBe('1');
            expect(textElements[1].textContent).toBe('Second Text');
        });
    });

    describe('Text Selection and Clicking', () => {
        test('should select text on click', () => {
            // Create text element
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('class', 'annotation-text');
            textElement.setAttribute('data-index', '0');
            
            // Mock closest method to return textElement only for '.annotation-text', null for others
            textElement.closest = jest.fn((selector) => {
                if (selector === '.annotation-text') return textElement;
                return null;
            });

            const mockEvent = {
                target: textElement,
                preventDefault: jest.fn()
            };

            const emitSpy = jest.spyOn(eventController, 'emit');
            eventController.handleClick(mockEvent);

            // Check if text-click event was emitted
            expect(emitSpy).toHaveBeenCalledWith('text-click', {
                textIndex: 0,
                event: mockEvent
            });

            // Check if text was selected in state
            const currentState = stateManager.getState();
            expect(currentState.selectedAnnotation).toEqual({
                type: 'text',
                index: 0
            });
        });
    });

    describe('Text Dragging', () => {
        test('should enable text dragging on mousedown', () => {
            // Setup initial state with text
            stateManager.setState({
                layoutData: {
                    texts: [{ x: 100, y: 100, content: 'Test', color: '#000', size: 14 }],
                    rectangles: [],
                    entities: {}
                }
            });

            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('data-index', '0');
            textElement.closest = jest.fn((selector) => {
                if (selector === '.annotation-text') return textElement;
                return null;
            });

            const mockEvent = {
                target: textElement,
                clientX: 100,
                clientY: 100,
                preventDefault: jest.fn()
            };

            eventController.handleMouseDown(mockEvent);

            // Check if interaction mode changed to dragging-text
            const currentState = stateManager.getState();
            expect(currentState.interactionMode).toBe('dragging-text');
        });

        test('should update text position during drag', () => {
            // Setup dragging state
            stateManager.setState({
                layoutData: {
                    texts: [{ x: 100, y: 100, content: 'Test', color: '#000', size: 14 }],
                    rectangles: [],
                    entities: {}
                },
                interactionMode: 'dragging-text',
                dragState: {
                    textIndex: 0,
                    startPosition: { x: 100, y: 100 },
                    startMouse: { x: 100, y: 100 },
                    offset: { x: 0, y: 0 }
                }
            });

            const mockEvent = {
                clientX: 150,
                clientY: 120
            };

            eventController.handleMouseMove(mockEvent);

            // Check if text position was updated
            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts[0].x).toBeCloseTo(150, 1);
            expect(currentState.layoutData.texts[0].y).toBeCloseTo(120, 1);
        });

        test('should end dragging on mouseup', () => {
            stateManager.setInteractionMode('dragging-text');

            const mockEvent = {
                clientX: 150,
                clientY: 120
            };

            eventController.handleMouseUp(mockEvent);

            const currentState = stateManager.getState();
            expect(currentState.interactionMode).toBe('default');
        });
    });

    describe('Text Properties Editing', () => {
        test('should open properties dialog for text', () => {
            // Setup state with text
            stateManager.setState({
                layoutData: {
                    texts: [{ x: 100, y: 100, content: 'Test Text', color: '#ff0000', size: 16 }],
                    rectangles: [],
                    entities: {}
                }
            });

            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('data-index', '0');

            // Call edit properties
            annotationController.editTextProperties(textElement);

            // Check if dialog was created
            const dialog = document.querySelector('div[style*="position: fixed"]');
            expect(dialog).toBeTruthy();
            expect(dialog.innerHTML).toContain('テキストのプロパティ');
        });

        test('should update text properties when saved', (done) => {
            // Set up initial state with a text annotation
            const initialLayoutData = {
                texts: [{ x: 100, y: 100, content: 'Original', color: '#000000', size: 14 }],
                rectangles: [],
                entities: {}
            };
            stateManager.setState({
                layoutData: initialLayoutData
            });

            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('data-index', '0');

            annotationController.editTextProperties(textElement);

            // Wait for DOM elements to be created and simulate user input changes
            const contentInput = document.getElementById('text-content');
            const colorInput = document.getElementById('text-color');
            const sizeInput = document.getElementById('text-size');
            const xInput = document.getElementById('text-x');
            const yInput = document.getElementById('text-y');

            // Ensure elements exist before setting values
            expect(contentInput).toBeTruthy();
            expect(colorInput).toBeTruthy();
            expect(sizeInput).toBeTruthy();
            expect(xInput).toBeTruthy();
            expect(yInput).toBeTruthy();

            contentInput.value = 'Updated Text';
            colorInput.value = '#ff0000';
            sizeInput.value = '18';
            xInput.value = '150';
            yInput.value = '200';

            // Simulate save button click
            const saveButton = document.getElementById('save-text-props');
            expect(saveButton).toBeTruthy();
            saveButton.click();

            // Wait for async operations and check state directly
            setTimeout(() => {
                try {
                    const currentState = stateManager.getState();
                    const updatedText = currentState.layoutData.texts[0];
                    
                    expect(updatedText.content).toBe('Updated Text');
                    expect(updatedText.color).toBe('#ff0000');
                    expect(updatedText.size).toBe(18);
                    expect(updatedText.x).toBe(150);
                    expect(updatedText.y).toBe(200);
                    done();
                } catch (error) {
                    done(error);
                }
            }, 10);
        });
    });

    describe('Text Context Menu', () => {
        test('should show context menu for text elements', () => {
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.classList.add('annotation-text');

            uiController.showContextMenu(100, 100, { target: textElement });

            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            expect(contextMenu.innerHTML).toContain('プロパティ編集');
            expect(contextMenu.innerHTML).toContain('削除');
        });
    });

    describe('Integration Test - Complete Text Workflow', () => {
        test('should handle complete text annotation workflow', () => {
            global.prompt.mockReturnValue('Integration Test Text');

            // 1. Create text
            stateManager.setInteractionMode('creating-text');
            eventController.handleMouseDown({
                clientX: 200,
                clientY: 150,
                preventDefault: jest.fn()
            });

            // Verify text creation
            let currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(1);
            expect(currentState.layoutData.texts[0].content).toBe('Integration Test Text');

            // 2. Render text
            canvasRenderer.initializeCanvas();
            canvasRenderer.renderAnnotations([], currentState.layoutData.texts);
            const textElements = canvas.querySelectorAll('.annotation-text');
            expect(textElements).toHaveLength(1);

            // 3. Click to select text
            const textElement = textElements[0];
            textElement.closest = jest.fn((selector) => {
                if (selector === '.annotation-text') return textElement;
                return null;
            });
            eventController.handleClick({
                target: textElement,
                preventDefault: jest.fn()
            });

            // Verify selection
            currentState = stateManager.getState();
            expect(currentState.selectedAnnotation).toEqual({
                type: 'text',
                index: 0
            });

            // 4. Test right-click context menu
            uiController.showContextMenu(100, 100, { target: textElement });
            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();

            console.log('✅ Complete text annotation workflow test passed');
        });
    });
});