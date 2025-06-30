/**
 * ERViewerCore - Orchestrates all components of the ER Viewer application
 * Follows Single Responsibility Principle - only handles coordination
 */
export class ERViewerCore {
    canvas: HTMLElement | null;
    stateManager: StateManager;
    coordinateTransform: CoordinateTransform;
    canvasRenderer: CanvasRenderer;
    highlightManager: HighlightManager;
    layerManager: LayerManager;
    eventController: EventController;
    uiController: UIController;
    annotationController: AnnotationController;
    clusteringEngine: ClusteringEngine;
    smartRouting: SmartRouting;
    connectionPoints: ConnectionPoints;
    /**
     * Initialize the application - set up event handlers and subscriptions
     */
    initializeApplication(): void;
    /**
     * Initialize UI-related event listeners
     */
    initUIEventListeners(): void;
    /**
     * Load ER data from the server
     */
    loadERData(): Promise<void>;
    /**
     * Update canvas transform based on current viewport state
     */
    updateTransform(): void;
    /**
     * Render the ER diagram
     */
    renderER(): void;
    /**
     * Show table details (DDL) in sidebar
     * @param {string} tableName - Name of the table
     */
    showTableDetails(tableName: string): Promise<void>;
    /**
     * Close the sidebar
     */
    closeSidebar(): void;
    /**
     * Convert screen coordinates to SVG coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} SVG coordinates
     */
    screenToSVG(screenX: number, screenY: number): Object;
    /**
     * Handle entity click event
     * @param {Object} data - Event data
     */
    handleEntityClick(data: Object): void;
    /**
     * Handle entity double-click event
     * @param {Object} data - Event data
     */
    handleEntityDoubleClick(data: Object): void;
    /**
     * Handle relationship click event
     * @param {Object} data - Event data
     */
    handleRelationshipClick(data: Object): void;
    /**
     * Handle context menu event
     * @param {Object} data - Event data
     */
    handleContextMenu(data: Object): void;
    /**
     * Add rectangle at specified position
     * @param {number} x - X coordinate in SVG space
     * @param {number} y - Y coordinate in SVG space
     */
    addRectangleAtPosition(x: number, y: number): void;
    /**
     * Add text at specified position
     * @param {number} x - X coordinate in SVG space
     * @param {number} y - Y coordinate in SVG space
     */
    addTextAtPosition(x: number, y: number): void;
    /**
     * Setup window resize handler
     */
    setupResizeHandler(): void;
}
import { StateManager } from '../state/state-manager.js';
import { CoordinateTransform } from '../utils/coordinate-transform.js';
import { CanvasRenderer } from '../rendering/canvas-renderer.js';
import { HighlightManager } from '../highlighting/highlight-manager.js';
import LayerManager from '../layer-manager.js';
import { EventController } from '../events/event-controller.js';
import { UIController } from '../ui/ui-controller.js';
import { AnnotationController } from '../annotations/annotation-controller.js';
import { ClusteringEngine } from '../clustering/clustering-engine.js';
import { SmartRouting } from '../pathfinding/smart-routing.js';
import { ConnectionPoints } from '../pathfinding/connection-points.js';
//# sourceMappingURL=er-viewer-core.d.ts.map