// Main ER Viewer core class - Clean Architecture
import { HighlightManager } from '../highlighting/highlight-manager.js';
import { ClusteringEngine } from '../clustering/clustering-engine.js';
import { SmartRouting } from '../pathfinding/smart-routing.js';
import { ConnectionPoints } from '../pathfinding/connection-points.js';
import { StateManager } from '../state/state-manager.js';
import { CoordinateTransform } from '../utils/coordinate-transform.js';
import { CanvasRenderer } from '../rendering/canvas-renderer.js';
import { EventController } from '../events/event-controller.js';
import { UIController } from '../ui/ui-controller.js';
import { AnnotationController } from '../annotations/annotation-controller.js';
import LayerManager from '../layer-manager.js';
/**
 * ERViewerCore - Orchestrates all components of the ER Viewer application
 * Follows Single Responsibility Principle - only handles coordination
 */
export class ERViewerCore {
    constructor() {
        this.canvas = document.getElementById('er-canvas');
        // Initialize core systems
        this.stateManager = new StateManager();
        this.coordinateTransform = new CoordinateTransform();
        this.canvasRenderer = new CanvasRenderer(this.canvas, this.coordinateTransform);
        this.highlightManager = new HighlightManager();
        this.layerManager = new LayerManager(this.stateManager);
        this.eventController = new EventController(this.canvas, this.stateManager, this.coordinateTransform, this.highlightManager, this.layerManager);
        this.uiController = new UIController(this.stateManager);
        this.annotationController = new AnnotationController(this.stateManager, this.coordinateTransform);
        // Pass canvasRenderer reference to UIController
        this.uiController.canvasRenderer = this.canvasRenderer;
        // Initialize feature modules
        this.clusteringEngine = new ClusteringEngine();
        this.smartRouting = new SmartRouting();
        this.connectionPoints = new ConnectionPoints();
        this.initializeApplication();
        // Setup window resize handler
        this.setupResizeHandler();
    }
    /**
     * Initialize the application - set up event handlers and subscriptions
     */
    initializeApplication() {
        // Subscribe to state changes
        this.stateManager.subscribeToProperty('viewport', (oldViewport, newViewport) => {
            this.canvasRenderer.updateTransform(newViewport.panX, newViewport.panY, newViewport.scale);
        });
        this.stateManager.subscribeToProperty('erData', (oldERData, newERData) => {
            this.clusteringEngine.setERData(newERData);
            this.connectionPoints.setERData(newERData);
            // If this is new ER data and entities don't have positions, calculate clustered positions
            if (newERData && newERData.entities) {
                const currentLayoutData = this.stateManager.get('layoutData');
                const needsClustering = newERData.entities.some((entity) => !currentLayoutData.entities[entity.name]);
                if (needsClustering) {
                    const newLayoutData = { ...currentLayoutData };
                    newERData.entities.forEach((entity, index) => {
                        if (!newLayoutData.entities[entity.name]) {
                            newLayoutData.entities[entity.name] = this.clusteringEngine.calculateClusteredPosition(entity, index);
                        }
                    });
                    this.stateManager.setLayoutData(newLayoutData);
                }
            }
            this.renderER();
        });
        this.stateManager.subscribeToProperty('layoutData', () => {
            this.renderER();
        });
        // Setup canvas event handlers
        this.eventController.on('entity-click', (e) => this.handleEntityClick(e.detail));
        this.eventController.on('entity-dblclick', (e) => this.handleEntityDoubleClick(e.detail));
        this.eventController.on('relationship-click', (e) => this.handleRelationshipClick(e.detail));
        this.eventController.on('context-menu', (e) => this.handleContextMenu(e.detail));
        // Setup UI event handlers
        this.uiController.on('edit-rectangle-properties', (e) => {
            this.annotationController.editRectangleProperties(e.detail.element);
        });
        this.uiController.on('edit-text-properties', (e) => {
            this.annotationController.editTextProperties(e.detail.element);
        });
        this.uiController.on('delete-annotation', (e) => {
            this.annotationController.deleteAnnotation(e.detail.element);
        });
        this.uiController.on('add-rectangle', (e) => {
            this.addRectangleAtPosition(e.detail.x, e.detail.y);
        });
        this.uiController.on('add-text', (e) => {
            this.addTextAtPosition(e.detail.x, e.detail.y);
        });
        // Initialize UI event listeners
        this.initUIEventListeners();
    }
    /**
     * Initialize UI-related event listeners
     */
    initUIEventListeners() {
        // Build info modal functionality
        const buildInfo = document.getElementById('build-info');
        const buildInfoModal = document.getElementById('build-info-modal');
        const closeBuildInfo = document.getElementById('close-build-info');
        if (buildInfo && buildInfoModal) {
            buildInfo.addEventListener('click', () => {
                this.uiController.showBuildInfo();
            });
        }
        if (closeBuildInfo && buildInfoModal) {
            closeBuildInfo.addEventListener('click', () => {
                this.uiController.hideBuildInfo();
            });
        }
        if (buildInfoModal) {
            buildInfoModal.addEventListener('click', (e) => {
                if (e.target === buildInfoModal) {
                    this.uiController.hideBuildInfo();
                }
            });
        }
    }
    /**
     * Load ER data from the server
     */
    async loadERData() {
        try {
            console.log('Loading ER data...');
            this.stateManager.setLoading(true);
            this.stateManager.clearError();
            const response = await fetch('/api/er-data');
            if (response.ok) {
                const erData = await response.json();
                this.stateManager.setERData(erData);
                console.log('ER data loaded successfully:', erData);
            }
            else {
                const errorMsg = `Failed to load ER data: ${response.status} ${response.statusText}`;
                console.warn(errorMsg);
                this.stateManager.setError(errorMsg);
            }
        }
        catch (error) {
            console.error('Error loading ER data:', error);
            this.stateManager.setError(error.message);
        }
        finally {
            this.stateManager.setLoading(false);
        }
    }
    /**
     * Update canvas transform based on current viewport state
     */
    updateTransform() {
        const viewport = this.stateManager.get('viewport');
        this.coordinateTransform.updateViewport(viewport.panX, viewport.panY, viewport.scale);
        this.canvasRenderer.updateTransform(viewport.panX, viewport.panY, viewport.scale);
    }
    /**
     * Render the ER diagram
     */
    renderER() {
        const erData = this.stateManager.get('erData');
        const layoutData = this.stateManager.get('layoutData');
        // Always render, even if erData is empty (to show annotations)
        this.canvasRenderer.renderER(erData, layoutData, this.layerManager);
        this.updateTransform();
    }
    /**
     * Show table details (DDL) in sidebar
     * @param {string} tableName - Name of the table
     */
    async showTableDetails(tableName) {
        try {
            console.log('showTableDetails called with tableName:', tableName);
            const response = await fetch(`/api/table/${tableName}/ddl`);
            console.log('DDL API response:', response);
            if (response.ok) {
                const data = await response.json();
                console.log('DDL data received:', data);
                this.uiController.showTableDetails(tableName, data.ddl);
            }
            else {
                console.error('Failed to fetch DDL:', response.status, response.statusText);
            }
        }
        catch (error) {
            console.error('Error loading table details:', error);
        }
    }
    /**
     * Close the sidebar
     */
    closeSidebar() {
        this.uiController.closeSidebar();
    }
    /**
     * Convert screen coordinates to SVG coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} SVG coordinates
     */
    screenToSVG(screenX, screenY) {
        return this.coordinateTransform.screenToSVG(screenX, screenY, this.canvas);
    }
    // Event handlers
    /**
     * Handle entity click event
     * @param {Object} data - Event data
     */
    handleEntityClick(data) {
        console.log('Entity clicked:', data.tableName);
        this.showTableDetails(data.tableName);
    }
    /**
     * Handle entity double-click event
     * @param {Object} data - Event data
     */
    handleEntityDoubleClick(data) {
        console.log('Entity double-clicked:', data.tableName);
        // Double click behavior can be different from single click
    }
    /**
     * Handle relationship click event
     * @param {Object} data - Event data
     */
    handleRelationshipClick(data) {
        console.log('Relationship clicked:', data.fromTable, '->', data.toTable);
        // Handle relationship click
    }
    /**
     * Handle context menu event
     * @param {Object} data - Event data
     */
    handleContextMenu(data) {
        console.log('Context menu requested at:', data.screenX, data.screenY);
        this.uiController.showContextMenu(data.screenX, data.screenY, {
            target: data.target,
            svgX: data.svgX,
            svgY: data.svgY,
        });
    }
    /**
     * Add rectangle at specified position
     * @param {number} x - X coordinate in SVG space
     * @param {number} y - Y coordinate in SVG space
     */
    addRectangleAtPosition(x, y) {
        const currentState = this.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        if (!newLayoutData.rectangles) {
            newLayoutData.rectangles = [];
        }
        const newRect = {
            x: x,
            y: y,
            width: 100,
            height: 60,
            fill: '#e3f2fd',
            stroke: '#1976d2',
            strokeWidth: 2,
        };
        newLayoutData.rectangles.push(newRect);
        // Add layer for new rectangle before updating state
        if (this.layerManager) {
            const rectangleNumber = newLayoutData.rectangles.length; // Use 1-based numbering
            this.layerManager.addRectangleLayer(rectangleNumber);
        }
        // Preserve existing layers when updating layout data
        const currentLayoutData = this.stateManager.get('layoutData');
        const finalLayoutData = {
            ...newLayoutData,
            layers: currentLayoutData?.layers || [],
        };
        this.stateManager.updateLayoutData(finalLayoutData);
        console.log('Rectangle added at:', x, y);
    }
    /**
     * Add text at specified position
     * @param {number} x - X coordinate in SVG space
     * @param {number} y - Y coordinate in SVG space
     */
    addTextAtPosition(x, y) {
        const text = prompt('テキストを入力してください:');
        if (!text)
            return;
        const currentState = this.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        if (!newLayoutData.texts) {
            newLayoutData.texts = [];
        }
        const newText = {
            x: x,
            y: y,
            content: text,
            color: '#2c3e50',
            size: 14,
        };
        newLayoutData.texts.push(newText);
        // Add layer for new text before updating state
        if (this.layerManager) {
            this.layerManager.addTextLayer(text);
        }
        // Preserve existing layers when updating layout data
        const currentLayoutData = this.stateManager.get('layoutData');
        const finalLayoutData = {
            ...newLayoutData,
            layers: currentLayoutData?.layers || [],
        };
        this.stateManager.updateLayoutData(finalLayoutData);
    }
    /**
     * Setup window resize handler
     */
    setupResizeHandler() {
        // Initial canvas resize
        setTimeout(() => {
            this.canvasRenderer.resizeCanvas();
        }, 100);
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvasRenderer.resizeCanvas();
        });
    }
}
//# sourceMappingURL=er-viewer-core.js.map