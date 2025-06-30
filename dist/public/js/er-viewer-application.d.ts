/**
 * ER Viewer Application - 統合されたアプリケーションクラス
 * 全てのロジックとステートを内包し、副作用はインフラストラクチャー層を通じて実行
 */
import type { Infrastructure, EventHandler as InfraEventHandler } from './types/infrastructure.js';
import type { ERData, LayoutData, ApplicationState, Position, Bounds, HistoryEntry } from './types/index.js';
interface ERViewerState extends ApplicationState {
    canvas: SVGSVGElement | null;
    sidebar: HTMLElement | null;
    sidebarContent: HTMLElement | null;
    buildInfoModal: HTMLElement | null;
    eventHandlers: Map<string, InfraEventHandler>;
    windowResizeHandler: (() => void) | null;
    highlightedEntities: Set<string>;
    highlightedRelationships: Set<string>;
    history: HistoryEntry[];
    historyIndex: number;
    maxHistorySize: number;
    clusteredPositions: Map<string, Position>;
    entityBounds: Map<string, Bounds>;
    routingCache: Map<string, Position[]>;
}
type StateUpdateCallback = (oldState: ERViewerState, newState: ERViewerState) => void;
type PropertyUpdateCallback<K extends keyof ERViewerState> = (oldValue: ERViewerState[K], newValue: ERViewerState[K]) => void;
export declare class ERViewerApplication {
    private readonly infra;
    private state;
    private subscribers;
    private propertySubscribers;
    constructor(infrastructure: Infrastructure);
    /**
     * Get current application state (for testing)
     */
    getApplicationState(): ApplicationState;
    /**
     * Initialize the application when DOM is ready
     */
    private initializeWhenReady;
    /**
     * Initialize the application
     */
    private initialize;
    /**
     * Initialize canvas
     */
    private initializeCanvas;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Load ER data from server
     */
    private loadERData;
    /**
     * Get current state (read-only)
     */
    getState(): Readonly<ERViewerState>;
    /**
     * Set state with notifications
     */
    private setState;
    /**
     * Subscribe to state changes
     */
    subscribe(callback: StateUpdateCallback): () => void;
    /**
     * Subscribe to specific property changes
     */
    subscribeToProperty<K extends keyof ERViewerState>(key: K, callback: PropertyUpdateCallback<K>): () => void;
    /**
     * Notify subscribers of state changes
     */
    private notifySubscribers;
    /**
     * Check if state changes should trigger a re-render
     */
    private shouldRerender;
    /**
     * Check if state changes should be saved to history
     */
    private shouldSaveToHistory;
    /**
     * Save state to history
     */
    private saveToHistory;
    /**
     * Main render method
     */
    private render;
    /**
     * Update canvas transform based on viewport
     */
    private updateTransform;
    /**
     * Render entities
     */
    private renderEntities;
    /**
     * Create entity SVG element
     */
    private createEntityElement;
    /**
     * Get entity position
     */
    private getEntityPosition;
    /**
     * Calculate clustered position for entity
     */
    private calculateClusteredPosition;
    /**
     * Render relationships
     */
    private renderRelationships;
    /**
     * Create relationship path
     */
    private createRelationshipPath;
    /**
     * Calculate connection points between entities
     */
    private calculateConnectionPoints;
    /**
     * Render annotations
     */
    private renderAnnotations;
    /**
     * Create rectangle annotation
     */
    private createRectangleAnnotation;
    /**
     * Create text annotation
     */
    private createTextAnnotation;
    /**
     * Setup canvas events
     */
    private setupCanvasEvents;
    /**
     * Handle canvas mouse down
     */
    private handleCanvasMouseDown;
    /**
     * Start entity drag
     */
    private startEntityDrag;
    /**
     * Start pan
     */
    private startPan;
    /**
     * Handle canvas mouse move
     */
    private handleCanvasMouseMove;
    /**
     * Handle document mouse move
     */
    private handleDocumentMouseMove;
    /**
     * Update entity drag
     */
    private updateDrag;
    /**
     * Update pan
     */
    private updatePan;
    /**
     * Handle mouse up
     */
    private handleCanvasMouseUp;
    /**
     * Handle document mouse up
     */
    private handleDocumentMouseUp;
    /**
     * End interaction
     */
    private endInteraction;
    /**
     * Handle canvas wheel
     */
    private handleCanvasWheel;
    /**
     * Handle canvas click
     */
    private handleCanvasClick;
    /**
     * Handle canvas double click
     */
    private handleCanvasDoubleClick;
    /**
     * Handle canvas context menu
     */
    private handleCanvasContextMenu;
    /**
     * Convert screen coordinates to SVG coordinates
     */
    private screenToSVG;
    /**
     * Show table details in sidebar
     */
    private showTableDetails;
    /**
     * Show sidebar with content
     */
    private showSidebar;
    /**
     * Close sidebar
     */
    private closeSidebar;
    /**
     * Show context menu
     */
    private showContextMenu;
    /**
     * Hide context menu
     */
    private hideContextMenu;
    /**
     * Add rectangle at position
     */
    private addRectangleAtPosition;
    /**
     * Add text at position
     */
    private addTextAtPosition;
    /**
     * Setup UI button events
     */
    private setupUIButtonEvents;
    /**
     * Reverse engineer database
     */
    private reverseEngineer;
    /**
     * Save layout
     */
    private saveLayout;
    /**
     * Setup sidebar resize events
     */
    private setupSidebarResizeEvents;
    /**
     * Setup help panel events
     */
    private setupHelpPanelEvents;
    /**
     * Setup build info modal events
     */
    private setupBuildInfoModalEvents;
    /**
     * Show build info modal
     */
    private showBuildInfo;
    /**
     * Hide build info modal
     */
    private hideBuildInfo;
    /**
     * Setup layer order change events
     */
    private setupLayerOrderChangeEvents;
    /**
     * Setup window resize handler
     */
    private setupResizeHandler;
    /**
     * Resize canvas
     */
    private resizeCanvas;
    /**
     * Update hover state
     */
    private updateHover;
    /**
     * Clear all highlights
     */
    private clearHighlights;
    /**
     * Highlight entity
     */
    private highlightEntity;
    /**
     * Highlight relationship
     */
    private highlightRelationship;
    /**
     * Select annotation
     */
    private selectAnnotation;
    /**
     * Show loading overlay
     */
    private showLoading;
    /**
     * Hide loading overlay
     */
    private hideLoading;
    /**
     * Show error notification
     */
    private showError;
    /**
     * Show success notification
     */
    private showSuccess;
    /**
     * Show notification
     */
    private showNotification;
    /**
     * Escape HTML
     */
    private escapeHtml;
    /**
     * Get current ER data
     */
    getERData(): ERData | null;
    /**
     * Get current layout data
     */
    getLayoutData(): LayoutData;
    /**
     * Update ER data
     */
    setERData(erData: ERData): void;
    /**
     * Update layout data
     */
    setLayoutData(layoutData: LayoutData): void;
}
export {};
//# sourceMappingURL=er-viewer-application.d.ts.map