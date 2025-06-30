class LayerManager {
  constructor(stateManager = null) {
    this.layers = [];
    this.layerCounter = 0;
    this.draggedItem = null;
    this.isCollapsed = false;
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

  setupStateSubscription() {
    // Load layers from state when layout data changes
    this.stateManager.subscribeToProperty('layoutData', (oldLayoutData, newLayoutData) => {
      if (newLayoutData && newLayoutData.layers) {
        // Only load from state if the layers actually changed to avoid infinite loops
        const currentLayerIds = this.layers.map((l) => l.id).sort();
        const stateLayerIds = newLayoutData.layers.map((l) => l.id).sort();

        if (JSON.stringify(currentLayerIds) !== JSON.stringify(stateLayerIds)) {
          this.loadLayersFromState(newLayoutData.layers);
        }
      }
    });

    // Load initial layers if they exist
    const currentLayoutData = this.stateManager.get('layoutData');
    if (currentLayoutData && currentLayoutData.layers) {
      this.loadLayersFromState(currentLayoutData.layers);
    }
  }

  loadLayersFromState(layerData) {
    // Clear current layers
    this.layers = [];

    // Load layers from state in order
    layerData.forEach((layerInfo) => {
      const layer = {
        id: layerInfo.id,
        type: layerInfo.type,
        name: layerInfo.name,
        icon: layerInfo.icon,
        order: layerInfo.order,
      };
      this.layers.push(layer);
    });

    // Ensure default ER diagram layer exists if not in state
    const hasERLayer = this.layers.some((layer) => layer.type === 'er-diagram');
    if (!hasERLayer) {
      const erLayer = {
        id: this.generateLayerId(),
        type: 'er-diagram',
        name: 'ER図',
        icon: '🗂️',
        order: 0,
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
        return match ? parseInt(match[1]) : 0;
      }),
    );

    this.renderLayers();
  }

  saveLayersToState() {
    if (this.stateManager) {
      const currentLayoutData = this.stateManager.get('layoutData');
      const layerData = this.layers.map((layer) => ({
        id: layer.id,
        type: layer.type,
        name: layer.name,
        icon: layer.icon,
        order: layer.order,
      }));

      const newLayoutData = {
        ...currentLayoutData,
        layers: layerData,
      };

      this.stateManager.updateLayoutData(newLayoutData);
    }
  }

  initializeElements() {
    this.sidebar = document.getElementById('layer-sidebar');
    this.layerList = document.getElementById('layer-list');
    this.collapseBtn = document.getElementById('collapse-layer-sidebar');
    this.resizeHandle = this.sidebar ? this.sidebar.querySelector('.layer-sidebar-resize-handle') : null;
  }

  setupEventListeners() {
    // Collapse/expand functionality
    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', () => {
        this.toggleCollapse();
      });
    }

    // Resize functionality
    this.setupResizeHandle();
  }

  setupResizeHandle() {
    if (!this.resizeHandle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    this.resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = this.sidebar.offsetWidth;
      this.resizeHandle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing || this.isCollapsed) return;

      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;

      // Respect min/max width constraints
      if (newWidth >= 150 && newWidth <= 400) {
        this.sidebar.style.width = newWidth + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        this.resizeHandle.classList.remove('dragging');
        document.body.style.cursor = '';
      }
    });
  }

  toggleCollapse() {
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
      localStorage.setItem('layerSidebarCollapsed', this.isCollapsed);
    }
  }

  loadCollapsedState() {
    if (typeof localStorage !== 'undefined') {
      const savedState = localStorage.getItem('layerSidebarCollapsed');
      if (savedState === 'true') {
        this.toggleCollapse();
      }
    }
  }

  addLayer(type, name, icon = '📄') {
    const layer = {
      id: this.generateLayerId(),
      type: type,
      name: name,
      icon: icon,
      order: this.layers.length,
    };

    this.layers.push(layer);
    this.renderLayers();
    this.saveLayersToState();

    return layer;
  }

  removeLayer(layerId) {
    const index = this.layers.findIndex((layer) => layer.id === layerId);
    if (index > -1) {
      this.layers.splice(index, 1);
      this.updateLayerOrders();
      this.renderLayers();
      this.saveLayersToState();
    }
  }

  generateLayerId() {
    return `layer-${++this.layerCounter}-${Date.now()}`;
  }

  updateLayerOrders() {
    this.layers.forEach((layer, index) => {
      layer.order = index;
    });
  }

  renderLayers() {
    if (!this.layerList) return;

    this.layerList.innerHTML = '';

    // Sort layers by order (top to bottom in list = front to back in rendering)
    const sortedLayers = [...this.layers].sort((a, b) => a.order - b.order);

    sortedLayers.forEach((layer) => {
      const layerElement = this.createLayerElement(layer);
      this.layerList.appendChild(layerElement);
    });

    this.setupDragAndDrop();
  }

  createLayerElement(layer) {
    if (typeof document === 'undefined') {
      return { className: 'layer-item', dataset: {}, setAttribute: () => {}, innerHTML: '' };
    }

    const div = document.createElement('div');
    div.className = 'layer-item';
    div.dataset.layerId = layer.id;
    div.setAttribute('draggable', true);

    div.innerHTML = `
            <span class="layer-item-icon">${layer.icon}</span>
            <span class="layer-item-text">${layer.name}</span>
        `;

    return div;
  }

  setupDragAndDrop() {
    if (!this.layerList) return;

    const layerItems = this.layerList.querySelectorAll('.layer-item');

    layerItems.forEach((item) => {
      item.addEventListener('dragstart', (e) => {
        this.draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        if (this.draggedItem) {
          this.draggedItem.classList.remove('dragging');
          this.draggedItem = null;
        }
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();

        if (this.draggedItem && this.draggedItem !== item) {
          this.reorderLayers(this.draggedItem, item);
        }
      });
    });
  }

  reorderLayers(draggedElement, targetElement) {
    const draggedLayerId = draggedElement.dataset.layerId;
    const targetLayerId = targetElement.dataset.layerId;

    const draggedIndex = this.layers.findIndex((layer) => layer.id === draggedLayerId);
    const targetIndex = this.layers.findIndex((layer) => layer.id === targetLayerId);

    if (draggedIndex > -1 && targetIndex > -1 && draggedIndex !== targetIndex) {
      // Remove dragged layer
      const [draggedLayer] = this.layers.splice(draggedIndex, 1);

      // Insert at target position (no adjustment needed since we want to drop at the target's position)
      this.layers.splice(targetIndex, 0, draggedLayer);

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
  addRectangleLayer(rectangleId) {
    const name = `矩形No${rectangleId}`;
    return this.addLayer('rectangle', name, '▭');
  }

  addTextLayer(text) {
    const truncatedText = text.length > 30 ? text.substring(0, 30) + '...' : text;
    const name = `テキスト "${truncatedText}"`;
    return this.addLayer('text', name, '📝');
  }

  removeLayerByReference(type, reference) {
    const layer = this.layers.find((l) => l.type === type && l.name.includes(reference));
    if (layer) {
      this.removeLayer(layer.id);
    }
  }

  getLayerOrder() {
    return this.layers.map((layer) => ({
      id: layer.id,
      type: layer.type,
      name: layer.name,
      icon: layer.icon,
      order: layer.order,
    }));
  }

  setLayerOrder(layerOrder) {
    layerOrder.forEach((orderInfo) => {
      const layer = this.layers.find((l) => l.id === orderInfo.id);
      if (layer) {
        layer.order = orderInfo.order;
      }
    });

    this.renderLayers();
    this.triggerCanvasRerender();
  }

  triggerCanvasRerender() {
    // Dispatch custom event to notify canvas renderer about layer order change
    const event = new CustomEvent('layerOrderChanged', {
      detail: { layerOrder: this.getLayerOrder() },
    });
    document.dispatchEvent(event);

    // Also update state if state manager is available
    if (this.stateManager) {
      const currentLayoutData = this.stateManager.get('layoutData');
      this.stateManager.updateLayoutData({ ...currentLayoutData });
    }
  }
}

export default LayerManager;
