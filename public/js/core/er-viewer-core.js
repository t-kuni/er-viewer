// Main ER Viewer core class - refactored architecture
import { HighlightManager } from '../highlighting/highlight-manager.js';
import { ClusteringEngine } from '../clustering/clustering-engine.js';
import { SmartRouting } from '../pathfinding/smart-routing.js';
import { ConnectionPoints } from '../pathfinding/connection-points.js';
import { StateManager } from '../state/state-manager.js';
import { CoordinateTransform } from '../utils/coordinate-transform.js';
import { CanvasRenderer } from '../rendering/canvas-renderer.js';
import { EventController } from '../events/event-controller.js';

export class ERViewerCore {
    constructor() {
        this.canvas = document.getElementById('er-canvas');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarContent = document.getElementById('sidebar-content');
        
        // Initialize core systems
        this.stateManager = new StateManager();
        this.coordinateTransform = new CoordinateTransform();
        this.canvasRenderer = new CanvasRenderer(this.canvas, this.coordinateTransform);
        this.eventController = new EventController(this.canvas, this.stateManager, this.coordinateTransform);
        
        // Initialize feature modules
        this.highlightManager = new HighlightManager();
        this.clusteringEngine = new ClusteringEngine();
        this.smartRouting = new SmartRouting();
        this.connectionPoints = new ConnectionPoints();
        
        this.initializeApplication();
    }

    initializeApplication() {
        // Subscribe to state changes
        this.stateManager.subscribeToProperty('viewport', (oldViewport, newViewport) => {
            this.canvasRenderer.updateTransform(newViewport.panX, newViewport.panY, newViewport.scale);
        });
        
        this.stateManager.subscribeToProperty('erData', (oldERData, newERData) => {
            this.clusteringEngine.setERData(newERData);
            this.connectionPoints.setERData(newERData);
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
        
        // Initialize UI event listeners
        this.initUIEventListeners();
    }

    initUIEventListeners() {
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
    }

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
            } else {
                const errorMsg = `Failed to load ER data: ${response.status} ${response.statusText}`;
                console.warn(errorMsg);
                this.stateManager.setError(errorMsg);
            }
        } catch (error) {
            console.error('Error loading ER data:', error);
            this.stateManager.setError(error.message);
        } finally {
            this.stateManager.setLoading(false);
        }
    }

    updateTransform() {
        const viewport = this.stateManager.get('viewport');
        this.coordinateTransform.updateViewport(viewport.panX, viewport.panY, viewport.scale);
        this.canvasRenderer.updateTransform(viewport.panX, viewport.panY, viewport.scale);
    }

    renderER() {
        const erData = this.stateManager.get('erData');
        const layoutData = this.stateManager.get('layoutData');
        
        if (!erData) return;
        
        this.canvasRenderer.renderER(erData, layoutData);
        this.updateTransform();
    }




    async showTableDetails(tableName) {
        try {
            console.log('showTableDetails called with tableName:', tableName);
            const response = await fetch(`/api/table/${tableName}/ddl`);
            console.log('DDL API response:', response);
            if (response.ok) {
                const data = await response.json();
                console.log('DDL data received:', data);
                const highlightedDDL = this.applySyntaxHighlighting(data.ddl);
                this.sidebarContent.innerHTML = `
                    <h4>${tableName}</h4>
                    <pre class="ddl-content syntax-highlighted"><code>${highlightedDDL}</code></pre>
                `;
                this.sidebar.classList.add('open');
                console.log('Sidebar should now be open');
            } else {
                console.error('Failed to fetch DDL:', response.status, response.statusText);
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
        return this.coordinateTransform.screenToSVG(screenX, screenY, this.canvas);
    }

    selectAnnotation(element) {
        this.stateManager.setState({ selectedAnnotation: element });
    }

    // Event handlers for new architecture
    handleEntityClick(data) {
        console.log('Entity clicked:', data.tableName);
        this.showTableDetails(data.tableName);
    }

    handleEntityDoubleClick(data) {
        console.log('Entity double-clicked:', data.tableName);
        // Double click behavior can be different from single click
    }

    handleRelationshipClick(data) {
        console.log('Relationship clicked:', data.fromTable, '->', data.toTable);
        // Handle relationship click
    }

    handleContextMenu(data) {
        console.log('Context menu requested at:', data.screenX, data.screenY);
        this.showContextMenu(data.screenX, data.screenY);
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

    applySyntaxHighlighting(ddl) {
        if (!ddl) return '';
        
        // Escape HTML first to prevent XSS
        let highlighted = ddl
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        // SQL Keywords
        const keywords = [
            'CREATE', 'TABLE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'SELECT',
            'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS',
            'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'DISTINCT',
            'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'INDEX', 'UNIQUE',
            'NOT', 'NULL', 'DEFAULT', 'AUTO_INCREMENT', 'CHECK', 'CASCADE', 'RESTRICT',
            'SET', 'NULL', 'CURRENT_TIMESTAMP', 'NOW'
        ];

        // Data Types
        const dataTypes = [
            'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT',
            'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'TINYTEXT',
            'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL',
            'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
            'BOOLEAN', 'BOOL', 'BIT',
            'BINARY', 'VARBINARY', 'BLOB', 'LONGBLOB', 'MEDIUMBLOB', 'TINYBLOB',
            'JSON', 'ENUM', 'SET'
        ];

        // Highlight SQL keywords
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlighted = highlighted.replace(regex, `<span class="sql-keyword">${keyword.toUpperCase()}</span>`);
        });

        // Highlight data types
        dataTypes.forEach(type => {
            const regex = new RegExp(`\\b${type}\\b`, 'gi');
            highlighted = highlighted.replace(regex, `<span class="sql-datatype">${type.toUpperCase()}</span>`);
        });

        // Highlight string literals
        highlighted = highlighted.replace(/(&#39;[^&#39;]*&#39;)/g, '<span class="sql-string">$1</span>');
        highlighted = highlighted.replace(/(&quot;[^&quot;]*&quot;)/g, '<span class="sql-string">$1</span>');

        // Highlight numbers
        highlighted = highlighted.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');

        // Highlight comments
        highlighted = highlighted.replace(/(--[^\n\r]*)/g, '<span class="sql-comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="sql-comment">$1</span>');

        return highlighted;
    }
}