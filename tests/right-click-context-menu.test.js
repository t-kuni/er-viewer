/**
 * Test suite for right-click context menu functionality
 * Tests the new context menu features for adding rectangles and text
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
import { ERViewerCore } from '../public/js/core/er-viewer-core.js';

// Mock DOM environment
global.prompt = jest.fn();
global.alert = jest.fn();

// Mock console to reduce noise
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

describe('Right-click Context Menu', () => {
    let container, canvas, erViewerCore, uiController, stateManager;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="container">
                <svg id="canvas" width="800" height="600">
                    <g id="entities-group"></g>
                    <g id="relationships-group"></g>
                    <g id="annotations-group"></g>
                </svg>
            </div>
        `;

        container = document.getElementById('container');
        canvas = document.getElementById('canvas');

        // Initialize basic components (without ERViewerCore for now)
        stateManager = new StateManager();
        uiController = new UIController(stateManager);

        // Reset mocks
        global.prompt.mockClear();
        global.alert.mockClear();
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        
        // Remove any context menus
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.remove();
        }
    });

    describe('Canvas Background Context Menu', () => {
        test('should show context menu with rectangle and text options on canvas background', () => {
            // Show context menu for canvas background (no specific target)
            uiController.showContextMenu(100, 100, { svgX: 200, svgY: 150 });

            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            expect(contextMenu.innerHTML).toContain('矩形追加');
            expect(contextMenu.innerHTML).toContain('テキスト追加');
        });

        test('should emit add-rectangle event when rectangle option is clicked', () => {
            let emittedEvent = null;
            uiController.on('add-rectangle', (e) => {
                emittedEvent = e.detail;
            });

            uiController.showContextMenu(100, 100, { svgX: 200, svgY: 150 });

            const contextMenu = document.getElementById('context-menu');
            const rectangleOption = Array.from(contextMenu.children).find(
                child => child.textContent === '矩形追加'
            );
            
            expect(rectangleOption).toBeTruthy();
            rectangleOption.click();

            expect(emittedEvent).toBeTruthy();
            expect(emittedEvent.x).toBe(200);
            expect(emittedEvent.y).toBe(150);
        });

        test('should emit add-text event when text option is clicked', () => {
            let emittedEvent = null;
            uiController.on('add-text', (e) => {
                emittedEvent = e.detail;
            });

            uiController.showContextMenu(100, 100, { svgX: 300, svgY: 250 });

            const contextMenu = document.getElementById('context-menu');
            const textOption = Array.from(contextMenu.children).find(
                child => child.textContent === 'テキスト追加'
            );
            
            expect(textOption).toBeTruthy();
            textOption.click();

            expect(emittedEvent).toBeTruthy();
            expect(emittedEvent.x).toBe(300);
            expect(emittedEvent.y).toBe(250);
        });
    });

    describe('Annotation Context Menu', () => {
        test('should show annotation-specific context menu for rectangles', () => {
            const rectangleElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rectangleElement.classList.add('annotation-rectangle');

            uiController.showContextMenu(100, 100, { target: rectangleElement });

            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            expect(contextMenu.innerHTML).toContain('プロパティ編集');
            expect(contextMenu.innerHTML).toContain('削除');
            expect(contextMenu.innerHTML).not.toContain('矩形追加');
            expect(contextMenu.innerHTML).not.toContain('テキスト追加');
        });

        test('should show annotation-specific context menu for text', () => {
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.classList.add('annotation-text');

            uiController.showContextMenu(100, 100, { target: textElement });

            const contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();
            expect(contextMenu.innerHTML).toContain('プロパティ編集');
            expect(contextMenu.innerHTML).toContain('削除');
            expect(contextMenu.innerHTML).not.toContain('矩形追加');
            expect(contextMenu.innerHTML).not.toContain('テキスト追加');
        });
    });

    describe('State Management Integration', () => {
        test('should add rectangle to state when creating via context menu', () => {
            const initialState = stateManager.getState();
            const initialRectangles = initialState.layoutData?.annotations?.rectangles?.length || 0;

            // Simulate adding rectangle directly to state
            const currentState = stateManager.getState();
            const newLayoutData = { ...currentState.layoutData };
            
            if (!newLayoutData.annotations) {
                newLayoutData.annotations = { rectangles: [], texts: [] };
            }
            
            const newRect = {
                x: 300,
                y: 200,
                width: 100,
                height: 60,
                fill: '#e3f2fd',
                stroke: '#1976d2',
                strokeWidth: 2
            };
            
            newLayoutData.annotations.rectangles.push(newRect);
            stateManager.updateLayoutData(newLayoutData);

            const newState = stateManager.getState();
            const newRectangles = newState.layoutData?.annotations?.rectangles?.length || 0;
            
            expect(newRectangles).toBe(initialRectangles + 1);
            
            const addedRectangle = newState.layoutData.annotations.rectangles[newRectangles - 1];
            expect(addedRectangle.x).toBe(300);
            expect(addedRectangle.y).toBe(200);
            expect(addedRectangle.width).toBe(100);
            expect(addedRectangle.height).toBe(60);
        });

        test('should add text to state when creating via context menu', () => {
            const initialState = stateManager.getState();
            const initialTexts = initialState.layoutData?.annotations?.texts?.length || 0;

            // Simulate adding text directly to state
            const currentState = stateManager.getState();
            const newLayoutData = { ...currentState.layoutData };
            
            if (!newLayoutData.annotations) {
                newLayoutData.annotations = { rectangles: [], texts: [] };
            }
            
            const newText = {
                x: 400,
                y: 300,
                text: 'Test context menu text',
                fontSize: 14,
                fill: '#333333',
                fontFamily: 'Arial, sans-serif'
            };
            
            newLayoutData.annotations.texts.push(newText);
            stateManager.updateLayoutData(newLayoutData);

            const newState = stateManager.getState();
            const newTexts = newState.layoutData?.annotations?.texts?.length || 0;
            
            expect(newTexts).toBe(initialTexts + 1);
            
            const addedText = newState.layoutData.annotations.texts[newTexts - 1];
            expect(addedText.x).toBe(400);
            expect(addedText.y).toBe(300);
            expect(addedText.text).toBe('Test context menu text');
        });
    });

    describe('Context Menu Behavior', () => {
        test('should remove context menu when removeContextMenu is called', () => {
            uiController.showContextMenu(100, 100, { svgX: 200, svgY: 150 });

            let contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeTruthy();

            uiController.removeContextMenu();

            contextMenu = document.getElementById('context-menu');
            expect(contextMenu).toBeFalsy();
        });

        test('should remove existing context menu before showing new one', () => {
            // Show first context menu
            uiController.showContextMenu(100, 100, { svgX: 200, svgY: 150 });
            const firstMenu = document.getElementById('context-menu');
            expect(firstMenu).toBeTruthy();

            // Show second context menu
            uiController.showContextMenu(200, 200, { svgX: 300, svgY: 250 });
            
            // Should only have one context menu
            const contextMenus = document.querySelectorAll('#context-menu');
            expect(contextMenus.length).toBe(1);
            
            const currentMenu = document.getElementById('context-menu');
            expect(currentMenu.style.left).toBe('200px');
            expect(currentMenu.style.top).toBe('200px');
        });
    });
});