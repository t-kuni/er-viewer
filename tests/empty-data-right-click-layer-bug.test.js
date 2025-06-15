/**
 * Test suite for right-click layer addition bug in empty data state
 * Tests the specific bug where right-click text/rectangle addition doesn't add layers 
 * to the layer list when ER data is empty/non-existent
 */

import 'jest-canvas-mock';

// Import required modules
import { EventController } from '../public/js/events/event-controller.js';
import { StateManager } from '../public/js/state/state-manager.js';
import { CoordinateTransform } from '../public/js/utils/coordinate-transform.js';
import { HighlightManager } from '../public/js/highlighting/highlight-manager.js';
import { UIController } from '../public/js/ui/ui-controller.js';
import { ERViewerCore } from '../public/js/core/er-viewer-core.js';
import LayerManager from '../public/js/layer-manager.js';

// Mock DOM environment
global.prompt = jest.fn();
global.alert = jest.fn();

describe('Empty Data Right-click Layer Addition Bug', () => {
    let canvas, stateManager, coordinateTransform, highlightManager, eventController, uiController, layerManager, erViewerCore;

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
        eventController = new EventController(canvas, stateManager, coordinateTransform, highlightManager, layerManager);
        uiController = new UIController(stateManager);
        erViewerCore = new ERViewerCore();

        // Initialize ERViewerCore with components
        erViewerCore.stateManager = stateManager;
        erViewerCore.layerManager = layerManager;
        erViewerCore.uiController = uiController;
        erViewerCore.eventController = eventController;

        // Mock UIController event system
        uiController._actualHandlers = {};
        uiController.on = jest.fn((event, handler) => {
            uiController._actualHandlers[event] = handler;
        });
        uiController.emit = jest.fn((eventName, data) => {
            const handler = uiController._actualHandlers[eventName];
            if (handler) {
                handler({ detail: data });
            }
        });
        
        // Set up ERViewerCore event subscriptions
        uiController.on('add-text', (e) => {
            erViewerCore.addTextAtPosition(e.detail.x, e.detail.y);
        });
        uiController.on('add-rectangle', (e) => {
            erViewerCore.addRectangleAtPosition(e.detail.x, e.detail.y);
        });

        // Initialize state with EMPTY ER data (simulating no data loaded scenario)
        stateManager.setState({
            erData: null, // This is the key difference - no ER data exists
            layoutData: { entities: {}, rectangles: [], texts: [] },
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

    describe('Bug Reproduction: Layer addition in empty data state', () => {
        test('should add text layer to layer list when no ER data exists', () => {
            // Verify we start with empty ER data and only default layer (ER図)
            const initialState = stateManager.getState();
            expect(initialState.erData).toBeNull();
            expect(layerManager.layers.length).toBe(1); // Default ER diagram layer
            expect(layerManager.layers[0].type).toBe('er-diagram');

            // Mock prompt to return text input
            global.prompt.mockReturnValue('Test Text in Empty State');

            // Simulate right-click to show context menu
            const svgCoords = { x: 200, y: 150 };
            uiController.showContextMenu(300, 250, { svgX: svgCoords.x, svgY: svgCoords.y });

            // Verify context menu was created
            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            expect(contextMenu.innerHTML).toContain('テキスト追加');

            // Find and click the text addition menu item
            const textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            expect(textOption).toBeTruthy();

            // Simulate clicking the text addition option
            textOption.click();

            // Verify text was added to layoutData
            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(1);
            expect(currentState.layoutData.texts[0].content).toBe('Test Text in Empty State');

            // BUG CHECK: Verify layer was added to layer list even with empty ER data
            expect(layerManager.layers.length).toBe(2); // Default ER layer + new text layer
            
            const textLayers = layerManager.layers.filter(l => l.type === 'text');
            expect(textLayers.length).toBe(1);
            expect(textLayers[0].name).toBe('テキスト "Test Text in Empty State"');
            expect(textLayers[0].icon).toBe('📝');

            // Verify layer list DOM is updated
            const layerListElement = document.getElementById('layer-list');
            expect(layerListElement.children.length).toBe(2); // Default ER layer + new text layer
        });

        test('should add rectangle layer to layer list when no ER data exists', () => {
            // Verify we start with empty ER data and only default layer (ER図)
            const initialState = stateManager.getState();
            expect(initialState.erData).toBeNull();
            expect(layerManager.layers.length).toBe(1); // Default ER diagram layer
            expect(layerManager.layers[0].type).toBe('er-diagram');

            // Simulate right-click to show context menu
            const svgCoords = { x: 300, y: 200 };
            uiController.showContextMenu(400, 300, { svgX: svgCoords.x, svgY: svgCoords.y });

            // Verify context menu was created
            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            expect(contextMenu.innerHTML).toContain('矩形追加');

            // Find and click the rectangle addition menu item
            const rectOption = Array.from(contextMenu.children).find(
                child => child.textContent === '矩形追加'
            );
            expect(rectOption).toBeTruthy();

            // Simulate clicking the rectangle addition option
            rectOption.click();

            // Verify rectangle was added to layoutData
            const currentState = stateManager.getState();
            expect(currentState.layoutData.rectangles).toHaveLength(1);
            expect(currentState.layoutData.rectangles[0].x).toBe(svgCoords.x);
            expect(currentState.layoutData.rectangles[0].y).toBe(svgCoords.y);

            // BUG CHECK: Verify layer was added to layer list even with empty ER data
            expect(layerManager.layers.length).toBe(2); // Default ER layer + new rectangle layer
            
            const rectLayers = layerManager.layers.filter(l => l.type === 'rectangle');
            expect(rectLayers.length).toBe(1);
            expect(rectLayers[0].name).toContain('矩形');
            expect(rectLayers[0].icon).toBe('▭');

            // Verify layer list DOM is updated
            const layerListElement = document.getElementById('layer-list');
            expect(layerListElement.children.length).toBe(2); // Default ER layer + new rectangle layer
        });

        test('should add multiple layers in sequence when no ER data exists', () => {
            // Verify we start with empty ER data
            const initialState = stateManager.getState();
            expect(initialState.erData).toBeNull();
            expect(layerManager.layers.length).toBe(1); // Default ER diagram layer

            // Add first text
            global.prompt.mockReturnValueOnce('First Text');
            uiController.showContextMenu(200, 150, { svgX: 100, svgY: 100 });
            
            let contextMenu = document.getElementById('context-menu');
            let textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            textOption.click();
            uiController.removeContextMenu();

            // Add rectangle
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

            // Verify all items were added to layoutData
            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(2);
            expect(currentState.layoutData.rectangles).toHaveLength(1);

            // BUG CHECK: Verify all layers were added to layer list
            expect(layerManager.layers.length).toBe(4); // Default ER layer + 2 text + 1 rectangle
            
            const textLayers = layerManager.layers.filter(l => l.type === 'text');
            const rectLayers = layerManager.layers.filter(l => l.type === 'rectangle');
            expect(textLayers.length).toBe(2);
            expect(rectLayers.length).toBe(1);

            // Verify layer list DOM shows all layers
            const layerListElement = document.getElementById('layer-list');
            expect(layerListElement.children.length).toBe(4); // Default ER layer + 2 text + 1 rectangle
        });

        test('should maintain layer list consistency after adding layers to empty state', () => {
            // Start with empty state
            expect(stateManager.getState().erData).toBeNull();
            expect(layerManager.layers.length).toBe(1); // Default ER diagram layer

            // Add text via right-click
            global.prompt.mockReturnValue('Consistency Test Text');
            uiController.showContextMenu(200, 150, { svgX: 150, svgY: 150 });
            
            const contextMenu = document.getElementById('context-menu');
            const textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            textOption.click();

            // Verify initial consistency
            expect(layerManager.layers.length).toBe(2); // Default ER layer + new text layer
            expect(stateManager.getState().layoutData.texts.length).toBe(1);

            // Verify layer properties match data
            const textLayer = layerManager.layers[1]; // Second layer (after default ER layer)
            const textData = stateManager.getState().layoutData.texts[0];
            
            expect(textLayer.type).toBe('text');
            expect(textLayer.name).toBe(`テキスト "${textData.content}"`);
            expect(textData.content).toBe('Consistency Test Text');

            // Verify DOM reflects the layer
            const layerListElement = document.getElementById('layer-list');
            expect(layerListElement.children.length).toBe(2);
            expect(layerListElement.children[1].textContent).toContain('テキスト "Consistency Test Text"');
        });
    });

    describe('Edge cases in empty data state', () => {
        test('should handle cancelled text input in empty data state', () => {
            // Mock prompt to return null (cancelled)
            global.prompt.mockReturnValue(null);

            expect(layerManager.layers.length).toBe(1); // Only default ER layer

            uiController.showContextMenu(200, 150, { svgX: 200, svgY: 150 });
            
            const contextMenu = document.getElementById('context-menu');
            const textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            textOption.click();

            // Verify nothing was added
            expect(stateManager.getState().layoutData.texts.length).toBe(0);
            expect(layerManager.layers.length).toBe(1); // Only default ER layer remains
        });

        test('should handle empty text input in empty data state', () => {
            // Mock prompt to return empty string
            global.prompt.mockReturnValue('');

            expect(layerManager.layers.length).toBe(1); // Only default ER layer

            uiController.showContextMenu(200, 150, { svgX: 200, svgY: 150 });
            
            const contextMenu = document.getElementById('context-menu');
            const textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            textOption.click();

            // Verify nothing was added for empty text
            expect(stateManager.getState().layoutData.texts.length).toBe(0);
            expect(layerManager.layers.length).toBe(1); // Only default ER layer remains
        });
    });
});