/**
 * @jest-environment jsdom
 */

import { MouseHandler } from '../public/js/events/mouse-handler.js';
import { KeyboardHandler } from '../public/js/events/keyboard-handler.js';

// Mock the ERViewer class and required dependencies
class MockERViewer {
    constructor() {
        this.canvas = document.createElement('svg');
        this.panX = 0;
        this.panY = 0;
        this.scale = 1;
        this.keyboardHandler = new KeyboardHandler(this);
        this.mouseHandler = new MouseHandler(this);
        
        // Add the canvas to DOM for testing
        document.body.appendChild(this.canvas);
    }

    updateTransform() {
        // Mock implementation
        this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }
}

describe('Scroll Functionality Tests', () => {
    let viewer;
    let mouseHandler;
    let keyboardHandler;

    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = '';
        
        // Create mock viewer
        viewer = new MockERViewer();
        mouseHandler = viewer.mouseHandler;
        keyboardHandler = viewer.keyboardHandler;
        
        // Mock getBoundingClientRect
        viewer.canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600
        }));
    });

    describe('Space + Drag Scrolling', () => {
        test('should enable panning when space key is pressed and mouse is dragged', () => {
            // スペースキーを押下
            const spaceKeyDownEvent = new KeyboardEvent('keydown', { code: 'Space' });
            keyboardHandler.handleKeyDown(spaceKeyDownEvent);
            
            expect(keyboardHandler.isSpacePressed).toBe(true);
            expect(viewer.canvas.style.cursor).toBe('grab');
            
            // マウスダウン（スペース押下中）
            const mouseDownEvent = new MouseEvent('mousedown', {
                button: 0,
                clientX: 100,
                clientY: 100
            });
            Object.defineProperty(mouseDownEvent, 'target', { value: viewer.canvas });
            
            mouseHandler.handleMouseDown(mouseDownEvent);
            
            expect(mouseHandler.isPanning).toBe(true);
            expect(viewer.canvas.style.cursor).toBe('grabbing');
            
            // マウス移動
            const initialPanX = viewer.panX;
            const initialPanY = viewer.panY;
            
            const mouseMoveEvent = new MouseEvent('mousemove', {
                clientX: 150,
                clientY: 120
            });
            
            mouseHandler.handleMouseMove(mouseMoveEvent);
            
            expect(viewer.panX).toBe(initialPanX + 50);
            expect(viewer.panY).toBe(initialPanY + 20);
            
            // マウスアップ
            const mouseUpEvent = new MouseEvent('mouseup', { button: 0 });
            mouseHandler.handleMouseUp(mouseUpEvent);
            
            expect(mouseHandler.isPanning).toBe(false);
            
            // スペースキーを離す
            const spaceKeyUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
            keyboardHandler.handleKeyUp(spaceKeyUpEvent);
            
            expect(keyboardHandler.isSpacePressed).toBe(false);
            expect(viewer.canvas.style.cursor).toBe('default');
        });

        test('should not enable panning when space is not pressed', () => {
            // スペースキーを押下しない状態でマウスダウン
            const mouseDownEvent = new MouseEvent('mousedown', {
                button: 0,
                clientX: 100,
                clientY: 100
            });
            Object.defineProperty(mouseDownEvent, 'target', { value: viewer.canvas });
            
            mouseHandler.handleMouseDown(mouseDownEvent);
            
            expect(mouseHandler.isPanning).toBe(false);
        });

        test('should prevent space key default behavior', () => {
            const spaceKeyDownEvent = new KeyboardEvent('keydown', { code: 'Space' });
            spaceKeyDownEvent.preventDefault = jest.fn();
            
            keyboardHandler.handleKeyDown(spaceKeyDownEvent);
            
            expect(spaceKeyDownEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('Middle Click (Wheel Button) Scrolling', () => {
        test('should enable panning when middle mouse button is pressed', () => {
            // 中クリック（ホイール押し込み）
            const middleClickEvent = new MouseEvent('mousedown', {
                button: 1, // Middle button
                clientX: 100,
                clientY: 100
            });
            middleClickEvent.preventDefault = jest.fn();
            Object.defineProperty(middleClickEvent, 'target', { value: viewer.canvas });
            
            mouseHandler.handleMouseDown(middleClickEvent);
            
            expect(middleClickEvent.preventDefault).toHaveBeenCalled();
            expect(mouseHandler.isPanning).toBe(true);
            expect(viewer.canvas.style.cursor).toBe('grabbing');
            
            // マウス移動
            const initialPanX = viewer.panX;
            const initialPanY = viewer.panY;
            
            const mouseMoveEvent = new MouseEvent('mousemove', {
                clientX: 150,
                clientY: 120
            });
            
            mouseHandler.handleMouseMove(mouseMoveEvent);
            
            expect(viewer.panX).toBe(initialPanX + 50);
            expect(viewer.panY).toBe(initialPanY + 20);
            
            // マウスアップ
            const mouseUpEvent = new MouseEvent('mouseup', { button: 1 });
            mouseHandler.handleMouseUp(mouseUpEvent);
            
            expect(mouseHandler.isPanning).toBe(false);
            expect(viewer.canvas.style.cursor).toBe('default');
        });

        test('should work independently of space key state', () => {
            // スペースキーが押されていない状態でも中クリックでパンできる
            expect(keyboardHandler.isSpacePressed).toBe(false);
            
            const middleClickEvent = new MouseEvent('mousedown', {
                button: 1,
                clientX: 100,
                clientY: 100
            });
            middleClickEvent.preventDefault = jest.fn();
            Object.defineProperty(middleClickEvent, 'target', { value: viewer.canvas });
            
            mouseHandler.handleMouseDown(middleClickEvent);
            
            expect(mouseHandler.isPanning).toBe(true);
        });
    });

    describe('Panning Behavior', () => {
        test('should update pan position correctly during mouse move', () => {
            // パンモードを有効にする
            mouseHandler.isPanning = true;
            mouseHandler.lastPanPoint = { x: 100, y: 100 };
            
            const initialPanX = viewer.panX;
            const initialPanY = viewer.panY;
            
            // マウス移動イベント
            const mouseMoveEvent = new MouseEvent('mousemove', {
                clientX: 120,
                clientY: 130
            });
            
            mouseHandler.handleMouseMove(mouseMoveEvent);
            
            // パン位置が更新されることを確認
            expect(viewer.panX).toBe(initialPanX + 20);
            expect(viewer.panY).toBe(initialPanY + 30);
            expect(mouseHandler.lastPanPoint).toEqual({ x: 120, y: 130 });
        });

        test('should call updateTransform when panning', () => {
            viewer.updateTransform = jest.fn();
            
            mouseHandler.isPanning = true;
            mouseHandler.lastPanPoint = { x: 100, y: 100 };
            
            const mouseMoveEvent = new MouseEvent('mousemove', {
                clientX: 110,
                clientY: 110
            });
            
            mouseHandler.handleMouseMove(mouseMoveEvent);
            
            expect(viewer.updateTransform).toHaveBeenCalled();
        });

        test('should reset panning state on mouse up', () => {
            mouseHandler.isPanning = true;
            mouseHandler.lastPanPoint = { x: 100, y: 100 };
            viewer.canvas.style.cursor = 'grabbing';
            
            const mouseUpEvent = new MouseEvent('mouseup', { button: 0 });
            mouseHandler.handleMouseUp(mouseUpEvent);
            
            expect(mouseHandler.isPanning).toBe(false);
            expect(viewer.canvas.style.cursor).toBe('default');
        });
    });

    describe('Cursor Management', () => {
        test('should change cursor to grab when space is pressed', () => {
            const spaceKeyDownEvent = new KeyboardEvent('keydown', { code: 'Space' });
            keyboardHandler.handleKeyDown(spaceKeyDownEvent);
            
            expect(viewer.canvas.style.cursor).toBe('grab');
        });

        test('should change cursor to grabbing when panning starts', () => {
            keyboardHandler.isSpacePressed = true;
            
            const mouseDownEvent = new MouseEvent('mousedown', {
                button: 0,
                clientX: 100,
                clientY: 100
            });
            Object.defineProperty(mouseDownEvent, 'target', { value: viewer.canvas });
            
            mouseHandler.handleMouseDown(mouseDownEvent);
            
            expect(viewer.canvas.style.cursor).toBe('grabbing');
        });

        test('should reset cursor to default when space is released', () => {
            keyboardHandler.isSpacePressed = true;
            viewer.canvas.style.cursor = 'grab';
            
            const spaceKeyUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
            keyboardHandler.handleKeyUp(spaceKeyUpEvent);
            
            expect(keyboardHandler.isSpacePressed).toBe(false);
            expect(viewer.canvas.style.cursor).toBe('default');
        });
    });

    describe('Edge Cases', () => {
        test('should handle multiple rapid key presses correctly', () => {
            // 複数回のスペースキー押下
            for (let i = 0; i < 5; i++) {
                const spaceKeyDownEvent = new KeyboardEvent('keydown', { code: 'Space' });
                keyboardHandler.handleKeyDown(spaceKeyDownEvent);
            }
            
            expect(keyboardHandler.isSpacePressed).toBe(true);
            
            // 1回のキーアップで解除される
            const spaceKeyUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
            keyboardHandler.handleKeyUp(spaceKeyUpEvent);
            
            expect(keyboardHandler.isSpacePressed).toBe(false);
        });

        test('should handle mouse events outside canvas correctly', () => {
            keyboardHandler.isSpacePressed = true;
            
            // キャンバス外の要素でのマウスダウン
            const outsideElement = document.createElement('div');
            const mouseDownEvent = new MouseEvent('mousedown', {
                button: 0,
                clientX: 100,
                clientY: 100
            });
            Object.defineProperty(mouseDownEvent, 'target', { value: outsideElement });
            
            mouseHandler.handleMouseDown(mouseDownEvent);
            
            // パンモードが有効になることを確認（スペースが押されているため）
            expect(mouseHandler.isPanning).toBe(true);
        });
    });
});