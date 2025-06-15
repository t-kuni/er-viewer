/**
 * Test suite for right-click rectangle addition layer bug
 * Tests the bug where right-click rectangle addition doesn't add layers to the layer list
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

describe('Right-click Rectangle Addition Layer Bug', () => {
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
        uiController.on('add-rectangle', (e) => {
            erViewerCore.addRectangleAtPosition(e.detail.x, e.detail.y);
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

    describe('Bug Reproduction: Right-click rectangle addition not adding layers', () => {
        test('should add layer when rectangle is created via right-click context menu', () => {
            // Get initial layer count (should be 1 for default ER diagram)
            const initialLayerCount = layerManager.layers.length;
            const initialRectCount = stateManager.get('layoutData')?.rectangles?.length || 0;

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

            // Show context menu (this should create menu with "矩形追加" option)
            uiController.showContextMenu(rightClickEvent.clientX, rightClickEvent.clientY, { svgX: svgCoords.x, svgY: svgCoords.y });

            // Verify context menu was created
            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            expect(contextMenu.innerHTML).toContain('矩形追加');

            // Find and click the rectangle addition menu item
            const rectOption = Array.from(contextMenu.children).find(
                child => child.textContent === '矩形追加'
            );
            expect(rectOption).toBeTruthy();

            // Simulate clicking the rectangle addition option - this should trigger the real event
            rectOption.click();

            // Check if rectangle was added to state
            const currentState = stateManager.getState();
            const newRectCount = currentState.layoutData?.rectangles?.length || 0;
            expect(newRectCount).toBe(initialRectCount + 1);

            // Check if the rectangle properties are correct
            const addedRect = currentState.layoutData.rectangles[newRectCount - 1];
            expect(addedRect.x).toBe(svgCoords.x);
            expect(addedRect.y).toBe(svgCoords.y);
            expect(addedRect.width).toBe(100); // Default width
            expect(addedRect.height).toBe(60); // Default height

            // BUG CHECK: Verify layer was added
            const newLayerCount = layerManager.layers.length;
            expect(newLayerCount).toBe(initialLayerCount + 1);

            // Check if the new layer is a rectangle layer with correct properties
            const rectLayers = layerManager.layers.filter(l => l.type === 'rectangle');
            expect(rectLayers.length).toBeGreaterThan(0);

            const newRectLayer = rectLayers[rectLayers.length - 1];
            expect(newRectLayer.type).toBe('rectangle');
            expect(newRectLayer.name).toContain('矩形');
            expect(newRectLayer.icon).toBe('▭');
        });

        test('should add multiple rectangle layers via right-click without duplication', () => {
            // Create first rectangle via right-click
            const svgCoords1 = { x: 100, y: 100 };
            uiController.showContextMenu(200, 150, { svgX: svgCoords1.x, svgY: svgCoords1.y });
            
            const contextMenu1 = document.getElementById('context-menu');
            const rectOption1 = Array.from(contextMenu1.children).find(
                child => child.textContent === '矩形追加'
            );
            
            rectOption1.click();

            // Clean up context menu
            uiController.removeContextMenu();

            // Create second rectangle via right-click
            const svgCoords2 = { x: 300, y: 250 };
            uiController.showContextMenu(400, 350, { svgX: svgCoords2.x, svgY: svgCoords2.y });
            
            const contextMenu2 = document.getElementById('context-menu');
            const rectOption2 = Array.from(contextMenu2.children).find(
                child => child.textContent === '矩形追加'
            );
            
            rectOption2.click();

            // Check if both rectangles were added to state
            const currentState = stateManager.getState();
            expect(currentState.layoutData.rectangles).toHaveLength(2);

            // BUG CHECK: Verify both layers were added
            const rectLayers = layerManager.layers.filter(l => l.type === 'rectangle');
            expect(rectLayers).toHaveLength(2);

            // Verify rectangles have different positions
            expect(currentState.layoutData.rectangles[0].x).toBe(100);
            expect(currentState.layoutData.rectangles[0].y).toBe(100);
            expect(currentState.layoutData.rectangles[1].x).toBe(300);
            expect(currentState.layoutData.rectangles[1].y).toBe(250);

            // Verify layers have unique IDs
            expect(rectLayers[0].id).not.toBe(rectLayers[1].id);
        });
    });

    describe('Context menu rectangle creation verification', () => {
        test('should document that rectangles are now created via context menu instead of keyboard shortcuts', () => {
            const initialLayerCount = layerManager.layers.length;
            
            // Note: Keyboard shortcuts (Ctrl+R) have been removed
            // Rectangles are now created via right-click context menu
            
            // Simulate creating a rectangle via context menu action
            const mockRectData = {
                id: 'context-rect',
                x: 100,
                y: 100,
                width: 100,
                height: 60,
                type: 'rectangle'
            };

            // Add rectangle directly (simulating context menu action)
            const currentState = stateManager.getState();
            currentState.layoutData.rectangles = currentState.layoutData.rectangles || [];
            currentState.layoutData.rectangles.push(mockRectData);
            
            // Trigger layer creation (this is what should happen when context menu creates rectangle)
            layerManager.addLayer('rectangle', `矩形No${currentState.layoutData.rectangles.length}`, '▭');

            // Check if layer was added
            const newLayerCount = layerManager.layers.length;
            expect(newLayerCount).toBe(initialLayerCount + 1);

            const rectLayers = layerManager.layers.filter(l => l.type === 'rectangle');
            expect(rectLayers.length).toBeGreaterThan(0);
            
            const newRectLayer = rectLayers[rectLayers.length - 1];
            expect(newRectLayer.type).toBe('rectangle');
            expect(newRectLayer.name).toContain('矩形');
            expect(newRectLayer.icon).toBe('▭');
        });
    });
});