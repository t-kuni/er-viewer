import type { LayoutData, Layer as BaseLayer } from './types/index.js';

// Extended Layer type for Layer Manager that includes UI-specific properties
interface LayerData extends BaseLayer {
  type: 'er-diagram' | 'rectangle' | 'text';
  icon: string;
  order: number;
}

export type Layer = LayerData;

interface StateManager {
  get(key: 'layoutData'): LayoutData | null;
  updateLayoutData(layoutData: LayoutData): void;
  subscribeToProperty(
    property: 'layoutData',
    callback: (oldValue: LayoutData | null, newValue: LayoutData | null) => void,
  ): void;
}

interface LayerElement extends HTMLDivElement {
  dataset: DOMStringMap & {
    layerId?: string;
  };
}

export class LayerManager {
  private layers: Layer[] = [];
  private layerCounter: number = 0;
  private draggedItem: LayerElement | null = null;
  private isCollapsed: boolean = false;
  private readonly stateManager: StateManager | null;

  // DOM elements
  private sidebar: HTMLElement | null = null;
  private layerList: HTMLElement | null = null;
  private collapseBtn: HTMLElement | null = null;
  private resizeHandle: HTMLElement | null = null;

  constructor(stateManager: StateManager | null = null) {
    this.stateManager = stateManager;

    this.initializeElements();
    this.setupEventListeners();
    this.loadCollapsedState();

    // Add default ER diagram layer
    this.addLayer('er-diagram', 'ER図', '🗂️');

    // Subscribe to state changes if state manager is provided
    if (this.stateManager) {
      this.setupStateSubscription();
    }
  }

  private setupStateSubscription(): void {
    if (!this.stateManager) {
      return;
    }

    // Load layers from state when layout data changes
    this.stateManager.subscribeToProperty('layoutData', (_oldLayoutData, newLayoutData) => {
      if (newLayoutData?.layers) {
        // Only load from state if the layers actually changed to avoid infinite loops
        const currentLayerIds = this.layers.map((l) => l.id).sort();
        const stateLayerIds = newLayoutData.layers.map((l) => l.id).sort();

        if (JSON.stringify(currentLayerIds) !== JSON.stringify(stateLayerIds)) {
          this.loadLayersFromState(newLayoutData.layers as LayerData[]);
        }
      }
    });

    // Load initial layers if they exist
    const currentLayoutData = this.stateManager.get('layoutData');
    if (currentLayoutData?.layers) {
      this.loadLayersFromState(currentLayoutData.layers as LayerData[]);
    }
  }

  private loadLayersFromState(layerData: LayerData[]): void {
    // Clear current layers
    this.layers = [];

    // Load layers from state in order
    layerData.forEach((layerInfo) => {
      const layer: Layer = {
        id: layerInfo.id,
        type: layerInfo.type,
        name: layerInfo.name,
        icon: layerInfo.icon,
        order: layerInfo.order,
        visible: layerInfo.visible !== undefined ? layerInfo.visible : true,
        zIndex: layerInfo.zIndex !== undefined ? layerInfo.zIndex : layerInfo.order,
      };
      this.layers.push(layer);
    });

    // Ensure default ER diagram layer exists if not in state
    const hasERLayer = this.layers.some((layer) => layer.type === 'er-diagram');
    if (!hasERLayer) {
      const erLayer: Layer = {
        id: this.generateLayerId(),
        type: 'er-diagram',
        name: 'ER図',
        icon: '🗂️',
        order: 0,
        visible: true,
        zIndex: 0,
      };
      this.layers.unshift(erLayer);
      // Update all other layer orders
      this.layers.forEach((layer, index) => {
        if (layer.type !== 'er-diagram') {
          layer.order = index;
        }
      });
    }

    // Sort by order to maintain correct sequence
    this.layers.sort((a, b) => a.order - b.order);

    // Update layer counter to avoid ID conflicts
    this.layerCounter = Math.max(
      this.layerCounter,
      ...layerData.map((l) => {
        const match = l.id.match(/layer-(\d+)-/);
        return match?.[1] ? parseInt(match[1], 10) : 0;
      }),
    );

    this.renderLayers();
  }

  private saveLayersToState(): void {
    if (this.stateManager) {
      const currentLayoutData = this.stateManager.get('layoutData') || { entities: {}, rectangles: [], texts: [] };
      const layerData: BaseLayer[] = this.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        zIndex: layer.zIndex,
      }));

      const newLayoutData: LayoutData = {
        ...currentLayoutData,
        layers: layerData,
      };

      this.stateManager.updateLayoutData(newLayoutData);
    }
  }

  private initializeElements(): void {
    this.sidebar = document.getElementById('layer-sidebar');
    this.layerList = document.getElementById('layer-list');
    this.collapseBtn = document.getElementById('collapse-layer-sidebar');
    this.resizeHandle = this.sidebar ? this.sidebar.querySelector('.layer-sidebar-resize-handle') : null;
  }

  private setupEventListeners(): void {
    // Collapse/expand functionality
    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', () => {
        this.toggleCollapse();
      });
    }

    // Resize functionality
    this.setupResizeHandle();
  }

  private setupResizeHandle(): void {
    if (!this.resizeHandle || !this.sidebar) {
      return;
    }

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    this.resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = this.sidebar!.offsetWidth;
      this.resizeHandle!.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isResizing || this.isCollapsed || !this.sidebar) {
        return;
      }

      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;

      // Respect min/max width constraints
      if (newWidth >= 150 && newWidth <= 400) {
        this.sidebar.style.width = newWidth + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing && this.resizeHandle) {
        isResizing = false;
        this.resizeHandle.classList.remove('dragging');
        document.body.style.cursor = '';
      }
    });
  }

  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.sidebar) {
      this.sidebar.classList.toggle('collapsed', this.isCollapsed);
    }

    // Update button text
    if (this.collapseBtn) {
      this.collapseBtn.textContent = this.isCollapsed ? '▶' : '◀';
    }

    // Save state
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('layerSidebarCollapsed', String(this.isCollapsed));
    }
  }

  private loadCollapsedState(): void {
    if (typeof localStorage !== 'undefined') {
      const savedState = localStorage.getItem('layerSidebarCollapsed');
      if (savedState === 'true') {
        this.toggleCollapse();
      }
    }
  }

  public addLayer(type: Layer['type'], name: string, icon: string = '📄'): Layer {
    const layer: Layer = {
      id: this.generateLayerId(),
      type: type,
      name: name,
      icon: icon,
      order: this.layers.length,
      visible: true,
      zIndex: this.layers.length,
    };

    this.layers.push(layer);
    this.renderLayers();
    this.saveLayersToState();

    return layer;
  }

  public removeLayer(layerId: string): void {
    const index = this.layers.findIndex((layer) => layer.id === layerId);
    if (index > -1) {
      this.layers.splice(index, 1);
      this.updateLayerOrders();
      this.renderLayers();
      this.saveLayersToState();
    }
  }

  private generateLayerId(): string {
    return `layer-${++this.layerCounter}-${Date.now()}`;
  }

  private updateLayerOrders(): void {
    this.layers.forEach((layer, index) => {
      layer.order = index;
    });
  }

  private renderLayers(): void {
    if (!this.layerList) {
      return;
    }

    this.layerList.innerHTML = '';

    // Sort layers by order (top to bottom in list = front to back in rendering)
    const sortedLayers = [...this.layers].sort((a, b) => a.order - b.order);

    sortedLayers.forEach((layer) => {
      const layerElement = this.createLayerElement(layer);
      if (this.layerList) {
        this.layerList.appendChild(layerElement);
      }
    });

    this.setupDragAndDrop();
  }

  private createLayerElement(layer: Layer): HTMLDivElement {
    if (typeof document === 'undefined') {
      const div = { className: 'layer-item', dataset: {}, setAttribute: () => {}, innerHTML: '' } as any;
      return div;
    }

    const div = document.createElement('div');
    div.className = 'layer-item';
    (div as LayerElement).dataset.layerId = layer.id;
    div.setAttribute('draggable', 'true');

    div.innerHTML = `
            <span class="layer-item-icon">${layer.icon}</span>
            <span class="layer-item-text">${layer.name}</span>
        `;

    return div;
  }

  private setupDragAndDrop(): void {
    if (!this.layerList) {
      return;
    }

    const layerItems = this.layerList.querySelectorAll<LayerElement>('.layer-item');

    layerItems.forEach((item) => {
      item.addEventListener('dragstart', (e: DragEvent) => {
        this.draggedItem = item;
        item.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
        }
      });

      item.addEventListener('dragend', () => {
        if (this.draggedItem) {
          this.draggedItem.classList.remove('dragging');
          this.draggedItem = null;
        }
      });

      item.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
      });

      item.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();

        if (this.draggedItem && this.draggedItem !== item) {
          this.reorderLayers(this.draggedItem, item);
        }
      });
    });
  }

  private reorderLayers(draggedElement: LayerElement, targetElement: LayerElement): void {
    const draggedLayerId = draggedElement.dataset.layerId;
    const targetLayerId = targetElement.dataset.layerId;

    if (!draggedLayerId || !targetLayerId) {
      return;
    }

    const draggedIndex = this.layers.findIndex((layer) => layer.id === draggedLayerId);
    const targetIndex = this.layers.findIndex((layer) => layer.id === targetLayerId);

    if (draggedIndex > -1 && targetIndex > -1 && draggedIndex !== targetIndex) {
      // Remove dragged layer
      const [draggedLayer] = this.layers.splice(draggedIndex, 1);

      // Insert at target position (no adjustment needed since we want to drop at the target's position)
      if (draggedLayer) {
        this.layers.splice(targetIndex, 0, draggedLayer);
      }

      // Update orders to reflect new positions
      this.updateLayerOrders();

      // Re-render layers list
      this.renderLayers();

      // Save to state
      this.saveLayersToState();

      console.log(
        'Layer order updated:',
        this.layers.map((l) => `${l.name} (order: ${l.order})`),
      );

      // Trigger re-rendering of canvas with new layer order
      this.triggerCanvasRerender();
    }
  }

  // Public methods for integration with other components
  public addRectangleLayer(rectangleId: number): Layer {
    const name = `矩形No${rectangleId}`;
    return this.addLayer('rectangle', name, '▭');
  }

  public addTextLayer(text: string): Layer {
    const truncatedText = text.length > 30 ? text.substring(0, 30) + '...' : text;
    const name = truncatedText;
    return this.addLayer('text', name, '📝');
  }

  public removeLayerByReference(type: Layer['type'], reference: string): void {
    const layer = this.layers.find((l) => l.type === type && l.name.includes(reference));
    if (layer) {
      this.removeLayer(layer.id);
    }
  }

  public getLayerOrder(): Layer[] {
    return this.layers.map((layer) => ({
      id: layer.id,
      type: layer.type,
      name: layer.name,
      icon: layer.icon,
      order: layer.order,
      visible: layer.visible,
      zIndex: layer.zIndex,
    }));
  }

  public setLayerOrder(layerOrder: Layer[]): void {
    layerOrder.forEach((orderInfo) => {
      const layer = this.layers.find((l) => l.id === orderInfo.id);
      if (layer) {
        layer.order = orderInfo.order;
      }
    });

    this.renderLayers();
    this.triggerCanvasRerender();
  }

  private triggerCanvasRerender(): void {
    // Dispatch custom event to notify canvas renderer about layer order change
    const event = new CustomEvent('layerOrderChanged', {
      detail: { layerOrder: this.getLayerOrder() },
    });
    document.dispatchEvent(event);

    // Also update state if state manager is available
    if (this.stateManager) {
      const currentLayoutData = this.stateManager.get('layoutData');
      if (currentLayoutData) {
        this.stateManager.updateLayoutData({ ...currentLayoutData });
      }
    }
  }
}

export default LayerManager;
