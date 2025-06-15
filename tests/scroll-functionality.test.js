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

    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = '';
        
        // Create mock viewer
        viewer = new MockERViewer();
        eventController = viewer.eventController;
        
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
            
            const wheelEvent = new WheelEvent('wheel', {
                deltaY: -100, // Scroll up
                clientX: 400,
                clientY: 300
            });
            
            eventController.handleWheel(wheelEvent);
            
            expect(viewer.viewport.scale).toBeGreaterThan(initialScale);
        });

        test('should zoom out when scrolling down', () => {
            const initialScale = viewer.viewport.scale;
            
            const wheelEvent = new WheelEvent('wheel', {
                deltaY: 100, // Scroll down
                clientX: 400,
                clientY: 300
            });
            
            eventController.handleWheel(wheelEvent);
            
            expect(viewer.viewport.scale).toBeLessThan(initialScale);
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
        test('should handle escape key to reset interaction mode', () => {
            // Set some interaction mode
            viewer.stateManager.setInteractionMode('creating-rectangle');
            
            const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape'
            });
            
            eventController.handleKeyDown(escapeEvent);
            
            expect(viewer.stateManager.get('interactionMode')).toBe('default');
        });

        test('should handle ctrl+z for undo', () => {
            const undoSpy = jest.spyOn(viewer.stateManager, 'undo');
            
            const ctrlZEvent = new KeyboardEvent('keydown', {
                key: 'z',
                ctrlKey: true
            });
            
            eventController.handleKeyDown(ctrlZEvent);
            
            expect(undoSpy).toHaveBeenCalled();
        });

        test('should handle ctrl+shift+z for redo', () => {
            const redoSpy = jest.spyOn(viewer.stateManager, 'redo');
            
            const ctrlShiftZEvent = new KeyboardEvent('keydown', {
                key: 'z',
                ctrlKey: true,
                shiftKey: true
            });
            
            eventController.handleKeyDown(ctrlShiftZEvent);
            
            expect(redoSpy).toHaveBeenCalled();
        });

        test('should handle ctrl+r for rectangle creation mode', () => {
            const ctrlREvent = new KeyboardEvent('keydown', {
                key: 'r',
                ctrlKey: true
            });
            
            eventController.handleKeyDown(ctrlREvent);
            
            expect(viewer.stateManager.get('interactionMode')).toBe('creating-rectangle');
        });

        test('should handle ctrl+t for text creation mode', () => {
            const ctrlTEvent = new KeyboardEvent('keydown', {
                key: 't',
                ctrlKey: true
            });
            
            eventController.handleKeyDown(ctrlTEvent);
            
            expect(viewer.stateManager.get('interactionMode')).toBe('creating-text');
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
            
            // End drag
            const mouseUpEvent = new MouseEvent('mouseup', {
                button: 0
            });
            
            eventController.handleMouseUp(mouseUpEvent);
        });
    });
});