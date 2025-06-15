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

    selectAnnotation(element) {
        // Clear previous selection
        if (this.selectedAnnotation) {
            this.selectedAnnotation.classList.remove('selected');
        }
        
        // Select new annotation
        this.selectedAnnotation = element;
        element.classList.add('selected');
    }

    showContextMenu(x, y) {
        console.log('showContextMenu called at', x, y);
        // Remove existing context menu
        const existing = document.getElementById('context-menu');
        if (existing) {
            existing.remove();
        }

        // Create context menu
        const menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.backgroundColor = '#ffffff';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        menu.style.zIndex = '2000';
        menu.style.minWidth = '120px';

        // Add edit properties option for rectangles
        if (this.selectedAnnotation && this.selectedAnnotation.classList.contains('custom-rectangle')) {
            const editItem = document.createElement('div');
            editItem.textContent = 'プロパティ編集';
            editItem.style.padding = '8px 12px';
            editItem.style.cursor = 'pointer';
            editItem.style.borderRadius = '4px';
            editItem.addEventListener('mouseenter', () => {
                editItem.style.backgroundColor = '#f0f0f0';
            });
            editItem.addEventListener('mouseleave', () => {
                editItem.style.backgroundColor = 'transparent';
            });
            editItem.addEventListener('click', () => {
                this.editRectangleProperties();
                menu.remove();
            });

            menu.appendChild(editItem);
        }

        // Add edit properties option for text
        if (this.selectedAnnotation && this.selectedAnnotation.classList.contains('custom-text')) {
            const editItem = document.createElement('div');
            editItem.textContent = 'プロパティ編集';
            editItem.style.padding = '8px 12px';
            editItem.style.cursor = 'pointer';
            editItem.style.borderRadius = '4px';
            editItem.addEventListener('mouseenter', () => {
                editItem.style.backgroundColor = '#f0f0f0';
            });
            editItem.addEventListener('mouseleave', () => {
                editItem.style.backgroundColor = 'transparent';
            });
            editItem.addEventListener('click', () => {
                this.editTextProperties();
                menu.remove();
            });

            menu.appendChild(editItem);
        }

        const deleteItem = document.createElement('div');
        deleteItem.textContent = '削除';
        deleteItem.style.padding = '8px 12px';
        deleteItem.style.cursor = 'pointer';
        deleteItem.style.borderRadius = '4px';
        deleteItem.addEventListener('mouseenter', () => {
            deleteItem.style.backgroundColor = '#f0f0f0';
        });
        deleteItem.addEventListener('mouseleave', () => {
            deleteItem.style.backgroundColor = 'transparent';
        });
        deleteItem.addEventListener('click', () => {
            this.deleteSelectedAnnotation();
            menu.remove();
        });

        menu.appendChild(deleteItem);
        document.body.appendChild(menu);

        // Remove menu when clicking elsewhere
        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 0);
    }

    deleteSelectedAnnotation() {
        if (!this.selectedAnnotation) return;

        const type = this.selectedAnnotation.getAttribute('data-type');
        const index = parseInt(this.selectedAnnotation.getAttribute('data-index'));

        if (type === 'rectangle') {
            this.layoutData.rectangles.splice(index, 1);
        } else if (type === 'text') {
            this.layoutData.texts.splice(index, 1);
        }

        this.selectedAnnotation = null;
        this.renderER();

        // Remove context menu if exists
        const menu = document.getElementById('context-menu');
        if (menu) {
            menu.remove();
        }
    }

    editText(index, textElement) {
        const textObj = this.layoutData.texts[index];
        if (!textObj) return;

        // Create an input element for inline editing
        const input = document.createElement('input');
        input.type = 'text';
        input.value = textObj.content;
        input.style.position = 'absolute';
        input.style.fontSize = textObj.size + 'px';
        input.style.color = textObj.color;
        input.style.backgroundColor = '#ffffff';
        input.style.border = '1px solid #ccc';
        input.style.padding = '2px 4px';
        input.style.zIndex = '1000';

        // Calculate position relative to the canvas
        const rect = this.canvas.getBoundingClientRect();
        const svgPoint = this.canvas.createSVGPoint();
        svgPoint.x = textObj.x;
        svgPoint.y = textObj.y;
        const screenPoint = svgPoint.matrixTransform(this.canvas.getScreenCTM());
        
        input.style.left = (rect.left + screenPoint.x) + 'px';
        input.style.top = (rect.top + screenPoint.y - textObj.size) + 'px';

        // Hide the original text element
        textElement.style.opacity = '0';

        // Add input to DOM
        document.body.appendChild(input);
        input.focus();
        input.select();

        // Handle input completion
        const finishEditing = () => {
            const newText = input.value.trim();
            if (newText && newText !== textObj.content) {
                textObj.content = newText;
                this.renderER();
            }
            textElement.style.opacity = '1';
            document.body.removeChild(input);
        };

        // Event listeners for finishing edit
        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEditing();
            } else if (e.key === 'Escape') {
                textElement.style.opacity = '1';
                document.body.removeChild(input);
            }
        });
    }

    addResizeHandles(rectGroup, rect, index) {
        const handleSize = 6;
        const x = rect.x;
        const y = rect.y;
        const width = rect.width;
        const height = rect.height;

        // Corner handles
        const corners = [
            { x: x - handleSize/2, y: y - handleSize/2, cursor: 'nw-resize', type: 'nw' },
            { x: x + width - handleSize/2, y: y - handleSize/2, cursor: 'ne-resize', type: 'ne' },
            { x: x + width - handleSize/2, y: y + height - handleSize/2, cursor: 'se-resize', type: 'se' },
            { x: x - handleSize/2, y: y + height - handleSize/2, cursor: 'sw-resize', type: 'sw' }
        ];

        // Edge handles
        const edges = [
            { x: x + width/2 - handleSize/2, y: y - handleSize/2, cursor: 'n-resize', type: 'n' },
            { x: x + width - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'e-resize', type: 'e' },
            { x: x + width/2 - handleSize/2, y: y + height - handleSize/2, cursor: 's-resize', type: 's' },
            { x: x - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'w-resize', type: 'w' }
        ];

        [...corners, ...edges].forEach(handle => {
            const handleElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            handleElement.setAttribute('class', 'resize-handle');
            handleElement.setAttribute('x', handle.x);
            handleElement.setAttribute('y', handle.y);
            handleElement.setAttribute('width', handleSize);
            handleElement.setAttribute('height', handleSize);
            handleElement.setAttribute('fill', '#3498db');
            handleElement.setAttribute('stroke', '#2980b9');
            handleElement.setAttribute('stroke-width', 1);
            handleElement.setAttribute('data-handle-type', handle.type);
            handleElement.setAttribute('data-rect-index', index);
            handleElement.style.cursor = handle.cursor;
            rectGroup.appendChild(handleElement);
        });
    }

    handleResize(currentPoint) {
        const rect = this.layoutData.rectangles[this.resizeTarget.index];
        if (!rect) return;

        const handleType = this.resizeTarget.type;
        const originalRect = { ...rect };

        const minSize = 20;

        switch (handleType) {
            case 'nw':
                rect.width = Math.max(minSize, originalRect.width + (originalRect.x - currentPoint.x));
                rect.height = Math.max(minSize, originalRect.height + (originalRect.y - currentPoint.y));
                rect.x = originalRect.x + originalRect.width - rect.width;
                rect.y = originalRect.y + originalRect.height - rect.height;
                break;
            case 'ne':
                rect.width = Math.max(minSize, currentPoint.x - originalRect.x);
                rect.height = Math.max(minSize, originalRect.height + (originalRect.y - currentPoint.y));
                rect.y = originalRect.y + originalRect.height - rect.height;
                break;
            case 'se':
                rect.width = Math.max(minSize, currentPoint.x - originalRect.x);
                rect.height = Math.max(minSize, currentPoint.y - originalRect.y);
                break;
            case 'sw':
                rect.width = Math.max(minSize, originalRect.width + (originalRect.x - currentPoint.x));
                rect.height = Math.max(minSize, currentPoint.y - originalRect.y);
                rect.x = originalRect.x + originalRect.width - rect.width;
                break;
            case 'n':
                rect.height = Math.max(minSize, originalRect.height + (originalRect.y - currentPoint.y));
                rect.y = originalRect.y + originalRect.height - rect.height;
                break;
            case 'e':
                rect.width = Math.max(minSize, currentPoint.x - originalRect.x);
                break;
            case 's':
                rect.height = Math.max(minSize, currentPoint.y - originalRect.y);
                break;
            case 'w':
                rect.width = Math.max(minSize, originalRect.width + (originalRect.x - currentPoint.x));
                rect.x = originalRect.x + originalRect.width - rect.width;
                break;
        }

        this.renderER();
    }

    editRectangleProperties() {
        if (!this.selectedAnnotation || !this.selectedAnnotation.classList.contains('custom-rectangle')) return;

        const index = parseInt(this.selectedAnnotation.getAttribute('data-index'));
        const rect = this.layoutData.rectangles[index];
        if (!rect) return;

        // Create properties modal
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.zIndex = '3000';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#ffffff';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        dialog.style.minWidth = '300px';

        dialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0;">矩形のプロパティ</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">線の色:</label>
                <input type="color" id="stroke-color" value="${rect.stroke || '#3498db'}" style="width: 100%; height: 40px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">塗りつぶしの色:</label>
                <input type="color" id="fill-color" value="${this.extractColorFromFill(rect.fill) || '#3498db'}" style="width: 100%; height: 40px;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px;">透明度:</label>
                <input type="range" id="opacity" min="0" max="100" value="${this.extractOpacityFromFill(rect.fill) || 10}" style="width: 100%;">
                <span id="opacity-value">${this.extractOpacityFromFill(rect.fill) || 10}%</span>
            </div>
            <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; font-size: 14px; color: #666;">
                サイズ変更: 矩形を選択して端をドラッグしてください
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancel-btn" style="padding: 8px 16px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">キャンセル</button>
                <button id="save-btn" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">保存</button>
            </div>
        `;

        modal.appendChild(dialog);
        document.body.appendChild(modal);

        // Opacity slider handler
        const opacitySlider = dialog.querySelector('#opacity');
        const opacityValue = dialog.querySelector('#opacity-value');
        opacitySlider.addEventListener('input', (e) => {
            opacityValue.textContent = e.target.value + '%';
        });

        // Button handlers
        dialog.querySelector('#cancel-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        dialog.querySelector('#save-btn').addEventListener('click', () => {
            const strokeColor = dialog.querySelector('#stroke-color').value;
            const fillColor = dialog.querySelector('#fill-color').value;
            const opacity = dialog.querySelector('#opacity').value / 100;

            // Update rectangle properties
            rect.stroke = strokeColor;
            rect.fill = this.hexToRgba(fillColor, opacity);

            // Store selection info to restore after render
            const selectedIndex = this.selectedAnnotation ? this.selectedAnnotation.getAttribute('data-index') : null;
            const selectedType = this.selectedAnnotation ? this.selectedAnnotation.getAttribute('data-type') : null;

            this.renderER();

            // Restore selection after render
            if (selectedIndex !== null && selectedType === 'rectangle') {
                const newSelectedElement = document.querySelector(`[data-index="${selectedIndex}"][data-type="rectangle"]`);
                if (newSelectedElement) {
                    this.selectedAnnotation = newSelectedElement;
                    newSelectedElement.classList.add('selected');
                }
            }

            document.body.removeChild(modal);
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    editTextProperties() {
        if (!this.selectedAnnotation || !this.selectedAnnotation.classList.contains('custom-text')) return;

        const index = parseInt(this.selectedAnnotation.getAttribute('data-index'));
        const textObj = this.layoutData.texts[index];
        if (!textObj) return;

        // Create properties modal
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.zIndex = '3000';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const dialog = document.createElement('div');
        dialog.style.backgroundColor = '#ffffff';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        dialog.style.minWidth = '300px';

        dialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0;">テキストのプロパティ</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">テキスト内容:</label>
                <input type="text" id="text-content" value="${textObj.content || ''}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">文字色:</label>
                <input type="color" id="text-color" value="${textObj.color || '#2c3e50'}" style="width: 100%; height: 40px;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px;">文字サイズ:</label>
                <input type="range" id="text-size" min="8" max="72" value="${textObj.size || 14}" style="width: 100%;">
                <span id="size-value">${textObj.size || 14}px</span>
            </div>
            <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; font-size: 14px; color: #666;">
                位置変更: テキストをドラッグして移動できます
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancel-btn" style="padding: 8px 16px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">キャンセル</button>
                <button id="save-btn" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">保存</button>
            </div>
        `;

        modal.appendChild(dialog);
        document.body.appendChild(modal);

        // Size slider handler
        const sizeSlider = dialog.querySelector('#text-size');
        const sizeValue = dialog.querySelector('#size-value');
        sizeSlider.addEventListener('input', (e) => {
            sizeValue.textContent = e.target.value + 'px';
        });

        // Button handlers
        dialog.querySelector('#cancel-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        dialog.querySelector('#save-btn').addEventListener('click', () => {
            const content = dialog.querySelector('#text-content').value;
            const color = dialog.querySelector('#text-color').value;
            const size = parseInt(dialog.querySelector('#text-size').value);

            // Update text properties
            textObj.content = content;
            textObj.color = color;
            textObj.size = size;

            // Store selection info to restore after render
            const selectedIndex = this.selectedAnnotation ? this.selectedAnnotation.getAttribute('data-index') : null;
            const selectedType = this.selectedAnnotation ? this.selectedAnnotation.getAttribute('data-type') : null;

            this.renderER();

            // Restore selection after render
            if (selectedIndex !== null && selectedType === 'text') {
                const newSelectedElement = document.querySelector(`[data-index="${selectedIndex}"][data-type="text"]`);
                if (newSelectedElement) {
                    this.selectedAnnotation = newSelectedElement;
                    newSelectedElement.classList.add('selected');
                }
            }

            document.body.removeChild(modal);
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    extractColorFromFill(fill) {
        if (!fill) return null;
        const match = fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
        return fill;
    }

    extractOpacityFromFill(fill) {
        if (!fill) return null;
        const match = fill.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
        if (match) {
            return Math.round(parseFloat(match[1]) * 100);
        }
        return null;
    }
}