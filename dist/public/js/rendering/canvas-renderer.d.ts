import type { ERData, LayoutData } from '../types/index.js';
interface Layer {
    id: string;
    type: 'er-diagram' | 'rectangle' | 'text';
    name: string;
    icon?: string;
    order: number;
}
interface LayerManager {
    getLayerOrder(): Layer[];
}
export declare class CanvasRenderer {
    private readonly canvas;
    private readonly smartRouting;
    private readonly connectionPoints;
    private currentERData;
    private currentLayoutData;
    private layerManager;
    private readonly config;
    constructor(canvas: SVGSVGElement);
    /**
     * Setup listener for layer order changes
     */
    private setupLayerOrderListener;
    /**
     * Initialize canvas with base structure
     */
    initializeCanvas(): void;
    /**
     * Render complete ER diagram
     */
    renderER(erData: ERData | null, layoutData: LayoutData | null, layerManager?: LayerManager | null): void;
    /**
     * Render elements based on layer order
     */
    private renderByLayerOrder;
    /**
     * Render entities in dynamic layer to respect layer order
     */
    private renderEntitiesInDynamicLayer;
    /**
     * Render relationships in dynamic layer to respect layer order
     */
    private renderRelationshipsInDynamicLayer;
    /**
     * Render specific rectangle by layer
     */
    private renderRectangleByLayer;
    /**
     * Render specific text by layer
     */
    private renderTextByLayer;
    /**
     * Render entities
     */
    private renderEntities;
    /**
     * Render relationships
     */
    private renderRelationships;
    /**
     * Render annotations (rectangles and texts)
     */
    private renderAnnotations;
    /**
     * Create entity element
     */
    private createEntityElement;
    /**
     * Calculate entity width based on content
     */
    private calculateEntityWidth;
    /**
     * Create relationship path
     */
    private createRelationshipPath;
    /**
     * Create rectangle annotation
     */
    private createRectangleAnnotation;
    /**
     * Create text annotation
     */
    private createTextAnnotation;
    /**
     * Add resize handles to rectangle
     */
    private addResizeHandles;
    /**
     * Create arrow markers
     */
    private createArrowMarkers;
    /**
     * Create filters for visual effects
     */
    private createFilters;
    /**
     * Get bounds for a specific entity
     */
    private getEntityBounds;
    /**
     * Get dimensions for an entity by name
     */
    private getEntityDimensions;
    /**
     * Resize canvas to fit container
     */
    resizeCanvas(): void;
}
export {};
//# sourceMappingURL=canvas-renderer.d.ts.map