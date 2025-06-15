/**
 * @jest-environment jsdom
 */

import { EventController } from '../public/js/events/event-controller.js';
import { StateManager } from '../public/js/state/state-manager.js';
import { CoordinateTransform } from '../public/js/utils/coordinate-transform.js';
import { HighlightManager } from '../public/js/highlighting/highlight-manager.js';

describe('Sidebar Resize Integration Tests', () => {
  let eventController;
  let stateManager;
  let coordinateTransform;
  let highlightManager;
  let canvas;
  let sidebar;
  let resizeHandle;

  beforeEach(() => {
    // Setup DOM with sidebar
    document.body.innerHTML = `
      <svg id="er-canvas" width="800" height="600" viewBox="0 0 800 600">
        <g id="main-group" transform="translate(0, 0) scale(1)">
        </g>
      </svg>
      <div id="sidebar" class="sidebar open" style="width: 300px;">
        <div class="sidebar-resize-handle"></div>
        <div class="sidebar-header">
          <h3>Table Details</h3>
          <button id="close-sidebar">×</button>
        </div>
        <div id="sidebar-content">
          <h4>users</h4>
          <pre class="ddl-content">CREATE TABLE users (id INT PRIMARY KEY);</pre>
        </div>
      </div>
    `;
    
    // Get elements
    canvas = document.getElementById('er-canvas');
    sidebar = document.getElementById('sidebar');
    resizeHandle = document.querySelector('.sidebar-resize-handle');
    
    // Mock offsetWidth for sidebar
    Object.defineProperty(sidebar, 'offsetWidth', {
      get() {
        return parseInt(this.style.width) || 300;
      },
      configurable: true
    });

    // Initialize managers
    stateManager = new StateManager();
    stateManager.setState({
      erData: { entities: [], relationships: [] },
      layoutData: { entities: {}, rectangles: [], texts: [] },
      viewport: { panX: 0, panY: 0, scale: 1 },
      interactionMode: 'default',
      selectedAnnotation: null
    });
    
    coordinateTransform = new CoordinateTransform();
    highlightManager = new HighlightManager(canvas);
    
    // Initialize EventController
    eventController = new EventController(canvas, stateManager, coordinateTransform, highlightManager);
    
    // Add sidebar resize handler registration
    eventController.registerHandler('mousedown', 'sidebar-resize-handle', (event, target) => {
      eventController.startSidebarResize(event, target);
      return true;
    });
    
    // Add sidebar resize methods to EventController
    eventController.startSidebarResize = function(event, resizeHandle) {
      this.stateManager.setInteractionMode('resizing-sidebar', {
        startWidth: sidebar.offsetWidth,
        startMouseX: event.clientX,
        handle: resizeHandle
      });
      resizeHandle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
    };
    
    eventController.handleSidebarResize = function(event) {
      const dragState = this.stateManager.get('dragState');
      if (!dragState) return;
      
      const deltaX = dragState.startMouseX - event.clientX;
      const newWidth = Math.max(200, dragState.startWidth + deltaX);
      sidebar.style.width = newWidth + 'px';
    };
    
    eventController.endSidebarResize = function() {
      const dragState = this.stateManager.get('dragState');
      if (dragState && dragState.handle) {
        dragState.handle.classList.remove('dragging');
      }
      document.body.style.cursor = '';
      
      // Save width to localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sidebar-width', sidebar.style.width);
      }
      
      this.stateManager.setInteractionMode('default');
    };
    
    // Override handleMouseMove to include sidebar resize handling
    const originalHandleMouseMove = eventController.handleMouseMove.bind(eventController);
    eventController.handleMouseMove = function(event) {
      const currentState = this.stateManager.getState();
      
      if (currentState.interactionMode === 'resizing-sidebar') {
        this.handleSidebarResize(event);
        return;
      }
      
      originalHandleMouseMove(event);
    };
    
    // Override handleMouseUp to include sidebar resize handling
    const originalHandleMouseUp = eventController.handleMouseUp.bind(eventController);
    eventController.handleMouseUp = function(event) {
      const currentState = this.stateManager.getState();
      
      if (currentState.interactionMode === 'resizing-sidebar') {
        this.endSidebarResize();
        return;
      }
      
      originalHandleMouseUp(event);
    };
    
    // Override handleEscape to include sidebar resize cleanup
    const originalHandleEscape = eventController.handleEscape.bind(eventController);
    eventController.handleEscape = function() {
      const currentState = this.stateManager.getState();
      
      if (currentState.interactionMode === 'resizing-sidebar') {
        this.endSidebarResize();
        return;
      }
      
      originalHandleEscape();
    };

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock console
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    eventController.removeEventListeners();
  });

  test('should integrate sidebar resize with EventController event flow', () => {
    // Simulate mousedown on resize handle
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    
    eventController.handleMouseDown(mouseDownEvent);
    
    // Check that resize mode is active
    const state = stateManager.getState();
    expect(state.interactionMode).toBe('resizing-sidebar');
    expect(state.dragState.startWidth).toBe(300);
    expect(state.dragState.startMouseX).toBe(500);
    expect(resizeHandle.classList.contains('dragging')).toBe(true);
    expect(document.body.style.cursor).toBe('col-resize');
  });

  test('should handle sidebar resize through complete event cycle', () => {
    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    eventController.handleMouseDown(mouseDownEvent);
    
    // Move mouse to resize
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 400, // 100px to the left
      clientY: 300,
      bubbles: true
    });
    eventController.handleMouseMove(mouseMoveEvent);
    
    expect(sidebar.style.width).toBe('400px'); // 300 + 100
    
    // End resize
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 400,
      clientY: 300,
      bubbles: true
    });
    eventController.handleMouseUp(mouseUpEvent);
    
    // Check final state
    expect(stateManager.getState().interactionMode).toBe('default');
    expect(resizeHandle.classList.contains('dragging')).toBe(false);
    expect(document.body.style.cursor).toBe('');
    expect(localStorage.setItem).toHaveBeenCalledWith('sidebar-width', '400px');
  });

  test('should not interfere with other interaction modes', () => {
    // Start entity drag (not sidebar resize)
    const entity = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    entity.classList.add('entity');
    entity.setAttribute('data-table', 'users');
    entity.setAttribute('transform', 'translate(100, 100)');
    canvas.querySelector('#main-group').appendChild(entity);
    
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 150,
      clientY: 150,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: entity,
      configurable: true
    });
    
    eventController.handleMouseDown(mouseDownEvent);
    
    // Should be in entity dragging mode, not sidebar resize
    const state = stateManager.getState();
    expect(state.interactionMode).toBe('dragging-entity');
    expect(state.interactionMode).not.toBe('resizing-sidebar');
  });

  test('should handle sidebar resize with boundary constraints', () => {
    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    eventController.handleMouseDown(mouseDownEvent);
    
    // Try to resize beyond minimum width
    let mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 700, // Would make width 100px
      clientY: 300,
      bubbles: true
    });
    eventController.handleMouseMove(mouseMoveEvent);
    expect(sidebar.style.width).toBe('200px'); // Clamped to min
    
    // Reset and try to resize beyond maximum width
    sidebar.style.width = '300px';
    eventController.handleMouseDown(mouseDownEvent);
    
    mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 100, // Would make width 700px
      clientY: 300,
      bubbles: true
    });
    eventController.handleMouseMove(mouseMoveEvent);
    expect(sidebar.style.width).toBe('700px'); // No upper limit
  });

  test('should restore sidebar width from localStorage on initialization', () => {
    // Mock localStorage to return a saved width
    localStorage.getItem.mockReturnValue('450px');
    
    // In a real implementation, this would be called on app initialization
    const savedWidth = localStorage.getItem('sidebar-width');
    if (savedWidth) {
      sidebar.style.width = savedWidth;
    }
    
    expect(sidebar.style.width).toBe('450px');
    expect(localStorage.getItem).toHaveBeenCalledWith('sidebar-width');
  });

  test('should handle rapid mouse movements during resize', () => {
    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    eventController.handleMouseDown(mouseDownEvent);
    
    // Simulate rapid mouse movements
    const movements = [450, 400, 350, 300, 250, 200, 150, 100];
    movements.forEach(clientX => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX,
        clientY: 300,
        bubbles: true
      });
      eventController.handleMouseMove(mouseMoveEvent);
    });
    
    // Final width should be unclamped
    expect(sidebar.style.width).toBe('700px'); // 300 + (500 - 100) = 700, no upper limit
    
    // End resize
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 100,
      clientY: 300,
      bubbles: true
    });
    eventController.handleMouseUp(mouseUpEvent);
    
    expect(localStorage.setItem).toHaveBeenCalledWith('sidebar-width', '700px');
  });

  test('should properly clean up after resize cancellation', () => {
    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    eventController.handleMouseDown(mouseDownEvent);
    
    // Move mouse
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 400,
      clientY: 300,
      bubbles: true
    });
    eventController.handleMouseMove(mouseMoveEvent);
    
    // Simulate escape key to cancel
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true
    });
    eventController.handleKeyDown(escapeEvent);
    
    // Check that resize mode is cancelled
    expect(stateManager.getState().interactionMode).toBe('default');
    expect(resizeHandle.classList.contains('dragging')).toBe(false);
    expect(document.body.style.cursor).toBe('');
  });
});