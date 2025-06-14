// Client-side logging system
class ClientLogger {
    static sendLog(level, message, error = null) {
        const logData = {
            level,
            message,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        if (error && error.stack) {
            logData.stack = error.stack;
            logData.line = error.line || error.lineno;
            logData.column = error.column || error.colno;
        }
        
        fetch('/api/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
        }).catch(err => console.warn('Failed to send log to server:', err));
    }
    
    static info(message) {
        console.log(message);
        this.sendLog('info', message);
    }
    
    static warn(message) {
        console.warn(message);
        this.sendLog('warn', message);
    }
    
    static error(message, error = null) {
        console.error(message, error);
        this.sendLog('error', message, error);
    }
}

// Override console methods to capture all logs
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function(...args) {
    originalLog.apply(console, args);
    ClientLogger.sendLog('info', args.join(' '));
};

console.warn = function(...args) {
    originalWarn.apply(console, args);
    ClientLogger.sendLog('warn', args.join(' '));
};

console.error = function(...args) {
    originalError.apply(console, args);
    ClientLogger.sendLog('error', args.join(' '));
};

// Global error handler
window.addEventListener('error', (event) => {
    ClientLogger.sendLog('error', `${event.message}`, {
        stack: event.error ? event.error.stack : '',
        line: event.lineno,
        column: event.colno,
        filename: event.filename
    });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    ClientLogger.sendLog('error', `Unhandled promise rejection: ${event.reason}`, {
        stack: event.reason && event.reason.stack ? event.reason.stack : ''
    });
});

class ERViewer {
    constructor() {
        this.canvas = document.getElementById('er-canvas');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarContent = document.getElementById('sidebar-content');
        
        this.erData = null;
        this.layoutData = { entities: {}, rectangles: [], texts: [] };
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragTarget = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isPanning = false;
        this.selectedAnnotation = null;
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeTarget = null;
        this.lastPanPoint = { x: 0, y: 0 };
        
        this.initEventListeners();
        this.loadERData();
    }

    initEventListeners() {
        document.getElementById('reverse-btn').addEventListener('click', () => this.reverseEngineer());
        document.getElementById('save-btn').addEventListener('click', () => this.saveLayout());
        document.getElementById('load-btn').addEventListener('click', () => this.loadERData());
        document.getElementById('close-sidebar').addEventListener('click', () => this.closeSidebar());
        document.getElementById('add-rectangle-btn').addEventListener('click', () => this.addRectangle());
        document.getElementById('add-text-btn').addEventListener('click', () => this.addText());
        document.getElementById('build-info-btn').addEventListener('click', () => this.showBuildInfo());
        document.getElementById('close-build-info-modal').addEventListener('click', () => this.hideBuildInfo());
        
        // Close modal when clicking outside
        document.getElementById('build-info-modal').addEventListener('click', (e) => {
            if (e.target.id === 'build-info-modal') {
                this.hideBuildInfo();
            }
        });

        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.canvas.style.cursor = 'grab';
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelectedAnnotation();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.canvas.style.cursor = 'default';
            }
        });
    }

    async loadERData() {
        try {
            console.log('Loading ER data...');
            const response = await fetch('/api/er-data');
            if (response.ok) {
                this.erData = await response.json();
                this.layoutData = this.erData.layout || { entities: {}, rectangles: [], texts: [] };
                console.log('ER data loaded successfully:', this.erData);
                this.renderER();
            } else {
                console.warn(`Failed to load ER data: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading ER data:', error);
        }
    }

    async reverseEngineer() {
        console.log('Starting reverse engineering...');
        this.showLoading('リバースエンジニアリング中...');
        try {
            const response = await fetch('/api/reverse-engineer', { method: 'POST' });
            if (response.ok) {
                this.erData = await response.json();
                this.layoutData = this.erData.layout || { entities: {}, rectangles: [], texts: [] };
                console.log('Reverse engineering completed successfully');
                this.renderER();
            } else {
                const errorText = await response.text();
                console.error(`Reverse engineering failed: ${response.status} ${response.statusText}`, errorText);
                alert('リバースエンジニアリングに失敗しました');
            }
        } catch (error) {
            console.error('Error during reverse engineering:', error);
            alert('リバースエンジニアリングエラー');
        } finally {
            this.hideLoading();
        }
    }

    async saveLayout() {
        try {
            const response = await fetch('/api/layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.layoutData)
            });
            if (response.ok) {
                alert('レイアウトを保存しました');
            }
        } catch (error) {
            console.error('Error saving layout:', error);
        }
    }

    renderER() {
        if (!this.erData) return;

        const svg = this.canvas;
        svg.innerHTML = svg.innerHTML.split('<defs>')[0] + '<defs>' + svg.innerHTML.split('</defs>')[1];

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
        svg.appendChild(g);

        this.renderRelationships(g);
        this.renderCustomElements(g);
        this.renderEntities(g);
    }

    renderEntities(container) {
        this.erData.entities.forEach((entity, index) => {
            const position = entity.position || { x: 50 + (index % 4) * 200, y: 50 + Math.floor(index / 4) * 150 };
            
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
                columnText.setAttribute('class', `entity-column ${column.key === 'PRI' ? 'primary-key' : ''} ${(entity.foreignKeys || []).some(fk => fk.column === column.name) ? 'foreign-key' : ''}`);
                columnText.setAttribute('x', 10);
                columnText.setAttribute('y', headerHeight + (colIndex + 1) * rowHeight - 5);
                columnText.textContent = `${column.name}: ${column.type}`;
                entityGroup.appendChild(columnText);
            });

            container.appendChild(entityGroup);
        });
    }

    renderRelationships(container) {
        this.erData.relationships.forEach(rel => {
            const fromEntity = this.erData.entities.find(e => e.name === rel.from);
            const toEntity = this.erData.entities.find(e => e.name === rel.to);
            
            if (!fromEntity || !toEntity) return;

            const fromPos = fromEntity.position || { x: 50, y: 50 };
            const toPos = toEntity.position || { x: 50, y: 50 };

            const fromCenter = { x: fromPos.x + 90, y: fromPos.y + 40 };
            const toCenter = { x: toPos.x + 90, y: toPos.y + 40 };

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'relationship');
            path.setAttribute('data-from', rel.from);
            path.setAttribute('data-to', rel.to);
            
            const pathData = this.createPolylinePath(fromCenter, toCenter);
            path.setAttribute('d', pathData);
            
            container.appendChild(path);
        });
    }

    renderCustomElements(container) {
        this.layoutData.rectangles.forEach((rect, index) => {
            // Create group for rectangle and resize handles
            const rectGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            rectGroup.setAttribute('class', 'rectangle-group');

            const rectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rectElement.setAttribute('class', 'custom-rectangle');
            rectElement.setAttribute('x', rect.x);
            rectElement.setAttribute('y', rect.y);
            rectElement.setAttribute('width', rect.width);
            rectElement.setAttribute('height', rect.height);
            rectElement.setAttribute('data-type', 'rectangle');
            rectElement.setAttribute('data-index', index);
            if (rect.stroke) {
                rectElement.style.stroke = rect.stroke;
                console.log(`Setting stroke for rectangle ${index}:`, rect.stroke);
            }
            if (rect.fill) {
                rectElement.style.fill = rect.fill;
                console.log(`Setting fill for rectangle ${index}:`, rect.fill);
            }
            rectGroup.appendChild(rectElement);

            // Add resize handles when selected
            if (this.selectedAnnotation && 
                this.selectedAnnotation.getAttribute('data-index') == index && 
                this.selectedAnnotation.getAttribute('data-type') === 'rectangle') {
                this.addResizeHandles(rectGroup, rect, index);
                // Update selected annotation reference to new element
                this.selectedAnnotation = rectElement;
                rectElement.classList.add('selected');
            }

            container.appendChild(rectGroup);
        });

        this.layoutData.texts.forEach((text, index) => {
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('class', 'custom-text');
            textElement.setAttribute('x', text.x);
            textElement.setAttribute('y', text.y);
            textElement.setAttribute('data-type', 'text');
            textElement.setAttribute('data-index', index);
            if (text.color) textElement.setAttribute('fill', text.color);
            if (text.size) textElement.setAttribute('font-size', text.size);
            textElement.textContent = text.content;
            container.appendChild(textElement);
        });
    }

    createPolylinePath(from, to) {
        const midX = (from.x + to.x) / 2;
        return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale = Math.max(0.1, Math.min(3, this.scale * delta));
        this.renderER();
    }

    handleMouseDown(e) {
        const resizeHandle = e.target.closest('.resize-handle');
        const target = e.target.closest('.entity, .custom-rectangle, .custom-text');

        if (resizeHandle) {
            e.preventDefault();
            this.isResizing = true;
            this.resizeHandle = resizeHandle;
            this.resizeTarget = {
                index: parseInt(resizeHandle.getAttribute('data-rect-index')),
                type: resizeHandle.getAttribute('data-handle-type')
            };
            const rect = this.canvas.getBoundingClientRect();
            this.dragOffset = this.screenToSVG(e.clientX - rect.left, e.clientY - rect.top);
            return;
        }
        
        if (e.button === 1 || (e.button === 0 && e.code === 'Space')) {
            this.isPanning = true;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
        } else if (target) {
            this.isDragging = true;
            this.dragTarget = target;
            const rect = this.canvas.getBoundingClientRect();
            const svgPoint = this.screenToSVG(e.clientX - rect.left, e.clientY - rect.top);
            
            if (target.classList.contains('entity')) {
                const transform = target.getAttribute('transform');
                const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                if (match) {
                    this.dragOffset = {
                        x: svgPoint.x - parseFloat(match[1]),
                        y: svgPoint.y - parseFloat(match[2])
                    };
                }
            } else if (target.classList.contains('custom-rectangle')) {
                const x = parseFloat(target.getAttribute('x'));
                const y = parseFloat(target.getAttribute('y'));
                this.dragOffset = {
                    x: svgPoint.x - x,
                    y: svgPoint.y - y
                };
            } else if (target.classList.contains('custom-text')) {
                const x = parseFloat(target.getAttribute('x'));
                const y = parseFloat(target.getAttribute('y'));
                this.dragOffset = {
                    x: svgPoint.x - x,
                    y: svgPoint.y - y
                };
            }
        }
    }

    handleMouseMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.lastPanPoint.x;
            const dy = e.clientY - this.lastPanPoint.y;
            this.panX += dx;
            this.panY += dy;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.renderER();
        } else if (this.isResizing && this.resizeTarget) {
            const rect = this.canvas.getBoundingClientRect();
            const svgPoint = this.screenToSVG(e.clientX - rect.left, e.clientY - rect.top);
            this.handleResize(svgPoint);
        } else if (this.isDragging && this.dragTarget) {
            const rect = this.canvas.getBoundingClientRect();
            const svgPoint = this.screenToSVG(e.clientX - rect.left, e.clientY - rect.top);
            
            if (this.dragTarget.classList.contains('entity')) {
                const newX = svgPoint.x - this.dragOffset.x;
                const newY = svgPoint.y - this.dragOffset.y;
                this.dragTarget.setAttribute('transform', `translate(${newX}, ${newY})`);
                
                const tableName = this.dragTarget.getAttribute('data-table');
                if (tableName) {
                    if (!this.layoutData.entities[tableName]) {
                        this.layoutData.entities[tableName] = {};
                    }
                    this.layoutData.entities[tableName].position = { x: newX, y: newY };
                    
                    const entity = this.erData.entities.find(e => e.name === tableName);
                    if (entity) {
                        entity.position = { x: newX, y: newY };
                    }
                }
                
                this.renderER();
            } else if (this.dragTarget.classList.contains('custom-rectangle')) {
                const newX = svgPoint.x - this.dragOffset.x;
                const newY = svgPoint.y - this.dragOffset.y;
                this.dragTarget.setAttribute('x', newX);
                this.dragTarget.setAttribute('y', newY);
                
                const index = parseInt(this.dragTarget.getAttribute('data-index'));
                if (this.layoutData.rectangles[index]) {
                    this.layoutData.rectangles[index].x = newX;
                    this.layoutData.rectangles[index].y = newY;
                }
            } else if (this.dragTarget.classList.contains('custom-text')) {
                const newX = svgPoint.x - this.dragOffset.x;
                const newY = svgPoint.y - this.dragOffset.y;
                this.dragTarget.setAttribute('x', newX);
                this.dragTarget.setAttribute('y', newY);
                
                const index = parseInt(this.dragTarget.getAttribute('data-index'));
                if (this.layoutData.texts[index]) {
                    this.layoutData.texts[index].x = newX;
                    this.layoutData.texts[index].y = newY;
                }
            }
        } else {
            const target = e.target.closest('.entity, .relationship');
            this.clearHighlights();
            
            if (target) {
                if (target.classList.contains('entity')) {
                    this.highlightEntity(target.getAttribute('data-table'));
                } else if (target.classList.contains('relationship')) {
                    target.classList.add('highlighted');
                }
            }
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.dragTarget = null;
        this.isPanning = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeTarget = null;
        this.canvas.style.cursor = 'default';
    }

    handleClick(e) {
        const entity = e.target.closest('.entity');
        if (entity) {
            const tableName = entity.getAttribute('data-table');
            this.showTableDetails(tableName);
        }
    }

    handleDoubleClick(e) {
        const textElement = e.target.closest('.custom-text');
        if (textElement) {
            const index = parseInt(textElement.getAttribute('data-index'));
            this.editText(index, textElement);
        }
    }

    handleContextMenu(e) {
        const annotation = e.target.closest('.custom-rectangle, .custom-text');
        if (annotation) {
            e.preventDefault();
            this.selectAnnotation(annotation);
            this.showContextMenu(e.clientX, e.clientY);
        }
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

            console.log('Updated rectangle properties:', rect);

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

    highlightEntity(tableName) {
        const entity = document.querySelector(`[data-table="${tableName}"]`);
        if (entity) {
            entity.classList.add('highlighted');
            
            // Get all relationships connected to this entity
            const relationships = document.querySelectorAll(`[data-from="${tableName}"], [data-to="${tableName}"]`);
            relationships.forEach(rel => {
                rel.classList.add('highlighted');
                
                // Highlight the related entities as well
                const fromTable = rel.getAttribute('data-from');
                const toTable = rel.getAttribute('data-to');
                
                // Highlight the other entity in each relationship
                const relatedTable = fromTable === tableName ? toTable : fromTable;
                const relatedEntity = document.querySelector(`[data-table="${relatedTable}"]`);
                if (relatedEntity) {
                    relatedEntity.classList.add('highlighted');
                }
            });
        }
    }

    clearHighlights() {
        document.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
    }

    addRectangle() {
        const rect = {
            x: 100,
            y: 100,
            width: 200,
            height: 100,
            stroke: '#3498db',
            fill: 'rgba(52, 152, 219, 0.1)'
        };
        this.layoutData.rectangles.push(rect);
        this.renderER();
    }

    addText() {
        const text = prompt('テキストを入力してください:');
        if (text) {
            const textObj = {
                x: 100,
                y: 100,
                content: text,
                color: '#2c3e50',
                size: 14
            };
            this.layoutData.texts.push(textObj);
            this.renderER();
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

    screenToSVG(screenX, screenY) {
        return {
            x: (screenX - this.panX) / this.scale,
            y: (screenY - this.panY) / this.scale
        };
    }

    showLoading(message) {
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.textContent = message;
        loading.id = 'loading';
        document.body.appendChild(loading);
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.remove();
        }
    }

    async showBuildInfo() {
        const modal = document.getElementById('build-info-modal');
        const content = document.getElementById('build-info-content');
        
        try {
            content.innerHTML = '<p>ビルド情報を読み込み中...</p>';
            modal.classList.add('show');
            
            const response = await fetch('/api/build-info');
            const buildInfo = await response.json();
            
            const formatDate = (dateString) => {
                if (dateString === 'unknown' || dateString === 'ビルド情報なし') {
                    return dateString;
                }
                try {
                    const date = new Date(dateString);
                    return date.toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                } catch {
                    return dateString;
                }
            };
            
            content.innerHTML = `
                <div class="build-info-item">
                    <span class="build-info-label">アプリケーション名:</span>
                    <span class="build-info-value">${buildInfo.name}</span>
                </div>
                <div class="build-info-item">
                    <span class="build-info-label">バージョン:</span>
                    <span class="build-info-value version">${buildInfo.version}</span>
                </div>
                <div class="build-info-item">
                    <span class="build-info-label">ビルド日時:</span>
                    <span class="build-info-value">${buildInfo.buildDate || formatDate(buildInfo.buildTime)}</span>
                </div>
                <div class="build-info-item">
                    <span class="build-info-label">Git コミット:</span>
                    <span class="build-info-value commit">${buildInfo.git.commitShort}</span>
                </div>
                <div class="build-info-item">
                    <span class="build-info-label">Git ブランチ:</span>
                    <span class="build-info-value">${buildInfo.git.branch}</span>
                </div>
                ${buildInfo.git.tag ? `
                <div class="build-info-item">
                    <span class="build-info-label">Git タグ:</span>
                    <span class="build-info-value">${buildInfo.git.tag}</span>
                </div>
                ` : ''}
                <div class="build-info-item">
                    <span class="build-info-label">Node.js バージョン:</span>
                    <span class="build-info-value">${buildInfo.nodeVersion}</span>
                </div>
                <div class="build-info-item">
                    <span class="build-info-label">プラットフォーム:</span>
                    <span class="build-info-value">${buildInfo.platform} (${buildInfo.arch})</span>
                </div>
            `;
        } catch (error) {
            console.error('Error loading build info:', error);
            content.innerHTML = '<p style="color: #e74c3c;">ビルド情報の読み込みに失敗しました。</p>';
        }
    }

    hideBuildInfo() {
        const modal = document.getElementById('build-info-modal');
        modal.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ERViewer();
});