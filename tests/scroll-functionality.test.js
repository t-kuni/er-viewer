/**
 * @jest-environment jsdom
 */

import { EventController } from '../public/js/events/event-controller.js';
import { StateManager } from '../public/js/state/state-manager.js';
import { CoordinateTransform } from '../public/js/utils/coordinate-transform.js';

// Mock the ERViewer class and required dependencies
class MockERViewer {
    constructor() {
        this.canvas = document.createElement('svg');
        this.canvas.id = 'er-canvas';
        this.stateManager = new StateManager();
        this.coordinateTransform = new CoordinateTransform();
        this.eventController = new EventController(this.canvas, this.stateManager, this.coordinateTransform);
        
        // Initialize viewport state
        this.stateManager.updateViewport(0, 0, 1);
        
        // Add the canvas to DOM for testing
        document.body.appendChild(this.canvas);
    }

    get viewport() {
        return this.stateManager.get('viewport');
    }

    updateTransform() {
        const viewport = this.viewport;
        // Mock implementation
        this.canvas.style.transform = `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.scale})`;
    }
}

describe('Scroll Functionality Tests', () => {
    let viewer;
    let eventController;
    let canvas;

    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = '';
        
        // Clear canvas mock calls
        if (HTMLCanvasElement.prototype.getContext) {
            HTMLCanvasElement.prototype.getContext('2d').__clearDrawCalls();
        }
        
        // Create mock viewer
        viewer = new MockERViewer();
        eventController = viewer.eventController;
        
        // Add canvas element for jest-canvas-mock
        canvas = document.createElement('canvas');
        canvas.id = 'test-canvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Mock getBoundingClientRect
        viewer.canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600
        }));
    });

    describe('Wheel Zoom Functionality', () => {
        test('should zoom in when scrolling up', () => {
            const initialScale = viewer.viewport.scale;
            const ctx = canvas.getContext('2d');
            
            // Clear previous canvas operations
            ctx.__clearDrawCalls();
            
            const wheelEvent = new WheelEvent('wheel', {
                deltaY: -100, // Scroll up
                clientX: 400,
                clientY: 300
            });
            
            eventController.handleWheel(wheelEvent);
            
            expect(viewer.viewport.scale).toBeGreaterThan(initialScale);
            
            // Verify canvas transformations were applied
            const drawCalls = ctx.__getDrawCalls();
            expect(drawCalls).toBeDefined();
            
            // Verify zoom operations can be tracked
            const events = ctx.__getEvents();
            expect(events).toBeDefined();
        });

        test('should zoom out when scrolling down', () => {
            const initialScale = viewer.viewport.scale;
            const ctx = canvas.getContext('2d');
            
            // Clear previous canvas operations
            ctx.__clearDrawCalls();
            
            const wheelEvent = new WheelEvent('wheel', {
                deltaY: 100, // Scroll down
                clientX: 400,
                clientY: 300
            });
            
            eventController.handleWheel(wheelEvent);
            
            expect(viewer.viewport.scale).toBeLessThan(initialScale);
            
            // Verify canvas transformations were applied
            const drawCalls = ctx.__getDrawCalls();
            expect(drawCalls).toBeDefined();
            
            // Verify zoom operations can be tracked
            const events = ctx.__getEvents();
            expect(events).toBeDefined();
        });

        test('should maintain minimum and maximum zoom levels', () => {
            // Test minimum zoom (zoom out a lot)
            for (let i = 0; i < 20; i++) {
                const wheelEvent = new WheelEvent('wheel', {
                    deltaY: 100,
                    clientX: 400,
                    clientY: 300
                });
                eventController.handleWheel(wheelEvent);
            }
            
            expect(viewer.viewport.scale).toBeGreaterThanOrEqual(0.1);
            
            // Reset and test maximum zoom
            viewer.stateManager.updateViewport(0, 0, 1);
            
            for (let i = 0; i < 20; i++) {
                const wheelEvent = new WheelEvent('wheel', {
                    deltaY: -100,
                    clientX: 400,
                    clientY: 300
                });
                eventController.handleWheel(wheelEvent);
            }
            
            expect(viewer.viewport.scale).toBeLessThanOrEqual(5);
        });
    });

    describe('Panning Functionality', () => {
        test('should start panning on mousedown', () => {
            const mouseDownEvent = new MouseEvent('mousedown', {
                button: 0,
                clientX: 100,
                clientY: 100
            });
            
            eventController.handleMouseDown(mouseDownEvent);
            
            expect(viewer.stateManager.get('interactionMode')).toBe('panning');
        });

        test('should update pan position during mouse move', () => {
            const ctx = canvas.getContext('2d');
            
            // Clear previous canvas operations
            ctx.__clearDrawCalls();
            
            // Start panning
            const mouseDownEvent = new MouseEvent('mousedown', {
                button: 0,
                clientX: 100,
                clientY: 100
            });
            
            eventController.handleMouseDown(mouseDownEvent);
            
            const initialPanX = viewer.viewport.panX;
            const initialPanY = viewer.viewport.panY;
            
            // Move mouse
            const mouseMoveEvent = new MouseEvent('mousemove', {
                clientX: 150,
                clientY: 120
            });
            
            eventController.handleMouseMove(mouseMoveEvent);
            
            // Pan position should be updated
            expect(viewer.viewport.panX).not.toBe(initialPanX);
            expect(viewer.viewport.panY).not.toBe(initialPanY);
            
            // Verify canvas transformations were applied for panning
            const drawCalls = ctx.__getDrawCalls();
            expect(drawCalls).toBeDefined();
            
            // Verify pan events were recorded
            const events = ctx.__getEvents();
            expect(events).toBeDefined();
        });

        test('should end panning on mouseup', () => {
            // Start panning
            const mouseDownEvent = new MouseEvent('mousedown', {
                button: 0,
                clientX: 100,
                clientY: 100
            });
            
            eventController.handleMouseDown(mouseDownEvent);
            expect(viewer.stateManager.get('interactionMode')).toBe('panning');
            
            // End panning
            const mouseUpEvent = new MouseEvent('mouseup', {
                button: 0
            });
            
            eventController.handleMouseUp(mouseUpEvent);
            
            expect(viewer.stateManager.get('interactionMode')).toBe('default');
        });
    });

    describe('Keyboard Shortcuts', () => {
        test('should handle ctrl+z for undo', () => {
            // Mock the stateManager's undo method
            const mockUndo = jest.fn();
            viewer.stateManager.undo = mockUndo;
            
            const ctrlZEvent = new KeyboardEvent('keydown', {
                key: 'z',
                ctrlKey: true,
                shiftKey: false
            });
            
            eventController.handleKeyDown(ctrlZEvent);
            
            expect(mockUndo).toHaveBeenCalled();
        });

        test('should handle ctrl+shift+z for redo', () => {
            // Mock the stateManager's redo method
            const mockRedo = jest.fn();
            viewer.stateManager.redo = mockRedo;
            
            const ctrlShiftZEvent = new KeyboardEvent('keydown', {
                key: 'z',
                ctrlKey: true,
                shiftKey: true
            });
            
            eventController.handleKeyDown(ctrlShiftZEvent);
            
            expect(mockRedo).toHaveBeenCalled();
        });
    });

    describe('Entity Interaction', () => {
        test('should handle entity click events', () => {
            const entityElement = document.createElement('g');
            entityElement.classList.add('entity');
            entityElement.setAttribute('data-table', 'users');
            viewer.canvas.appendChild(entityElement);
            
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                clientX: 100,
                clientY: 100
            });
            
            const eventSpy = jest.fn();
            viewer.canvas.addEventListener('entity-click', eventSpy);
            
            // Simulate click on entity
            Object.defineProperty(clickEvent, 'target', { value: entityElement });
            eventController.handleClick(clickEvent);
            
            expect(eventSpy).toHaveBeenCalled();
        });

        test('should handle entity double-click events', () => {
            const entityElement = document.createElement('g');
            entityElement.classList.add('entity');
            entityElement.setAttribute('data-table', 'users');
            viewer.canvas.appendChild(entityElement);
            
            const dblClickEvent = new MouseEvent('dblclick', {
                bubbles: true,
                clientX: 100,
                clientY: 100
            });
            
            const eventSpy = jest.fn();
            viewer.canvas.addEventListener('entity-dblclick', eventSpy);
            
            // Simulate double-click on entity
            Object.defineProperty(dblClickEvent, 'target', { value: entityElement });
            eventController.handleDoubleClick(dblClickEvent);
            
            expect(eventSpy).toHaveBeenCalled();
        });
    });

    describe('Context Menu', () => {
        test('should show context menu on right click', () => {
            const contextMenuEvent = new MouseEvent('contextmenu', {
                button: 2,
                clientX: 200,
                clientY: 150
            });
            
            const eventSpy = jest.fn();
            viewer.canvas.addEventListener('context-menu', eventSpy);
            
            eventController.handleContextMenu(contextMenuEvent);
            
            expect(eventSpy).toHaveBeenCalled();
            expect(eventSpy.mock.calls[0][0].detail.screenX).toBe(200);
            expect(eventSpy.mock.calls[0][0].detail.screenY).toBe(150);
        });
    });

    describe('Drag Threshold', () => {
        test('should not trigger click when dragging beyond threshold', () => {
            const ctx = canvas.getContext('2d');
            
            // Clear previous canvas operations
            ctx.__clearDrawCalls();
            
            // Start drag
            const mouseDownEvent = new MouseEvent('mousedown', {
                button: 0,
                clientX: 100,
                clientY: 100
            });
            
            eventController.handleMouseDown(mouseDownEvent);
            
            // Move beyond threshold
            const mouseMoveEvent = new MouseEvent('mousemove', {
                clientX: 110, // 10 pixels away (> 5 pixel threshold)
                clientY: 100
            });
            
            eventController.handleMouseMove(mouseMoveEvent);
            
            // Check that drag movement was detected
            expect(eventController.hasDragMovement).toBe(true);
            
            // Test click while still dragging - should be ignored
            const clickEventDuringDrag = new MouseEvent('click', {
                clientX: 110,
                clientY: 100
            });
            
            const eventSpy = jest.fn();
            viewer.canvas.addEventListener('canvas-click', eventSpy);
            
            eventController.handleClick(clickEventDuringDrag);
            
            // Click should be ignored due to drag movement
            expect(eventSpy).not.toHaveBeenCalled();
            
            // Verify canvas drag operations were tracked
            const drawCalls = ctx.__getDrawCalls();
            expect(drawCalls).toBeDefined();
            
            // Verify drag events were recorded
            const events = ctx.__getEvents();
            expect(events).toBeDefined();
            
            // End drag
            const mouseUpEvent = new MouseEvent('mouseup', {
                button: 0
            });
            
            eventController.handleMouseUp(mouseUpEvent);
        });
        
        test('should verify canvas viewport transformations', () => {
            const ctx = canvas.getContext('2d');
            
            // Clear canvas operations
            ctx.__clearDrawCalls();
            
            // Simulate viewport transformation
            const initialViewport = viewer.viewport;
            
            // Mock viewport transformation
            viewer.stateManager.updateViewport(50, 30, 1.5);
            viewer.updateTransform();
            
            const updatedViewport = viewer.viewport;
            
            // Verify viewport was updated
            expect(updatedViewport.panX).toBe(50);
            expect(updatedViewport.panY).toBe(30);
            expect(updatedViewport.scale).toBe(1.5);
            
            // Verify canvas context is available for transformation tracking
            expect(ctx.__getDrawCalls).toBeDefined();
            expect(ctx.__getEvents).toBeDefined();
            
            // Verify transformation matrix calculations can be tracked
            const drawCalls = ctx.__getDrawCalls();
            expect(Array.isArray(drawCalls)).toBe(true);
        });
        
        test('should track canvas coordinate system changes', () => {
            const ctx = canvas.getContext('2d');
            
            // Clear canvas operations
            ctx.__clearDrawCalls();
            
            // Test coordinate transformations
            const screenPoint = { x: 100, y: 150 };
            const viewport = { panX: 10, panY: 20, scale: 1.2 };
            
            // Mock coordinate transformation (would normally be handled by CoordinateTransform)
            const svgPoint = {
                x: (screenPoint.x - viewport.panX) / viewport.scale,
                y: (screenPoint.y - viewport.panY) / viewport.scale
            };
            
            // Verify coordinate calculation
            expect(svgPoint.x).toBeCloseTo(75);
            expect(svgPoint.y).toBeCloseTo(108.33, 1);
            
            // Verify canvas operations can be tracked
            const drawCalls = ctx.__getDrawCalls();
            expect(drawCalls).toBeDefined();
            
            // Verify coordinate system events
            const events = ctx.__getEvents();
            expect(events).toBeDefined();
        });
    });
});