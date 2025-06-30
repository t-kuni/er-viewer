import { ApplicationState, Viewport, LayoutData, Position, Rectangle, Text } from '../types/index.js';

/**
 * Generate a unique ID for annotations
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Type definitions for dependencies
interface StateManager {
  getState(): ApplicationState;
  get<K extends keyof ApplicationState>(key: K): ApplicationState[K];
  setState(partialState: Partial<ApplicationState>): void;
  setInteractionMode(mode: string, dragState?: any): void;
  updateViewport(panX: number, panY: number, scale: number): void;
  updateLayoutData(layoutData: LayoutData): void;
  undo(): void;
  redo(): void;
}

interface CoordinateTransform {
  screenToSVG(clientX: number, clientY: number, canvas: Element, viewport?: Viewport): Position;
  distance(point1: Position, point2: Position): number;
  updateViewport(panX: number, panY: number, scale: number): void;
}

interface HighlightManager {
  handleHover(target: Element | null): void;
}

interface LayerManager {
  addTextLayer(text: string): void;
  addRectangleLayer(rectangleNumber: number): void;
}

// Types for event handlers
type BoundHandlers = {
  wheel: (event: WheelEvent) => void;
  mousedown: (event: MouseEvent) => void;
  mousemove: (event: MouseEvent) => void;
  mouseup: (event: MouseEvent) => void;
  click: (event: MouseEvent) => void;
  dblclick: (event: MouseEvent) => void;
  contextmenu: (event: MouseEvent) => void;
  keydown: (event: KeyboardEvent) => void;
  keyup: (event: KeyboardEvent) => void;
};

// Extended drag state for event handling
interface DragState {
  tableName?: string;
  startPosition?: Position;
  startMouse?: Position;
  offset?: Position;
  startViewport?: Viewport;
  rectangleIndex?: number;
  handleType?: string;
  originalRect?: Rectangle;
  textIndex?: number;
  startPoint?: Position;
  currentRect?: Rectangle;
  // Base DragState properties
  type?: 'entity' | 'annotation' | 'pan';
  element?: Element;
  startX?: number;
  startY?: number;
  originalX?: number;
  originalY?: number;
  currentX?: number;
  currentY?: number;
  originalPanX?: number;
  originalPanY?: number;
}

// Types for custom events
// Removed unused interfaces

/**
 * Centralized event management system
 * Handles all canvas events, interaction modes, and event delegation
 */
export class EventController {
  private canvas: HTMLElement;
  private stateManager: StateManager;
  private coordinateTransform: CoordinateTransform;
  private highlightManager: HighlightManager;
  private layerManager: LayerManager | null;

  // Event delegation map
  private eventHandlers: Map<string, Map<string, (event: Event, target: Element) => boolean | void>>;

  // Interaction state
  private dragThreshold: number = 5; // pixels
  private dragStartPoint: Position | null = null;
  private dragCurrentPoint: Position | null = null;
  private hasDragMovement: boolean = false;
  private lastHadDragMovement: boolean = false;

  // Event handler bindings
  private boundHandlers: BoundHandlers;

  constructor(
    canvas: HTMLElement,
    stateManager: StateManager,
    coordinateTransform: CoordinateTransform,
    highlightManager: HighlightManager,
    layerManager: LayerManager | null = null,
  ) {
    this.canvas = canvas;
    this.stateManager = stateManager;
    this.coordinateTransform = coordinateTransform;
    this.highlightManager = highlightManager;
    this.layerManager = layerManager;

    // Event delegation map
    this.eventHandlers = new Map();

    // Event handler bindings
    this.boundHandlers = {
      wheel: this.handleWheel.bind(this),
      mousedown: this.handleMouseDown.bind(this),
      mousemove: this.handleMouseMove.bind(this),
      mouseup: this.handleMouseUp.bind(this),
      click: this.handleClick.bind(this),
      dblclick: this.handleDoubleClick.bind(this),
      contextmenu: this.handleContextMenu.bind(this),
      keydown: this.handleKeyDown.bind(this),
      keyup: this.handleKeyUp.bind(this),
    };

    this.initializeEventListeners();
  }

  /**
   * Initialize all event listeners
   */
  initializeEventListeners(): void {
    // Canvas mouse events
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel);
    this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
    this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
    this.canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
    this.canvas.addEventListener('click', this.boundHandlers.click);
    this.canvas.addEventListener('dblclick', this.boundHandlers.dblclick);
    this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);

    // Global keyboard events
    document.addEventListener('keydown', this.boundHandlers.keydown);
    document.addEventListener('keyup', this.boundHandlers.keyup);
  }

  /**
   * Remove all event listeners
   */
  removeEventListeners(): void {
    this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
    this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
    this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
    this.canvas.removeEventListener('click', this.boundHandlers.click);
    this.canvas.removeEventListener('dblclick', this.boundHandlers.dblclick);
    this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);

    document.removeEventListener('keydown', this.boundHandlers.keydown);
    document.removeEventListener('keyup', this.boundHandlers.keyup);
  }

  /**
   * Register event handler for specific event type and element
   */
  registerHandler(
    eventType: string,
    selector: string,
    handler: (event: Event, target: Element) => boolean | void,
  ): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Map());
    }
    this.eventHandlers.get(eventType)!.set(selector, handler);
  }

  /**
   * Delegate event to appropriate handler
   */
  delegateEvent(event: Event, eventType: string): boolean {
    if (!this.eventHandlers.has(eventType)) {
      return false;
    }

    const handlers = this.eventHandlers.get(eventType)!;
    let target = event.target as Element | null;

    // Walk up the DOM tree to find matching handlers
    while (target && target !== this.canvas) {
      for (const [selector, handler] of handlers) {
        if (target.matches && target.matches(selector)) {
          const result = handler(event, target);
          return result === undefined ? true : result;
        }
        if (target.classList && target.classList.contains(selector)) {
          const result = handler(event, target);
          return result === undefined ? true : result;
        }
      }
      target = target.parentElement;
    }

    return false;
  }

  /**
   * Handle wheel events (zoom)
   */
  handleWheel(event: WheelEvent): void {
    event.preventDefault();

    const currentState = this.stateManager.getState();
    const { viewport } = currentState;

    // Calculate zoom
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, viewport.scale * zoomFactor));

    // Calculate zoom center point
    const mousePos = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas, viewport);

    // Calculate new pan to keep mouse position stable
    const newPanX = viewport.panX - mousePos.x * (newScale - viewport.scale);
    const newPanY = viewport.panY - mousePos.y * (newScale - viewport.scale);

    // Update state
    this.stateManager.updateViewport(newPanX, newPanY, newScale);
    this.coordinateTransform.updateViewport(newPanX, newPanY, newScale);
  }

  /**
   * Handle mouse down events
   */
  handleMouseDown(event: MouseEvent): void {
    event.preventDefault();

    // Check for delegated handlers first
    if (this.delegateEvent(event, 'mousedown')) {
      return;
    }

    const currentState = this.stateManager.getState();

    // Start drag tracking
    this.dragStartPoint = { x: event.clientX, y: event.clientY };
    this.dragCurrentPoint = { x: event.clientX, y: event.clientY };
    this.hasDragMovement = false;

    // Handle different interaction modes
    switch (currentState.interactionMode) {
      case 'creating-rectangle':
        this.startRectangleCreation(event);
        break;
      case 'creating-text':
        this.startTextCreation(event);
        break;
      default:
        // Check if user clicked on a resize handle first
        const resizeHandle =
          event.target &&
          (event.target as Element).classList &&
          (event.target as Element).classList.contains('resize-handle')
            ? (event.target as Element)
            : null;
        if (resizeHandle) {
          this.startRectangleResizing(event, resizeHandle);
        } else {
          // Check if user clicked on a text annotation
          const textElement =
            event.target && (event.target as Element).closest
              ? (event.target as Element).closest('.annotation-text')
              : null;
          if (textElement) {
            this.startTextDragging(event, textElement);
          } else {
            // Check if user clicked on a rectangle or rectangle group
            const rectangleElement =
              event.target && (event.target as Element).closest
                ? (event.target as Element).closest('.annotation-rectangle') ||
                  (event.target as Element).closest('.annotation-rectangle-group')
                : null;
            if (rectangleElement) {
              this.startRectangleDragging(event, rectangleElement);
            } else {
              // Check if user clicked on an entity
              const entityElement =
                event.target && (event.target as Element).closest ? (event.target as Element).closest('.entity') : null;
              if (entityElement) {
                this.startEntityDragging(event, entityElement);
              } else {
                this.clearRectangleSelection();
                this.startPanning(event);
              }
            }
          }
        }
        break;
    }
  }

  /**
   * Handle mouse move events
   */
  handleMouseMove(event: MouseEvent): void {
    // Update drag tracking (this happens regardless of interaction mode)
    if (this.dragStartPoint) {
      this.dragCurrentPoint = { x: event.clientX, y: event.clientY };

      const dragDistance = this.coordinateTransform.distance(this.dragStartPoint, this.dragCurrentPoint);

      if (dragDistance > this.dragThreshold) {
        this.hasDragMovement = true;
      }
    }

    const currentState = this.stateManager.getState();

    // Handle interaction modes
    switch (currentState.interactionMode) {
      case 'panning':
        this.handlePanning(event);
        break;
      case 'dragging-entity':
        this.handleEntityDragging(event);
        break;
      case 'dragging-text':
        this.handleTextDragging(event);
        break;
      case 'dragging-rectangle':
        this.handleRectangleDragging(event);
        break;
      case 'resizing-rectangle':
        this.handleRectangleResizing(event);
        break;
      case 'creating-rectangle':
        this.handleRectangleCreation(event);
        break;
      default:
        // Check for hover effects
        this.handleHover(event);
        break;
    }
  }

  /**
   * Handle mouse up events
   */
  handleMouseUp(event: MouseEvent): void {
    const currentState = this.stateManager.getState();

    // Handle interaction modes
    switch (currentState.interactionMode) {
      case 'panning':
        this.endPanning();
        break;
      case 'dragging-entity':
        this.endEntityDragging(event);
        break;
      case 'dragging-text':
        this.endTextDragging(event);
        break;
      case 'dragging-rectangle':
        this.endRectangleDragging(event);
        break;
      case 'resizing-rectangle':
        this.endRectangleResizing(event);
        break;
      case 'creating-rectangle':
        this.endRectangleCreation(event);
        break;
    }

    // Store drag movement state for click detection
    this.lastHadDragMovement = this.hasDragMovement;

    // Reset drag tracking
    this.dragStartPoint = null;
    this.dragCurrentPoint = null;
    this.hasDragMovement = false;

    // Reset the drag movement flag after a short delay to allow click handler to see it
    setTimeout(() => {
      this.lastHadDragMovement = false;
    }, 10);
  }

  /**
   * Handle click events
   */
  handleClick(event: MouseEvent): void {
    // Don't trigger click if we were dragging
    if (this.hasDragMovement || this.lastHadDragMovement) {
      return;
    }

    // Check for delegated handlers first
    if (this.delegateEvent(event, 'click')) {
      return;
    }

    // Handle entity clicks (prioritize entities over text annotations)
    if (event.target && (event.target as Element).closest) {
      const entityElement = (event.target as Element).closest('.entity');
      if (entityElement) {
        this.handleEntityClick(event, entityElement);
        return;
      }
    }

    // Handle text clicks
    if (event.target && (event.target as Element).closest) {
      const textElement = (event.target as Element).closest('.annotation-text');
      if (textElement) {
        this.handleTextClick(event, textElement);
        return;
      }
    }

    // Handle relationship clicks
    if (event.target && (event.target as Element).closest) {
      const relationshipElement = (event.target as Element).closest('.relationship');
      if (relationshipElement) {
        this.handleRelationshipClick(event, relationshipElement);
        return;
      }
    }

    // Handle canvas background click
    this.handleCanvasClick(event);
  }

  /**
   * Handle double click events
   */
  handleDoubleClick(event: MouseEvent): void {
    event.preventDefault();

    // Check for delegated handlers first
    if (this.delegateEvent(event, 'dblclick')) {
      return;
    }

    // Handle entity double-click
    if (event.target && (event.target as Element).closest) {
      const entityElement = (event.target as Element).closest('.entity');
      if (entityElement) {
        this.handleEntityDoubleClick(event, entityElement);
      }
    }
  }

  /**
   * Handle context menu events
   */
  handleContextMenu(event: MouseEvent): void {
    event.preventDefault();

    // Check for delegated handlers first
    if (this.delegateEvent(event, 'contextmenu')) {
      return;
    }

    // Show context menu
    this.showContextMenu(event);
  }

  /**
   * Handle keyboard down events
   */
  handleKeyDown(event: KeyboardEvent): void {
    // Handle global shortcuts - prevent default first for custom shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            this.stateManager.redo();
          } else {
            this.stateManager.undo();
          }
          return;
      }
    }
  }

  /**
   * Handle keyboard up events
   */
  handleKeyUp(_event: KeyboardEvent): void {
    // Handle key release events if needed
  }

  // Interaction mode handlers

  /**
   * Start panning mode
   */
  private startPanning(event: MouseEvent): void {
    this.stateManager.setInteractionMode('panning', {
      startViewport: { ...this.stateManager.get('viewport') },
      startMouse: { x: event.clientX, y: event.clientY },
    });
  }

  /**
   * Handle panning movement
   */
  private handlePanning(event: MouseEvent): void {
    const dragState = this.stateManager.get('dragState') as DragState | undefined;
    if (!dragState?.startMouse || !dragState.startViewport) {
      return;
    }

    const deltaX = event.clientX - dragState.startMouse.x;
    const deltaY = event.clientY - dragState.startMouse.y;

    const newPanX = dragState.startViewport.panX + deltaX;
    const newPanY = dragState.startViewport.panY + deltaY;

    this.stateManager.updateViewport(newPanX, newPanY, dragState.startViewport.scale);
    this.coordinateTransform.updateViewport(newPanX, newPanY, dragState.startViewport.scale);
  }

  /**
   * End panning mode
   */
  private endPanning(): void {
    this.stateManager.setInteractionMode('default');
  }

  /**
   * Start entity dragging
   */
  private startEntityDragging(event: MouseEvent, entityElement: Element): void {
    const tableName = entityElement.getAttribute('data-table');
    if (!tableName) {
      return;
    }

    const currentState = this.stateManager.getState();
    let entityPos = currentState.layoutData.entities[tableName];

    // If entity doesn't have a position, get it from the DOM element
    if (!entityPos) {
      const transform = entityElement.getAttribute('transform');
      const match = transform ? transform.match(/translate\(([^,]+),\s*([^)]+)\)/) : null;
      if (match?.[1] && match[2]) {
        entityPos = {
          position: {
            x: parseFloat(match[1]),
            y: parseFloat(match[2]),
          },
        };
      } else {
        // Fallback to default position
        entityPos = { position: { x: 0, y: 0 } };
      }
    }

    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    this.stateManager.setInteractionMode('dragging-entity', {
      tableName,
      startPosition: { ...entityPos },
      startMouse: svgPoint,
      offset: {
        x: svgPoint.x - entityPos.position.x,
        y: svgPoint.y - entityPos.position.y,
      },
    });
  }

  /**
   * Handle entity dragging movement
   */
  private handleEntityDragging(event: MouseEvent): void {
    const dragState = this.stateManager.get('dragState') as DragState | undefined;
    if (!dragState?.tableName || !dragState.offset) {
      return;
    }

    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    const newPosition = {
      x: svgPoint.x - dragState.offset.x,
      y: svgPoint.y - dragState.offset.y,
    };

    // Update entity position in layout data
    const currentState = this.stateManager.getState();
    const newLayoutData = { ...currentState.layoutData };
    newLayoutData.entities[dragState.tableName] = { position: newPosition };

    this.stateManager.updateLayoutData(newLayoutData);
  }

  /**
   * End entity dragging
   */
  private endEntityDragging(_event: MouseEvent): void {
    this.stateManager.setInteractionMode('default');
  }

  /**
   * Start rectangle dragging
   */
  private startRectangleDragging(event: MouseEvent, rectangleElement: Element): void {
    const rectangleIndex = parseInt(rectangleElement.getAttribute('data-index') || '');
    if (isNaN(rectangleIndex)) {
      return;
    }

    const currentState = this.stateManager.getState();
    const rectangleData = currentState.layoutData.rectangles[rectangleIndex];

    if (!rectangleData) {
      return;
    }

    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    this.stateManager.setInteractionMode('dragging-rectangle', {
      rectangleIndex,
      startPosition: { x: rectangleData.x, y: rectangleData.y },
      startMouse: svgPoint,
      offset: {
        x: svgPoint.x - rectangleData.x,
        y: svgPoint.y - rectangleData.y,
      },
    });

    // Show resize handles for the selected rectangle
    this.showRectangleResizeHandles(rectangleIndex);
  }

  /**
   * Handle rectangle dragging movement
   */
  private handleRectangleDragging(event: MouseEvent): void {
    const dragState = this.stateManager.get('dragState') as DragState | undefined;
    if (dragState?.rectangleIndex === undefined || !dragState.offset) {
      return;
    }

    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    const newPosition = {
      x: svgPoint.x - dragState.offset.x,
      y: svgPoint.y - dragState.offset.y,
    };

    // Update rectangle position in layout data
    const currentState = this.stateManager.getState();
    const newLayoutData = { ...currentState.layoutData };
    newLayoutData.rectangles = [...newLayoutData.rectangles];
    const existingRect = newLayoutData.rectangles[dragState.rectangleIndex];
    if (existingRect) {
      newLayoutData.rectangles[dragState.rectangleIndex] = {
        ...existingRect,
        x: newPosition.x,
        y: newPosition.y,
      };
    }

    this.stateManager.updateLayoutData(newLayoutData);
  }

  /**
   * End rectangle dragging
   */
  private endRectangleDragging(_event: MouseEvent): void {
    this.stateManager.setInteractionMode('default');
  }

  /**
   * Start rectangle resizing
   */
  private startRectangleResizing(event: MouseEvent, resizeHandle: Element): void {
    const rectangleIndex = parseInt(resizeHandle.getAttribute('data-rectangle-index') || '');
    const handleType = resizeHandle.getAttribute('data-handle-type');
    if (isNaN(rectangleIndex) || !handleType) {
      return;
    }

    const currentState = this.stateManager.getState();
    const rectangleData = currentState.layoutData.rectangles[rectangleIndex];

    if (!rectangleData) {
      return;
    }

    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    this.stateManager.setInteractionMode('resizing-rectangle', {
      rectangleIndex,
      handleType,
      startMouse: svgPoint,
      originalRect: {
        x: rectangleData.x,
        y: rectangleData.y,
        width: rectangleData.width,
        height: rectangleData.height,
      },
    });
  }

  /**
   * Handle rectangle resizing movement
   */
  private handleRectangleResizing(event: MouseEvent): void {
    const dragState = this.stateManager.get('dragState') as DragState | undefined;
    if (
      dragState?.rectangleIndex === undefined ||
      !dragState.startMouse ||
      !dragState.originalRect ||
      !dragState.handleType
    ) {
      return;
    }

    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    const deltaX = svgPoint.x - dragState.startMouse.x;
    const deltaY = svgPoint.y - dragState.startMouse.y;

    const newRect = this.calculateNewRectangleSize(dragState.originalRect, dragState.handleType, deltaX, deltaY);

    // Update rectangle in layout data
    const currentState = this.stateManager.getState();
    const newLayoutData = { ...currentState.layoutData };
    newLayoutData.rectangles = [...newLayoutData.rectangles];
    const existingRect = newLayoutData.rectangles[dragState.rectangleIndex];
    if (existingRect) {
      newLayoutData.rectangles[dragState.rectangleIndex] = {
        ...existingRect,
        ...newRect,
      };
    }

    this.stateManager.updateLayoutData(newLayoutData);
  }

  /**
   * Calculate new rectangle size based on handle type and mouse movement
   */
  private calculateNewRectangleSize(
    originalRect: Rectangle,
    handleType: string,
    deltaX: number,
    deltaY: number,
  ): Partial<Rectangle> {
    const minSize = 10; // Minimum width/height
    const newRect: Partial<Rectangle> = { ...originalRect };

    switch (handleType) {
      case 'nw': // Top-left
        newRect.x = originalRect.x + deltaX;
        newRect.y = originalRect.y + deltaY;
        newRect.width = Math.max(minSize, originalRect.width - deltaX);
        newRect.height = Math.max(minSize, originalRect.height - deltaY);
        break;
      case 'n': // Top
        newRect.y = originalRect.y + deltaY;
        newRect.height = Math.max(minSize, originalRect.height - deltaY);
        break;
      case 'ne': // Top-right
        newRect.y = originalRect.y + deltaY;
        newRect.width = Math.max(minSize, originalRect.width + deltaX);
        newRect.height = Math.max(minSize, originalRect.height - deltaY);
        break;
      case 'e': // Right
        newRect.width = Math.max(minSize, originalRect.width + deltaX);
        break;
      case 'se': // Bottom-right
        newRect.width = Math.max(minSize, originalRect.width + deltaX);
        newRect.height = Math.max(minSize, originalRect.height + deltaY);
        break;
      case 's': // Bottom
        newRect.height = Math.max(minSize, originalRect.height + deltaY);
        break;
      case 'sw': // Bottom-left
        newRect.x = originalRect.x + deltaX;
        newRect.width = Math.max(minSize, originalRect.width - deltaX);
        newRect.height = Math.max(minSize, originalRect.height + deltaY);
        break;
      case 'w': // Left
        newRect.x = originalRect.x + deltaX;
        newRect.width = Math.max(minSize, originalRect.width - deltaX);
        break;
    }

    return newRect;
  }

  /**
   * End rectangle resizing
   */
  private endRectangleResizing(_event: MouseEvent): void {
    this.stateManager.setInteractionMode('default');
  }

  /**
   * Show resize handles for a rectangle
   */
  private showRectangleResizeHandles(rectangleIndex: number): void {
    // Hide all resize handles first
    this.hideAllResizeHandles();

    // Show handles for the selected rectangle
    const handles = document.querySelectorAll(`[data-rectangle-index="${rectangleIndex}"].resize-handle`);
    handles.forEach((handle) => {
      (handle as HTMLElement).style.display = 'block';
    });

    this.stateManager.setState({ selectedAnnotation: `rectangle-${rectangleIndex}` });
  }

  /**
   * Hide all resize handles
   */
  private hideAllResizeHandles(): void {
    const handles = document.querySelectorAll('.resize-handle');
    handles.forEach((handle) => {
      (handle as HTMLElement).style.display = 'none';
    });
  }

  /**
   * Clear rectangle selection
   */
  private clearRectangleSelection(): void {
    this.hideAllResizeHandles();
    this.stateManager.setState({ selectedAnnotation: null });
  }

  /**
   * Start rectangle creation
   */
  private startRectangleCreation(event: MouseEvent): void {
    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    console.log('Starting rectangle creation at:', svgPoint);

    this.stateManager.setInteractionMode('creating-rectangle', {
      startPoint: svgPoint,
      currentRect: {
        x: svgPoint.x,
        y: svgPoint.y,
        width: 0,
        height: 0,
      },
    });
  }

  /**
   * Handle rectangle creation movement
   */
  private handleRectangleCreation(event: MouseEvent): void {
    const dragState = this.stateManager.get('dragState') as DragState | undefined;
    if (!dragState?.startPoint) {
      return;
    }

    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    const rect: Rectangle = {
      id: generateId(),
      x: Math.min(dragState.startPoint.x, svgPoint.x),
      y: Math.min(dragState.startPoint.y, svgPoint.y),
      width: Math.abs(svgPoint.x - dragState.startPoint.x),
      height: Math.abs(svgPoint.y - dragState.startPoint.y),
    };

    // Update drag state with current rectangle
    this.stateManager.setInteractionMode('creating-rectangle', {
      ...dragState,
      currentRect: rect,
    });
  }

  /**
   * Start text creation
   */
  private startTextCreation(event: MouseEvent): void {
    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    console.log('Starting text creation at:', svgPoint);

    // Prompt user for text input
    const textContent = prompt('テキストを入力してください:');
    if (textContent && textContent.trim()) {
      // Create text annotation
      const textAnnotation: Text = {
        id: generateId(),
        x: svgPoint.x,
        y: svgPoint.y,
        content: textContent.trim(),
        color: '#2c3e50',
        fontSize: 14,
      };

      // Add text to layout data
      const currentState = this.stateManager.getState();
      const newLayoutData = { ...currentState.layoutData };
      if (!newLayoutData.texts) {
        newLayoutData.texts = [];
      }
      newLayoutData.texts.push(textAnnotation);

      this.stateManager.updateLayoutData(newLayoutData);

      // Add layer for new text (ensure layer manager is called even for subsequent texts)
      if (this.layerManager) {
        console.log('Adding text layer for:', textContent.trim());
        this.layerManager.addTextLayer(textContent.trim());
      } else {
        console.warn('LayerManager not available when adding text');
      }

      console.log('Text annotation created:', textAnnotation);
    }

    this.stateManager.setInteractionMode('default');
  }

  /**
   * End rectangle creation
   */
  private endRectangleCreation(_event: MouseEvent): void {
    const dragState = this.stateManager.get('dragState') as DragState | undefined;
    if (!dragState) {
      console.log('Rectangle creation ended without drag state');
      this.stateManager.setInteractionMode('default');
      return;
    }

    // If no drag movement, create a default-sized rectangle at the start point
    let rectToAdd: Rectangle;
    if (!this.hasDragMovement && dragState.startPoint) {
      console.log('Rectangle creation with minimal drag - creating default size rectangle');
      rectToAdd = {
        id: generateId(),
        x: dragState.startPoint.x,
        y: dragState.startPoint.y,
        width: 100,
        height: 60,
        color: '#1976d2',
        strokeWidth: 2,
      };
    } else if (dragState.currentRect) {
      console.log('Ending rectangle creation, adding to layout:', dragState.currentRect);
      rectToAdd = dragState.currentRect;
    } else {
      this.stateManager.setInteractionMode('default');
      return;
    }

    // Add rectangle to layout data
    const currentState = this.stateManager.getState();
    const newLayoutData = { ...currentState.layoutData };
    if (!newLayoutData.rectangles) {
      newLayoutData.rectangles = [];
    }
    newLayoutData.rectangles.push(rectToAdd);

    this.stateManager.updateLayoutData(newLayoutData);

    // Add layer for new rectangle
    if (this.layerManager) {
      const rectangleNumber = newLayoutData.rectangles.length; // Use 1-based numbering
      this.layerManager.addRectangleLayer(rectangleNumber);
    }

    this.stateManager.setInteractionMode('default');
  }

  // Text interaction handlers

  /**
   * Start text dragging
   */
  private startTextDragging(event: MouseEvent, textElement: Element): void {
    const textIndex = parseInt(textElement.getAttribute('data-index') || '');
    if (isNaN(textIndex)) {
      return;
    }

    const currentState = this.stateManager.getState();
    const textData = currentState.layoutData.texts?.[textIndex];

    if (!textData) {
      return;
    }

    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    this.stateManager.setInteractionMode('dragging-text', {
      textIndex,
      startPosition: { x: textData.x, y: textData.y },
      startMouse: svgPoint,
      offset: {
        x: svgPoint.x - textData.x,
        y: svgPoint.y - textData.y,
      },
    });

    // Select the text
    this.stateManager.setState({ selectedAnnotation: `text-${textIndex}` });
  }

  /**
   * Handle text dragging movement
   */
  private handleTextDragging(event: MouseEvent): void {
    const dragState = this.stateManager.get('dragState') as DragState | undefined;
    if (dragState?.textIndex === undefined || !dragState.offset) {
      return;
    }

    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    const newPosition = {
      x: svgPoint.x - dragState.offset.x,
      y: svgPoint.y - dragState.offset.y,
    };

    // Update text position in layout data
    const currentState = this.stateManager.getState();
    const newLayoutData = { ...currentState.layoutData };
    if (newLayoutData.texts?.[dragState.textIndex]) {
      newLayoutData.texts = [...newLayoutData.texts];
      const existingText = newLayoutData.texts[dragState.textIndex];
      if (existingText) {
        newLayoutData.texts[dragState.textIndex] = {
          ...existingText,
          x: newPosition.x,
          y: newPosition.y,
        };
      }

      this.stateManager.updateLayoutData(newLayoutData);
    }
  }

  /**
   * End text dragging
   */
  private endTextDragging(_event: MouseEvent): void {
    this.stateManager.setInteractionMode('default');
  }

  /**
   * Handle text click
   */
  private handleTextClick(event: MouseEvent, textElement: Element): void {
    const textIndex = parseInt(textElement.getAttribute('data-index') || '');
    if (isNaN(textIndex)) {
      return;
    }

    console.log('Text clicked:', textIndex);

    // Select the text
    this.stateManager.setState({ selectedAnnotation: `text-${textIndex}` });

    // Emit custom event for text click
    this.emit('text-click', { textIndex, event });
  }

  // Event-specific handlers

  /**
   * Handle entity click
   */
  private handleEntityClick(event: MouseEvent, entityElement: Element): void {
    const tableName = entityElement.getAttribute('data-table');
    if (!tableName) {
      return;
    }

    console.log('Entity clicked:', tableName);

    // Emit custom event for entity click
    this.emit('entity-click', { tableName, event });
  }

  /**
   * Handle entity double-click
   */
  private handleEntityDoubleClick(event: MouseEvent, entityElement: Element): void {
    const tableName = entityElement.getAttribute('data-table');
    if (!tableName) {
      return;
    }

    console.log('Entity double-clicked:', tableName);

    // Emit custom event for entity double-click
    this.emit('entity-dblclick', { tableName, event });
  }

  /**
   * Handle relationship click
   */
  private handleRelationshipClick(event: MouseEvent, relationshipElement: Element): void {
    const fromTable = relationshipElement.getAttribute('data-from');
    const toTable = relationshipElement.getAttribute('data-to');

    if (!fromTable || !toTable) {
      return;
    }

    console.log('Relationship clicked:', fromTable, '->', toTable);

    // Emit custom event for relationship click
    this.emit('relationship-click', { fromTable, toTable, event });
  }

  /**
   * Handle canvas background click
   */
  private handleCanvasClick(event: MouseEvent): void {
    // Clear selections
    this.stateManager.setState({ selectedAnnotation: null });

    // Emit custom event for canvas click
    this.emit('canvas-click', { event });
  }

  /**
   * Handle hover effects
   */
  private handleHover(event: MouseEvent): void {
    let hoverTarget: Element | null = null;

    // Check if hovering over an entity
    if (event.target && (event.target as Element).closest) {
      const entityElement = (event.target as Element).closest('.entity');
      if (entityElement) {
        hoverTarget = entityElement;
      } else {
        // Check if hovering over a relationship
        const relationshipElement = (event.target as Element).closest('.relationship');
        if (relationshipElement) {
          hoverTarget = relationshipElement;
        }
      }
    }

    // Delegate to highlight manager
    if (this.highlightManager) {
      this.highlightManager.handleHover(hoverTarget);
    }
  }

  /**
   * Show context menu
   */
  private showContextMenu(event: MouseEvent): void {
    const svgPoint = this.coordinateTransform.screenToSVG(event.clientX, event.clientY, this.canvas);

    // Emit custom event for context menu
    this.emit('context-menu', {
      screenX: event.clientX,
      screenY: event.clientY,
      svgX: svgPoint.x,
      svgY: svgPoint.y,
      target: event.target,
      event,
    });
  }

  /**
   * Handle escape key
   */
  handleEscape(): void {
    this.stateManager.setInteractionMode('default');
    this.stateManager.setState({ selectedAnnotation: null });
  }

  /**
   * Handle delete key
   */
  handleDelete(): void {
    const selectedAnnotation = this.stateManager.get('selectedAnnotation');
    if (selectedAnnotation) {
      // Emit custom event for annotation deletion
      this.emit('delete-annotation', { selectedAnnotation });
    }
  }

  // Event emitter functionality

  /**
   * Emit custom event
   */
  emit(eventName: string, data: any): void {
    const customEvent = new CustomEvent(eventName, { detail: data });
    this.canvas.dispatchEvent(customEvent);
  }

  /**
   * Add custom event listener
   */
  on(eventName: string, handler: EventListener): void {
    this.canvas.addEventListener(eventName, handler);
  }

  /**
   * Remove custom event listener
   */
  off(eventName: string, handler: EventListener): void {
    this.canvas.removeEventListener(eventName, handler);
  }
}
