/**
 * ER Viewer Application - Core Type Definitions
 */

// Database column information
export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  key: string; // 'PRI', 'UNI', 'MUL', or ''
  default: string | null;
  extra: string; // e.g., 'auto_increment'
}

// Foreign key constraint information
export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

// Entity (table) definition
export interface Entity {
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  ddl: string;
  position?: Position; // Optional position, added when merged with layout
}

// Relationship between entities
export interface Relationship {
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
  constraintName: string;
}

// Complete ER data structure from the database
export interface ERData {
  entities: Entity[];
  relationships: Relationship[];
  layout?: LayoutData; // Optional layout data when merged
}

// Position coordinates
export interface Position {
  x: number;
  y: number;
}

// Entity layout information
export interface EntityLayout {
  position: Position;
}

// Rectangle annotation
export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  layerId?: string;
}

// Text annotation
export interface Text {
  id: string;
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  layerId?: string;
}

// Layer definition
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  zIndex: number;
}

// Complete layout data structure
export interface LayoutData {
  entities: Record<string, EntityLayout>;
  rectangles: Rectangle[];
  texts: Text[];
  layers: Layer[];
}

// Viewport state for pan and zoom
export interface Viewport {
  panX: number;
  panY: number;
  scale: number;
}

// Drag state during interactions
export interface DragState {
  type: 'entity' | 'annotation' | 'pan';
  element?: Element;
  tableName?: string;
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  currentX: number;
  currentY: number;
  originalPanX?: number;
  originalPanY?: number;
}

// Context menu state
export interface ContextMenu {
  x: number;
  y: number;
  items: ContextMenuItem[];
  visible: boolean;
}

// Context menu item
export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: string;
  disabled?: boolean;
}

// Interaction modes
export type InteractionMode =
  | 'default'
  | 'panning'
  | 'dragging'
  | 'creating'
  | 'creating-rectangle'
  | 'creating-text'
  | 'dragging-entity'
  | 'dragging-text'
  | 'dragging-rectangle'
  | 'resizing-rectangle';

// Complete application state
export interface ApplicationState {
  // Application data
  erData: ERData | null;
  layoutData: LayoutData;

  // View state
  viewport: Viewport;

  // UI state
  selectedAnnotation: string | null;
  sidebarVisible: boolean;
  currentTable: string | null;
  contextMenu: ContextMenu | null;

  // Interaction state
  interactionMode: InteractionMode;
  dragState: DragState | null;
  isSpacePressed: boolean;

  // Drawing state
  drawingMode: 'rectangle' | 'text' | null;
  isDrawing: boolean;
  currentDrawingRect: Rectangle | null;

  // Application state
  loading: boolean;
  error: string | null;

  // Canvas and UI elements
  canvas: SVGSVGElement | null;
  sidebar: HTMLElement | null;
  sidebarContent: HTMLElement | null;
  buildInfoModal: HTMLElement | null;
  contextMenuElement: Element | null;

  // Event handlers
  eventHandlers: Map<string, EventListener>;
  windowResizeHandler: (() => void) | null;

  // Highlight state
  highlightedEntities: Set<string>;
  highlightedRelationships: Set<string>;

  // Layer management
  layers: Layer[];
  layerOrder: string[];

  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // Clustering and routing
  clusteredPositions: Map<string, Position>;
  entityBounds: Map<string, Bounds>;
  routingCache: Map<string, Position[]>;
}

// History entry for undo/redo
export interface HistoryEntry {
  timestamp: number;
  action: string;
  previousState: Partial<ApplicationState>;
  nextState: Partial<ApplicationState>;
}

// Bounding box
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// SVG path
export interface Path {
  d: string; // SVG path data
  points: Position[];
}

// Build information
export interface BuildInfo {
  version: string;
  name: string;
  buildTime: string;
  buildDate: string;
  git: {
    commit: string;
    commitShort: string;
    branch: string;
    tag: string | null;
  };
  nodeVersion: string;
  platform: string;
  arch: string;
}

// Log entry
export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  url?: string;
  line?: number;
  column?: number;
  stack?: string;
  userAgent?: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Table DDL response
export interface TableDDLResponse {
  ddl: string;
}

// Log response
export interface LogResponse {
  logs: string[];
  type: 'server' | 'client' | 'error' | 'all';
}
