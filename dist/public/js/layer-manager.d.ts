import type { LayoutData, Layer as BaseLayer } from './types/index.js';
interface LayerData extends BaseLayer {
    type: 'er-diagram' | 'rectangle' | 'text';
    icon: string;
    order: number;
}
export type Layer = LayerData;
interface StateManager {
    get(key: 'layoutData'): LayoutData | null;
    updateLayoutData(layoutData: LayoutData): void;
    subscribeToProperty(property: 'layoutData', callback: (oldValue: LayoutData | null, newValue: LayoutData | null) => void): void;
}
export declare class LayerManager {
    private layers;
    private layerCounter;
    private draggedItem;
    private isCollapsed;
    private readonly stateManager;
    private sidebar;
    private layerList;
    private collapseBtn;
    private resizeHandle;
    constructor(stateManager?: StateManager | null);
    private setupStateSubscription;
    private loadLayersFromState;
    private saveLayersToState;
    private initializeElements;
    private setupEventListeners;
    private setupResizeHandle;
    private toggleCollapse;
    private loadCollapsedState;
    addLayer(type: Layer['type'], name: string, icon?: string): Layer;
    removeLayer(layerId: string): void;
    private generateLayerId;
    private updateLayerOrders;
    private renderLayers;
    private createLayerElement;
    private setupDragAndDrop;
    private reorderLayers;
    addRectangleLayer(rectangleId: number): Layer;
    addTextLayer(text: string): Layer;
    removeLayerByReference(type: Layer['type'], reference: string): void;
    getLayerOrder(): Layer[];
    setLayerOrder(layerOrder: Layer[]): void;
    private triggerCanvasRerender;
}
export default LayerManager;
//# sourceMappingURL=layer-manager.d.ts.map