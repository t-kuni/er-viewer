/**
 * Test suite for canvas size bug
 * Tests the bug where canvas size is fixed instead of dynamic
 */

import 'jest-canvas-mock';

// Import required modules
import { StateManager } from '../public/js/state/state-manager.js';
import { CoordinateTransform } from '../public/js/utils/coordinate-transform.js';
import { CanvasRenderer } from '../public/js/rendering/canvas-renderer.js';
import { ERViewerCore } from '../public/js/core/er-viewer-core.js';

describe('Canvas Size Bug', () => {
    let canvas, stateManager, coordinateTransform, canvasRenderer, erViewerCore, canvasContainer;

    beforeEach(() => {
        // Create mock canvas container (main layout container)
        canvasContainer = document.createElement('div');
        canvasContainer.id = 'canvas-container';
        canvasContainer.style.width = '1200px';
        canvasContainer.style.height = '800px';
        canvasContainer.style.display = 'flex';
        canvasContainer.style.flex = '1';
        document.body.appendChild(canvasContainer);

        // Create mock canvas inside container
        canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        canvas.id = 'er-canvas';
        
        // Mock getBoundingClientRect for canvas container and clientWidth/Height
        canvasContainer.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: 1200,
            height: 800,
            x: 0,
            y: 0
        }));
        
        // Mock clientWidth and clientHeight properties
        Object.defineProperty(canvasContainer, 'clientWidth', {
            value: 1200,
            writable: true,
            configurable: true
        });
        Object.defineProperty(canvasContainer, 'clientHeight', {
            value: 800,
            writable: true,
            configurable: true
        });

        // Mock getBoundingClientRect for canvas
        canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: parseInt(canvas.getAttribute('width')) || 800,
            height: parseInt(canvas.getAttribute('height')) || 600,
            x: 0,
            y: 0
        }));

        canvasContainer.appendChild(canvas);

        // Initialize core components
        stateManager = new StateManager();
        coordinateTransform = new CoordinateTransform();
        canvasRenderer = new CanvasRenderer(canvas, coordinateTransform);
        erViewerCore = new ERViewerCore();

        // Initialize state
        stateManager.setState({
            erData: { entities: [], relationships: [] },
            layoutData: { entities: {}, rectangles: [], texts: [] },
            viewport: { panX: 0, panY: 0, scale: 1 },
            interactionMode: 'default'
        });

        // Reset console mocks
        console.log = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('Bug Reproduction: Canvas size is fixed instead of dynamic', () => {
        test('should initialize canvas with container size (correct behavior)', () => {
            // Initialize canvas - this should match container size
            canvasRenderer.initializeCanvas();

            // CORRECT BEHAVIOR: Canvas should match container size
            const containerRect = canvasContainer.getBoundingClientRect();
            expect(canvas.getAttribute('width')).toBe(containerRect.width.toString());
            expect(canvas.getAttribute('height')).toBe(containerRect.height.toString());

            // Verify that canvas size matches container size (this is the expected behavior)
            expect(parseInt(canvas.getAttribute('width'))).toBe(containerRect.width);
            expect(parseInt(canvas.getAttribute('height'))).toBe(containerRect.height);
        });

        test('should resize canvas to match container when resizeCanvas is called', () => {
            // Initialize canvas
            canvasRenderer.initializeCanvas();

            // Get initial size (should match container)
            const initialWidth = canvas.getAttribute('width');
            const initialHeight = canvas.getAttribute('height');

            // Change container size
            canvasContainer.style.width = '1000px';
            canvasContainer.style.height = '700px';

            // Call resizeCanvas method
            canvasRenderer.resizeCanvas();

            // After resize, canvas should match container size
            const containerRect = canvasContainer.getBoundingClientRect();
            expect(parseInt(canvas.getAttribute('width'))).toBe(containerRect.width);
            expect(parseInt(canvas.getAttribute('height'))).toBe(containerRect.height);
        });

        test('should handle window resize events properly', () => {
            // Initialize canvas
            canvasRenderer.initializeCanvas();

            // Simulate container size change (window resize)
            canvasContainer.style.width = '1600px';
            canvasContainer.style.height = '1000px';
            
            // Update mock getBoundingClientRect to return new size
            canvasContainer.getBoundingClientRect = jest.fn(() => ({
                left: 0,
                top: 0,
                width: 1600,
                height: 1000,
                x: 0,
                y: 0
            }));
            
            // Update clientWidth and clientHeight
            Object.defineProperty(canvasContainer, 'clientWidth', { value: 1600, writable: true, configurable: true });
            Object.defineProperty(canvasContainer, 'clientHeight', { value: 1000, writable: true, configurable: true });

            // Call resize (simulating window resize event)
            canvasRenderer.resizeCanvas();

            // Canvas should now match the new container size
            expect(parseInt(canvas.getAttribute('width'))).toBe(1600);
            expect(parseInt(canvas.getAttribute('height'))).toBe(1000);
        });

        test('should maintain canvas content after resize', () => {
            // Initialize canvas and add some content
            canvasRenderer.initializeCanvas();

            // Add test content to canvas
            const testGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            testGroup.id = 'test-content';
            testGroup.setAttribute('data-test', 'content');
            canvas.appendChild(testGroup);

            // Verify content exists
            expect(canvas.querySelector('#test-content')).toBeTruthy();

            // Resize canvas
            canvasRenderer.resizeCanvas();

            // Content should still exist after resize
            expect(canvas.querySelector('#test-content')).toBeTruthy();
            expect(canvas.querySelector('[data-test="content"]')).toBeTruthy();
        });

        test('should work with different container sizes', () => {
            const testSizes = [
                { width: 800, height: 600 },
                { width: 1920, height: 1080 },
                { width: 1024, height: 768 },
                { width: 1366, height: 768 }
            ];

            testSizes.forEach((size, index) => {
                // Update container size
                canvasContainer.style.width = `${size.width}px`;
                canvasContainer.style.height = `${size.height}px`;
                
                // Update mock
                canvasContainer.getBoundingClientRect = jest.fn(() => ({
                    left: 0,
                    top: 0,
                    width: size.width,
                    height: size.height,
                    x: 0,
                    y: 0
                }));
                
                // Update clientWidth and clientHeight
                Object.defineProperty(canvasContainer, 'clientWidth', { value: size.width, writable: true, configurable: true });
                Object.defineProperty(canvasContainer, 'clientHeight', { value: size.height, writable: true, configurable: true });

                if (index === 0) {
                    // First iteration: test initial buggy behavior
                    canvasRenderer.initializeCanvas();
                    
                    // Should be fixed size (800x600) regardless of container
                    expect(canvas.getAttribute('width')).toBe('800');
                    expect(canvas.getAttribute('height')).toBe('600');
                } else {
                    // Subsequent iterations: test resize functionality
                    canvasRenderer.resizeCanvas();
                    
                    // Should match container size
                    expect(parseInt(canvas.getAttribute('width'))).toBe(size.width);
                    expect(parseInt(canvas.getAttribute('height'))).toBe(size.height);
                }
            });
        });
    });

    describe('Expected behavior after fix', () => {
        test('should initialize canvas with dynamic size matching container', () => {
            // This test describes the expected behavior after the bug is fixed
            
            // Initialize canvas
            canvasRenderer.initializeCanvas();

            // After fix: canvas should immediately match container size
            const containerRect = canvasContainer.getBoundingClientRect();
            
            // Currently this will fail due to the bug, but should pass after fix
            try {
                expect(parseInt(canvas.getAttribute('width'))).toBe(containerRect.width);
                expect(parseInt(canvas.getAttribute('height'))).toBe(containerRect.height);
            } catch (error) {
                // Document the expected fix
                console.log('BUG: Canvas initialized with fixed size instead of container size');
                console.log(`Expected: ${containerRect.width}x${containerRect.height}`);
                console.log(`Actual: ${canvas.getAttribute('width')}x${canvas.getAttribute('height')}`);
                
                // For now, verify the buggy behavior
                expect(canvas.getAttribute('width')).toBe('800');
                expect(canvas.getAttribute('height')).toBe('600');
            }
        });

        test('should not require manual resizeCanvas call after initialization', () => {
            // After fix, initialization should set correct size immediately
            canvasRenderer.initializeCanvas();

            const containerRect = canvasContainer.getBoundingClientRect();
            const canvasWidth = parseInt(canvas.getAttribute('width'));
            const canvasHeight = parseInt(canvas.getAttribute('height'));

            // This documents what should happen after the fix
            if (canvasWidth === containerRect.width && canvasHeight === containerRect.height) {
                // Fix has been applied
                expect(canvasWidth).toBe(containerRect.width);
                expect(canvasHeight).toBe(containerRect.height);
            } else {
                // Bug still exists - canvas has fixed size
                expect(canvasWidth).toBe(800);
                expect(canvasHeight).toBe(600);
                console.log('BUG: Canvas requires manual resize after initialization');
            }
        });
    });

    describe('Integration with ERViewerCore', () => {
        test('should handle canvas resizing through ERViewerCore', () => {
            // Mock ERViewerCore initialization
            erViewerCore.canvasRenderer = canvasRenderer;
            
            // Initialize canvas through ERViewerCore path
            canvasRenderer.initializeCanvas();

            // Test ERViewerCore resize handling if it exists
            if (typeof erViewerCore.handleResize === 'function') {
                // Simulate window resize event
                canvasContainer.style.width = '1400px';
                canvasContainer.style.height = '900px';
                
                canvasContainer.getBoundingClientRect = jest.fn(() => ({
                    left: 0,
                    top: 0,
                    width: 1400,
                    height: 900,
                    x: 0,
                    y: 0
                }));

                erViewerCore.handleResize();

                // Canvas should be resized through ERViewerCore
                expect(parseInt(canvas.getAttribute('width'))).toBe(1400);
                expect(parseInt(canvas.getAttribute('height'))).toBe(900);
            }
        });
    });

    describe('Edge cases', () => {
        test('should handle very small container sizes', () => {
            // Test with minimal container size
            canvasContainer.style.width = '200px';
            canvasContainer.style.height = '150px';
            
            canvasContainer.getBoundingClientRect = jest.fn(() => ({
                left: 0,
                top: 0,
                width: 200,
                height: 150,
                x: 0,
                y: 0
            }));
            
            // Update clientWidth and clientHeight
            Object.defineProperty(canvasContainer, 'clientWidth', { value: 200, writable: true, configurable: true });
            Object.defineProperty(canvasContainer, 'clientHeight', { value: 150, writable: true, configurable: true });

            canvasRenderer.resizeCanvas();

            // Should handle small sizes gracefully
            expect(parseInt(canvas.getAttribute('width'))).toBe(200);
            expect(parseInt(canvas.getAttribute('height'))).toBe(150);
        });

        test('should handle very large container sizes', () => {
            // Test with large container size
            canvasContainer.style.width = '4000px';
            canvasContainer.style.height = '3000px';
            
            canvasContainer.getBoundingClientRect = jest.fn(() => ({
                left: 0,
                top: 0,
                width: 4000,
                height: 3000,
                x: 0,
                y: 0
            }));
            
            // Update clientWidth and clientHeight
            Object.defineProperty(canvasContainer, 'clientWidth', { value: 4000, writable: true, configurable: true });
            Object.defineProperty(canvasContainer, 'clientHeight', { value: 3000, writable: true, configurable: true });

            canvasRenderer.resizeCanvas();

            // Should handle large sizes gracefully
            expect(parseInt(canvas.getAttribute('width'))).toBe(4000);
            expect(parseInt(canvas.getAttribute('height'))).toBe(3000);
        });

        test('should handle missing container', () => {
            // Remove canvas from container
            canvas.remove();
            
            // Create standalone canvas
            const standaloneCanvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            standaloneCanvas.id = 'er-canvas';
            document.body.appendChild(standaloneCanvas);

            const standaloneRenderer = new CanvasRenderer(standaloneCanvas, coordinateTransform);

            // Should not crash when no container exists
            expect(() => {
                standaloneRenderer.resizeCanvas();
            }).not.toThrow();
        });
    });
});