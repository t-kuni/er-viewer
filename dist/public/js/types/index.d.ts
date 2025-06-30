/**
 * ER Viewer Application - Core Type Definitions
 */
export interface Column {
    name: string;
    type: string;
    nullable: boolean;
    key: string;
    default: string | null;
    extra: string;
}
export interface ForeignKey {
    column: string;
    referencedTable: string;
    referencedColumn: string;
    constraintName: string;
}
export interface Entity {
    name: string;
    columns: Column[];
    foreignKeys: ForeignKey[];
    ddl: string;
    position?: Position;
}
export interface Relationship {
    from: string;
    fromColumn: string;
    to: string;
    toColumn: string;
    constraintName: string;
}
export interface ERData {
    entities: Entity[];
    relationships: Relationship[];
    layout?: LayoutData;
}
export interface Position {
    x: number;
    y: number;
}
export interface EntityLayout {
    position: Position;
}
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
export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    zIndex: number;
}
export interface LayoutData {
    entities: Record<string, EntityLayout>;
    rectangles: Rectangle[];
    texts: Text[];
    layers?: Layer[];
}
export interface Viewport {
    panX: number;
    panY: number;
    scale: number;
}
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
export interface ContextMenu {
    x: number;
    y: number;
    items: ContextMenuItem[];
    visible: boolean;
}
export interface ContextMenuItem {
    label: string;
    action: () => void;
    icon?: string;
    disabled?: boolean;
}
export type InteractionMode = 'default' | 'panning' | 'dragging' | 'creating' | 'creating-rectangle' | 'creating-text' | 'dragging-entity' | 'dragging-text' | 'dragging-rectangle' | 'resizing-rectangle';
export interface ApplicationState {
    erData: ERData | null;
    layoutData: LayoutData;
    viewport: Viewport;
    selectedAnnotation: string | null;
    sidebarVisible: boolean;
    currentTable: string | null;
    contextMenu: ContextMenu | null;
    interactionMode: InteractionMode;
    dragState: DragState | null;
    loading: boolean;
    error: string | null;
    canvas: SVGSVGElement | null;
    sidebar: HTMLElement | null;
    sidebarContent: HTMLElement | null;
    buildInfoModal: HTMLElement | null;
    contextMenuElement: Element | null;
    eventHandlers: Map<string, EventListener>;
    windowResizeHandler: (() => void) | null;
    highlightedEntities: Set<string>;
    highlightedRelationships: Set<string>;
    layers: Layer[];
    layerOrder: string[];
    history: HistoryEntry[];
    historyIndex: number;
    maxHistorySize: number;
    clusteredPositions: Map<string, Position>;
    entityBounds: Map<string, Bounds>;
    routingCache: Map<string, Position[]>;
}
export interface HistoryEntry {
    timestamp: number;
    action: string;
    previousState: Partial<ApplicationState>;
    nextState: Partial<ApplicationState>;
}
export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Path {
    d: string;
    points: Position[];
}
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
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    success: boolean;
}
export interface TableDDLResponse {
    ddl: string;
}
export interface LogResponse {
    logs: string[];
    type: 'server' | 'client' | 'error' | 'all';
}
//# sourceMappingURL=index.d.ts.map