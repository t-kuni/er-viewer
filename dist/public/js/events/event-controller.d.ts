import { ApplicationState, Viewport, LayoutData, Position } from '../types/index';
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
/**
 * Centralized event management system
 * Handles all canvas events, interaction modes, and event delegation
 */
export declare class EventController {
    private canvas;
    private stateManager;
    private coordinateTransform;
    private highlightManager;
    private layerManager;
    private eventHandlers;
    private dragThreshold;
    private dragStartPoint;
    private dragCurrentPoint;
    private hasDragMovement;
    private lastHadDragMovement;
    private boundHandlers;
    constructor(canvas: HTMLElement, stateManager: StateManager, coordinateTransform: CoordinateTransform, highlightManager: HighlightManager, layerManager?: LayerManager | null);
    /**
     * Initialize all event listeners
     */
    initializeEventListeners(): void;
    /**
     * Remove all event listeners
     */
    removeEventListeners(): void;
    /**
     * Register event handler for specific event type and element
     */
    registerHandler(eventType: string, selector: string, handler: (event: Event, target: Element) => boolean | void): void;
    /**
     * Delegate event to appropriate handler
     */
    delegateEvent(event: Event, eventType: string): boolean;
    /**
     * Handle wheel events (zoom)
     */
    handleWheel(event: WheelEvent): void;
    /**
     * Handle mouse down events
     */
    handleMouseDown(event: MouseEvent): void;
    /**
     * Handle mouse move events
     */
    handleMouseMove(event: MouseEvent): void;
    /**
     * Handle mouse up events
     */
    handleMouseUp(event: MouseEvent): void;
    /**
     * Handle click events
     */
    handleClick(event: MouseEvent): void;
    /**
     * Handle double click events
     */
    handleDoubleClick(event: MouseEvent): void;
    /**
     * Handle context menu events
     */
    handleContextMenu(event: MouseEvent): void;
    /**
     * Handle keyboard down events
     */
    handleKeyDown(event: KeyboardEvent): void;
    /**
     * Handle keyboard up events
     */
    handleKeyUp(_event: KeyboardEvent): void;
    /**
     * Start panning mode
     */
    private startPanning;
    /**
     * Handle panning movement
     */
    private handlePanning;
    /**
     * End panning mode
     */
    private endPanning;
    /**
     * Start entity dragging
     */
    private startEntityDragging;
    /**
     * Handle entity dragging movement
     */
    private handleEntityDragging;
    /**
     * End entity dragging
     */
    private endEntityDragging;
    /**
     * Start rectangle dragging
     */
    private startRectangleDragging;
    /**
     * Handle rectangle dragging movement
     */
    private handleRectangleDragging;
    /**
     * End rectangle dragging
     */
    private endRectangleDragging;
    /**
     * Start rectangle resizing
     */
    private startRectangleResizing;
    /**
     * Handle rectangle resizing movement
     */
    private handleRectangleResizing;
    /**
     * Calculate new rectangle size based on handle type and mouse movement
     */
    private calculateNewRectangleSize;
    /**
     * End rectangle resizing
     */
    private endRectangleResizing;
    /**
     * Show resize handles for a rectangle
     */
    private showRectangleResizeHandles;
    /**
     * Hide all resize handles
     */
    private hideAllResizeHandles;
    /**
     * Clear rectangle selection
     */
    private clearRectangleSelection;
    /**
     * Start rectangle creation
     */
    private startRectangleCreation;
    /**
     * Handle rectangle creation movement
     */
    private handleRectangleCreation;
    /**
     * Start text creation
     */
    private startTextCreation;
    /**
     * End rectangle creation
     */
    private endRectangleCreation;
    /**
     * Start text dragging
     */
    private startTextDragging;
    /**
     * Handle text dragging movement
     */
    private handleTextDragging;
    /**
     * End text dragging
     */
    private endTextDragging;
    /**
     * Handle text click
     */
    private handleTextClick;
    /**
     * Handle entity click
     */
    private handleEntityClick;
    /**
     * Handle entity double-click
     */
    private handleEntityDoubleClick;
    /**
     * Handle relationship click
     */
    private handleRelationshipClick;
    /**
     * Handle canvas background click
     */
    private handleCanvasClick;
    /**
     * Handle hover effects
     */
    private handleHover;
    /**
     * Show context menu
     */
    private showContextMenu;
    /**
     * Handle escape key
     */
    handleEscape(): void;
    /**
     * Handle delete key
     */
    handleDelete(): void;
    /**
     * Emit custom event
     */
    emit(eventName: string, data: any): void;
    /**
     * Add custom event listener
     */
    on(eventName: string, handler: EventListener): void;
    /**
     * Remove custom event listener
     */
    off(eventName: string, handler: EventListener): void;
}
export {};
//# sourceMappingURL=event-controller.d.ts.map