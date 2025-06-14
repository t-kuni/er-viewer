// Main ER Viewer core class - modularized version
import { HighlightManager } from '../highlighting/highlight-manager.js';
import { MouseHandler } from '../events/mouse-handler.js';
import { KeyboardHandler } from '../events/keyboard-handler.js';
import { ClusteringEngine } from '../clustering/clustering-engine.js';
import { SmartRouting } from '../pathfinding/smart-routing.js';
import { ConnectionPoints } from '../pathfinding/connection-points.js';
import { SVGUtils } from '../utils/svg-utils.js';

export class ERViewerCore {
    constructor() {
        this.canvas = document.getElementById('er-canvas');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarContent = document.getElementById('sidebar-content');
        
        this.erData = null;
        this.layoutData = { entities: {}, rectangles: [], texts: [] };
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.selectedAnnotation = null;
        
        // Initialize modules
        this.highlightManager = new HighlightManager();
        this.mouseHandler = new MouseHandler(this);
        this.keyboardHandler = new KeyboardHandler(this);
        this.clusteringEngine = new ClusteringEngine(this.erData);
        this.smartRouting = new SmartRouting();
        this.connectionPoints = new ConnectionPoints(this.erData);
        
        this.initEventListeners();
    }

    initEventListeners() {
        // Build info modal functionality
        const buildInfo = document.getElementById('build-info');
        const buildInfoModal = document.getElementById('build-info-modal');
        const closeBuildInfo = document.getElementById('close-build-info');

        if (buildInfo && buildInfoModal) {
            buildInfo.addEventListener('click', () => {
                buildInfoModal.classList.add('show');
            });
        }

        if (closeBuildInfo && buildInfoModal) {
            closeBuildInfo.addEventListener('click', () => {
                this.hideBuildInfo();
            });
        }

        if (buildInfoModal) {
            buildInfoModal.addEventListener('click', (e) => {
                if (e.target === buildInfoModal) {
                    this.hideBuildInfo();
                }
            });
        }

        // Canvas event listeners
        this.canvas.addEventListener('wheel', (e) => this.mouseHandler.handleWheel(e));
        this.canvas.addEventListener('mousedown', (e) => this.mouseHandler.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.mouseHandler.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.mouseHandler.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.mouseHandler.handleClick(e));
        this.canvas.addEventListener('dblclick', (e) => this.mouseHandler.handleDoubleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.mouseHandler.handleContextMenu(e));
        
        // Keyboard event listeners
        document.addEventListener('keydown', (e) => this.keyboardHandler.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.keyboardHandler.handleKeyUp(e));
    }

    async loadERData() {
        try {
            console.log('Loading ER data...');
            const response = await fetch('/api/er-data');
            if (response.ok) {
                this.erData = await response.json();
                this.layoutData = this.erData.layout || { entities: {}, rectangles: [], texts: [] };
                
                // Update modules with new data
                this.clusteringEngine.setERData(this.erData);
                this.connectionPoints.setERData(this.erData);
                
                console.log('ER data loaded successfully:', this.erData);
                this.renderER();
            } else {
                console.warn(`Failed to load ER data: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading ER data:', error);
        }
    }

    updateTransform() {
        const mainGroup = document.getElementById('main-group');
        if (mainGroup) {
            mainGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
        }
    }

    renderER() {
        if (!this.erData) return;

        const svg = this.canvas;
        svg.innerHTML = svg.innerHTML.split('<defs>')[0] + '<defs>' + svg.innerHTML.split('</defs>')[1];

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', 'main-group');
        g.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
        svg.appendChild(g);

        this.renderRelationships(g);
        this.renderCustomElements(g);
        this.renderEntities(g);
    }

    renderEntities(container) {
        this.erData.entities.forEach((entity, index) => {
            const position = entity.position || this.clusteringEngine.calculateClusteredPosition(entity, index);
            
            const entityGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            entityGroup.setAttribute('class', 'entity');
            entityGroup.setAttribute('data-table', entity.name);
            entityGroup.setAttribute('transform', `translate(${position.x}, ${position.y})`);

            const width = 180;
            const headerHeight = 30;
            const rowHeight = 20;
            const bottomPadding = 8;
            const height = headerHeight + entity.columns.length * rowHeight + bottomPadding;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'entity-rect');
            rect.setAttribute('width', width);
            rect.setAttribute('height', height);
            entityGroup.appendChild(rect);

            const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            title.setAttribute('class', 'entity-title');
            title.setAttribute('x', width / 2);
            title.setAttribute('y', headerHeight / 2);
            title.textContent = entity.name;
            entityGroup.appendChild(title);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', headerHeight);
            line.setAttribute('x2', width);
            line.setAttribute('y2', headerHeight);
            line.setAttribute('stroke', '#34495e');
            line.setAttribute('stroke-width', 1);
            entityGroup.appendChild(line);

            entity.columns.forEach((column, colIndex) => {
                const columnText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                columnText.setAttribute('class', `entity-column column ${column.key === 'PRI' ? 'primary-key' : ''} ${(entity.foreignKeys || []).some(fk => fk.column === column.name) ? 'foreign-key' : ''}`);
                columnText.setAttribute('data-column', column.name);
                columnText.setAttribute('x', 10);
                columnText.setAttribute('y', headerHeight + (colIndex + 1) * rowHeight - 5);
                columnText.textContent = `${column.name}: ${column.type}`;
                entityGroup.appendChild(columnText);
            });

            container.appendChild(entityGroup);
        });
    }

    renderRelationships(container) {
        if (!this.erData.relationships) return;

        // Update entity bounds for smart routing
        const entityBounds = this.connectionPoints.getAllEntityBounds(this.erData.entities);
        this.smartRouting.setEntityBounds(entityBounds);

        this.erData.relationships.forEach(relationship => {
            const fromEntity = this.erData.entities.find(e => e.name === relationship.from);
            const toEntity = this.erData.entities.find(e => e.name === relationship.to);

            if (!fromEntity || !toEntity) return;

            const fromBounds = this.connectionPoints.getEntityBounds(fromEntity);
            const toBounds = this.connectionPoints.getEntityBounds(toEntity);

            const connectionPoints = this.connectionPoints.findOptimalConnectionPoints(fromBounds, toBounds, relationship);
            const pathData = this.smartRouting.createPolylinePath(connectionPoints.from, connectionPoints.to);

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'relationship');
            path.setAttribute('d', pathData);
            path.setAttribute('data-from', relationship.from);
            path.setAttribute('data-to', relationship.to);
            path.setAttribute('data-from-column', relationship.fromColumn);
            path.setAttribute('data-to-column', relationship.toColumn);

            container.appendChild(path);
        });
    }

    renderCustomElements(container) {
        // Render rectangles
        this.layoutData.rectangles.forEach((rect, index) => {
            const rectGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            rectGroup.setAttribute('class', 'rectangle-group');

            const rectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rectElement.setAttribute('class', 'custom-rectangle');
            rectElement.setAttribute('x', rect.x);
            rectElement.setAttribute('y', rect.y);
            rectElement.setAttribute('width', rect.width);
            rectElement.setAttribute('height', rect.height);
            rectElement.setAttribute('stroke', rect.stroke);
            rectElement.setAttribute('fill', rect.fill);
            rectElement.setAttribute('data-index', index);
            rectElement.setAttribute('data-type', 'rectangle');

            rectGroup.appendChild(rectElement);

            if (this.selectedAnnotation && 
                this.selectedAnnotation.getAttribute('data-index') === index.toString() &&
                this.selectedAnnotation.getAttribute('data-type') === 'rectangle') {
                rectElement.classList.add('selected');
                this.addResizeHandles(rectGroup, rect, index);
            }

            container.appendChild(rectGroup);
        });

        // Render texts
        this.layoutData.texts.forEach((text, index) => {
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('class', 'custom-text');
            textElement.setAttribute('x', text.x);
            textElement.setAttribute('y', text.y);
            textElement.setAttribute('fill', text.color);
            textElement.setAttribute('font-size', text.size);
            textElement.setAttribute('data-index', index);
            textElement.setAttribute('data-type', 'text');
            textElement.textContent = text.content;

            container.appendChild(textElement);
        });
    }

    async showTableDetails(tableName) {
        try {
            const response = await fetch(`/api/table/${tableName}/ddl`);
            if (response.ok) {
                const data = await response.json();
                this.sidebarContent.innerHTML = `
                    <h4>${tableName}</h4>
                    <div class="ddl-content">${data.ddl}</div>
                `;
                this.sidebar.classList.add('open');
            }
        } catch (error) {
            console.error('Error loading table details:', error);
        }
    }

    closeSidebar() {
        this.sidebar.classList.remove('open');
    }

    hideBuildInfo() {
        const buildInfoModal = document.getElementById('build-info-modal');
        if (buildInfoModal) {
            buildInfoModal.classList.remove('show');
        }
    }

    screenToSVG(screenX, screenY) {
        return SVGUtils.screenToSVG(screenX, screenY, this.canvas, this.panX, this.panY, this.scale);
    }

    // Placeholder methods for compatibility - these would be implemented in separate modules
    selectAnnotation(element) { /* Implementation in annotations module */ }
    showContextMenu(x, y) { /* Implementation in ui module */ }
    deleteSelectedAnnotation() { /* Implementation in annotations module */ }
    editText(index, textElement) { /* Implementation in annotations module */ }
    addResizeHandles(rectGroup, rect, index) { /* Implementation in annotations module */ }
    handleResize(currentPoint) { /* Implementation in annotations module */ }
}