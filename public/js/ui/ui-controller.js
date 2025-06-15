/**
 * UI Controller - Handles all UI-related operations
 * Manages sidebar, modals, context menus, and user feedback
 */
export class UIController {
    constructor(stateManager) {
        this.stateManager = stateManager;
        
        // UI element references
        this.sidebar = document.getElementById('sidebar');
        this.sidebarContent = document.getElementById('sidebar-content');
        this.buildInfoModal = document.getElementById('build-info-modal');
        
        // Context menu state
        this.contextMenu = null;
    }
    
    /**
     * Show table details in sidebar
     * @param {string} tableName - Name of the table
     * @param {string} ddl - DDL string
     */
    showTableDetails(tableName, ddl) {
        console.log('showTableDetails called with tableName:', tableName);
        
        const highlightedDDL = this.applySyntaxHighlighting(ddl);
        this.sidebarContent.innerHTML = `
            <h4>${tableName}</h4>
            <pre class="ddl-content syntax-highlighted"><code>${highlightedDDL}</code></pre>
        `;
        this.sidebar.classList.add('open');
        console.log('Sidebar should now be open');
    }
    
    /**
     * Close the sidebar
     */
    closeSidebar() {
        this.sidebar.classList.remove('open');
    }
    
    /**
     * Show build info modal
     */
    showBuildInfo() {
        if (this.buildInfoModal) {
            this.buildInfoModal.classList.add('show');
        }
    }
    
    /**
     * Hide build info modal
     */
    hideBuildInfo() {
        if (this.buildInfoModal) {
            this.buildInfoModal.classList.remove('show');
        }
    }
    
    /**
     * Show context menu
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} options - Context menu options
     */
    showContextMenu(x, y, options = {}) {
        console.log('showContextMenu called at', x, y);
        
        // Remove existing context menu
        this.removeContextMenu();
        
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
        
        // Add menu items based on context
        const selectedAnnotation = this.stateManager.get('selectedAnnotation');
        
        if (selectedAnnotation) {
            if (selectedAnnotation.classList.contains('custom-rectangle')) {
                this.addMenuItem(menu, 'プロパティ編集', () => {
                    this.emit('edit-rectangle-properties', { element: selectedAnnotation });
                    this.removeContextMenu();
                });
            }
            
            if (selectedAnnotation.classList.contains('custom-text')) {
                this.addMenuItem(menu, 'プロパティ編集', () => {
                    this.emit('edit-text-properties', { element: selectedAnnotation });
                    this.removeContextMenu();
                });
            }
            
            this.addMenuItem(menu, '削除', () => {
                this.emit('delete-annotation', { element: selectedAnnotation });
                this.removeContextMenu();
            });
        }
        
        // Add custom menu items from options
        if (options.items) {
            options.items.forEach(item => {
                this.addMenuItem(menu, item.label, item.action);
            });
        }
        
        document.body.appendChild(menu);
        this.contextMenu = menu;
        
        // Remove menu when clicking elsewhere
        const removeMenu = (e) => {
            if (!menu.contains(e.target)) {
                this.removeContextMenu();
                document.removeEventListener('click', removeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 0);
    }
    
    /**
     * Remove context menu
     */
    removeContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
        const existing = document.getElementById('context-menu');
        if (existing) {
            existing.remove();
        }
    }
    
    /**
     * Add menu item to context menu
     * @param {Element} menu - Menu element
     * @param {string} label - Menu item label
     * @param {Function} action - Click handler
     */
    addMenuItem(menu, label, action) {
        const item = document.createElement('div');
        item.textContent = label;
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.style.borderRadius = '4px';
        
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = '#f0f0f0';
        });
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = 'transparent';
        });
        item.addEventListener('click', () => {
            action();
        });
        
        menu.appendChild(item);
    }
    
    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    showLoading(message) {
        const loading = document.createElement('div');
        loading.id = 'loading-overlay';
        loading.className = 'loading';
        loading.textContent = message;
        document.body.appendChild(loading);
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const loading = document.getElementById('loading-overlay');
        if (loading) {
            loading.remove();
        }
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     * @param {string} details - Error details
     */
    showError(message, details) {
        // TODO: Replace with better notification system
        alert(`エラー: ${message}${details ? '\n詳細: ' + details : ''}`);
    }
    
    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        // TODO: Replace with better notification system
        alert(message);
    }
    
    /**
     * Apply syntax highlighting to DDL
     * @param {string} ddl - DDL string
     * @returns {string} - Highlighted DDL HTML
     */
    applySyntaxHighlighting(ddl) {
        // SQL keywords
        const keywords = [
            'CREATE', 'TABLE', 'VIEW', 'INDEX', 'DATABASE', 'SCHEMA',
            'DROP', 'ALTER', 'TRUNCATE',
            'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'JOIN',
            'ON', 'AS', 'WITH', 'UNION', 'ALL', 'DISTINCT',
            'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK',
            'DEFAULT', 'NOT', 'NULL', 'AUTO_INCREMENT', 'IDENTITY',
            'CONSTRAINT', 'CASCADE', 'RESTRICT', 'NO', 'ACTION',
            'ENGINE', 'CHARSET', 'COLLATE', 'COMMENT',
            'BEGIN', 'END', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
            'IF', 'EXISTS', 'THEN', 'ELSE', 'CASE', 'WHEN',
            'AND', 'OR', 'IN', 'BETWEEN', 'LIKE', 'IS',
            'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
            'ASC', 'DESC', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS'
        ];
        
        // Data types
        const dataTypes = [
            'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT',
            'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL',
            'CHAR', 'VARCHAR', 'TEXT', 'NCHAR', 'NVARCHAR', 'NTEXT',
            'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR',
            'BOOLEAN', 'BOOL', 'BIT',
            'BLOB', 'BINARY', 'VARBINARY',
            'JSON', 'XML', 'UUID',
            'ENUM', 'SET'
        ];
        
        // Functions
        const functions = [
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
            'CONCAT', 'SUBSTRING', 'LENGTH', 'TRIM', 'UPPER', 'LOWER',
            'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
            'COALESCE', 'NULLIF', 'CAST', 'CONVERT'
        ];
        
        let highlighted = ddl;
        
        // Escape HTML
        highlighted = highlighted
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Highlight strings (single quotes)
        highlighted = highlighted.replace(
            /'([^']*)'/g,
            '<span class="sql-string">\'$1\'</span>'
        );
        
        // Highlight strings (double quotes for identifiers)
        highlighted = highlighted.replace(
            /"([^"]*)"/g,
            '<span class="sql-identifier">"$1"</span>'
        );
        
        // Highlight backticks (MySQL style identifiers)
        highlighted = highlighted.replace(
            /`([^`]*)`/g,
            '<span class="sql-identifier">`$1`</span>'
        );
        
        // Highlight numbers
        highlighted = highlighted.replace(
            /\b(\d+(?:\.\d+)?)\b/g,
            '<span class="sql-number">$1</span>'
        );
        
        // Highlight comments (single line)
        highlighted = highlighted.replace(
            /--(.*)$/gm,
            '<span class="sql-comment">--$1</span>'
        );
        
        // Highlight comments (multi-line)
        highlighted = highlighted.replace(
            /\/\*([\s\S]*?)\*\//g,
            '<span class="sql-comment">/*$1*/</span>'
        );
        
        // Highlight keywords (case-insensitive)
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
            highlighted = highlighted.replace(regex, '<span class="sql-keyword">$1</span>');
        });
        
        // Highlight data types (case-insensitive)
        dataTypes.forEach(dataType => {
            const regex = new RegExp(`\\b(${dataType})\\b`, 'gi');
            highlighted = highlighted.replace(regex, '<span class="sql-datatype">$1</span>');
        });
        
        // Highlight functions (case-insensitive)
        functions.forEach(func => {
            const regex = new RegExp(`\\b(${func})\\b(?=\\s*\\()`, 'gi');
            highlighted = highlighted.replace(regex, '<span class="sql-function">$1</span>');
        });
        
        // Highlight operators
        highlighted = highlighted.replace(
            /([=<>!]+|[+\-*/])/g,
            '<span class="sql-operator">$1</span>'
        );
        
        // Highlight parentheses and commas
        highlighted = highlighted.replace(
            /([(),;])/g,
            '<span class="sql-punctuation">$1</span>'
        );
        
        return highlighted;
    }
    
    // Event emitter functionality
    
    /**
     * Emit UI event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    emit(eventName, data) {
        const customEvent = new CustomEvent(`ui-${eventName}`, { detail: data });
        document.dispatchEvent(customEvent);
    }
    
    /**
     * Subscribe to UI event
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     */
    on(eventName, handler) {
        document.addEventListener(`ui-${eventName}`, handler);
    }
    
    /**
     * Unsubscribe from UI event
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     */
    off(eventName, handler) {
        document.removeEventListener(`ui-${eventName}`, handler);
    }
}