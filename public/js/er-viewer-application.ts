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
  Column,
  Relationship,
  Position,
  Bounds,
  Rectangle,
  Text,
  HistoryEntry,
  Layer,
} from './types/index.js';
import type { SVGMousePosition } from './types/dom.js';
import { LayerManager } from './layer-manager.js';
import { ClusteringEngine } from './clustering/clustering-engine.js';

// Build info type definition
interface BuildInfo {
  version?: string;
  name?: string;
  buildTime?: string;
  buildDate?: string;
  git?: {
    commit?: string;
    commitShort?: string;
    branch?: string;
    tag?: string | null;
  };
  nodeVersion?: string;
  platform?: string;
  arch?: string;
}

// Global type declarations
declare global {
  interface Window {
    Prism?: {
      highlightElement: (element: Element) => void;
    };
  }
}

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

  // Keyboard state
  isSpacePressed: boolean;

  // Drawing state
  drawingMode: 'rectangle' | 'text' | null;
  isDrawing: boolean;
  currentDrawingRect: Rectangle | null;
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
  private propertySubscribers: Map<string, Set<unknown>>;
  private layerManager: LayerManager | null = null;
  private clusteringEngine: ClusteringEngine;

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
      leftSidebarState: {
        visible: true,
        width: 250,
      },

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

      // Keyboard state
      isSpacePressed: false,

      // Drawing state
      drawingMode: null,
      isDrawing: false,
      currentDrawingRect: null,
    };

    // Event subscribers
    this.subscribers = new Set();
    this.propertySubscribers = new Map();

    // Initialize clustering engine
    this.clusteringEngine = new ClusteringEngine();

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

    // Recreate defs element with arrowhead marker
    const defs = this.infra.dom.createElement('defs', 'http://www.w3.org/2000/svg');
    const marker = this.infra.dom.createElement('marker', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(marker, 'id', 'arrowhead');
    this.infra.dom.setAttribute(marker, 'markerWidth', '10');
    this.infra.dom.setAttribute(marker, 'markerHeight', '7');
    this.infra.dom.setAttribute(marker, 'refX', '9');
    this.infra.dom.setAttribute(marker, 'refY', '3.5');
    this.infra.dom.setAttribute(marker, 'orient', 'auto');

    const polygon = this.infra.dom.createElement('polygon', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(polygon, 'points', '0 0, 10 3.5, 0 7');
    this.infra.dom.setAttribute(polygon, 'fill', '#666');

    this.infra.dom.appendChild(marker, polygon);
    this.infra.dom.appendChild(defs, marker);
    this.infra.dom.appendChild(this.state.canvas, defs);

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

    // Layer sidebar events
    this.setupLayerSidebarEvents();
  }

  /**
   * Load ER data from server
   */
  public async loadERData(): Promise<void> {
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
   * Get specific state property (for LayerManager compatibility)
   */
  public get<K extends keyof ERViewerState>(key: K): ERViewerState[K] | null {
    const value = this.state[key];
    return value !== null && value !== undefined ? value : null;
  }

  /**
   * Update layout data (for LayerManager compatibility)
   */
  public updateLayoutData(layoutData: LayoutData): void {
    this.setState({ layoutData });
  }

  /**
   * Set state with notifications
   */
  private setState(updates: Partial<ERViewerState>, saveToHistory = true): void {
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
      const stateKey = key as keyof ERViewerState;
      if (oldState[stateKey] !== newState[stateKey]) {
        callbacks.forEach((callback) => {
          try {
            (callback as PropertyUpdateCallback<typeof stateKey>)(oldState[stateKey], newState[stateKey]);
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
   * Calculate entity width based on table name and column names
   */
  private calculateEntityWidth(entity: Entity): number {
    const padding = 20; // Left and right padding
    const minWidth = 150; // Minimum width
    const charWidth = 8; // Approximate width per character
    const emojiWidth = 20; // Width for emoji characters

    // Calculate width based on table name
    let maxWidth = entity.name.length * charWidth + padding;

    // Calculate width based on column names
    entity.columns.forEach((column) => {
      const emojis = this.getColumnEmojis(column);
      const emojiCount = (emojis.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
      const columnWidth = emojiCount * emojiWidth + column.name.length * charWidth + padding;
      maxWidth = Math.max(maxWidth, columnWidth);
    });

    return Math.max(minWidth, maxWidth);
  }

  /**
   * Get emoji icons for column based on its properties
   */
  private getColumnEmojis(column: Column): string {
    const emojis: string[] = [];

    // キー種別の絵文字
    if (column.key === 'PRI') {
      emojis.push('🔑'); // 主キー
    } else if (column.key === 'UNI') {
      emojis.push('📍'); // ユニークキー
    } else if (column.key === 'MUL') {
      emojis.push('🔗'); // 外部キー
    }

    // 型に基づく絵文字
    const typeLC = column.type.toLowerCase();
    if (
      typeLC.includes('int') ||
      typeLC.includes('decimal') ||
      typeLC.includes('numeric') ||
      typeLC.includes('float') ||
      typeLC.includes('double') ||
      typeLC.includes('real')
    ) {
      emojis.push('🔢'); // 数値型
    } else if (
      typeLC.includes('varchar') ||
      typeLC.includes('char') ||
      typeLC.includes('text') ||
      typeLC.includes('string')
    ) {
      emojis.push('📝'); // 文字列型
    } else if (typeLC.includes('date') || typeLC.includes('time') || typeLC.includes('timestamp')) {
      emojis.push('📅'); // 日付型
    }

    // NULL制約の絵文字
    if (column.nullable) {
      emojis.push('❓'); // NULL許可
    } else {
      emojis.push('🚫'); // NOT NULL
    }

    return emojis.length > 0 ? emojis.join(' ') + ' ' : '';
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
    const width = this.calculateEntityWidth(entity);
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
      this.infra.dom.setAttribute(columnText, 'class', 'column');
      this.infra.dom.setAttribute(columnText, 'data-column-name', column.name);

      const emojis = this.getColumnEmojis(column);
      const columnContent = `${emojis}${column.name}`;
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

    // Update clustering engine with current ER data
    this.clusteringEngine.setERData(this.state.erData);

    // Use clustering engine to calculate position
    const index = this.state.erData.entities.indexOf(entity);
    const position = this.clusteringEngine.calculateClusteredPosition(entity, index);

    this.state.clusteredPositions.set(entityName, position);
    return position;
  }

  /**
   * Render relationships
   */
  private renderRelationships(): void {
    if (!this.state.erData?.relationships) {
      this.infra.browserAPI.log('No relationships to render');
      return;
    }

    this.infra.browserAPI.log('Rendering relationships:', this.state.erData.relationships.length);

    const dynamicLayer = this.infra.dom.getElementById('dynamic-layer');
    if (!dynamicLayer) {
      this.infra.browserAPI.log('Dynamic layer not found');
      return;
    }

    // Remove existing relationship groups first
    const existingGroups = Array.from(dynamicLayer.children).filter(
      (child) => typeof child.getAttribute === 'function' && child.getAttribute('class') === 'relationships',
    );
    existingGroups.forEach((group) => {
      this.infra.dom.removeElement(group);
    });

    // Create relationships group
    const relationshipsGroup = this.infra.dom.createElement('g', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(relationshipsGroup, 'class', 'relationships');

    this.state.erData.relationships.forEach((relationship) => {
      this.infra.browserAPI.log('Creating path for relationship:', relationship.from, '->', relationship.to);
      const path = this.createRelationshipPath(relationship);
      if (path) {
        this.infra.dom.appendChild(relationshipsGroup, path);
      } else {
        this.infra.browserAPI.log('Failed to create path for:', relationship.from, '->', relationship.to);
      }
    });

    // Insert before entities
    const firstEntity = Array.from(dynamicLayer.children).find(
      (child) => {
        if (typeof child.getAttribute !== 'function') return false;
        const classAttr = child.getAttribute('class');
        return classAttr !== null && classAttr !== undefined && classAttr.includes('entity');
      },
    );

    if (firstEntity) {
      this.infra.dom.insertBefore(dynamicLayer, relationshipsGroup, firstEntity);
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
      this.infra.browserAPI.log('Missing bounds for:', relationship.from, fromBounds, relationship.to, toBounds);
      return null;
    }

    // Calculate polyline path
    const pathData = this.calculatePolylinePath(fromBounds, toBounds);

    // Create path
    const path = this.infra.dom.createElement('path', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(path, 'class', 'relationship');
    this.infra.dom.setAttribute(path, 'd', pathData);
    this.infra.dom.setAttribute(path, 'stroke', '#666');
    this.infra.dom.setAttribute(path, 'stroke-width', '2');
    this.infra.dom.setAttribute(path, 'fill', 'none');
    this.infra.dom.setAttribute(path, 'data-from-table', relationship.from);
    this.infra.dom.setAttribute(path, 'data-to-table', relationship.to);
    this.infra.dom.setAttribute(path, 'data-from-column', relationship.fromColumn);
    this.infra.dom.setAttribute(path, 'data-to-column', relationship.toColumn);

    return path;
  }

  /**
   * Calculate polyline path between entities
   */
  private calculatePolylinePath(fromBounds: Bounds, toBounds: Bounds): string {
    // Add padding to avoid overlapping with entity border
    const padding = 5;

    // Calculate edge connection points
    const fromCenter = {
      x: fromBounds.x + fromBounds.width / 2,
      y: fromBounds.y + fromBounds.height / 2,
    };
    const toCenter = {
      x: toBounds.x + toBounds.width / 2,
      y: toBounds.y + toBounds.height / 2,
    };

    // Determine which sides to connect from/to
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    let fromPoint: Position;
    let toPoint: Position;
    let middlePoints: Position[] = [];

    // Determine connection sides and calculate edge points
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        // From right to left
        fromPoint = { x: fromBounds.x + fromBounds.width + padding, y: fromCenter.y };
        toPoint = { x: toBounds.x - padding, y: toCenter.y };
      } else {
        // From left to right
        fromPoint = { x: fromBounds.x - padding, y: fromCenter.y };
        toPoint = { x: toBounds.x + toBounds.width + padding, y: toCenter.y };
      }

      // Add middle points for L-shape or Z-shape
      const middleX = (fromPoint.x + toPoint.x) / 2;

      if (Math.abs(fromPoint.y - toPoint.y) > 1) {
        // L-shape or Z-shape needed
        middlePoints = [
          { x: middleX, y: fromPoint.y },
          { x: middleX, y: toPoint.y },
        ];
      } else {
        // Straight horizontal line - no middle points needed
        middlePoints = [];
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        // From bottom to top
        fromPoint = { x: fromCenter.x, y: fromBounds.y + fromBounds.height + padding };
        toPoint = { x: toCenter.x, y: toBounds.y - padding };
      } else {
        // From top to bottom
        fromPoint = { x: fromCenter.x, y: fromBounds.y - padding };
        toPoint = { x: toCenter.x, y: toBounds.y + toBounds.height + padding };
      }

      // Add middle points for L-shape or Z-shape
      const middleY = (fromPoint.y + toPoint.y) / 2;

      if (Math.abs(fromPoint.x - toPoint.x) > 1) {
        // L-shape or Z-shape needed
        middlePoints = [
          { x: fromPoint.x, y: middleY },
          { x: toPoint.x, y: middleY },
        ];
      } else {
        // Straight vertical line - no middle points needed
        middlePoints = [];
      }
    }

    // Build path data
    let pathData = `M ${fromPoint.x} ${fromPoint.y}`;

    for (const point of middlePoints) {
      pathData += ` L ${point.x} ${point.y}`;
    }

    pathData += ` L ${toPoint.x} ${toPoint.y}`;

    return pathData;
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
    if (this.state.layoutData.rectangles !== null && this.state.layoutData.rectangles !== undefined && this.state.layoutData.rectangles.length > 0) {
      this.state.layoutData.rectangles.forEach((rect, index) => {
        const rectElement = this.createRectangleAnnotation(rect, index);
        this.infra.dom.appendChild(annotationLayer, rectElement);
      });
    }

    // Render texts
    if (this.state.layoutData.texts !== null && this.state.layoutData.texts !== undefined && this.state.layoutData.texts.length > 0) {
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
    this.infra.dom.setAttribute(rectElement, 'data-rect-id', rect.id);
    this.infra.dom.setAttribute(rectElement, 'x', rect.x.toString());
    this.infra.dom.setAttribute(rectElement, 'y', rect.y.toString());
    this.infra.dom.setAttribute(rectElement, 'width', rect.width.toString());
    this.infra.dom.setAttribute(rectElement, 'height', rect.height.toString());
    this.infra.dom.setAttribute(rectElement, 'fill', rect.color !== null && rect.color !== undefined && rect.color !== '' ? rect.color : '#e3f2fd');
    this.infra.dom.setAttribute(rectElement, 'stroke', rect.stroke !== null && rect.stroke !== undefined && rect.stroke !== '' ? rect.stroke : '#1976d2');
    this.infra.dom.setAttribute(rectElement, 'stroke-width', (rect.strokeWidth !== null && rect.strokeWidth !== undefined && rect.strokeWidth !== 0 ? rect.strokeWidth : 2).toString());
    return rectElement;
  }

  /**
   * Create text annotation
   */
  private createTextAnnotation(text: Text, index: number): Element {
    const textElement = this.infra.dom.createElement('text', 'http://www.w3.org/2000/svg');
    this.infra.dom.setAttribute(textElement, 'class', 'annotation-text');
    this.infra.dom.setAttribute(textElement, 'data-text-index', index.toString());
    this.infra.dom.setAttribute(textElement, 'data-text-id', text.id);
    this.infra.dom.setAttribute(textElement, 'x', text.x.toString());
    this.infra.dom.setAttribute(textElement, 'y', text.y.toString());
    this.infra.dom.setAttribute(textElement, 'fill', text.color !== null && text.color !== undefined && text.color !== '' ? text.color : '#2c3e50');
    this.infra.dom.setAttribute(textElement, 'font-size', (text.fontSize !== null && text.fontSize !== undefined && text.fontSize !== 0 ? text.fontSize : 14).toString());
    this.infra.dom.setAttribute(textElement, 'cursor', 'pointer');
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
    this.infra.dom.addEventListener(this.state.canvas, 'mousedown', (e) => this.handleCanvasMouseDown(e as MouseEvent));
    this.infra.dom.addEventListener(this.state.canvas, 'mousemove', (e) => this.handleCanvasMouseMove(e as MouseEvent));
    this.infra.dom.addEventListener(this.state.canvas, 'mouseup', (e) => this.handleCanvasMouseUp(e as MouseEvent));
    this.infra.dom.addEventListener(this.state.canvas, 'wheel', (e) => this.handleCanvasWheel(e as WheelEvent));
    this.infra.dom.addEventListener(this.state.canvas, 'click', (e) => this.handleCanvasClick(e as MouseEvent));
    this.infra.dom.addEventListener(this.state.canvas, 'dblclick', (e) => this.handleCanvasDoubleClick(e as MouseEvent));
    this.infra.dom.addEventListener(this.state.canvas, 'contextmenu', (e) => this.handleCanvasContextMenu(e as MouseEvent));

    // Document events for drag
    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'mousemove', (e) =>
      this.handleDocumentMouseMove(e as MouseEvent),
    );
    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'mouseup', (e) =>
      this.handleDocumentMouseUp(e as MouseEvent),
    );

    // Keyboard events
    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'keydown', (e) =>
      this.handleKeyDown(e as KeyboardEvent),
    );
    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'keyup', (e) =>
      this.handleKeyUp(e as KeyboardEvent),
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

    // Check if in drawing mode
    if (this.state.drawingMode === 'rectangle') {
      event.preventDefault();
      this.startRectangleDrawing(svgPoint);
      return;
    }

    if (this.state.drawingMode === 'text') {
      event.preventDefault();
      this.addTextAtPosition(svgPoint.x, svgPoint.y);
      return;
    }

    // Check if clicking on entity
    const entity = this.infra.dom.closest(target, '.entity');
    if (entity) {
      event.preventDefault();
      this.startEntityDrag(entity, svgPoint);
      return;
    }

    // Check if clicking on annotation
    if (this.infra.dom.hasClass(target, 'annotation-rectangle')) {
      event.preventDefault();
      this.selectAnnotation(target);
      // Start rectangle drag
      this.startRectangleDrag(target, svgPoint);
      return;
    }
    
    if (this.infra.dom.hasClass(target, 'annotation-text')) {
      event.preventDefault();
      this.selectAnnotation(target);
      // Start text drag
      this.startTextDrag(target, svgPoint);
      return;
    }

    // Start pan if middle mouse, shift+left, or space+left
    if (
      event.button === 1 ||
      (event.button === 0 && event.shiftKey) ||
      (event.button === 0 && this.state.isSpacePressed)
    ) {
      event.preventDefault();
      this.startPan(screenX, screenY);
    }
  }

  /**
   * Start entity drag
   */
  private startEntityDrag(entity: Element, startPoint: SVGMousePosition): void {
    const tableNameAttr = this.infra.dom.getAttribute(entity, 'data-table-name');
    const tableName = tableNameAttr !== null && tableNameAttr !== undefined ? tableNameAttr : '';
    const transformAttr = this.infra.dom.getAttribute(entity, 'transform');
    const transform = transformAttr !== null && transformAttr !== undefined ? transformAttr : '';
    const match = transform.match(/translate\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\)/);

    if (match !== null && match !== undefined && match[1] !== null && match[1] !== undefined && match[1] !== '' && match[2] !== null && match[2] !== undefined && match[2] !== '') {
      // Add dragging class for visual feedback
      this.infra.dom.addClass(entity, 'dragging');
      
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
   * Start text drag
   */
  private startTextDrag(text: Element, startPoint: SVGMousePosition): void {
    const textId = this.infra.dom.getAttribute(text, 'data-text-id');
    const textIndex = parseInt(this.infra.dom.getAttribute(text, 'data-text-index') || '0');
    const x = parseFloat(this.infra.dom.getAttribute(text, 'x') || '0');
    const y = parseFloat(this.infra.dom.getAttribute(text, 'y') || '0');

    // Add dragging class for visual feedback
    this.infra.dom.addClass(text, 'dragging');
    
    this.setState({
      interactionMode: 'dragging' as InteractionMode,
      dragState: {
        type: 'annotation',
        element: text,
        rectId: textId || '',
        rectIndex: textIndex,
        startX: startPoint.x,
        startY: startPoint.y,
        originalX: x,
        originalY: y,
        currentX: startPoint.x,
        currentY: startPoint.y,
      },
    });
  }

  /**
   * Start rectangle drag
   */
  private startRectangleDrag(rectangle: Element, startPoint: SVGMousePosition): void {
    const rectId = this.infra.dom.getAttribute(rectangle, 'data-rect-id');
    const rectIndex = parseInt(this.infra.dom.getAttribute(rectangle, 'data-rect-index') || '0');
    const x = parseFloat(this.infra.dom.getAttribute(rectangle, 'x') || '0');
    const y = parseFloat(this.infra.dom.getAttribute(rectangle, 'y') || '0');

    // Add dragging class for visual feedback
    this.infra.dom.addClass(rectangle, 'dragging');
    
    this.setState({
      interactionMode: 'dragging' as InteractionMode,
      dragState: {
        type: 'rectangle',
        element: rectangle,
        rectId: rectId || '',
        rectIndex: rectIndex,
        startX: startPoint.x,
        startY: startPoint.y,
        originalX: x,
        originalY: y,
        currentX: startPoint.x,
        currentY: startPoint.y,
      },
    });
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
    } else if (this.state.isDrawing && this.state.drawingMode === 'rectangle') {
      this.updateRectangleDrawing(event);
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
    } else if (this.state.isDrawing && this.state.drawingMode === 'rectangle') {
      this.updateRectangleDrawing(event);
    }
  }

  /**
   * Update entity drag
   */
  private updateDrag(event: MouseEvent): void {
    if (!this.state.dragState) {
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

    if (this.state.dragState.type === 'entity') {
      // Update entity position
      if (this.state.dragState.element) {
        this.infra.dom.setAttribute(this.state.dragState.element, 'transform', `translate(${newX}, ${newY})`);
      }

      // Update bounds
      if (this.state.dragState.tableName !== null && this.state.dragState.tableName !== undefined && this.state.dragState.tableName !== '') {
        const bounds = this.state.entityBounds.get(this.state.dragState.tableName);
        if (bounds) {
          bounds.x = newX;
          bounds.y = newY;
        }
      }

      // Re-render relationships
      this.renderRelationships();
    } else if (this.state.dragState.type === 'rectangle') {
      // Update rectangle position
      if (this.state.dragState.element) {
        this.infra.dom.setAttribute(this.state.dragState.element, 'x', newX.toString());
        this.infra.dom.setAttribute(this.state.dragState.element, 'y', newY.toString());
      }
    } else if (this.state.dragState.type === 'annotation') {
      // Update text position
      if (this.state.dragState.element) {
        this.infra.dom.setAttribute(this.state.dragState.element, 'x', newX.toString());
        this.infra.dom.setAttribute(this.state.dragState.element, 'y', newY.toString());
      }
    }
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
    // Handle rectangle drawing completion
    if (this.state.isDrawing && this.state.drawingMode === 'rectangle' && this.state.currentDrawingRect) {
      this.completeRectangleDrawing();
      return;
    }

    if (this.state.interactionMode === 'dragging' && this.state.dragState) {
      // Save entity position
      if (this.state.dragState.type === 'entity' && this.state.dragState.tableName !== null && this.state.dragState.tableName !== undefined && this.state.dragState.tableName !== '') {
        // Remove dragging class
        if (this.state.dragState.element) {
          this.infra.dom.removeClass(this.state.dragState.element, 'dragging');
        }
        
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
      
      // Save rectangle position
      if (this.state.dragState.type === 'rectangle' && this.state.dragState.rectIndex !== undefined) {
        // Remove dragging class
        if (this.state.dragState.element) {
          this.infra.dom.removeClass(this.state.dragState.element, 'dragging');
        }
        
        const newX = parseFloat(this.infra.dom.getAttribute(this.state.dragState.element!, 'x') || '0');
        const newY = parseFloat(this.infra.dom.getAttribute(this.state.dragState.element!, 'y') || '0');
        
        const newLayoutData = { ...this.state.layoutData };
        const currentRect = newLayoutData.rectangles?.[this.state.dragState.rectIndex];
        if (currentRect) {
          newLayoutData.rectangles![this.state.dragState.rectIndex] = {
            id: currentRect.id,
            x: newX,
            y: newY,
            width: currentRect.width,
            height: currentRect.height,
            color: currentRect.color,
            stroke: currentRect.stroke,
            strokeWidth: currentRect.strokeWidth,
          };
          this.setState({ layoutData: newLayoutData });
        }
      }
      
      // Save text position
      if (this.state.dragState.type === 'annotation' && this.state.dragState.rectIndex !== undefined) {
        // Remove dragging class
        if (this.state.dragState.element) {
          this.infra.dom.removeClass(this.state.dragState.element, 'dragging');
        }
        
        const newX = parseFloat(this.infra.dom.getAttribute(this.state.dragState.element!, 'x') || '0');
        const newY = parseFloat(this.infra.dom.getAttribute(this.state.dragState.element!, 'y') || '0');
        
        const newLayoutData = { ...this.state.layoutData };
        const currentText = newLayoutData.texts?.[this.state.dragState.rectIndex];
        if (currentText) {
          newLayoutData.texts![this.state.dragState.rectIndex] = {
            ...currentText,
            x: newX,
            y: newY,
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
    this.infra.browserAPI.log('handleCanvasClick called with target:', target);

    // Check if clicking on entity
    const entity = this.infra.dom.closest(target, '.entity');
    this.infra.browserAPI.log('Entity found:', entity);

    if (entity) {
      const tableName = this.infra.dom.getAttribute(entity, 'data-table-name');
      this.infra.browserAPI.log('Table name from entity:', tableName);

      if (tableName !== null && tableName !== undefined && tableName !== '') {
        this.infra.browserAPI.log('Calling showTableDetails with tableName:', tableName);
        this.showTableDetails(tableName);
      } else {
        this.infra.browserAPI.log('No table name found on entity');
      }
    } else {
      this.infra.browserAPI.log('No entity found - clicked on background or other element');
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
   * Handle key down
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      this.setState({ isSpacePressed: true }, false);
    }
  }

  /**
   * Handle key up
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      this.setState({ isSpacePressed: false }, false);
    }
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
    this.infra.dom.addClass(this.state.sidebar, 'open');

    // Apply syntax highlighting
    const codeElement = this.infra.dom.querySelector('#sidebar-content code');
    if (codeElement && typeof window.Prism !== 'undefined') {
      window.Prism.highlightElement(codeElement);
    }

    this.setState({ sidebarVisible: true, currentTable: tableName });
  }

  /**
   * Close sidebar
   */
  private closeSidebar(): void {
    if (this.state.sidebar) {
      this.infra.dom.removeClass(this.state.sidebar, 'open');
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
    if (newLayoutData.rectangles === null || newLayoutData.rectangles === undefined) {
      newLayoutData.rectangles = [];
    }

    const newRect: Rectangle = {
      id: `rect-${Date.now()}`,
      x: x,
      y: y,
      width: 100,
      height: 60,
      color: '#e3f2fd',
      stroke: '#e3f2fd',
      strokeWidth: 2,
    };

    newLayoutData.rectangles.push(newRect);
    this.setState({ layoutData: newLayoutData });

    // Add layer for the rectangle
    if (this.layerManager) {
      this.layerManager.addRectangleLayer(newLayoutData.rectangles.length);
    }

    this.infra.browserAPI.log('Rectangle added at:', x, y);
  }

  /**
   * Add text at position
   */
  private addTextAtPosition(x: number, y: number): void {
    const text = this.infra.browserAPI.prompt('テキストを入力してください:');
    if (text === null || text === undefined || text === '') {
      return;
    }

    const newLayoutData = { ...this.state.layoutData };
    if (newLayoutData.texts === null || newLayoutData.texts === undefined) {
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

    // Add layer for the text
    if (this.layerManager) {
      this.layerManager.addTextLayer(text);
    }

    // テキスト描画モードを終了
    this.endDrawingMode();
    const textBtn = this.infra.dom.getElementById('draw-text');
    if (textBtn) {
      this.infra.dom.removeClass(textBtn, 'active');
    }
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

    // Rectangle Drawing button
    const rectBtn = this.infra.dom.getElementById('draw-rectangle');
    if (rectBtn) {
      this.infra.dom.addEventListener(rectBtn, 'click', () => {
        if (this.state.drawingMode === 'rectangle') {
          // End drawing mode
          this.endDrawingMode();
          this.infra.dom.removeClass(rectBtn, 'active');
        } else {
          // Start rectangle drawing mode
          this.startRectangleDrawingMode();
          this.infra.dom.addClass(rectBtn, 'active');

          // Disable other drawing modes
          const textBtn = this.infra.dom.getElementById('draw-text');
          if (textBtn) {
            this.infra.dom.removeClass(textBtn, 'active');
          }
        }
      });
    }

    // Text Drawing button
    const textBtn = this.infra.dom.getElementById('draw-text');
    if (textBtn) {
      this.infra.dom.addEventListener(textBtn, 'click', () => {
        if (this.state.drawingMode === 'text') {
          // End drawing mode
          this.endDrawingMode();
          this.infra.dom.removeClass(textBtn, 'active');
        } else {
          // Start text drawing mode
          this.startTextDrawingMode();
          this.infra.dom.addClass(textBtn, 'active');

          // Disable other drawing modes
          const rectBtn = this.infra.dom.getElementById('draw-rectangle');
          if (rectBtn) {
            this.infra.dom.removeClass(rectBtn, 'active');
          }
        }
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

        // Incremental reverse engineering: preserve existing layout
        const currentLayout = this.state.layoutData;
        const currentEntities = new Set(this.state.erData?.entities.map((e) => e.name) || []);
        const newEntities = new Set(erData.entities.map((e) => e.name));

        // Create new layout data preserving existing positions
        const newLayoutData: LayoutData = {
          entities: {},
          rectangles: currentLayout.rectangles !== null && currentLayout.rectangles !== undefined ? currentLayout.rectangles : [],
          texts: currentLayout.texts !== null && currentLayout.texts !== undefined ? currentLayout.texts : [],
          layers: currentLayout.layers !== null && currentLayout.layers !== undefined ? currentLayout.layers : [],
        };

        // Process each entity
        erData.entities.forEach((entity) => {
          const existingLayout = currentLayout.entities[entity.name];
          if (currentEntities.has(entity.name) && existingLayout) {
            // Existing entity: preserve its layout
            newLayoutData.entities[entity.name] = existingLayout;
          } else {
            // New entity: will be clustered
          }
        });

        // Remove layout data for deleted entities
        Object.keys(currentLayout.entities).forEach((entityName) => {
          if (!newEntities.has(entityName)) {
            delete newLayoutData.entities[entityName];
          }
        });

        this.setState({
          erData,
          layoutData: newLayoutData,
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
  public async saveLayout(): Promise<void> {
    try {
      // Prepare layout data with left sidebar state
      const layoutDataToSave = {
        ...this.state.layoutData,
        leftSidebar: this.state.leftSidebarState,
      };
      
      await this.infra.network.postJSON('/api/layout', layoutDataToSave);
      this.showSuccess('レイアウトが保存されました');
    } catch (error) {
      this.infra.browserAPI.error('Error saving layout:', error);
      this.showError('レイアウトの保存に失敗しました', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Save all data (ER data and layout data)
   */
  public async saveAllData(): Promise<void> {
    try {
      // Prepare data to save
      const dataToSave = {
        erData: this.state.erData,
        layoutData: {
          ...this.state.layoutData,
          leftSidebar: this.state.leftSidebarState,
        },
      };
      
      await this.infra.network.postJSON('/api/data/all', dataToSave);
      this.showSuccess('データが保存されました');
    } catch (error) {
      this.infra.browserAPI.error('Error saving all data:', error);
      this.showError('データの保存に失敗しました', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Load all data (ER data and layout data)
   */
  public async loadAllData(): Promise<void> {
    try {
      this.showLoading('データを読み込み中...');
      
      const response = await this.infra.network.fetch('/api/data/all');
      if (!response.ok) {
        throw new Error('Failed to load data');
      }
      
      const data = await response.json();
      
      // Update state with loaded data
      if (data.erData) {
        await this.setState({ erData: data.erData });
      }
      
      if (data.layoutData) {
        const layoutData = data.layoutData;
        
        // Update left sidebar state if present
        if (layoutData.leftSidebar) {
          await this.setState({ leftSidebarState: layoutData.leftSidebar });
          this.applyLeftSidebarState();
        }
        
        // Update layout data
        await this.setState({ layoutData });
        
        // Update layer manager
        if (this.layerManager) {
          this.layerManager.setLayers(layoutData.layers || []);
        }
      }
      
      // Re-render canvas
      await this.render();
      
      this.hideLoading();
      this.showSuccess('データが読み込まれました');
    } catch (error) {
      this.hideLoading();
      this.infra.browserAPI.error('Error loading all data:', error);
      this.showError('データの読み込みに失敗しました', error instanceof Error ? error.message : String(error));
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
      this.infra.dom.addEventListener(buildInfo, 'click', async () => {
        await this.showBuildInfo();
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
  private async showBuildInfo(): Promise<void> {
    if (!this.state.buildInfoModal) {
      return;
    }

    this.infra.dom.addClass(this.state.buildInfoModal, 'show');

    const buildInfoContent = this.infra.dom.getElementById('build-info-content');
    if (!buildInfoContent) {
      return;
    }

    try {
      const buildInfo = await this.infra.network.getJSON<BuildInfo>('/api/build-info');

      let html = '<div class="build-info-section">';
      html += `<h4>バージョン情報</h4>`;
      html += `<p><strong>バージョン:</strong> ${buildInfo.version || 'unknown'}</p>`;
      html += `<p><strong>ビルド日時:</strong> ${buildInfo.buildDate || 'unknown'}</p>`;
      html += '</div>';

      html += '<div class="build-info-section">';
      html += `<h4>Git情報</h4>`;
      html += `<p><strong>ブランチ:</strong> ${buildInfo.git?.branch || 'unknown'}</p>`;
      html += `<p><strong>コミット:</strong> ${buildInfo.git?.commitShort || 'unknown'}</p>`;
      if (buildInfo.git?.tag) {
        html += `<p><strong>タグ:</strong> ${buildInfo.git.tag}</p>`;
      }
      html += '</div>';

      html += '<div class="build-info-section">';
      html += `<h4>環境情報</h4>`;
      html += `<p><strong>Node.js:</strong> ${buildInfo.nodeVersion || 'unknown'}</p>`;
      html += `<p><strong>プラットフォーム:</strong> ${buildInfo.platform || 'unknown'}</p>`;
      html += `<p><strong>アーキテクチャ:</strong> ${buildInfo.arch || 'unknown'}</p>`;
      html += '</div>';

      this.infra.dom.setInnerHTML(buildInfoContent, html);
    } catch (error) {
      this.infra.browserAPI.error('Failed to load build info:', error);
      this.infra.dom.setInnerHTML(buildInfoContent, '<p>ビルド情報の読み込みに失敗しました。</p>');
    }
  }

  /**
   * Hide build info modal
   */
  private hideBuildInfo(): void {
    if (this.state.buildInfoModal) {
      this.infra.dom.removeClass(this.state.buildInfoModal, 'show');
    }
  }

  /**
   * Setup layer order change events
   */
  private setupLayerOrderChangeEvents(): void {
    interface LayerOrderChangedDetail {
      layerOrder?: Layer[];
      layers?: Layer[];
    }
    
    this.infra.dom.addEventListener(this.infra.dom.getDocumentElement(), 'layerOrderChanged', (e: CustomEvent<LayerOrderChangedDetail>) => {
      this.infra.browserAPI.log('Layer order changed:', e.detail);
      // Handle both possible property names for backward compatibility
      const layers = e.detail?.layers ?? e.detail?.layerOrder;
      if (layers !== null && layers !== undefined) {
        const newLayoutData = { ...this.state.layoutData };
        newLayoutData.layers = layers;
        this.setState({ layoutData: newLayoutData });
      }
    });
  }

  /**
   * Setup layer sidebar events
   */
  private setupLayerSidebarEvents(): void {
    const layerSidebar = this.infra.dom.getElementById('layer-sidebar');
    const collapseBtn = this.infra.dom.getElementById('collapse-layer-sidebar');

    if (!layerSidebar || !collapseBtn) {
      return;
    }

    // Initialize LayerManager with state management and infrastructure
    this.layerManager = new LayerManager(this, this.infra);

    // Apply initial state from ApplicationState
    this.applyLeftSidebarState();

    // Setup collapse button click handler
    this.infra.dom.addEventListener(collapseBtn, 'click', () => {
      const isCurrentlyCollapsed = this.infra.dom.hasClass(layerSidebar, 'collapsed');

      if (isCurrentlyCollapsed) {
        // Expand
        this.infra.dom.removeClass(layerSidebar, 'collapsed');
        this.setState({ 
          leftSidebarState: { ...this.state.leftSidebarState, visible: true } 
        });
        this.infra.browserAPI.log('Layer sidebar expanded');
      } else {
        // Collapse
        this.infra.dom.addClass(layerSidebar, 'collapsed');
        this.setState({ 
          leftSidebarState: { ...this.state.leftSidebarState, visible: false } 
        });
        this.infra.browserAPI.log('Layer sidebar collapsed');
      }
    });

    // Setup resize handle
    const resizeHandle = this.infra.dom.querySelector('.layer-sidebar-resize-handle');
    if (resizeHandle) {
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      // Mouse down on resize handle
      this.infra.dom.addEventListener(resizeHandle, 'mousedown', (e: Event) => {
        const mouseEvent = e as MouseEvent;
        isResizing = true;
        startX = mouseEvent.clientX;
        startWidth = this.state.leftSidebarState.width;
        
        this.infra.dom.addClass(resizeHandle, 'dragging');
        this.infra.dom.setStyles(document.body as any as Element, { cursor: 'col-resize' });
        mouseEvent.preventDefault();
      });

      // Mouse move on document
      this.infra.dom.addEventListener(document.documentElement, 'mousemove', (e: Event) => {
        if (!isResizing) return;
        
        const mouseEvent = e as MouseEvent;
        const deltaX = mouseEvent.clientX - startX;
        const newWidth = Math.max(150, Math.min(500, startWidth + deltaX)); // Min 150px, Max 500px
        
        // Apply width immediately for smooth feedback
        this.infra.dom.setStyles(layerSidebar, {
          width: `${newWidth}px`,
          minWidth: `${newWidth}px`
        });
      });

      // Mouse up on document
      this.infra.dom.addEventListener(document.documentElement, 'mouseup', (e: Event) => {
        if (!isResizing) return;
        
        const mouseEvent = e as MouseEvent;
        const deltaX = mouseEvent.clientX - startX;
        const newWidth = Math.max(150, Math.min(500, startWidth + deltaX));
        
        // Update state
        this.setState({
          leftSidebarState: { ...this.state.leftSidebarState, width: newWidth }
        });
        
        isResizing = false;
        this.infra.dom.removeClass(resizeHandle, 'dragging');
        this.infra.dom.setStyles(document.body as any as Element, { cursor: '' });
        
        this.infra.browserAPI.log(`Layer sidebar resized to ${newWidth}px`);
      });
    }
  }

  /**
   * Apply left sidebar state to UI
   */
  private applyLeftSidebarState(): void {
    const layerSidebar = this.infra.dom.getElementById('layer-sidebar');
    if (!layerSidebar) {
      return;
    }

    if (this.state.leftSidebarState.visible) {
      this.infra.dom.removeClass(layerSidebar, 'collapsed');
      // Apply width
      this.infra.dom.setStyles(layerSidebar, {
        width: `${this.state.leftSidebarState.width}px`,
        minWidth: `${this.state.leftSidebarState.width}px`
      });
    } else {
      this.infra.dom.addClass(layerSidebar, 'collapsed');
    }
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
    // Remove highlight classes from all elements
    const highlightedElements = this.infra.dom.querySelectorAll('.highlighted');
    highlightedElements.forEach((element) => {
      this.infra.dom.removeClass(element, 'highlighted');
    });

    // Clear the highlight layer
    const highlightLayer = this.infra.dom.getElementById('highlight-layer');
    if (highlightLayer) {
      this.infra.dom.setInnerHTML(highlightLayer, '');
    }

    this.setState({ highlightedEntities: new Set(), highlightedRelationships: new Set() });
  }

  /**
   * Update highlight layer to ensure highlighted elements are on top
   */
  private updateHighlightLayer(): void {
    const highlightLayer = this.infra.dom.getElementById('highlight-layer');
    if (!highlightLayer) {
      return;
    }

    // Clear the highlight layer
    this.infra.dom.setInnerHTML(highlightLayer, '');

    // Clone highlighted elements to the highlight layer for z-index effect
    const highlightedElements = this.infra.dom.querySelectorAll('.highlighted');
    highlightedElements.forEach((element) => {
      const clone = this.infra.dom.cloneNode(element, true);

      // Add special styling to make it stand out
      this.infra.dom.addClass(clone, 'highlight-clone');
      this.infra.dom.setAttribute(clone, 'pointer-events', 'none');

      // Add to highlight layer
      this.infra.dom.appendChild(highlightLayer, clone);
    });
  }

  /**
   * Highlight entity
   */
  private highlightEntity(entity: Element): void {
    const tableName = this.infra.dom.getAttribute(entity, 'data-table-name');
    if (tableName === null || tableName === undefined || tableName === '' || this.state.erData === null || this.state.erData === undefined) {
      return;
    }

    // Clear any existing highlights first
    this.clearHighlights();

    // Highlight the hovered entity
    this.state.highlightedEntities.add(tableName);
    this.infra.dom.addClass(entity, 'highlighted');

    // Find and highlight all related entities and relationships
    const relatedTables = new Set<string>();
    const relatedRelationships = new Set<string>();

    // Find relationships connected to this entity
    this.state.erData.relationships.forEach((rel) => {
      if (rel.from === tableName) {
        relatedTables.add(rel.to);
        relatedRelationships.add(`${rel.from}-${rel.to}`);
      } else if (rel.to === tableName) {
        relatedTables.add(rel.from);
        relatedRelationships.add(`${rel.from}-${rel.to}`);
      }
    });

    // Highlight related entities
    relatedTables.forEach((relatedTable) => {
      this.state.highlightedEntities.add(relatedTable);
      const relatedEntity = this.infra.dom.querySelector(`.entity[data-table-name="${relatedTable}"]`);
      if (relatedEntity) {
        this.infra.dom.addClass(relatedEntity, 'highlighted');
      }
    });

    // Highlight relationships
    relatedRelationships.forEach((relKey) => {
      this.state.highlightedRelationships.add(relKey);
      const [fromTable, toTable] = relKey.split('-');
      const relationship = this.infra.dom.querySelector(
        `.relationship[data-from-table="${fromTable}"][data-to-table="${toTable}"]`,
      );
      if (relationship) {
        this.infra.dom.addClass(relationship, 'highlighted');

        // Highlight the related columns
        const fromColumn = this.infra.dom.getAttribute(relationship, 'data-from-column');
        const toColumn = this.infra.dom.getAttribute(relationship, 'data-to-column');

        if (fromColumn !== null && fromColumn !== undefined && fromColumn !== '') {
          const fromColumnElement = this.infra.dom.querySelector(
            `.entity[data-table-name="${fromTable}"] .column[data-column-name="${fromColumn}"]`,
          );
          if (fromColumnElement) {
            this.infra.dom.addClass(fromColumnElement, 'highlighted');
          }
        }

        if (toColumn !== null && toColumn !== undefined && toColumn !== '') {
          const toColumnElement = this.infra.dom.querySelector(
            `.entity[data-table-name="${toTable}"] .column[data-column-name="${toColumn}"]`,
          );
          if (toColumnElement) {
            this.infra.dom.addClass(toColumnElement, 'highlighted');
          }
        }
      }
    });

    // Update the highlight layer to ensure highlighted elements are on top
    this.updateHighlightLayer();
  }

  /**
   * Highlight relationship
   */
  private highlightRelationship(relationship: Element): void {
    const fromTable = this.infra.dom.getAttribute(relationship, 'data-from-table');
    const toTable = this.infra.dom.getAttribute(relationship, 'data-to-table');
    const fromColumn = this.infra.dom.getAttribute(relationship, 'data-from-column');
    const toColumn = this.infra.dom.getAttribute(relationship, 'data-to-column');

    if (!fromTable || !toTable) {
      return;
    }

    // Clear any existing highlights first
    this.clearHighlights();

    // Highlight the relationship
    this.state.highlightedRelationships.add(`${fromTable}-${toTable}`);
    this.infra.dom.addClass(relationship, 'highlighted');

    // Highlight both entities
    this.state.highlightedEntities.add(fromTable);
    this.state.highlightedEntities.add(toTable);

    const fromEntity = this.infra.dom.querySelector(`.entity[data-table-name="${fromTable}"]`);
    const toEntity = this.infra.dom.querySelector(`.entity[data-table-name="${toTable}"]`);

    if (fromEntity) {
      this.infra.dom.addClass(fromEntity, 'highlighted');
    }
    if (toEntity) {
      this.infra.dom.addClass(toEntity, 'highlighted');
    }

    // Highlight the specific columns
    if (fromColumn) {
      const fromColumnElement = this.infra.dom.querySelector(
        `.entity[data-table-name="${fromTable}"] .column[data-column-name="${fromColumn}"]`,
      );
      if (fromColumnElement) {
        this.infra.dom.addClass(fromColumnElement, 'highlighted');
      }
    }

    if (toColumn) {
      const toColumnElement = this.infra.dom.querySelector(
        `.entity[data-table-name="${toTable}"] .column[data-column-name="${toColumn}"]`,
      );
      if (toColumnElement) {
        this.infra.dom.addClass(toColumnElement, 'highlighted');
      }
    }

    // Update the highlight layer to ensure highlighted elements are on top
    this.updateHighlightLayer();
  }

  /**
   * Select annotation
   */
  private selectAnnotation(element: Element): void {
    const annotationId =
      this.infra.dom.getAttribute(element, 'data-rect-id') ||
      this.infra.dom.getAttribute(element, 'data-text-id') ||
      '';
    this.setState({ selectedAnnotation: annotationId });

    // Add selection visual
    this.infra.dom.addClass(element, 'selected');

    // If it's a rectangle element, allow editing on double click
    if (this.infra.dom.hasClass(element, 'annotation-rectangle')) {
      const rectId = this.infra.dom.getAttribute(element, 'data-rect-id');
      const rectIndex = parseInt(this.infra.dom.getAttribute(element, 'data-rect-index') || '0');

      // Set up double click event for rectangle editing
      this.infra.dom.addEventListener(element, 'dblclick', () => {
        this.editRectangleAnnotation(rectId!, rectIndex);
      });
    }

    // If it's a text element, allow editing on double click
    if (this.infra.dom.hasClass(element, 'annotation-text')) {
      const textId = this.infra.dom.getAttribute(element, 'data-text-id');
      const textIndex = parseInt(this.infra.dom.getAttribute(element, 'data-text-index') || '0');

      // Set up double click event for text editing
      this.infra.dom.addEventListener(element, 'dblclick', () => {
        this.editTextAnnotation(textId!, textIndex);
      });
    }
  }

  /**
   * Edit rectangle annotation
   */
  private editRectangleAnnotation(_rectId: string, rectIndex: number): void {
    if (!this.state.layoutData.rectangles?.[rectIndex]) {
      return;
    }

    const currentRect = this.state.layoutData.rectangles[rectIndex];
    
    // Edit color
    const newColor = this.infra.browserAPI.prompt('塗りつぶしの色を編集してください (例: #e3f2fd):', currentRect.color || '#e3f2fd');
    if (newColor === null) return;
    
    // Edit stroke color
    const newStroke = this.infra.browserAPI.prompt('線の色を編集してください (例: #1976d2):', currentRect.stroke || '#1976d2');
    if (newStroke === null) return;
    
    // Edit stroke width
    const newStrokeWidth = this.infra.browserAPI.prompt('線の太さを編集してください (例: 2):', currentRect.strokeWidth?.toString() || '2');
    if (newStrokeWidth === null) return;
    
    // Edit width
    const newWidth = this.infra.browserAPI.prompt('幅を編集してください (例: 100):', currentRect.width.toString());
    if (newWidth === null) return;
    
    // Edit height
    const newHeight = this.infra.browserAPI.prompt('高さを編集してください (例: 60):', currentRect.height.toString());
    if (newHeight === null) return;

    const newLayoutData = { ...this.state.layoutData };
    newLayoutData.rectangles[rectIndex] = {
      ...currentRect,
      color: newColor || currentRect.color,
      stroke: newStroke || currentRect.stroke,
      strokeWidth: newStrokeWidth ? parseInt(newStrokeWidth) : currentRect.strokeWidth,
      width: newWidth ? parseInt(newWidth) : currentRect.width,
      height: newHeight ? parseInt(newHeight) : currentRect.height,
    };

    this.setState({ layoutData: newLayoutData });
  }

  /**
   * Edit text annotation
   */
  private editTextAnnotation(_textId: string, textIndex: number): void {
    if (!this.state.layoutData.texts?.[textIndex]) {
      return;
    }

    const currentText = this.state.layoutData.texts[textIndex];
    const newContent = this.infra.browserAPI.prompt('テキストを編集してください:', currentText.content);

    if (newContent !== null && newContent !== currentText.content) {
      const newFontSize = this.infra.browserAPI.prompt(
        'フォントサイズを編集してください:',
        currentText.fontSize?.toString() || '14',
      );
      const newColor = this.infra.browserAPI.prompt('色を編集してください:', currentText.color || '#2c3e50');

      const newLayoutData = { ...this.state.layoutData };
      newLayoutData.texts[textIndex] = {
        ...currentText,
        content: newContent,
        fontSize: newFontSize ? parseInt(newFontSize) : currentText.fontSize,
        color: newColor || currentText.color,
      };

      this.setState({ layoutData: newLayoutData });
    }
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
   * Start rectangle drawing mode
   */
  public startRectangleDrawingMode(): void {
    this.setState({
      drawingMode: 'rectangle',
      isDrawing: false,
      currentDrawingRect: null,
    });

    // Change cursor
    if (this.state.canvas) {
      this.infra.dom.setStyles(this.state.canvas, { cursor: 'crosshair' });
    }
  }

  /**
   * Start text drawing mode
   */
  public startTextDrawingMode(): void {
    this.setState({
      drawingMode: 'text',
      isDrawing: false,
      currentDrawingRect: null,
    });

    // Change cursor
    if (this.state.canvas) {
      this.infra.dom.setStyles(this.state.canvas, { cursor: 'text' });
    }
  }

  /**
   * End drawing mode
   */
  public endDrawingMode(): void {
    this.setState({
      drawingMode: null,
      isDrawing: false,
      currentDrawingRect: null,
    });

    // Reset cursor
    if (this.state.canvas) {
      this.infra.dom.setStyles(this.state.canvas, { cursor: 'default' });
    }
  }

  /**
   * Update a rectangle's properties
   */
  public updateRectangle(id: string, updates: Partial<Rectangle>): void {
    const layoutRectIndex = this.state.layoutData.rectangles.findIndex((r) => r.id === id);
    if (layoutRectIndex === -1) {
      return;
    }

    // Update in layoutData
    const updatedRectangles = [...this.state.layoutData.rectangles];
    const existingRect = updatedRectangles[layoutRectIndex];
    if (!existingRect) {
      this.infra.browserAPI.error('Rectangle not found in layoutData:', id);
      return;
    }
    updatedRectangles[layoutRectIndex] = {
      ...existingRect,
      ...updates,
      id: existingRect.id, // Ensure id is preserved
    } as Rectangle;

    const updatedLayoutData = {
      ...this.state.layoutData,
      rectangles: updatedRectangles,
    };
    this.setState({ layoutData: updatedLayoutData });

    // Update DOM element
    const rectElement = this.infra.dom.querySelector(`[data-rect-id="${id}"]`);
    if (rectElement) {
      if (updates.x !== undefined) {
        this.infra.dom.setAttribute(rectElement, 'x', updates.x.toString());
      }
      if (updates.y !== undefined) {
        this.infra.dom.setAttribute(rectElement, 'y', updates.y.toString());
      }
      if (updates.width !== undefined) {
        this.infra.dom.setAttribute(rectElement, 'width', updates.width.toString());
      }
      if (updates.height !== undefined) {
        this.infra.dom.setAttribute(rectElement, 'height', updates.height.toString());
      }
      if (updates.color !== undefined) {
        this.infra.dom.setAttribute(rectElement, 'fill', updates.color);
      }
      if (updates.stroke !== undefined) {
        this.infra.dom.setAttribute(rectElement, 'stroke', updates.stroke);
      }
      if (updates.strokeWidth !== undefined) {
        this.infra.dom.setAttribute(rectElement, 'stroke-width', updates.strokeWidth.toString());
      }
    }
  }

  /**
   * Start rectangle drawing
   */
  private startRectangleDrawing(point: SVGMousePosition): void {
    const rectId = `rect-${Date.now()}`;
    const newRect: Rectangle = {
      id: rectId,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      color: '#e3f2fd',
      stroke: '#1976d2',
      strokeWidth: 2,
    };

    this.setState({
      isDrawing: true,
      currentDrawingRect: newRect,
    });

    // Create temporary rectangle element
    const annotationLayer = this.infra.dom.getElementById('annotation-layer');
    if (annotationLayer) {
      const rectElement = this.infra.dom.createElement('rect', 'http://www.w3.org/2000/svg');
      this.infra.dom.setAttribute(rectElement, 'id', `temp-${rectId}`);
      this.infra.dom.setAttribute(rectElement, 'data-rect-id', rectId);
      this.infra.dom.setAttribute(rectElement, 'x', newRect.x.toString());
      this.infra.dom.setAttribute(rectElement, 'y', newRect.y.toString());
      this.infra.dom.setAttribute(rectElement, 'width', '0');
      this.infra.dom.setAttribute(rectElement, 'height', '0');
      this.infra.dom.setAttribute(rectElement, 'fill', newRect.color || '#e3f2fd');
      this.infra.dom.setAttribute(rectElement, 'stroke', newRect.stroke || '#1976d2');
      this.infra.dom.setAttribute(rectElement, 'stroke-width', newRect.strokeWidth?.toString() || '2');
      this.infra.dom.setAttribute(rectElement, 'opacity', '0.5');
      this.infra.dom.appendChild(annotationLayer, rectElement);
    }
  }

  /**
   * Update rectangle drawing
   */
  private updateRectangleDrawing(event: MouseEvent): void {
    if (!this.state.currentDrawingRect) {
      return;
    }

    const rect = this.infra.dom.getBoundingClientRect(this.state.canvas!);
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const svgPoint = this.screenToSVG(screenX, screenY);

    // Calculate dimensions
    const width = Math.abs(svgPoint.x - this.state.currentDrawingRect.x);
    const height = Math.abs(svgPoint.y - this.state.currentDrawingRect.y);
    const x = Math.min(svgPoint.x, this.state.currentDrawingRect.x);
    const y = Math.min(svgPoint.y, this.state.currentDrawingRect.y);

    // Update temporary rectangle
    const tempRect = this.infra.dom.getElementById(`temp-${this.state.currentDrawingRect.id}`);
    if (tempRect) {
      this.infra.dom.setAttribute(tempRect, 'x', x.toString());
      this.infra.dom.setAttribute(tempRect, 'y', y.toString());
      this.infra.dom.setAttribute(tempRect, 'width', width.toString());
      this.infra.dom.setAttribute(tempRect, 'height', height.toString());
    }

    // Update current drawing rect state
    this.setState({
      currentDrawingRect: {
        ...this.state.currentDrawingRect,
        x,
        y,
        width,
        height,
      },
    });
  }

  /**
   * Complete rectangle drawing
   */
  private completeRectangleDrawing(): void {
    if (
      !this.state.currentDrawingRect ||
      this.state.currentDrawingRect.width === 0 ||
      this.state.currentDrawingRect.height === 0
    ) {
      // Remove temporary rectangle if too small
      const tempRect = this.infra.dom.getElementById(`temp-${this.state.currentDrawingRect?.id}`);
      if (tempRect) {
        this.infra.dom.removeElement(tempRect);
      }

      this.setState({
        isDrawing: false,
        currentDrawingRect: null,
      });
      return;
    }

    // Remove opacity from temporary rectangle
    const tempRect = this.infra.dom.getElementById(`temp-${this.state.currentDrawingRect.id}`);
    if (tempRect) {
      this.infra.dom.setAttribute(tempRect, 'id', this.state.currentDrawingRect.id);
      this.infra.dom.setAttribute(tempRect, 'opacity', '1');
      this.infra.dom.setAttribute(tempRect, 'class', 'annotation-rectangle');
    }

    // Add to layout data
    const updatedLayoutData = {
      ...this.state.layoutData,
      rectangles: [...this.state.layoutData.rectangles, this.state.currentDrawingRect],
    };

    // First update the state with rectangles
    this.setState({
      layoutData: updatedLayoutData,
      isDrawing: false,
      currentDrawingRect: null,
    });

    // Then add layer for this rectangle after state is updated
    if (this.layerManager) {
      const rectangleNumber = updatedLayoutData.rectangles.length;
      this.layerManager.addRectangleLayer(rectangleNumber);
    }
  }
}
