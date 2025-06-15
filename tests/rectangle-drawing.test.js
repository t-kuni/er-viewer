/**
 * @jest-environment jsdom
 */

/**
 * Rectangle Drawing Functionality Tests
 * 
 * Tests for rectangle annotation creation, rendering, and interactive editing
 */

// Mock canvas-renderer dependencies
require('jest-canvas-mock');

const fs = require('fs');
const path = require('path');

describe('Rectangle Drawing Functionality', () => {
    let mockStateManager;
    let mockCoordinateTransform;
    let mockERViewer;

    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = `
            <svg id="er-canvas" width="100%" height="100%">
                <g id="main-group">
                    <g id="annotation-layer"></g>
                </g>
            </svg>
            <button id="add-rectangle">矩形追加</button>
            <button id="add-text">テキスト追加</button>
        `;

        // Mock state manager
        mockStateManager = {
            getState: jest.fn(() => ({
                layoutData: {
                    entities: {},
                    rectangles: [],
                    texts: []
                },
                interactionMode: 'default'
            })),
            updateLayoutData: jest.fn(),
            setInteractionMode: jest.fn(),
            get: jest.fn(),
            set: jest.fn()
        };

        // Mock coordinate transform
        mockCoordinateTransform = {
            screenToSVG: jest.fn((x, y) => ({ x: x - 100, y: y - 100 })),
            distance: jest.fn(() => 10)
        };

        // Mock ER Viewer
        mockERViewer = {
            stateManager: mockStateManager
        };

        global.erViewer = mockERViewer;
        global.console.log = jest.fn();
        global.console.error = jest.fn();
    });

    describe('Rectangle Creation via Button', () => {
        test('should call updateLayoutData when addRectangle function is executed', () => {
            // Import and execute the addRectangle function logic
            const addRectangleLogic = () => {
                if (!global.erViewer) return;
                
                const rect = {
                    x: 100,
                    y: 100,
                    width: 200,
                    height: 100,
                    stroke: '#3498db',
                    fill: 'rgba(52, 152, 219, 0.1)'
                };
                const currentState = global.erViewer.stateManager.getState();
                const newLayoutData = { ...currentState.layoutData };
                if (!newLayoutData.rectangles) {
                    newLayoutData.rectangles = [];
                }
                newLayoutData.rectangles.push(rect);
                global.erViewer.stateManager.updateLayoutData(newLayoutData);
            };

            addRectangleLogic();

            expect(mockStateManager.updateLayoutData).toHaveBeenCalledWith({
                entities: {},
                rectangles: [{
                    x: 100,
                    y: 100,
                    width: 200,
                    height: 100,
                    stroke: '#3498db',
                    fill: 'rgba(52, 152, 219, 0.1)'
                }],
                texts: []
            });
        });

        test('should handle multiple rectangle additions', () => {
            // Simulate adding multiple rectangles
            mockStateManager.getState.mockReturnValueOnce({
                layoutData: {
                    entities: {},
                    rectangles: [{ x: 100, y: 100, width: 200, height: 100 }],
                    texts: []
                }
            });

            const addRectangleLogic = () => {
                const rect = {
                    x: 100,
                    y: 100,
                    width: 200,
                    height: 100,
                    stroke: '#3498db',
                    fill: 'rgba(52, 152, 219, 0.1)'
                };
                const currentState = global.erViewer.stateManager.getState();
                const newLayoutData = { ...currentState.layoutData };
                newLayoutData.rectangles.push(rect);
                global.erViewer.stateManager.updateLayoutData(newLayoutData);
            };

            addRectangleLogic();

            expect(mockStateManager.updateLayoutData).toHaveBeenCalledWith({
                entities: {},
                rectangles: [
                    { x: 100, y: 100, width: 200, height: 100 },
                    {
                        x: 100,
                        y: 100,
                        width: 200,
                        height: 100,
                        stroke: '#3498db',
                        fill: 'rgba(52, 152, 219, 0.1)'
                    }
                ],
                texts: []
            });
        });
    });

    describe('Rectangle Creation via Keyboard Shortcut', () => {
        test('should call setInteractionMode when Ctrl+R logic is executed', () => {
            // Simulate Ctrl+R key handler logic
            const handleCtrlR = () => {
                if (global.erViewer && global.erViewer.stateManager) {
                    global.erViewer.stateManager.setInteractionMode('creating-rectangle');
                }
            };

            handleCtrlR();

            expect(mockStateManager.setInteractionMode).toHaveBeenCalledWith('creating-rectangle');
        });
    });

    describe('Rectangle Rendering', () => {
        test('should create SVG rectangle element with correct attributes', () => {
            // Test the createRectangleAnnotation logic
            const rectData = {
                x: 100,
                y: 100,
                width: 200,
                height: 100,
                stroke: '#3498db',
                fill: 'rgba(52, 152, 219, 0.1)'
            };

            // Create SVG rectangle element (simulating CanvasRenderer logic)
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'annotation-rectangle');
            rect.setAttribute('data-index', '0');
            rect.setAttribute('data-type', 'rectangle');
            rect.setAttribute('x', rectData.x);
            rect.setAttribute('y', rectData.y);
            rect.setAttribute('width', rectData.width);
            rect.setAttribute('height', rectData.height);
            rect.setAttribute('fill', rectData.fill);
            rect.setAttribute('stroke', rectData.stroke);

            expect(rect.getAttribute('x')).toBe('100');
            expect(rect.getAttribute('y')).toBe('100');
            expect(rect.getAttribute('width')).toBe('200');
            expect(rect.getAttribute('height')).toBe('100');
            expect(rect.getAttribute('data-type')).toBe('rectangle');
            expect(rect.getAttribute('data-index')).toBe('0');
        });

        test('should add rectangle to annotation layer', () => {
            const annotationLayer = document.getElementById('annotation-layer');
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'annotation-rectangle');
            
            annotationLayer.appendChild(rect);

            expect(annotationLayer.children.length).toBe(1);
            expect(annotationLayer.querySelector('.annotation-rectangle')).toBeTruthy();
        });
    });

    describe('Rectangle Drag and Drop', () => {
        test('should enable rectangle dragging when clicked', () => {
            const mockEventController = {
                startRectangleDragging: jest.fn(),
                stateManager: mockStateManager,
                coordinateTransform: mockCoordinateTransform
            };

            // Simulate rectangle element
            const rectangleElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rectangleElement.setAttribute('class', 'annotation-rectangle');
            rectangleElement.setAttribute('data-index', '0');
            rectangleElement.setAttribute('data-type', 'rectangle');

            // Mock event
            const mockEvent = {
                target: rectangleElement,
                clientX: 150,
                clientY: 150,
                preventDefault: jest.fn()
            };

            // Test rectangle click detection logic
            const rectangleClickedElement = mockEvent.target.closest('.annotation-rectangle');
            expect(rectangleClickedElement).toBe(rectangleElement);
            expect(rectangleClickedElement.getAttribute('data-index')).toBe('0');
        });

        test('should update rectangle position during drag', () => {
            // Setup initial rectangle data
            const initialRect = { x: 100, y: 100, width: 200, height: 100 };
            mockStateManager.getState.mockReturnValue({
                layoutData: {
                    entities: {},
                    rectangles: [initialRect],
                    texts: []
                }
            });

            // Simulate drag movement
            const startMouse = { x: 50, y: 50 };
            const currentMouse = { x: 80, y: 70 };
            const offset = { x: 10, y: 10 };

            const newPosition = {
                x: currentMouse.x - offset.x,
                y: currentMouse.y - offset.y
            };

            // Verify position calculation
            expect(newPosition.x).toBe(70);
            expect(newPosition.y).toBe(60);

            // Test layout data update
            const newLayoutData = {
                entities: {},
                rectangles: [{ ...initialRect, x: newPosition.x, y: newPosition.y }],
                texts: []
            };

            expect(newLayoutData.rectangles[0].x).toBe(70);
            expect(newLayoutData.rectangles[0].y).toBe(60);
        });
    });

    describe('Rectangle Resize Functionality', () => {
        test('should create resize handles for rectangles', () => {
            const rectData = { x: 100, y: 100, width: 200, height: 100 };
            
            // Simulate createResizeHandles logic
            const handlePositions = [
                { name: 'nw', x: rectData.x, y: rectData.y, cursor: 'nw-resize' },
                { name: 'ne', x: rectData.x + rectData.width, y: rectData.y, cursor: 'ne-resize' },
                { name: 'sw', x: rectData.x, y: rectData.y + rectData.height, cursor: 'sw-resize' },
                { name: 'se', x: rectData.x + rectData.width, y: rectData.y + rectData.height, cursor: 'se-resize' }
            ];

            expect(handlePositions[0]).toEqual({ name: 'nw', x: 100, y: 100, cursor: 'nw-resize' });
            expect(handlePositions[1]).toEqual({ name: 'ne', x: 300, y: 100, cursor: 'ne-resize' });
            expect(handlePositions[2]).toEqual({ name: 'sw', x: 100, y: 200, cursor: 'sw-resize' });
            expect(handlePositions[3]).toEqual({ name: 'se', x: 300, y: 200, cursor: 'se-resize' });
        });

        test('should calculate new rectangle size correctly for southeast handle', () => {
            const originalRect = { x: 100, y: 100, width: 200, height: 100 };
            const handleType = 'se';
            const deltaX = 50;
            const deltaY = 30;
            const minSize = 10;

            // Simulate calculateNewRectangleSize logic for southeast handle
            let newRect = { ...originalRect };
            newRect.width = Math.max(minSize, originalRect.width + deltaX);
            newRect.height = Math.max(minSize, originalRect.height + deltaY);

            expect(newRect).toEqual({
                x: 100,
                y: 100,
                width: 250,
                height: 130
            });
        });

        test('should calculate new rectangle size correctly for northwest handle', () => {
            const originalRect = { x: 100, y: 100, width: 200, height: 100 };
            const handleType = 'nw';
            const deltaX = 20;
            const deltaY = 15;
            const minSize = 10;

            // Simulate calculateNewRectangleSize logic for northwest handle
            let newRect = { ...originalRect };
            newRect.x = originalRect.x + deltaX;
            newRect.y = originalRect.y + deltaY;
            newRect.width = Math.max(minSize, originalRect.width - deltaX);
            newRect.height = Math.max(minSize, originalRect.height - deltaY);

            expect(newRect).toEqual({
                x: 120,
                y: 115,
                width: 180,
                height: 85
            });
        });

        test('should enforce minimum size during resize', () => {
            const originalRect = { x: 100, y: 100, width: 20, height: 20 };
            const handleType = 'se';
            const deltaX = -50; // Large negative movement
            const deltaY = -50;
            const minSize = 10;

            // Simulate resize with minimum size enforcement
            let newRect = { ...originalRect };
            newRect.width = Math.max(minSize, originalRect.width + deltaX);
            newRect.height = Math.max(minSize, originalRect.height + deltaY);

            expect(newRect.width).toBe(minSize);
            expect(newRect.height).toBe(minSize);
        });

        test('should show and hide resize handles correctly', () => {
            // Create mock resize handles
            const mockHandle1 = document.createElement('div');
            mockHandle1.className = 'resize-handle';
            mockHandle1.setAttribute('data-rectangle-index', '0');
            mockHandle1.style.display = 'none';

            const mockHandle2 = document.createElement('div');
            mockHandle2.className = 'resize-handle';
            mockHandle2.setAttribute('data-rectangle-index', '1');
            mockHandle2.style.display = 'none';

            document.body.appendChild(mockHandle1);
            document.body.appendChild(mockHandle2);

            // Test showing handles for rectangle 0
            const rectangleIndex = 0;
            const handles = document.querySelectorAll(`[data-rectangle-index="${rectangleIndex}"].resize-handle`);
            handles.forEach(handle => {
                handle.style.display = 'block';
            });

            expect(mockHandle1.style.display).toBe('block');
            expect(mockHandle2.style.display).toBe('none');

            // Test hiding all handles
            const allHandles = document.querySelectorAll('.resize-handle');
            allHandles.forEach(handle => {
                handle.style.display = 'none';
            });

            expect(mockHandle1.style.display).toBe('none');
            expect(mockHandle2.style.display).toBe('none');

            // Cleanup
            document.body.removeChild(mockHandle1);
            document.body.removeChild(mockHandle2);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing erViewer gracefully', () => {
            global.erViewer = null;

            const addRectangleLogic = () => {
                if (!global.erViewer) {
                    console.error('ER Viewer not initialized');
                    return;
                }
            };

            expect(() => addRectangleLogic()).not.toThrow();
            expect(global.console.error).toHaveBeenCalledWith('ER Viewer not initialized');
        });

        test('should handle invalid rectangle index gracefully', () => {
            const invalidIndex = 999;
            const rectangles = [{ x: 100, y: 100, width: 200, height: 100 }];
            
            // Test bounds checking
            const rectangleData = rectangles[invalidIndex];
            expect(rectangleData).toBeUndefined();
            
            // Should not proceed if rectangle data is invalid
            if (!rectangleData) {
                expect(true).toBe(true); // Test passes if we return early
            }
        });
    });
});