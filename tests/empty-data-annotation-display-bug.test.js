/**
 * Test suite for empty data annotation display bug
 * Tests the bug where right-click text and rectangle addition don't display when no data exists
 */

import 'jest-canvas-mock';

// Import required modules
import { EventController } from '../public/js/events/event-controller.js';
import { StateManager } from '../public/js/state/state-manager.js';
import { CoordinateTransform } from '../public/js/utils/coordinate-transform.js';
import { HighlightManager } from '../public/js/highlighting/highlight-manager.js';
import { UIController } from '../public/js/ui/ui-controller.js';
import { ERViewerCore } from '../public/js/core/er-viewer-core.js';
import { CanvasRenderer } from '../public/js/rendering/canvas-renderer.js';
import LayerManager from '../public/js/layer-manager.js';

// Mock DOM environment
global.prompt = jest.fn();
global.alert = jest.fn();

describe('Empty Data Annotation Display Bug', () => {
    let canvas, stateManager, coordinateTransform, highlightManager, eventController, uiController, layerManager, erViewerCore, canvasRenderer;

    beforeEach(() => {
        // Mock required DOM elements for LayerManager
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

        // Mock getBoundingClientRect for canvas
        canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600,
            x: 0,
            y: 0
        }));

        document.body.appendChild(canvas);

        // Initialize core components
        stateManager = new StateManager();
        coordinateTransform = new CoordinateTransform();
        highlightManager = new HighlightManager();
        layerManager = new LayerManager(stateManager);
        canvasRenderer = new CanvasRenderer(canvas, coordinateTransform);
        eventController = new EventController(canvas, stateManager, coordinateTransform, highlightManager, layerManager);
        uiController = new UIController(stateManager);
        erViewerCore = new ERViewerCore();

        // Initialize ERViewerCore with components
        erViewerCore.stateManager = stateManager;
        erViewerCore.layerManager = layerManager;
        erViewerCore.uiController = uiController;
        erViewerCore.eventController = eventController;
        erViewerCore.canvasRenderer = canvasRenderer;
        erViewerCore.coordinateTransform = coordinateTransform;

        // Mock UIController event system
        uiController.emit = jest.fn();
        uiController.on = jest.fn();
        
        // Set up actual event handling like ERViewerCore does
        uiController._actualHandlers = {};
        uiController.on = jest.fn((event, handler) => {
            uiController._actualHandlers[event] = handler;
        });
        uiController.emit = jest.fn((eventName, data) => {
            // Simulate the real event emission
            const handler = uiController._actualHandlers[eventName];
            if (handler) {
                handler({ detail: data });
            }
        });
        
        // Set up ERViewerCore event subscriptions manually since we can't rely on automatic initialization
        uiController.on('add-text', (e) => {
            erViewerCore.addTextAtPosition(e.detail.x, e.detail.y);
            // Manually trigger render after adding text
            erViewerCore.renderER();
        });
        
        uiController.on('add-rectangle', (e) => {
            erViewerCore.addRectangleAtPosition(e.detail.x, e.detail.y);
            // Manually trigger render after adding rectangle
            erViewerCore.renderER();
        });
        
        // Initialize ERViewerCore properly
        erViewerCore.canvasRenderer = erViewerCore.canvasRenderer || canvasRenderer;
        uiController.canvasRenderer = erViewerCore.canvasRenderer;
        
        // Setup state manager subscriptions manually for tests
        stateManager.subscribeToProperty('layoutData', () => {
            erViewerCore.renderER();
        });

        // Initialize state with NO DATA (empty ER data) - this is the bug condition
        stateManager.setState({
            erData: { entities: [], relationships: [] }, // Empty data
            layoutData: { entities: {}, rectangles: [], texts: [] }, // Empty layout
            viewport: { panX: 0, panY: 0, scale: 1 },
            interactionMode: 'default'
        });

        // Mock prompt for text input
        global.prompt.mockReset();
        global.alert.mockReset();

        // Reset console mocks
        console.log = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        eventController.removeEventListeners();
    });

    describe('Bug Reproduction: Elements not displaying with empty data', () => {
        test('should display text annotations after right-click addition when no ER data exists', () => {
            // Verify initial state has no data
            const initialState = stateManager.getState();
            expect(initialState.erData.entities).toHaveLength(0);
            expect(initialState.erData.relationships).toHaveLength(0);
            expect(initialState.layoutData.texts).toHaveLength(0);

            // Mock prompt to return text input
            global.prompt.mockReturnValue('Test Text');

            // Add text via right-click context menu
            const svgCoords = { x: 200, y: 150 };
            uiController.showContextMenu(300, 250, { svgX: svgCoords.x, svgY: svgCoords.y });

            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            
            const textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            expect(textOption).toBeTruthy();

            // Simulate clicking the text addition option
            textOption.click();

            // Verify text was added to state
            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(1);
            expect(currentState.layoutData.texts[0].content).toBe('Test Text');

            // BUG CHECK: Verify text appears on canvas
            // Text should be rendered and visible
            const textElements = canvas.querySelectorAll('.annotation-text');
            expect(textElements.length).toBeGreaterThan(0);

            // Verify layer was created
            const textLayers = layerManager.layers.filter(l => l.type === 'text');
            expect(textLayers).toHaveLength(1);
            expect(textLayers[0].name).toBe('テキスト "Test Text"');
        });

        test('should display rectangle annotations after right-click addition when no ER data exists', () => {
            // Verify initial state has no data
            const initialState = stateManager.getState();
            expect(initialState.erData.entities).toHaveLength(0);
            expect(initialState.erData.relationships).toHaveLength(0);
            expect(initialState.layoutData.rectangles).toHaveLength(0);

            // Add rectangle via right-click context menu
            const svgCoords = { x: 300, y: 200 };
            uiController.showContextMenu(400, 300, { svgX: svgCoords.x, svgY: svgCoords.y });

            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            
            const rectOption = Array.from(contextMenu.children).find(
                child => child.textContent === '矩形追加'
            );
            expect(rectOption).toBeTruthy();

            // Simulate clicking the rectangle addition option
            rectOption.click();

            // Verify rectangle was added to state
            const currentState = stateManager.getState();
            expect(currentState.layoutData.rectangles).toHaveLength(1);
            expect(currentState.layoutData.rectangles[0].x).toBe(svgCoords.x);
            expect(currentState.layoutData.rectangles[0].y).toBe(svgCoords.y);

            // BUG CHECK: Verify rectangle appears on canvas
            // Rectangle should be rendered and visible
            const rectElements = canvas.querySelectorAll('.annotation-rectangle');
            expect(rectElements.length).toBeGreaterThan(0);

            // Verify layer was created
            const rectLayers = layerManager.layers.filter(l => l.type === 'rectangle');
            expect(rectLayers).toHaveLength(1);
            expect(rectLayers[0].name).toContain('矩形');
        });

        test('should display multiple text and rectangle annotations when added sequentially', () => {
            // Add first text
            global.prompt.mockReturnValueOnce('First Text');
            uiController.showContextMenu(200, 150, { svgX: 100, svgY: 100 });
            let contextMenu = document.getElementById('context-menu');
            let textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            textOption.click();
            uiController.removeContextMenu();

            // Add first rectangle
            uiController.showContextMenu(300, 250, { svgX: 200, svgY: 200 });
            contextMenu = document.getElementById('context-menu');
            let rectOption = Array.from(contextMenu.children).find(
                child => child.textContent === '矩形追加'
            );
            rectOption.click();
            uiController.removeContextMenu();

            // Add second text
            global.prompt.mockReturnValueOnce('Second Text');
            uiController.showContextMenu(400, 350, { svgX: 300, svgY: 300 });
            contextMenu = document.getElementById('context-menu');
            textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            textOption.click();
            uiController.removeContextMenu();

            // Verify all elements were added to state
            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(2);
            expect(currentState.layoutData.rectangles).toHaveLength(1);

            // BUG CHECK: Verify all elements appear on canvas
            const textElements = canvas.querySelectorAll('.annotation-text');
            const rectElements = canvas.querySelectorAll('.annotation-rectangle');
            expect(textElements.length).toBe(2);
            expect(rectElements.length).toBe(1);

            // Verify layers were created for all elements
            const textLayers = layerManager.layers.filter(l => l.type === 'text');
            const rectLayers = layerManager.layers.filter(l => l.type === 'rectangle');
            expect(textLayers).toHaveLength(2);
            expect(rectLayers).toHaveLength(1);
        });

        test('should display annotations correctly when ER data is added after annotations', () => {
            // Start with empty data and add a text annotation
            global.prompt.mockReturnValue('Pre-existing Text');
            uiController.showContextMenu(200, 150, { svgX: 150, svgY: 150 });
            const contextMenu = document.getElementById('context-menu');
            const textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            textOption.click();

            // Now simulate loading ER data (use correct entity structure)
            const mockERData = {
                entities: [
                    {
                        name: 'users',
                        columns: [
                            { name: 'id', type: 'INT', key: 'PRI' },
                            { name: 'name', type: 'VARCHAR(100)' }
                        ],
                        foreignKeys: []
                    }
                ],
                relationships: []
            };

            stateManager.setState({
                erData: mockERData,
                layoutData: {
                    entities: { users: { x: 100, y: 100 } },
                    rectangles: [],
                    texts: stateManager.getState().layoutData.texts // Keep existing text
                }
            });
            
            // Manually trigger render after state change
            erViewerCore.renderER();

            // Verify both ER entities and annotations are in state
            const finalState = stateManager.getState();
            expect(finalState.erData.entities).toHaveLength(1);
            expect(finalState.layoutData.texts).toHaveLength(1);

            // BUG CHECK: Both ER diagram and annotations should be visible
            const entityElements = canvas.querySelectorAll('.entity');
            const textElements = canvas.querySelectorAll('.annotation-text');
            expect(entityElements.length).toBe(1);
            expect(textElements.length).toBe(1);
        });
    });

    describe('Canvas rendering verification with empty initial data', () => {
        test('should initialize canvas renderer properly with empty data', () => {
            // Verify canvas is initialized even with empty data
            expect(canvas).toBeTruthy();
            expect(canvas.id).toBe('er-canvas');

            // Verify state manager has empty but valid data structure
            const state = stateManager.getState();
            expect(state.erData).toBeDefined();
            expect(state.layoutData).toBeDefined();
            expect(Array.isArray(state.erData.entities)).toBe(true);
            expect(Array.isArray(state.erData.relationships)).toBe(true);
            expect(Array.isArray(state.layoutData.texts)).toBe(true);
            expect(Array.isArray(state.layoutData.rectangles)).toBe(true);
        });

        test('should handle coordinate transforms correctly with empty data', () => {
            // Test coordinate transformation works even with no entities
            const screenPoint = { x: 400, y: 300 };
            const svgPoint = coordinateTransform.screenToSVG(
                screenPoint.x, screenPoint.y, canvas, stateManager.get('viewport')
            );

            expect(svgPoint).toBeDefined();
            expect(typeof svgPoint.x).toBe('number');
            expect(typeof svgPoint.y).toBe('number');
        });
    });
});