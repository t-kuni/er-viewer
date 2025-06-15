/**
 * @jest-environment jsdom
 */

import { EventController } from '../public/js/events/event-controller.js';
import { HighlightManager } from '../public/js/highlighting/highlight-manager.js';

// Mock StateManager
const mockStateManager = {
    getState: jest.fn(() => ({
        interactionMode: 'default',
        viewport: { panX: 0, panY: 0, scale: 1 }
    })),
    get: jest.fn((key) => {
        if (key === 'viewport') return { panX: 0, panY: 0, scale: 1 };
        return null;
    }),
    setInteractionMode: jest.fn(),
    updateViewport: jest.fn(),
    setState: jest.fn()
};

// Mock CoordinateTransform
const mockCoordinateTransform = {
    screenToSVG: jest.fn(() => ({ x: 100, y: 100 })),
    distance: jest.fn(() => 10),
    updateViewport: jest.fn(),
    applyTransform: jest.fn()
};

describe('Event Controller Integration Tests', () => {
    let eventController;
    let highlightManager;
    let mockCanvas;

    beforeEach(() => {
        // Set up DOM mock
        document.body.innerHTML = `
            <div id="test-container">
                <svg id="er-canvas" width="800" height="600">
                    <g class="entity" data-table="users">
                        <rect width="150" height="100"></rect>
                        <g class="entity-column" data-column="id"></g>
                        <g class="entity-column" data-column="name"></g>
                    </g>
                    <g class="entity" data-table="orders">
                        <rect width="150" height="100"></rect>
                        <g class="entity-column" data-column="id"></g>
                        <g class="entity-column" data-column="user_id"></g>
                    </g>
                    <path class="relationship" 
                          data-from="users" 
                          data-to="orders" 
                          data-from-column="id" 
                          data-to-column="user_id">
                    </path>
                </svg>
            </div>
        `;

        mockCanvas = document.getElementById('er-canvas');
        highlightManager = new HighlightManager();
        eventController = new EventController(
            mockCanvas,
            mockStateManager,
            mockCoordinateTransform,
            highlightManager
        );

        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        eventController.removeEventListeners();
        document.body.innerHTML = '';
    });

    describe('Hover Event Integration', () => {
        test('should handle entity hover and trigger highlighting', () => {
            const entityElement = document.querySelector('[data-table="users"]');
            
            // Create mock mouse event
            const mockEvent = {
                target: entityElement,
                clientX: 100,
                clientY: 100,
                preventDefault: jest.fn()
            };

            // Spy on highlight manager
            const handleHoverSpy = jest.spyOn(highlightManager, 'handleHover');
            
            // Trigger hover event
            eventController.handleHover(mockEvent);
            
            // Verify highlight manager was called with entity
            expect(handleHoverSpy).toHaveBeenCalledWith(entityElement);
        });

        test('should handle relationship hover and trigger highlighting', () => {
            const relationshipElement = document.querySelector('.relationship');
            
            const mockEvent = {
                target: relationshipElement,
                clientX: 200,
                clientY: 200,
                preventDefault: jest.fn()
            };

            const handleHoverSpy = jest.spyOn(highlightManager, 'handleHover');
            
            eventController.handleHover(mockEvent);
            
            expect(handleHoverSpy).toHaveBeenCalledWith(relationshipElement);
        });

        test('should handle hover over nested elements correctly', () => {
            const columnElement = document.querySelector('[data-column="id"]');
            const entityElement = document.querySelector('[data-table="users"]');
            
            // Mock closest method to return entity when called on column
            columnElement.closest = jest.fn((selector) => {
                if (selector === '.entity') return entityElement;
                return null;
            });

            const mockEvent = {
                target: columnElement,
                clientX: 150,
                clientY: 150,
                preventDefault: jest.fn()
            };

            const handleHoverSpy = jest.spyOn(highlightManager, 'handleHover');
            
            eventController.handleHover(mockEvent);
            
            expect(handleHoverSpy).toHaveBeenCalledWith(entityElement);
        });

        test('should clear highlights when hovering over empty space', () => {
            const mockEvent = {
                target: mockCanvas,
                clientX: 400,
                clientY: 400,
                preventDefault: jest.fn()
            };

            const handleHoverSpy = jest.spyOn(highlightManager, 'handleHover');
            
            eventController.handleHover(mockEvent);
            
            expect(handleHoverSpy).toHaveBeenCalledWith(null);
        });
    });

    describe('Mouse Movement Integration', () => {
        test('should trigger hover effects during mouse movement in default mode', () => {
            const entityElement = document.querySelector('[data-table="users"]');
            
            const mockEvent = {
                target: entityElement,
                clientX: 100,
                clientY: 100,
                preventDefault: jest.fn()
            };

            const handleHoverSpy = jest.spyOn(eventController, 'handleHover');
            
            eventController.handleMouseMove(mockEvent);
            
            expect(handleHoverSpy).toHaveBeenCalledWith(mockEvent);
        });

        test('should not trigger hover effects during panning mode', () => {
            // Set interaction mode to panning
            mockStateManager.getState.mockReturnValue({
                interactionMode: 'panning',
                viewport: { panX: 0, panY: 0, scale: 1 }
            });

            const mockEvent = {
                target: document.querySelector('[data-table="users"]'),
                clientX: 100,
                clientY: 100,
                preventDefault: jest.fn()
            };

            const handleHoverSpy = jest.spyOn(eventController, 'handleHover');
            
            eventController.handleMouseMove(mockEvent);
            
            expect(handleHoverSpy).not.toHaveBeenCalled();
        });

        test('should not trigger hover effects during entity dragging', () => {
            mockStateManager.getState.mockReturnValue({
                interactionMode: 'dragging-entity',
                viewport: { panX: 0, panY: 0, scale: 1 }
            });

            const mockEvent = {
                target: document.querySelector('[data-table="users"]'),
                clientX: 100,
                clientY: 100,
                preventDefault: jest.fn()
            };

            const handleHoverSpy = jest.spyOn(eventController, 'handleHover');
            
            eventController.handleMouseMove(mockEvent);
            
            expect(handleHoverSpy).not.toHaveBeenCalled();
        });
    });

    describe('Event Registration and Delegation', () => {
        test('should register event handlers correctly', () => {
            const mockHandler = jest.fn();
            
            eventController.registerHandler('mouseover', 'entity', mockHandler);
            
            expect(eventController.eventHandlers.has('mouseover')).toBe(true);
            expect(eventController.eventHandlers.get('mouseover').has('entity')).toBe(true);
        });

        test('should delegate events to registered handlers', () => {
            const mockHandler = jest.fn(() => true);
            eventController.registerHandler('click', '.entity', mockHandler);
            
            const entityElement = document.querySelector('[data-table="users"]');
            entityElement.matches = jest.fn(() => true);
            
            const mockEvent = {
                target: entityElement,
                preventDefault: jest.fn()
            };
            
            const result = eventController.delegateEvent(mockEvent, 'click');
            
            expect(result).toBe(true);
            expect(mockHandler).toHaveBeenCalledWith(mockEvent, entityElement);
        });
    });

    describe('Click vs Hover Interaction', () => {
        test('should handle entity click correctly', () => {
            const entityElement = document.querySelector('[data-table="users"]');
            entityElement.closest = jest.fn(() => entityElement);
            
            const mockEvent = {
                target: entityElement,
                clientX: 100,
                clientY: 100,
                preventDefault: jest.fn()
            };

            const emitSpy = jest.spyOn(eventController, 'emit');
            
            eventController.handleClick(mockEvent);
            
            expect(emitSpy).toHaveBeenCalledWith('entity-click', {
                tableName: 'users',
                event: mockEvent
            });
        });

        test('should handle relationship click correctly', () => {
            const relationshipElement = document.querySelector('.relationship');
            relationshipElement.closest = jest.fn((selector) => {
                if (selector === '.entity') return null;
                if (selector === '.relationship') return relationshipElement;
                return null;
            });
            
            const mockEvent = {
                target: relationshipElement,
                clientX: 200,
                clientY: 200,
                preventDefault: jest.fn()
            };

            const emitSpy = jest.spyOn(eventController, 'emit');
            
            eventController.handleClick(mockEvent);
            
            expect(emitSpy).toHaveBeenCalledWith('relationship-click', {
                fromTable: 'users',
                toTable: 'orders',
                event: mockEvent
            });
        });
    });

    describe('Event Cleanup', () => {
        test('should remove event listeners properly', () => {
            const removeEventListenerSpy = jest.spyOn(mockCanvas, 'removeEventListener');
            const documentRemoveSpy = jest.spyOn(document, 'removeEventListener');
            
            eventController.removeEventListeners();
            
            expect(removeEventListenerSpy).toHaveBeenCalledTimes(7); // canvas events
            expect(documentRemoveSpy).toHaveBeenCalledTimes(2); // document events
        });
    });
});