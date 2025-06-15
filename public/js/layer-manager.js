class LayerManager {
    constructor() {
        this.layers = [];
        this.layerCounter = 0;
        this.draggedItem = null;
        this.isCollapsed = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadCollapsedState();
        
        // Add default ER diagram layer
        this.addLayer('er-diagram', 'ER図', '🗂️');
    }
    
    initializeElements() {
        this.sidebar = document.getElementById('layer-sidebar');
        this.layerList = document.getElementById('layer-list');
        this.collapseBtn = document.getElementById('collapse-layer-sidebar');
        this.resizeHandle = this.sidebar.querySelector('.layer-sidebar-resize-handle');
    }
    
    setupEventListeners() {
        // Collapse/expand functionality
        this.collapseBtn.addEventListener('click', () => {
            this.toggleCollapse();
        });
        
        // Resize functionality
        this.setupResizeHandle();
    }
    
    setupResizeHandle() {
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
        this.sidebar.classList.toggle('collapsed', this.isCollapsed);
        
        // Update button text
        this.collapseBtn.textContent = this.isCollapsed ? '▶' : '◀';
        
        // Save state
        localStorage.setItem('layerSidebarCollapsed', this.isCollapsed);
    }
    
    loadCollapsedState() {
        const savedState = localStorage.getItem('layerSidebarCollapsed');
        if (savedState === 'true') {
            this.toggleCollapse();
        }
    }
    
    addLayer(type, name, icon = '📄') {
        const layer = {
            id: this.generateLayerId(),
            type: type,
            name: name,
            icon: icon,
            order: this.layers.length
        };
        
        this.layers.push(layer);
        this.renderLayers();
        
        return layer;
    }
    
    removeLayer(layerId) {
        const index = this.layers.findIndex(layer => layer.id === layerId);
        if (index > -1) {
            this.layers.splice(index, 1);
            this.updateLayerOrders();
            this.renderLayers();
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
        this.layerList.innerHTML = '';
        
        // Sort layers by order (top to bottom in list = front to back in rendering)
        const sortedLayers = [...this.layers].sort((a, b) => a.order - b.order);
        
        sortedLayers.forEach(layer => {
            const layerElement = this.createLayerElement(layer);
            this.layerList.appendChild(layerElement);
        });
        
        this.setupDragAndDrop();
    }
    
    createLayerElement(layer) {
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
        const layerItems = this.layerList.querySelectorAll('.layer-item');
        
        layerItems.forEach(item => {
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
        
        const draggedIndex = this.layers.findIndex(layer => layer.id === draggedLayerId);
        const targetIndex = this.layers.findIndex(layer => layer.id === targetLayerId);
        
        if (draggedIndex > -1 && targetIndex > -1) {
            // Remove dragged layer
            const [draggedLayer] = this.layers.splice(draggedIndex, 1);
            
            // Insert at target position
            this.layers.splice(targetIndex, 0, draggedLayer);
            
            // Update orders
            this.updateLayerOrders();
            
            // Re-render
            this.renderLayers();
            
            console.log('Layer order updated:', this.layers.map(l => l.name));
        }
    }
    
    // Public methods for integration with other components
    addRectangleLayer(rectangleId) {
        const name = `矩形No${rectangleId}`;
        return this.addLayer('rectangle', name, '▭');
    }
    
    addTextLayer(text) {
        const truncatedText = text.length > 20 ? text.substring(0, 20) + '...' : text;
        const name = `テキスト "${truncatedText}"`;
        return this.addLayer('text', name, '📝');
    }
    
    removeLayerByReference(type, reference) {
        const layer = this.layers.find(l => l.type === type && l.name.includes(reference));
        if (layer) {
            this.removeLayer(layer.id);
        }
    }
    
    getLayerOrder() {
        return this.layers.map(layer => ({
            id: layer.id,
            type: layer.type,
            order: layer.order
        }));
    }
    
    setLayerOrder(layerOrder) {
        layerOrder.forEach(orderInfo => {
            const layer = this.layers.find(l => l.id === orderInfo.id);
            if (layer) {
                layer.order = orderInfo.order;
            }
        });
        
        this.renderLayers();
    }
}

export default LayerManager;