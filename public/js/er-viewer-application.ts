/**
 * ER Viewer Application - 統合されたアプリケーションクラス
 * 全てのロジックとステートを内包し、副作用はインフラストラクチャー層を通じて実行
 */
import type { Infrastructure, EventHandler as InfraEventHandler } from './types/infrastructure.js';
import type {
  ERData,
  LayoutData,
  ApplicationState,
  Entity,
  Relationship,
  Position,
  Bounds,
  Rectangle,
  Text,
  HistoryEntry,
} from './types/index.js';
import type { SVGMousePosition } from './types/dom.js';

// Internal types
type InteractionMode = 'default' | 'panning' | 'dragging' | 'creating';

interface ERViewerState extends ApplicationState {
  // Canvas and UI elements
  canvas: SVGSVGElement | null;
  sidebar: HTMLElement | null;
  sidebarContent: HTMLElement | null;
  buildInfoModal: HTMLElement | null;

  // Event handlers
  eventHandlers: Map<string, InfraEventHandler>;
  windowResizeHandler: (() => void) | null;

  // Highlight state
  highlightedEntities: Set<string>;
  highlightedRelationships: Set<string>;

  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // Clustering and routing
  clusteredPositions: Map<string, Position>;
  entityBounds: Map<string, Bounds>;
  routingCache: Map<string, Position[]>;
}

type StateUpdateCallback = (oldState: ERViewerState, newState: ERViewerState) => void;
type PropertyUpdateCallback<K extends keyof ERViewerState> = (
  oldValue: ERViewerState[K],
  newValue: ERViewerState[K],
) => void;

export class ERViewerApplication {
  private readonly infra: Infrastructure;
  private state: ERViewerState;
  private subscribers: Set<StateUpdateCallback>;
  private propertySubscribers: Map<keyof ERViewerState, Set<PropertyUpdateCallback<any>>>;

  constructor(infrastructure: Infrastructure) {
    this.infra = infrastructure;

    // State
    this.state = {
      // Application data
      erData: null,
      layoutData: { entities: {}, rectangles: [], texts: [], layers: [] },

      // View state
      viewport: {
        panX: 0,
        panY: 0,
        scale: 1,
      },

      // UI state
      selectedAnnotation: null,
      sidebarVisible: false,
      currentTable: null,
      contextMenu: null,

      // Interaction state
      interactionMode: 'default' as InteractionMode,
      dragState: null,

      // Application state
      loading: false,
      error: null,

      // Canvas and UI elements
      canvas: null,
      sidebar: null,
      sidebarContent: null,
      buildInfoModal: null,
      contextMenuElement: null,

      // Event handlers
      eventHandlers: new Map(),
      windowResizeHandler: null,

      // Highlight state
      highlightedEntities: new Set(),
      highlightedRelationships: new Set(),

      // Layer management
      layers: [],
      layerOrder: [],

      // History for undo/redo
      history: [],
      historyIndex: -1,
      maxHistorySize: 50,

      // Clustering and routing
      clusteredPositions: new Map(),
      entityBounds: new Map(),
      routingCache: new Map(),
    };

    // Event subscribers
    this.subscribers = new Set();
    this.propertySubscribers = new Map();

    // Initialize once DOM is loaded
    this.initializeWhenReady();
  }

  /**
   * Get current application state (for testing)
   */
  public getApplicationState(): ApplicationState {
    return { ...this.state };
  }

  /**
   * Initialize the application when DOM is ready
   */
  private initializeWhenReady(): void {
    // Since we can't check document.readyState through the infrastructure,
    // we'll try to initialize immediately and use a timeout as fallback
    if (this.infra.dom.getElementById('er-canvas')) {
      this.initialize();
    } else {
      // Wait for DOM to be ready
      this.infra.browserAPI.setTimeout(() => this.initialize(), 10);
    }
  }

  /**
   * Initialize the application
   */
  private initialize(): void {
    // Get canvas and UI elements
    this.state.canvas = this.infra.dom.getElementById('er-canvas') as SVGSVGElement | null;
    this.state.sidebar = this.infra.dom.getElementById('sidebar') as HTMLElement | null;
    this.state.sidebarContent = this.infra.dom.getElementById('sidebar-content') as HTMLElement | null;
    this.state.buildInfoModal = this.infra.dom.getElementById('build-info-modal') as HTMLElement | null;

    // Initialize canvas
    this.initializeCanvas();

    // Setup event handlers
    this.setupEventHandlers();

    // Load initial data
    this.loadERData();

    // Setup resize handler
    this.setupResizeHandler();

    this.infra.browserAPI.log('ER Viewer application initialized successfully');
  }

  /**
   * Initialize canvas
   */
  private initializeCanvas(): void {
    if (!this.state.canvas) {
      return;
    }

    // Clear canvas
    this.infra.dom.setInnerHTML(this.state.canvas, '');

    // Get canvas dimensions
    const rect = this.infra.dom.getBoundingClientRect(this.state.canvas);
    const width = rect.width || 800;
    const height = rect.height || 600;

    // Set canvas attributes
    this.infra.dom.setAttribute(this.state.canvas, 'width', width.toString());
    this.infra.dom.setAttribute(this.state.canvas, 'height', height.toString());
    this.infra.dom.setAttribute(this.state.canvas, 'viewBox', `0 0 ${width} ${height}`);
    this.infra.dom.setAttribute(this.state.canvas, 'xmlns', 'http://www.w3.org/2000/svg');

    // Create main group for transformations
    const mainGroup = this.infra.dom.createElement('g', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(mainGroup, 'id', 'main-group');
    this.infra.dom.appendChild(this.state.canvas, mainGroup);

    // Create layers
    const staticLayer = this.infra.dom.createElement('g', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(staticLayer, 'id', 'static-layer');
    this.infra.dom.appendChild(mainGroup, staticLayer);

    const dynamicLayer = this.infra.dom.createElement('g', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(dynamicLayer, 'id', 'dynamic-layer');
    this.infra.dom.appendChild(mainGroup, dynamicLayer);

    const annotationLayer = this.infra.dom.createElement('g', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(annotationLayer, 'id', 'annotation-layer');
    this.infra.dom.appendChild(mainGroup, annotationLayer);

    const highlightLayer = this.infra.dom.createElement('g', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(highlightLayer, 'id', 'highlight-layer');
    this.infra.dom.appendChild(mainGroup, highlightLayer);

    this.updateTransform();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Canvas events
    this.setupCanvasEvents();

    // UI button events
    this.setupUIButtonEvents();

    // Sidebar resize events
    this.setupSidebarResizeEvents();

    // Help panel events
    this.setupHelpPanelEvents();

    // Build info modal events
    this.setupBuildInfoModalEvents();

    // Layer order change events
    this.setupLayerOrderChangeEvents();
  }

  /**
   * Load ER data from server
   */
  private async loadERData(): Promise<void> {
    try {
      this.infra.browserAPI.log('Loading ER data...');
      this.setState({ loading: true, error: null });

      const erData = await this.infra.network.getJSON<ERData>('/api/er-data');
      this.setState({
        erData,
        layoutData: erData.layout || { entities: {}, rectangles: [], texts: [], layers: [] },
      });

      this.infra.browserAPI.log('ER data loaded successfully:', erData);
    } catch (error) {
      this.infra.browserAPI.error('Error loading ER data:', error);
      this.setState({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      this.setState({ loading: false });
    }
  }

  // State management methods

  /**
   * Get current state (read-only)
   */
  public getState(): Readonly<ERViewerState> {
    return { ...this.state };
  }

  /**
   * Set state with notifications
   */
  private setState(updates: Partial<ERViewerState>, saveToHistory: boolean = true): void {
    const oldState = { ...this.state };

    // Apply updates
    Object.assign(this.state, updates);

    // Save to history
    if (saveToHistory && this.shouldSaveToHistory(updates)) {
      const action = Object.keys(updates).join(', ');
      this.saveToHistory(action, oldState, this.state);
    }

    // Notify subscribers
    this.notifySubscribers(oldState, this.state);

    // Re-render if needed
    if (this.shouldRerender(updates)) {
      this.render();
    }
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(callback: StateUpdateCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Subscribe to specific property changes
   */
  public subscribeToProperty<K extends keyof ERViewerState>(key: K, callback: PropertyUpdateCallback<K>): () => void {
    if (!this.propertySubscribers.has(key)) {
      this.propertySubscribers.set(key, new Set());
    }
    const callbacks = this.propertySubscribers.get(key)!;
    callbacks.add(callback);
    return () => {
      if (this.propertySubscribers.has(key)) {
        this.propertySubscribers.get(key)?.delete(callback);
      }
    };
  }

  /**
   * Notify subscribers of state changes
   */
  private notifySubscribers(oldState: ERViewerState, newState: ERViewerState): void {
    // Notify general subscribers
    this.subscribers.forEach((callback) => {
      try {
        callback(oldState, newState);
      } catch (error) {
        this.infra.browserAPI.error('Error in state subscriber:', error);
      }
    });

    // Notify property subscribers
    this.propertySubscribers.forEach((callbacks, key) => {
      if (oldState[key] !== newState[key]) {
        callbacks.forEach((callback) => {
          try {
            callback(oldState[key], newState[key]);
          } catch (error) {
            this.infra.browserAPI.error(`Error in property subscriber for ${String(key)}:`, error);
          }
        });
      }
    });
  }

  /**
   * Check if state changes should trigger a re-render
   */
  private shouldRerender(updates: Partial<ERViewerState>): boolean {
    const renderKeys: Array<keyof ERViewerState> = [
      'erData',
      'layoutData',
      'viewport',
      'highlightedEntities',
      'highlightedRelationships',
    ];
    return Object.keys(updates).some((key) => renderKeys.includes(key as keyof ERViewerState));
  }

  /**
   * Check if state changes should be saved to history
   */
  private shouldSaveToHistory(updates: Partial<ERViewerState>): boolean {
    const historyKeys: Array<keyof ERViewerState> = ['layoutData', 'erData'];
    return Object.keys(updates).some((key) => historyKeys.includes(key as keyof ERViewerState));
  }

  /**
   * Save state to history
   */
  private saveToHistory(action: string, previousState: ERViewerState, nextState: ERViewerState): void {
    // Remove future history if we're not at the end
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    }

    // Add new state
    this.state.history.push({
      timestamp: Date.now(),
      action: action,
      previousState: {
        erData: previousState.erData,
        layoutData: previousState.layoutData,
      },
      nextState: {
        erData: nextState.erData,
        layoutData: nextState.layoutData,
      },
    });

    // Limit history size
    if (this.state.history.length > this.state.maxHistorySize) {
      this.state.history.shift();
    } else {
      this.state.historyIndex++;
    }
  }

  // Rendering methods

  /**
   * Main render method
   */
  private render(): void {
    if (!this.state.canvas) {
      return;
    }

    // Clear dynamic layer
    const dynamicLayer = this.infra.dom.getElementById('dynamic-layer');
    if (dynamicLayer) {
      this.infra.dom.setInnerHTML(dynamicLayer, '');
    }

    // Render entities
    this.renderEntities();

    // Render relationships
    this.renderRelationships();

    // Render annotations
    this.renderAnnotations();

    // Update transform
    this.updateTransform();
  }

  /**
   * Update canvas transform based on viewport
   */
  private updateTransform(): void {
    const mainGroup = this.infra.dom.getElementById('main-group');
    if (!mainGroup) {
      return;
    }

    const { panX, panY, scale } = this.state.viewport;
    const transform = `translate(${panX}, ${panY}) scale(${scale})`;
    this.infra.dom.setAttribute(mainGroup, 'transform', transform);
  }

  /**
   * Render entities
   */
  private renderEntities(): void {
    if (!this.state.erData?.entities) {
      return;
    }

    const dynamicLayer = this.infra.dom.getElementById('dynamic-layer');
    if (!dynamicLayer) {
      return;
    }

    this.state.erData.entities.forEach((entity) => {
      const position = this.getEntityPosition(entity.name);
      if (!position) {
        return;
      }

      // Create entity group
      const entityGroup = this.createEntityElement(entity, position);
      this.infra.dom.appendChild(dynamicLayer, entityGroup);
    });
  }

  /**
   * Create entity SVG element
   */
  private createEntityElement(entity: Entity, position: Position): Element {
    const group = this.infra.dom.createElement('g', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(group, 'class', 'entity draggable');
    this.infra.dom.setAttribute(group, 'data-table-name', entity.name);
    this.infra.dom.setAttribute(group, 'transform', `translate(${position.x}, ${position.y})`);

    // Calculate dimensions
    const padding = 10;
    const headerHeight = 30;
    const rowHeight = 20;
    const width = 200;
    const height = headerHeight + entity.columns.length * rowHeight + padding * 2;

    // Background rectangle
    const rect = this.infra.dom.createElement('rect', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(rect, 'width', width.toString());
    this.infra.dom.setAttribute(rect, 'height', height.toString());
    this.infra.dom.setAttribute(rect, 'rx', '5');
    this.infra.dom.setAttribute(rect, 'fill', '#f5f5f5');
    this.infra.dom.setAttribute(rect, 'stroke', '#333');
    this.infra.dom.setAttribute(rect, 'stroke-width', '1');
    this.infra.dom.appendChild(group, rect);

    // Header
    const headerRect = this.infra.dom.createElement('rect', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(headerRect, 'width', width.toString());
    this.infra.dom.setAttribute(headerRect, 'height', headerHeight.toString());
    this.infra.dom.setAttribute(headerRect, 'rx', '5');
    this.infra.dom.setAttribute(headerRect, 'fill', '#4a5568');
    this.infra.dom.appendChild(group, headerRect);

    // Table name
    const title = this.infra.dom.createElement('text', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(title, 'x', (width / 2).toString());
    this.infra.dom.setAttribute(title, 'y', (headerHeight / 2 + 5).toString());
    this.infra.dom.setAttribute(title, 'text-anchor', 'middle');
    this.infra.dom.setAttribute(title, 'fill', 'white');
    this.infra.dom.setAttribute(title, 'font-weight', 'bold');
    this.infra.dom.setInnerHTML(title, entity.name);
    this.infra.dom.appendChild(group, title);

    // Columns
    entity.columns.forEach((column, index) => {
      const y = headerHeight + index * rowHeight + rowHeight / 2 + 5;

      // Column text
      const columnText = this.infra.dom.createElement('text', 'http://www.w3.org/2000/svg');
      this.infra.dom.setAttribute(columnText, 'x', padding.toString());
      this.infra.dom.setAttribute(columnText, 'y', y.toString());
      this.infra.dom.setAttribute(columnText, 'fill', '#333');
      this.infra.dom.setAttribute(columnText, 'font-size', '12');

      const isPrimaryKey = column.key === 'PRI';
      const columnContent = `${isPrimaryKey ? '🔑 ' : ''}${column.name} (${column.type})`;
      this.infra.dom.setInnerHTML(columnText, columnContent);
      this.infra.dom.appendChild(group, columnText);
    });

    // Store bounds for routing
    this.state.entityBounds.set(entity.name, {
      x: position.x,
      y: position.y,
      width,
      height,
    });

    return group;
  }

  /**
   * Get entity position
   */
  private getEntityPosition(entityName: string): Position | null {
    // Check layout data first
    if (this.state.layoutData.entities[entityName]) {
      return this.state.layoutData.entities[entityName].position;
    }

    // Check clustered positions
    if (this.state.clusteredPositions.has(entityName)) {
      return this.state.clusteredPositions.get(entityName)!;
    }

    // Calculate new position
    return this.calculateClusteredPosition(entityName);
  }

  /**
   * Calculate clustered position for entity
   */
  private calculateClusteredPosition(entityName: string): Position {
    const entity = this.state.erData?.entities.find((e) => e.name === entityName);
    if (!entity || !this.state.erData) {
      return { x: 0, y: 0 };
    }

    // Simple grid layout for now
    const index = this.state.erData.entities.indexOf(entity);
    const cols = Math.ceil(Math.sqrt(this.state.erData.entities.length));
    const row = Math.floor(index / cols);
    const col = index % cols;

    const position: Position = {
      x: col * 250 + 50,
      y: row * 200 + 50,
    };

    this.state.clusteredPositions.set(entityName, position);
    return position;
  }

  /**
   * Render relationships
   */
  private renderRelationships(): void {
    if (!this.state.erData?.relationships) {
      return;
    }

    const dynamicLayer = this.infra.dom.getElementById('dynamic-layer');
    if (!dynamicLayer) {
      return;
    }

    // Remove existing relationship groups first
    const existingGroups = Array.from(dynamicLayer.children).filter(
      (child) => child.getAttribute && child.getAttribute('class') === 'relationships',
    );
    existingGroups.forEach((group) => {
      this.infra.dom.removeElement(group);
    });

    // Create relationships group
    const relationshipsGroup = this.infra.dom.createElement('g', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(relationshipsGroup, 'class', 'relationships');

    this.state.erData.relationships.forEach((relationship) => {
      const path = this.createRelationshipPath(relationship);
      if (path) {
        this.infra.dom.appendChild(relationshipsGroup, path);
      }
    });

    // Insert before entities
    const firstEntity = Array.from(dynamicLayer.children).find(
      (child) => child.getAttribute && child.getAttribute('class') && child.getAttribute('class')!.includes('entity'),
    );

    if (firstEntity) {
      dynamicLayer.insertBefore(relationshipsGroup, firstEntity);
    } else {
      this.infra.dom.appendChild(dynamicLayer, relationshipsGroup);
    }
  }

  /**
   * Create relationship path
   */
  private createRelationshipPath(relationship: Relationship): Element | null {
    const fromBounds = this.state.entityBounds.get(relationship.from);
    const toBounds = this.state.entityBounds.get(relationship.to);

    if (!fromBounds || !toBounds) {
      return null;
    }

    // Calculate connection points
    const points = this.calculateConnectionPoints(fromBounds, toBounds);

    // Create path
    const path = this.infra.dom.createElement('path', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(path, 'class', 'relationship');
    this.infra.dom.setAttribute(path, 'd', `M ${points.from.x} ${points.from.y} L ${points.to.x} ${points.to.y}`);
    this.infra.dom.setAttribute(path, 'stroke', '#666');
    this.infra.dom.setAttribute(path, 'stroke-width', '2');
    this.infra.dom.setAttribute(path, 'fill', 'none');
    this.infra.dom.setAttribute(path, 'data-from-table', relationship.from);
    this.infra.dom.setAttribute(path, 'data-to-table', relationship.to);

    return path;
  }

  /**
   * Calculate connection points between entities
   */
  private calculateConnectionPoints(fromBounds: Bounds, toBounds: Bounds): { from: Position; to: Position } {
    // Simple center-to-center for now
    return {
      from: {
        x: fromBounds.x + fromBounds.width / 2,
        y: fromBounds.y + fromBounds.height / 2,
      },
      to: {
        x: toBounds.x + toBounds.width / 2,
        y: toBounds.y + toBounds.height / 2,
      },
    };
  }

  /**
   * Render annotations
   */
  private renderAnnotations(): void {
    const annotationLayer = this.infra.dom.getElementById('annotation-layer');
    if (!annotationLayer) {
      return;
    }

    this.infra.dom.setInnerHTML(annotationLayer, '');

    // Render rectangles
    if (this.state.layoutData.rectangles) {
      this.state.layoutData.rectangles.forEach((rect, index) => {
        const rectElement = this.createRectangleAnnotation(rect, index);
        this.infra.dom.appendChild(annotationLayer, rectElement);
      });
    }

    // Render texts
    if (this.state.layoutData.texts) {
      this.state.layoutData.texts.forEach((text, index) => {
        const textElement = this.createTextAnnotation(text, index);
        this.infra.dom.appendChild(annotationLayer, textElement);
      });
    }
  }

  /**
   * Create rectangle annotation
   */
  private createRectangleAnnotation(rect: Rectangle, index: number): Element {
    const rectElement = this.infra.dom.createElement('rect', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(rectElement, 'class', 'annotation-rectangle');
    this.infra.dom.setAttribute(rectElement, 'data-rect-index', index.toString());
    this.infra.dom.setAttribute(rectElement, 'x', rect.x.toString());
    this.infra.dom.setAttribute(rectElement, 'y', rect.y.toString());
    this.infra.dom.setAttribute(rectElement, 'width', rect.width.toString());
    this.infra.dom.setAttribute(rectElement, 'height', rect.height.toString());
    this.infra.dom.setAttribute(rectElement, 'fill', rect.color || '#e3f2fd');
    this.infra.dom.setAttribute(rectElement, 'stroke', rect.color || '#1976d2');
    this.infra.dom.setAttribute(rectElement, 'stroke-width', '2');
    return rectElement;
  }

  /**
   * Create text annotation
   */
  private createTextAnnotation(text: Text, index: number): Element {
    const textElement = this.infra.dom.createElement('text', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(textElement, 'class', 'annotation-text');
    this.infra.dom.setAttribute(textElement, 'data-text-index', index.toString());
    this.infra.dom.setAttribute(textElement, 'x', text.x.toString());
    this.infra.dom.setAttribute(textElement, 'y', text.y.toString());
    this.infra.dom.setAttribute(textElement, 'fill', text.color || '#2c3e50');
    this.infra.dom.setAttribute(textElement, 'font-size', (text.fontSize || 14).toString());
    this.infra.dom.setInnerHTML(textElement, text.content);
    return textElement;
  }

  // Canvas event handlers

  /**
   * Setup canvas events
   */
  private setupCanvasEvents(): void {
    if (!this.state.canvas) {
      return;
    }

    // Mouse events
    this.infra.dom.addEventListener(this.state.canvas, 'mousedown', (e) => this.handleCanvasMouseDown(e));
    this.infra.dom.addEventListener(this.state.canvas, 'mousemove', (e) => this.handleCanvasMouseMove(e));
    this.infra.dom.addEventListener(this.state.canvas, 'mouseup', (e) => this.handleCanvasMouseUp(e));
    this.infra.dom.addEventListener(this.state.canvas, 'wheel', (e) => this.handleCanvasWheel(e));
    this.infra.dom.addEventListener(this.state.canvas, 'click', (e) => this.handleCanvasClick(e));
    this.infra.dom.addEventListener(this.state.canvas, 'dblclick', (e) => this.handleCanvasDoubleClick(e));
    this.infra.dom.addEventListener(this.state.canvas, 'contextmenu', (e) => this.handleCanvasContextMenu(e));

    // Document events for drag
    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'mousemove', (e) =>
      this.handleDocumentMouseMove(e),
    );
    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'mouseup', (e) =>
      this.handleDocumentMouseUp(e),
    );
  }

  /**
   * Handle canvas mouse down
   */
  private handleCanvasMouseDown(event: MouseEvent): void {
    const target = event.target as Element;
    const rect = this.infra.dom.getBoundingClientRect(this.state.canvas!);
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const svgPoint = this.screenToSVG(screenX, screenY);

    // Check if clicking on entity
    const entity = this.infra.dom.closest(target, '.entity');
    if (entity) {
      event.preventDefault();
      this.startEntityDrag(entity, svgPoint);
      return;
    }

    // Check if clicking on annotation
    if (this.infra.dom.hasClass(target, 'annotation-rectangle') || this.infra.dom.hasClass(target, 'annotation-text')) {
      event.preventDefault();
      this.selectAnnotation(target);
      return;
    }

    // Start pan if middle mouse or shift+left
    if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
      event.preventDefault();
      this.startPan(screenX, screenY);
    }
  }

  /**
   * Start entity drag
   */
  private startEntityDrag(entity: Element, startPoint: SVGMousePosition): void {
    const tableName = this.infra.dom.getAttribute(entity, 'data-table-name') || '';
    const transform = this.infra.dom.getAttribute(entity, 'transform') || '';
    const match = transform.match(/translate\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\)/);

    if (match?.[1] && match[2]) {
      this.setState({
        interactionMode: 'dragging' as InteractionMode,
        dragState: {
          type: 'entity',
          element: entity,
          tableName: tableName,
          startX: startPoint.x,
          startY: startPoint.y,
          originalX: parseFloat(match[1]),
          originalY: parseFloat(match[2]),
          currentX: startPoint.x,
          currentY: startPoint.y,
        },
      });
    }
  }

  /**
   * Start pan
   */
  private startPan(screenX: number, screenY: number): void {
    this.setState({
      interactionMode: 'panning' as InteractionMode,
      dragState: {
        type: 'pan',
        startX: screenX,
        startY: screenY,
        originalX: 0,
        originalY: 0,
        currentX: screenX,
        currentY: screenY,
        originalPanX: this.state.viewport.panX,
        originalPanY: this.state.viewport.panY,
      },
    });
  }

  /**
   * Handle canvas mouse move
   */
  private handleCanvasMouseMove(event: MouseEvent): void {
    if (this.state.interactionMode === 'default') {
      this.updateHover(event);
    }
  }

  /**
   * Handle document mouse move
   */
  private handleDocumentMouseMove(event: MouseEvent): void {
    if (this.state.interactionMode === 'dragging') {
      this.updateDrag(event);
    } else if (this.state.interactionMode === 'panning') {
      this.updatePan(event);
    }
  }

  /**
   * Update entity drag
   */
  private updateDrag(event: MouseEvent): void {
    if (!this.state.dragState || this.state.dragState.type !== 'entity') {
      return;
    }

    const rect = this.infra.dom.getBoundingClientRect(this.state.canvas!);
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const svgPoint = this.screenToSVG(screenX, screenY);

    const deltaX = svgPoint.x - this.state.dragState.startX;
    const deltaY = svgPoint.y - this.state.dragState.startY;

    const newX = this.state.dragState.originalX + deltaX;
    const newY = this.state.dragState.originalY + deltaY;

    // Update entity position
    if (this.state.dragState.element) {
      this.infra.dom.setAttribute(this.state.dragState.element, 'transform', `translate(${newX}, ${newY})`);
    }

    // Update bounds
    if (this.state.dragState.tableName) {
      const bounds = this.state.entityBounds.get(this.state.dragState.tableName);
      if (bounds) {
        bounds.x = newX;
        bounds.y = newY;
      }
    }

    // Re-render relationships
    this.renderRelationships();
  }

  /**
   * Update pan
   */
  private updatePan(event: MouseEvent): void {
    if (!this.state.dragState || this.state.dragState.type !== 'pan') {
      return;
    }

    const rect = this.infra.dom.getBoundingClientRect(this.state.canvas!);
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const deltaX = screenX - this.state.dragState.startX;
    const deltaY = screenY - this.state.dragState.startY;

    this.setState(
      {
        viewport: {
          ...this.state.viewport,
          panX: this.state.dragState.originalPanX! + deltaX,
          panY: this.state.dragState.originalPanY! + deltaY,
        },
      },
      false,
    );
  }

  /**
   * Handle mouse up
   */
  private handleCanvasMouseUp(_event: MouseEvent): void {
    this.endInteraction();
  }

  /**
   * Handle document mouse up
   */
  private handleDocumentMouseUp(_event: MouseEvent): void {
    this.endInteraction();
  }

  /**
   * End interaction
   */
  private endInteraction(): void {
    if (this.state.interactionMode === 'dragging' && this.state.dragState) {
      // Save entity position
      if (this.state.dragState.type === 'entity' && this.state.dragState.tableName) {
        const bounds = this.state.entityBounds.get(this.state.dragState.tableName);
        if (bounds) {
          const newLayoutData = { ...this.state.layoutData };
          newLayoutData.entities[this.state.dragState.tableName] = {
            position: {
              x: bounds.x,
              y: bounds.y,
            },
          };
          this.setState({ layoutData: newLayoutData });
        }
      }
    }

    this.setState({
      interactionMode: 'default' as InteractionMode,
      dragState: null,
    });
  }

  /**
   * Handle canvas wheel
   */
  private handleCanvasWheel(event: WheelEvent): void {
    event.preventDefault();

    const rect = this.infra.dom.getBoundingClientRect(this.state.canvas!);
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, this.state.viewport.scale * delta));

    // Adjust pan to zoom towards mouse position
    const svgPointBefore = this.screenToSVG(screenX, screenY);

    this.setState(
      {
        viewport: {
          ...this.state.viewport,
          scale: newScale,
        },
      },
      false,
    );

    const svgPointAfter = this.screenToSVG(screenX, screenY);

    this.setState(
      {
        viewport: {
          ...this.state.viewport,
          panX: this.state.viewport.panX + (svgPointAfter.x - svgPointBefore.x) * newScale,
          panY: this.state.viewport.panY + (svgPointAfter.y - svgPointBefore.y) * newScale,
        },
      },
      false,
    );
  }

  /**
   * Handle canvas click
   */
  private handleCanvasClick(event: MouseEvent): void {
    const target = event.target as Element;

    // Check if clicking on entity
    const entity = this.infra.dom.closest(target, '.entity');
    if (entity) {
      const tableName = this.infra.dom.getAttribute(entity, 'data-table-name');
      if (tableName) {
        this.showTableDetails(tableName);
      }
    }
  }

  /**
   * Handle canvas double click
   */
  private handleCanvasDoubleClick(_event: MouseEvent): void {
    // Implement double click behavior
  }

  /**
   * Handle canvas context menu
   */
  private handleCanvasContextMenu(event: MouseEvent): void {
    event.preventDefault();

    const rect = this.infra.dom.getBoundingClientRect(this.state.canvas!);
    const screenX = event.clientX;
    const screenY = event.clientY;
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    const svgPoint = this.screenToSVG(canvasX, canvasY);

    this.showContextMenu(screenX, screenY, svgPoint, event.target as Element);
  }

  /**
   * Convert screen coordinates to SVG coordinates
   */
  private screenToSVG(screenX: number, screenY: number): SVGMousePosition {
    const { panX, panY, scale } = this.state.viewport;
    const svgX = (screenX - panX) / scale;
    const svgY = (screenY - panY) / scale;
    return {
      x: svgX,
      y: svgY,
      clientX: screenX,
      clientY: screenY,
      svgX: svgX,
      svgY: svgY,
    };
  }

  /**
   * Show table details in sidebar
   */
  private async showTableDetails(tableName: string): Promise<void> {
    try {
      this.infra.browserAPI.log('showTableDetails called with tableName:', tableName);
      const response = await this.infra.network.fetch(`/api/table/${tableName}/ddl`);

      if (response.ok) {
        const data = (await response.json()) as { ddl: string };
        this.infra.browserAPI.log('DDL data received:', data);
        this.showSidebar(tableName, data.ddl);
      } else {
        this.infra.browserAPI.error('Failed to fetch DDL:', response.status, response.statusText);
      }
    } catch (error) {
      this.infra.browserAPI.error(
        'Error loading table details:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Show sidebar with content
   */
  private showSidebar(tableName: string, ddl: string): void {
    if (!this.state.sidebar || !this.state.sidebarContent) {
      return;
    }

    // Update sidebar content
    const content = `
            <h2>${tableName}</h2>
            <pre><code class="language-sql">${this.escapeHtml(ddl)}</code></pre>
        `;
    this.infra.dom.setInnerHTML(this.state.sidebarContent, content);

    // Show sidebar
    this.infra.dom.removeClass(this.state.sidebar, 'hidden');

    // Highlight syntax if available
    const codeElement = this.infra.dom.querySelector('#sidebar-content code');
    if (codeElement && typeof (window as any).Prism !== 'undefined') {
      (window as any).Prism.highlightElement(codeElement);
    }

    this.setState({ sidebarVisible: true, currentTable: tableName });
  }

  /**
   * Close sidebar
   */
  private closeSidebar(): void {
    if (this.state.sidebar) {
      this.infra.dom.addClass(this.state.sidebar, 'hidden');
      this.setState({ sidebarVisible: false, currentTable: null });
    }
  }

  /**
   * Show context menu
   */
  private showContextMenu(screenX: number, screenY: number, svgPoint: SVGMousePosition, _target: Element): void {
    this.hideContextMenu();

    // Create menu
    const menu = this.infra.dom.createElement('div');
    this.infra.dom.setAttribute(menu, 'id', 'context-menu');
    this.infra.dom.setAttribute(menu, 'class', 'context-menu');
    this.infra.dom.setStyles(menu, {
      position: 'fixed',
      left: `${screenX}px`,
      top: `${screenY}px`,
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '4px 0',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: '1000',
    });

    // Add menu items
    const items = [
      { label: '矩形を追加', action: () => this.addRectangleAtPosition(svgPoint.x, svgPoint.y) },
      { label: 'テキストを追加', action: () => this.addTextAtPosition(svgPoint.x, svgPoint.y) },
    ];

    items.forEach((item) => {
      const menuItem = this.infra.dom.createElement('div');
      this.infra.dom.setAttribute(menuItem, 'class', 'context-menu-item');
      this.infra.dom.setInnerHTML(menuItem, item.label);
      this.infra.dom.setStyles(menuItem, {
        padding: '8px 16px',
        cursor: 'pointer',
      });

      this.infra.dom.addEventListener(menuItem, 'click', () => {
        item.action();
        this.hideContextMenu();
      });

      this.infra.dom.addEventListener(menuItem, 'mouseenter', () => {
        this.infra.dom.setStyles(menuItem, { background: '#f0f0f0' });
      });

      this.infra.dom.addEventListener(menuItem, 'mouseleave', () => {
        this.infra.dom.setStyles(menuItem, { background: 'transparent' });
      });

      this.infra.dom.appendChild(menu, menuItem);
    });

    // Add to body
    this.infra.dom.appendChild(this.infra.dom.getBodyElement(), menu);

    // Close on outside click
    this.infra.browserAPI.setTimeout(() => {
      this.infra.dom.addEventListener(
        this.infra.dom.getDocumentElement(),
        'click',
        () => {
          this.hideContextMenu();
        },
        { once: true },
      );
    }, 0);

    this.setState({
      contextMenuElement: menu,
      contextMenu: {
        x: screenX,
        y: screenY,
        items: items,
        visible: true,
      },
    });
  }

  /**
   * Hide context menu
   */
  private hideContextMenu(): void {
    if (this.state.contextMenuElement) {
      this.infra.dom.removeElement(this.state.contextMenuElement);
      this.setState({
        contextMenu: null,
        contextMenuElement: null,
      });
    }
  }

  /**
   * Add rectangle at position
   */
  private addRectangleAtPosition(x: number, y: number): void {
    const newLayoutData = { ...this.state.layoutData };
    if (!newLayoutData.rectangles) {
      newLayoutData.rectangles = [];
    }

    const newRect: Rectangle = {
      id: `rect-${Date.now()}`,
      x: x,
      y: y,
      width: 100,
      height: 60,
      color: '#e3f2fd',
    };

    newLayoutData.rectangles.push(newRect);
    this.setState({ layoutData: newLayoutData });

    this.infra.browserAPI.log('Rectangle added at:', x, y);
  }

  /**
   * Add text at position
   */
  private addTextAtPosition(x: number, y: number): void {
    const text = this.infra.browserAPI.prompt('テキストを入力してください:');
    if (!text) {
      return;
    }

    const newLayoutData = { ...this.state.layoutData };
    if (!newLayoutData.texts) {
      newLayoutData.texts = [];
    }

    const newText: Text = {
      id: `text-${Date.now()}`,
      x: x,
      y: y,
      content: text,
      color: '#2c3e50',
      fontSize: 14,
    };

    newLayoutData.texts.push(newText);
    this.setState({ layoutData: newLayoutData });
  }

  /**
   * Setup UI button events
   */
  private setupUIButtonEvents(): void {
    // Reverse Engineer button
    const reverseBtn = this.infra.dom.getElementById('reverse-engineer');
    if (reverseBtn) {
      this.infra.dom.addEventListener(reverseBtn, 'click', async () => {
        try {
          await this.reverseEngineer();
        } catch (error) {
          this.infra.browserAPI.error('Reverse engineering failed', error);
        }
      });
    }

    // Save Layout button
    const saveBtn = this.infra.dom.getElementById('save-layout');
    if (saveBtn) {
      this.infra.dom.addEventListener(saveBtn, 'click', async () => {
        try {
          await this.saveLayout();
        } catch (error) {
          this.infra.browserAPI.error('Save layout failed', error);
        }
      });
    }

    // Close Sidebar button
    const closeSidebarBtn = this.infra.dom.getElementById('close-sidebar');
    if (closeSidebarBtn) {
      this.infra.dom.addEventListener(closeSidebarBtn, 'click', () => {
        this.closeSidebar();
      });
    }
  }

  /**
   * Reverse engineer database
   */
  private async reverseEngineer(): Promise<void> {
    this.infra.browserAPI.log('Starting reverse engineering...');
    this.showLoading('リバースエンジニアリング中...');

    try {
      const response = await this.infra.network.fetch('/api/reverse-engineer', { method: 'POST' });
      if (response.ok) {
        const erData = (await response.json()) as ERData;

        // Clear existing positions to force clustering
        erData.entities.forEach((entity) => {
          delete entity.position;
        });

        this.setState({
          erData,
          layoutData: erData.layout || { entities: {}, rectangles: [], texts: [] },
        });
      } else {
        const errorText = await response.text();
        this.infra.browserAPI.error(`Reverse engineering failed: ${response.status} ${response.statusText}`, errorText);
        this.showError('リバースエンジニアリングに失敗しました', `${response.status}: ${errorText}`);
      }
    } catch (error) {
      this.infra.browserAPI.error('Error during reverse engineering:', error);
      this.showError(
        'リバースエンジニアリング中にエラーが発生しました',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Save layout
   */
  private async saveLayout(): Promise<void> {
    try {
      await this.infra.network.postJSON('/api/layout', this.state.layoutData);
      this.showSuccess('レイアウトが保存されました');
    } catch (error) {
      this.infra.browserAPI.error('Error saving layout:', error);
      this.showError('レイアウトの保存に失敗しました', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Setup sidebar resize events
   */
  private setupSidebarResizeEvents(): void {
    const sidebar = this.infra.dom.getElementById('sidebar');
    const resizeHandle = this.infra.dom.querySelector('.sidebar-resize-handle');
    if (!sidebar || !resizeHandle) {
      return;
    }

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    this.infra.dom.addEventListener(resizeHandle, 'mousedown', (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = this.infra.dom.getOffsetWidth(sidebar);
      this.infra.dom.addClass(resizeHandle, 'dragging');
      this.infra.dom.setStyles(this.infra.dom.getBodyElement(), { cursor: 'col-resize' });
      e.preventDefault();
    });

    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'mousemove', (e: MouseEvent) => {
      if (!isResizing) {
        return;
      }

      const deltaX = startX - e.clientX;
      const newWidth = startWidth + deltaX;

      if (newWidth >= 200) {
        this.infra.dom.setStyles(sidebar, { width: `${newWidth}px` });
      }
    });

    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'mouseup', () => {
      if (isResizing) {
        isResizing = false;
        this.infra.dom.removeClass(resizeHandle, 'dragging');
        this.infra.dom.setStyles(this.infra.dom.getBodyElement(), { cursor: '' });
      }
    });
  }

  /**
   * Setup help panel events
   */
  private setupHelpPanelEvents(): void {
    const helpPanel = this.infra.dom.getElementById('help-panel');
    const helpToggle = this.infra.dom.getElementById('help-toggle');
    const helpContent = this.infra.dom.getElementById('help-content');
    const helpHeader = this.infra.dom.querySelector('.help-panel-header');

    if (!helpPanel || !helpToggle || !helpContent || !helpHeader) {
      this.infra.browserAPI.warn('Help panel elements not found');
      return;
    }

    // Load collapsed state from localStorage
    const isCollapsed = this.infra.storage.getItem<boolean>('helpPanelCollapsed') === true;
    if (isCollapsed) {
      this.infra.dom.addClass(helpContent, 'collapsed');
      this.infra.dom.addClass(helpToggle, 'collapsed');
      this.infra.dom.setInnerHTML(helpToggle, '▶');
    }

    // Toggle function
    const toggleHelpPanel = (): void => {
      const isCurrentlyCollapsed = this.infra.dom.hasClass(helpContent, 'collapsed');

      if (isCurrentlyCollapsed) {
        this.infra.dom.removeClass(helpContent, 'collapsed');
        this.infra.dom.removeClass(helpToggle, 'collapsed');
        this.infra.dom.setInnerHTML(helpToggle, '▼');
        this.infra.storage.setItem('helpPanelCollapsed', false);
      } else {
        this.infra.dom.addClass(helpContent, 'collapsed');
        this.infra.dom.addClass(helpToggle, 'collapsed');
        this.infra.dom.setInnerHTML(helpToggle, '▶');
        this.infra.storage.setItem('helpPanelCollapsed', true);
      }
    };

    // Add event listeners
    this.infra.dom.addEventListener(helpToggle, 'click', (e: Event) => {
      e.stopPropagation();
      toggleHelpPanel();
    });

    this.infra.dom.addEventListener(helpHeader, 'click', toggleHelpPanel);
  }

  /**
   * Setup build info modal events
   */
  private setupBuildInfoModalEvents(): void {
    const buildInfo = this.infra.dom.getElementById('build-info');
    const buildInfoModal = this.infra.dom.getElementById('build-info-modal');
    const closeBuildInfo = this.infra.dom.getElementById('close-build-info');

    if (buildInfo && buildInfoModal) {
      this.infra.dom.addEventListener(buildInfo, 'click', () => {
        this.showBuildInfo();
      });
    }

    if (closeBuildInfo && buildInfoModal) {
      this.infra.dom.addEventListener(closeBuildInfo, 'click', () => {
        this.hideBuildInfo();
      });
    }

    if (buildInfoModal) {
      this.infra.dom.addEventListener(buildInfoModal, 'click', (e: Event) => {
        if (e.target === buildInfoModal) {
          this.hideBuildInfo();
        }
      });
    }
  }

  /**
   * Show build info modal
   */
  private showBuildInfo(): void {
    if (this.state.buildInfoModal) {
      this.infra.dom.removeClass(this.state.buildInfoModal, 'hidden');
    }
  }

  /**
   * Hide build info modal
   */
  private hideBuildInfo(): void {
    if (this.state.buildInfoModal) {
      this.infra.dom.addClass(this.state.buildInfoModal, 'hidden');
    }
  }

  /**
   * Setup layer order change events
   */
  private setupLayerOrderChangeEvents(): void {
    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'layerOrderChanged', (e: CustomEvent) => {
      this.infra.browserAPI.log('Layer order changed:', e.detail);
      if (e.detail?.layers) {
        const newLayoutData = { ...this.state.layoutData };
        newLayoutData.layers = e.detail.layers;
        this.setState({ layoutData: newLayoutData });
      }
    });
  }

  /**
   * Setup window resize handler
   */
  private setupResizeHandler(): void {
    // Initial canvas resize
    this.infra.browserAPI.setTimeout(() => {
      this.resizeCanvas();
    }, 100);

    // Handle window resize
    this.infra.browserAPI.addWindowEventListener('resize', () => {
      this.resizeCanvas();
    });
  }

  /**
   * Resize canvas
   */
  private resizeCanvas(): void {
    if (!this.state.canvas) {
      return;
    }

    const rect = this.infra.dom.getBoundingClientRect(this.state.canvas);
    const width = rect.width;
    const height = rect.height;

    this.infra.dom.setAttribute(this.state.canvas, 'width', width.toString());
    this.infra.dom.setAttribute(this.state.canvas, 'height', height.toString());
    this.infra.dom.setAttribute(this.state.canvas, 'viewBox', `0 0 ${width} ${height}`);

    this.render();
  }

  /**
   * Update hover state
   */
  private updateHover(event: MouseEvent): void {
    const target = event.target as Element;

    // Clear previous highlights
    this.clearHighlights();

    // Check if hovering over entity
    const entity = this.infra.dom.closest(target, '.entity');
    if (entity) {
      this.highlightEntity(entity);
    }

    // Check if hovering over relationship
    if (this.infra.dom.hasClass(target, 'relationship')) {
      this.highlightRelationship(target);
    }
  }

  /**
   * Clear all highlights
   */
  private clearHighlights(): void {
    const highlightLayer = this.infra.dom.getElementById('highlight-layer');
    if (highlightLayer) {
      this.infra.dom.setInnerHTML(highlightLayer, '');
    }
    this.setState({ highlightedEntities: new Set(), highlightedRelationships: new Set() });
  }

  /**
   * Highlight entity
   */
  private highlightEntity(entity: Element): void {
    const tableName = this.infra.dom.getAttribute(entity, 'data-table-name');
    if (tableName) {
      this.state.highlightedEntities.add(tableName);
    }

    // Add highlight effect
    this.infra.dom.addClass(entity, 'highlighted');
  }

  /**
   * Highlight relationship
   */
  private highlightRelationship(relationship: Element): void {
    const fromTable = this.infra.dom.getAttribute(relationship, 'data-from-table');
    const toTable = this.infra.dom.getAttribute(relationship, 'data-to-table');

    if (fromTable && toTable) {
      this.state.highlightedRelationships.add(`${fromTable}-${toTable}`);
    }

    // Add highlight effect
    this.infra.dom.addClass(relationship, 'highlighted');
  }

  /**
   * Select annotation
   */
  private selectAnnotation(element: Element): void {
    const annotationId = this.infra.dom.getAttribute(element, 'data-id') || '';
    this.setState({ selectedAnnotation: annotationId });

    // Add selection visual
    this.infra.dom.addClass(element, 'selected');
  }

  // UI utility methods

  /**
   * Show loading overlay
   */
  private showLoading(message: string): void {
    const loading = this.infra.dom.createElement('div');
    this.infra.dom.setAttribute(loading, 'id', 'loading-overlay');
    this.infra.dom.setAttribute(loading, 'class', 'loading');
    this.infra.dom.setInnerHTML(loading, message);
    this.infra.dom.appendChild(this.infra.dom.getBodyElement(), loading);
  }

  /**
   * Hide loading overlay
   */
  private hideLoading(): void {
    const loading = this.infra.dom.getElementById('loading-overlay');
    if (loading) {
      this.infra.dom.removeElement(loading);
    }
  }

  /**
   * Show error notification
   */
  private showError(message: string, details?: string): void {
    this.showNotification(`エラー: ${message}${details ? '\n詳細: ' + details : ''}`, 'error');
  }

  /**
   * Show success notification
   */
  private showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const notification = this.infra.dom.createElement('div');
    this.infra.dom.setAttribute(notification, 'class', `notification notification-${type}`);
    this.infra.dom.setInnerHTML(notification, message);

    // Add to DOM
    this.infra.dom.appendChild(this.infra.dom.getBodyElement(), notification);

    // Trigger animation
    this.infra.browserAPI.setTimeout(() => {
      this.infra.dom.addClass(notification, 'show');
    }, 10);

    // Auto-remove after 4 seconds
    this.infra.browserAPI.setTimeout(() => {
      this.infra.dom.removeClass(notification, 'show');
      this.infra.browserAPI.setTimeout(() => {
        this.infra.dom.removeElement(notification);
      }, 300);
    }, 4000);
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = this.infra.dom.createElement('div');
    (div as HTMLDivElement).textContent = text;
    return (div as HTMLDivElement).innerHTML;
  }

  // Public API methods for external access

  /**
   * Get current ER data
   */
  public getERData(): ERData | null {
    return this.state.erData;
  }

  /**
   * Get current layout data
   */
  public getLayoutData(): LayoutData {
    return this.state.layoutData;
  }

  /**
   * Update ER data
   */
  public setERData(erData: ERData): void {
    this.setState({ erData });
  }

  /**
   * Update layout data
   */
  public setLayoutData(layoutData: LayoutData): void {
    this.setState({ layoutData });
  }
}
