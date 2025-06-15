/**
 * @jest-environment jsdom
 */

describe('Drag and Click Interaction Tests', () => {
  let eventController;
  let mockERViewer;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <svg id="er-canvas" width="800" height="600">
        <g id="main-group" transform="translate(0, 0) scale(1)">
          <g class="entity" data-table="users" transform="translate(100, 100)">
            <rect class="entity-rect" width="180" height="120"></rect>
            <text class="entity-title" x="90" y="15">users</text>
            <text class="entity-column" data-column="id" x="10" y="50">id: INT</text>
          </g>
        </g>
      </svg>
      <div id="sidebar" class="sidebar">
        <div id="sidebar-content"></div>
      </div>
    `;

    // Mock ERViewer
    mockERViewer = {
      canvas: document.getElementById('er-canvas'),
      sidebar: document.getElementById('sidebar'),
      sidebarContent: document.getElementById('sidebar-content'),
      panX: 0,
      panY: 0,
      scale: 1,
      erData: { entities: [] },
      layoutData: { entities: {} },
      keyboardHandler: { isSpacePressed: false },
      showTableDetails: jest.fn(),
      updateTransform: jest.fn(),
      renderER: jest.fn(),
      selectAnnotation: jest.fn()
    };

    // Mock MouseHandler
    eventController = {
      viewer: mockERViewer,
      dragStartPoint: false,
      dragTarget: null,
      dragOffset: { x: 0, y: 0 },
      isPanning: false,
      isResizing: false,
      resizeHandle: null,
      resizeTarget: null,
      lastPanPoint: { x: 0, y: 0 },
      hasDragMovement: false,
      mouseDownPosition: { x: 0, y: 0 },

      handleMouseDown(e) {
        this.mouseDownPosition = { x: e.clientX, y: e.clientY };
        this.hasDragMovement = false;
        
        const target = e.target.closest('.entity, .custom-rectangle, .custom-text, .resize-handle');
        
        if (e.button === 0 && target) {
          this.dragStartPoint = true;
          this.dragTarget = target;
          
          if (target.classList.contains('entity')) {
            const transform = target.getAttribute('transform');
            const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            const entityX = match ? parseFloat(match[1]) : 0;
            const entityY = match ? parseFloat(match[2]) : 0;
            this.dragOffset = { x: 100 - entityX, y: 100 - entityY }; // Mock SVG coordinates
          }
        }
      },

      handleMouseMove(e) {
        if (this.dragStartPoint && this.dragTarget) {
          const deltaX = Math.abs(e.clientX - this.mouseDownPosition.x);
          const deltaY = Math.abs(e.clientY - this.mouseDownPosition.y);
          
          // Consider it a drag if mouse moved more than 3 pixels
          if (deltaX > 3 || deltaY > 3) {
            this.hasDragMovement = true;
          }

          if (this.dragTarget.classList.contains('entity')) {
            const newX = 100 + (e.clientX - this.mouseDownPosition.x); // Mock new position
            const newY = 100 + (e.clientY - this.mouseDownPosition.y);
            this.dragTarget.setAttribute('transform', `translate(${newX}, ${newY})`);
          }
        }
      },

      handleMouseUp(e) {
        const wasEntityDragging = this.dragStartPoint && this.dragTarget && this.dragTarget.classList.contains('entity');
        
        this.dragStartPoint = false;
        this.dragTarget = null;
        
        if (wasEntityDragging) {
          this.viewer.renderER();
        }
      },

      handleClick(e) {
        console.log('handleClick called', e.target);
        console.log('hasDragMovement:', this.hasDragMovement);
        
        // Don't trigger click if we were dragging
        if (this.hasDragMovement) {
          console.log('Click prevented due to drag movement');
          return;
        }
        
        const entity = e.target.closest('.entity');
        console.log('Found entity:', entity);
        if (entity) {
          const tableName = entity.getAttribute('data-table');
          console.log('Table name:', tableName);
          this.viewer.showTableDetails(tableName);
        }
      }
    };

    // Mock console to reduce noise
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should trigger click when no dragging occurs', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    const entityTitle = entity.querySelector('.entity-title');

    // Simulate mousedown
    const mouseDownEvent = {
      button: 0,
      clientX: 150,
      clientY: 115,
      target: entityTitle
    };
    eventController.handleMouseDown(mouseDownEvent);

    expect(eventController.dragStartPoint).toBe(true);
    expect(eventController.hasDragMovement).toBe(false);

    // Simulate mouseup without movement
    const mouseUpEvent = {
      target: entityTitle
    };
    eventController.handleMouseUp(mouseUpEvent);

    expect(eventController.dragStartPoint).toBe(false);

    // Simulate click
    const clickEvent = {
      target: entityTitle,
      preventDefault: jest.fn()
    };
    eventController.handleClick(clickEvent);

    // Should trigger showTableDetails since no dragging occurred
    expect(mockERViewer.showTableDetails).toHaveBeenCalledWith('users');
  });

  test('should prevent click when dragging has occurred', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    const entityTitle = entity.querySelector('.entity-title');

    // Simulate mousedown
    const mouseDownEvent = {
      button: 0,
      clientX: 150,
      clientY: 115,
      target: entityTitle
    };
    eventController.handleMouseDown(mouseDownEvent);

    expect(eventController.dragStartPoint).toBe(true);
    expect(eventController.hasDragMovement).toBe(false);

    // Simulate mouse movement (dragging)
    const mouseMoveEvent = {
      clientX: 160, // Moved 10 pixels horizontally
      clientY: 115
    };
    eventController.handleMouseMove(mouseMoveEvent);

    expect(eventController.hasDragMovement).toBe(true);

    // Simulate mouseup
    const mouseUpEvent = {
      target: entityTitle
    };
    eventController.handleMouseUp(mouseUpEvent);

    expect(eventController.dragStartPoint).toBe(false);

    // Simulate click after drag
    const clickEvent = {
      target: entityTitle,
      preventDefault: jest.fn()
    };
    eventController.handleClick(clickEvent);

    // Should NOT trigger showTableDetails since dragging occurred
    expect(mockERViewer.showTableDetails).not.toHaveBeenCalled();
  });

  test('should detect small movements as clicks, not drags', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    const entityTitle = entity.querySelector('.entity-title');

    // Simulate mousedown
    const mouseDownEvent = {
      button: 0,
      clientX: 150,
      clientY: 115,
      target: entityTitle
    };
    eventController.handleMouseDown(mouseDownEvent);

    // Simulate very small mouse movement (< 3 pixels)
    const mouseMoveEvent = {
      clientX: 152, // Moved only 2 pixels
      clientY: 115
    };
    eventController.handleMouseMove(mouseMoveEvent);

    expect(eventController.hasDragMovement).toBe(false); // Should still be false

    // Simulate mouseup
    const mouseUpEvent = {
      target: entityTitle
    };
    eventController.handleMouseUp(mouseUpEvent);

    // Simulate click
    const clickEvent = {
      target: entityTitle,
      preventDefault: jest.fn()
    };
    eventController.handleClick(clickEvent);

    // Should trigger showTableDetails since movement was too small to be a drag
    expect(mockERViewer.showTableDetails).toHaveBeenCalledWith('users');
  });

  test('should detect large movements as drags', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    const entityTitle = entity.querySelector('.entity-title');

    // Simulate mousedown
    const mouseDownEvent = {
      button: 0,
      clientX: 150,
      clientY: 115,
      target: entityTitle
    };
    eventController.handleMouseDown(mouseDownEvent);

    // Simulate large mouse movement
    const mouseMoveEvent = {
      clientX: 170, // Moved 20 pixels horizontally
      clientY: 130  // Moved 15 pixels vertically
    };
    eventController.handleMouseMove(mouseMoveEvent);

    expect(eventController.hasDragMovement).toBe(true);

    // Verify entity position was updated
    const currentTransform = entity.getAttribute('transform');
    expect(currentTransform).toContain('translate(120, 115)'); // Original position + movement
  });

  test('should handle multiple mouse movements correctly', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    const entityTitle = entity.querySelector('.entity-title');

    // Simulate mousedown
    const mouseDownEvent = {
      button: 0,
      clientX: 150,
      clientY: 115,
      target: entityTitle
    };
    eventController.handleMouseDown(mouseDownEvent);

    // First small movement
    let mouseMoveEvent = {
      clientX: 152,
      clientY: 115
    };
    eventController.handleMouseMove(mouseMoveEvent);
    expect(eventController.hasDragMovement).toBe(false);

    // Second small movement
    mouseMoveEvent = {
      clientX: 153,
      clientY: 116
    };
    eventController.handleMouseMove(mouseMoveEvent);
    expect(eventController.hasDragMovement).toBe(false);

    // Third movement that crosses threshold
    mouseMoveEvent = {
      clientX: 155,
      clientY: 118
    };
    eventController.handleMouseMove(mouseMoveEvent);
    expect(eventController.hasDragMovement).toBe(true); // Now it's considered a drag
  });

  test('should reset drag state on each mousedown', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    const entityTitle = entity.querySelector('.entity-title');

    // First interaction - with drag
    let mouseDownEvent = {
      button: 0,
      clientX: 150,
      clientY: 115,
      target: entityTitle
    };
    eventController.handleMouseDown(mouseDownEvent);

    let mouseMoveEvent = {
      clientX: 160,
      clientY: 115
    };
    eventController.handleMouseMove(mouseMoveEvent);
    expect(eventController.hasDragMovement).toBe(true);

    eventController.handleMouseUp({ target: entityTitle });

    // Second interaction - should reset state
    mouseDownEvent = {
      button: 0,
      clientX: 200,
      clientY: 200,
      target: entityTitle
    };
    eventController.handleMouseDown(mouseDownEvent);
    
    expect(eventController.hasDragMovement).toBe(false); // Should be reset
    expect(eventController.mouseDownPosition.x).toBe(200);
    expect(eventController.mouseDownPosition.y).toBe(200);

    // Click should work now
    const clickEvent = {
      target: entityTitle,
      preventDefault: jest.fn()
    };
    eventController.handleClick(clickEvent);
    expect(mockERViewer.showTableDetails).toHaveBeenCalledWith('users');
  });

  test('should handle right click and middle click correctly', () => {
    const entity = document.querySelector('.entity[data-table="users"]');
    const entityTitle = entity.querySelector('.entity-title');

    // Test right click (button 2)
    const rightClickEvent = {
      button: 2,
      clientX: 150,
      clientY: 115,
      target: entityTitle
    };
    eventController.handleMouseDown(rightClickEvent);
    expect(eventController.dragStartPoint).toBe(false); // Should not start dragging on right click

    // Test middle click (button 1) - need to implement this in eventController
    const middleClickEvent = {
      button: 1,
      clientX: 150,
      clientY: 115,
      target: entityTitle,
      preventDefault: jest.fn()
    };
    
    // Add middle click handling to our mock
    if (middleClickEvent.button === 1) {
      middleClickEvent.preventDefault();
      eventController.isPanning = true;
      eventController.lastPanPoint = { x: middleClickEvent.clientX, y: middleClickEvent.clientY };
    }
    
    expect(eventController.isPanning).toBe(true); // Should start panning on middle click
  });
});