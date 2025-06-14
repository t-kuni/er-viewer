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
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.canvas.style.cursor = 'grab';
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

        this.renderCustomElements(g);
        this.renderEntities(g);
        this.renderRelationships(g);
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
            const height = headerHeight + entity.columns.length * rowHeight;

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
                columnText.setAttribute('class', `entity-column ${column.key === 'PRI' ? 'primary-key' : ''} ${entity.foreignKeys.some(fk => fk.column === column.name) ? 'foreign-key' : ''}`);
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
            const rectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rectElement.setAttribute('class', 'custom-rectangle');
            rectElement.setAttribute('x', rect.x);
            rectElement.setAttribute('y', rect.y);
            rectElement.setAttribute('width', rect.width);
            rectElement.setAttribute('height', rect.height);
            rectElement.setAttribute('data-type', 'rectangle');
            rectElement.setAttribute('data-index', index);
            if (rect.stroke) rectElement.setAttribute('stroke', rect.stroke);
            if (rect.fill) rectElement.setAttribute('fill', rect.fill);
            container.appendChild(rectElement);
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
        const target = e.target.closest('.entity, .custom-rectangle, .custom-text');
        
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
        this.canvas.style.cursor = 'default';
    }

    handleClick(e) {
        const entity = e.target.closest('.entity');
        if (entity) {
            const tableName = entity.getAttribute('data-table');
            this.showTableDetails(tableName);
        }
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
            
            const relationships = document.querySelectorAll(`[data-from="${tableName}"], [data-to="${tableName}"]`);
            relationships.forEach(rel => rel.classList.add('highlighted'));
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