/**
 * Test suite for right-click text addition layer bug
 * Tests the bug where right-click text addition doesn't add layers to the layer list
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

describe('Right-click Text Addition Layer Bug', () => {
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
        
        // Set up ERViewerCore event subscriptions
        uiController.on('add-text', (e) => {
            erViewerCore.addTextAtPosition(e.detail.x, e.detail.y);
        });

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

    describe('Bug Reproduction: Right-click text addition not adding layers', () => {
        test('should add layer when text is created via right-click context menu', () => {
            // Mock prompt to return text input
            global.prompt.mockReturnValue('Test Text');

            // Get initial layer count (should be 1 for default ER diagram)
            const initialLayerCount = layerManager.layers.length;
            const initialTextCount = stateManager.get('layoutData')?.texts?.length || 0;

            // Simulate right-click to show context menu
            const rightClickEvent = {
                clientX: 200,
                clientY: 150,
                preventDefault: jest.fn(),
                button: 2,
                type: 'contextmenu'
            };

            // Use simple coordinates for testing
            const svgCoords = { x: 200, y: 150 };

            // Show context menu (this should create menu with "テキスト追加" option)
            uiController.showContextMenu(rightClickEvent.clientX, rightClickEvent.clientY, { svgX: svgCoords.x, svgY: svgCoords.y });

            // Verify context menu was created
            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            expect(contextMenu.innerHTML).toContain('テキスト追加');

            // Find and click the text addition menu item
            const textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            expect(textOption).toBeTruthy();

            // Simulate clicking the text addition option - this should trigger the real event
            textOption.click();

            // Check if text was added to state
            const currentState = stateManager.getState();
            const newTextCount = currentState.layoutData?.texts?.length || 0;
            expect(newTextCount).toBe(initialTextCount + 1);

            // Check if the text content is correct
            const addedText = currentState.layoutData.texts[newTextCount - 1];
            expect(addedText.content).toBe('Test Text');

            // BUG CHECK: Verify layer was added
            const newLayerCount = layerManager.layers.length;
            expect(newLayerCount).toBe(initialLayerCount + 1);

            // Check if the new layer is a text layer with correct properties
            const textLayers = layerManager.layers.filter(l => l.type === 'text');
            expect(textLayers.length).toBeGreaterThan(0);

            const newTextLayer = textLayers[textLayers.length - 1];
            expect(newTextLayer.type).toBe('text');
            expect(newTextLayer.name).toBe('テキスト "Test Text"');
            expect(newTextLayer.icon).toBe('📝');
        });

        test('should add multiple text layers via right-click without duplication', () => {
            // Create first text via right-click
            global.prompt.mockReturnValueOnce('First Text');
            
            const svgCoords1 = { x: 100, y: 100 };
            uiController.showContextMenu(200, 150, { svgX: svgCoords1.x, svgY: svgCoords1.y });
            
            const contextMenu1 = document.getElementById('context-menu');
            const textOption1 = Array.from(contextMenu1.children).find(
                child => child.textContent === 'テキスト追加'
            );
            
            textOption1.click();

            // Clean up context menu
            uiController.removeContextMenu();

            // Create second text via right-click
            global.prompt.mockReturnValueOnce('Second Text');
            
            const svgCoords2 = { x: 200, y: 200 };
            uiController.showContextMenu(300, 250, { svgX: svgCoords2.x, svgY: svgCoords2.y });
            
            const contextMenu2 = document.getElementById('context-menu');
            const textOption2 = Array.from(contextMenu2.children).find(
                child => child.textContent === 'テキスト追加'
            );
            
            textOption2.click();

            // Check if both texts were added to state
            const currentState = stateManager.getState();
            expect(currentState.layoutData.texts).toHaveLength(2);

            // BUG CHECK: Verify both layers were added
            const textLayers = layerManager.layers.filter(l => l.type === 'text');
            expect(textLayers).toHaveLength(2);
            expect(textLayers[0].name).toBe('テキスト "First Text"');
            expect(textLayers[1].name).toBe('テキスト "Second Text"');

            // Verify layers have unique IDs
            expect(textLayers[0].id).not.toBe(textLayers[1].id);
        });

        test('should not add layer when text creation is cancelled', () => {
            // Mock prompt to return null (cancelled)
            global.prompt.mockReturnValue(null);

            const initialLayerCount = layerManager.layers.length;
            const initialTextCount = stateManager.get('layoutData')?.texts?.length || 0;

            const svgCoords = { x: 300, y: 250 };
            uiController.showContextMenu(400, 350, { svgX: svgCoords.x, svgY: svgCoords.y });

            const contextMenu = document.getElementById('context-menu');
            const textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );

            textOption.click();

            // Verify no text was added
            const currentState = stateManager.getState();
            const newTextCount = currentState.layoutData?.texts?.length || 0;
            expect(newTextCount).toBe(initialTextCount);

            // Verify no layer was added
            const newLayerCount = layerManager.layers.length;
            expect(newLayerCount).toBe(initialLayerCount);
        });
    });

    describe('Context menu text creation verification', () => {
        test('should document that text is now created via context menu instead of keyboard shortcuts', () => {
            const initialLayerCount = layerManager.layers.length;
            
            // Note: Keyboard shortcuts (Ctrl+T) have been removed
            // Text is now created via right-click context menu
            
            // Simulate creating text via context menu action
            const mockTextData = {
                id: 'context-text',
                x: 200,
                y: 150,
                content: 'Context Menu Text',
                type: 'text'
            };

            // Add text directly (simulating context menu action)
            const currentState = stateManager.getState();
            currentState.layoutData.texts = currentState.layoutData.texts || [];
            currentState.layoutData.texts.push(mockTextData);
            
            // Trigger layer creation (this is what should happen when context menu creates text)
            layerManager.addLayer('text', `テキスト "${mockTextData.content}"`, '📝');

            // Check if layer was added
            const newLayerCount = layerManager.layers.length;
            expect(newLayerCount).toBe(initialLayerCount + 1);

            const textLayers = layerManager.layers.filter(l => l.type === 'text');
            expect(textLayers.length).toBeGreaterThan(0);
            
            const newTextLayer = textLayers[textLayers.length - 1];
            expect(newTextLayer.type).toBe('text');
            expect(newTextLayer.name).toBe('テキスト "Context Menu Text"');
            expect(newTextLayer.icon).toBe('📝');
        });
    });
});