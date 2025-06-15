/**
 * @jest-environment jsdom
 */

describe('Sidebar Resize Functionality Tests', () => {
  let eventController;
  let mockERViewer;
  let sidebar;
  let resizeHandle;
  let canvas;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <svg id="er-canvas" width="800" height="600">
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
      <canvas id="test-canvas" width="800" height="600"></canvas>
    `;
    
    // Get elements
    sidebar = document.getElementById('sidebar');
    resizeHandle = document.querySelector('.sidebar-resize-handle');
    canvas = document.getElementById('test-canvas');
    
    // Mock offsetWidth for sidebar since jsdom doesn't calculate it
    Object.defineProperty(sidebar, 'offsetWidth', {
      get() {
        const width = parseInt(this.style.width) || 300;
        return width;
      },
      configurable: true
    });

    // Mock ERViewer
    mockERViewer = {
      canvas: document.getElementById('er-canvas'),
      sidebar,
      sidebarContent: document.getElementById('sidebar-content'),
      panX: 0,
      panY: 0,
      scale: 1,
      erData: { entities: [] },
      layoutData: { entities: {} },
      renderER: jest.fn()
    };

    // Mock EventController with sidebar resize handling
    eventController = {
      viewer: mockERViewer,
      isResizingSidebar: false,
      sidebarStartWidth: 300,
      startMouseX: 0,

      handleSidebarResizeStart(e) {
        if (e.target.classList.contains('sidebar-resize-handle')) {
          this.isResizingSidebar = true;
          this.sidebarStartWidth = this.viewer.sidebar.offsetWidth;
          this.startMouseX = e.clientX;
          e.target.classList.add('dragging');
          document.body.style.cursor = 'col-resize';
          e.preventDefault();
        }
      },

      handleSidebarResize(e) {
        if (!this.isResizingSidebar) return;
        
        const deltaX = this.startMouseX - e.clientX; // Negative because sidebar is on the right
        const newWidth = Math.max(200, this.sidebarStartWidth + deltaX);
        this.viewer.sidebar.style.width = newWidth + 'px';
        e.preventDefault();
      },

      handleSidebarResizeEnd(e) {
        if (this.isResizingSidebar) {
          this.isResizingSidebar = false;
          document.querySelector('.sidebar-resize-handle').classList.remove('dragging');
          document.body.style.cursor = '';
          
          // Store the new width in localStorage for persistence
          localStorage.setItem('sidebar-width', this.viewer.sidebar.style.width);
        }
      }
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
  });

  test('should start sidebar resize when clicking on resize handle', () => {
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    
    // Set the target manually since jsdom doesn't support event path
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    
    eventController.handleSidebarResizeStart(mouseDownEvent);

    expect(eventController.isResizingSidebar).toBe(true);
    expect(eventController.sidebarStartWidth).toBe(300);
    expect(eventController.startMouseX).toBe(500);
    expect(resizeHandle.classList.contains('dragging')).toBe(true);
    expect(document.body.style.cursor).toBe('col-resize');
  });

  test('should resize sidebar within min/max bounds during drag', () => {
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
    eventController.handleSidebarResizeStart(mouseDownEvent);

    // Test dragging to make sidebar wider (move mouse left)
    let mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 400, // 100px to the left
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);
    expect(sidebar.style.width).toBe('400px'); // 300 + 100

    // Test dragging to make sidebar narrower (move mouse right)
    mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 600, // 100px to the right from start
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);
    expect(sidebar.style.width).toBe('200px'); // 300 - 100

    // Test minimum width constraint
    mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 800, // 300px to the right (would make width 0)
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);
    expect(sidebar.style.width).toBe('200px'); // Should stay at min width

    // Test that large widths are allowed (no upper limit)
    eventController.startMouseX = 500;
    eventController.sidebarStartWidth = 300;
    mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 100, // 400px to the left (would make width 700)
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);
    expect(sidebar.style.width).toBe('700px'); // Should allow large widths
  });

  test('should end resize and save width to localStorage', () => {
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
    eventController.handleSidebarResizeStart(mouseDownEvent);

    // Resize
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 450,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);
    expect(sidebar.style.width).toBe('350px');

    // End resize
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 450,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResizeEnd(mouseUpEvent);

    expect(eventController.isResizingSidebar).toBe(false);
    expect(resizeHandle.classList.contains('dragging')).toBe(false);
    expect(document.body.style.cursor).toBe('');
    expect(localStorage.setItem).toHaveBeenCalledWith('sidebar-width', '350px');
  });

  test('should not resize if not clicking on resize handle', () => {
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    
    // Set target to sidebar content instead of resize handle
    const sidebarContent = document.getElementById('sidebar-content');
    Object.defineProperty(mouseDownEvent, 'target', {
      value: sidebarContent,
      configurable: true
    });
    
    eventController.handleSidebarResizeStart(mouseDownEvent);

    expect(eventController.isResizingSidebar).toBe(false);
    expect(resizeHandle.classList.contains('dragging')).toBe(false);
  });

  test('should not resize if resize not started', () => {
    const initialWidth = sidebar.style.width;
    
    // Try to resize without starting
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 400,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);
    
    expect(sidebar.style.width).toBe(initialWidth);
  });

  test('should handle multiple resize sessions', () => {
    // First resize session
    let mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    eventController.handleSidebarResizeStart(mouseDownEvent);

    let mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 450,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);
    expect(sidebar.style.width).toBe('350px');

    let mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 450,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResizeEnd(mouseUpEvent);

    // Second resize session
    sidebar.style.width = '350px'; // Simulate saved width
    mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 450,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    eventController.handleSidebarResizeStart(mouseDownEvent);

    expect(eventController.sidebarStartWidth).toBe(350); // Should start from current width

    mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 400,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);
    expect(sidebar.style.width).toBe('400px');

    mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 400,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResizeEnd(mouseUpEvent);

    expect(localStorage.setItem).toHaveBeenLastCalledWith('sidebar-width', '400px');
  });

  test('should maintain sidebar state during resize', () => {
    // Ensure sidebar content remains visible during resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    eventController.handleSidebarResizeStart(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 400,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);

    // Check that sidebar remains open and content is still there
    expect(sidebar.classList.contains('open')).toBe(true);
    expect(document.getElementById('sidebar-content').innerHTML).toContain('users');
    expect(document.querySelector('.ddl-content').textContent).toContain('CREATE TABLE users');
  });

  test('should handle edge case of very fast mouse movements', () => {
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    eventController.handleSidebarResizeStart(mouseDownEvent);

    // Simulate very fast mouse movement that would exceed bounds
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: -100, // Way beyond reasonable bounds
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);

    // Should allow very large widths
    expect(sidebar.style.width).toBe('900px');
  });

  test('should apply visual feedback during resize', () => {
    const ctx = canvas.getContext('2d');
    ctx.__clearDrawCalls();

    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 500,
      clientY: 300,
      bubbles: true
    });
    Object.defineProperty(mouseDownEvent, 'target', {
      value: resizeHandle,
      configurable: true
    });
    eventController.handleSidebarResizeStart(mouseDownEvent);

    // Visual feedback checks
    expect(resizeHandle.classList.contains('dragging')).toBe(true);
    expect(document.body.style.cursor).toBe('col-resize');

    // The handle should maintain its dragging state during resize
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 450,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResize(mouseMoveEvent);
    expect(resizeHandle.classList.contains('dragging')).toBe(true);

    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 450,
      clientY: 300,
      bubbles: true
    });
    eventController.handleSidebarResizeEnd(mouseUpEvent);
    
    // Visual feedback should be removed
    expect(resizeHandle.classList.contains('dragging')).toBe(false);
    expect(document.body.style.cursor).toBe('');
  });
});