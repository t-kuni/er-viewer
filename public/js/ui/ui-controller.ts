import { ApplicationState } from '../types/index.js';
// Removed unused imports

// Type definitions for dependencies
interface StateManager {
  get<K extends keyof ApplicationState>(key: K): ApplicationState[K];
}

interface CanvasRenderer {
  // Add canvas renderer methods if needed
}

// Context menu options
interface ContextMenuOptions {
  target?: EventTarget | null;
  svgX?: number;
  svgY?: number;
  items?: ContextMenuItem[];
}

interface ContextMenuItem {
  label: string;
  action: () => void;
}

// UI event data types
// These types are commented out as they are not currently used
// They can be re-added when needed

type NotificationType = 'info' | 'success' | 'error';

/**
 * UI Controller - Handles all UI-related operations
 * Manages sidebar, modals, context menus, and user feedback
 */
export class UIController {
  // Keep stateManager for future use and API compatibility
  // @ts-expect-error - Unused but required by constructor signature
  private readonly _stateManager: StateManager;

  // UI element references
  private sidebar: HTMLElement | null;
  private sidebarContent: HTMLElement | null;
  private buildInfoModal: HTMLElement | null;

  // Context menu state
  private contextMenu: HTMLElement | null = null;

  // Canvas renderer reference (will be set by ERViewerCore)
  public canvasRenderer: CanvasRenderer | null = null;

  constructor(stateManager: StateManager) {
    this._stateManager = stateManager;

    // UI element references
    this.sidebar = document.getElementById('sidebar');
    this.sidebarContent = document.getElementById('sidebar-content');
    this.buildInfoModal = document.getElementById('build-info-modal');
  }

  /**
   * Show table details in sidebar
   */
  showTableDetails(tableName: string, ddl: string): void {
    console.log('showTableDetails called with tableName:', tableName);

    const highlightedDDL = this.applySyntaxHighlighting(ddl);
    if (this.sidebarContent) {
      this.sidebarContent.innerHTML = `
                <h4>${tableName}</h4>
                <pre class="ddl-content syntax-highlighted"><code></code></pre>
            `;

      // Insert highlighted HTML properly
      const codeElement = this.sidebarContent.querySelector('code');
      if (codeElement) {
        codeElement.innerHTML = highlightedDDL;
      }
    }

    if (this.sidebar) {
      this.sidebar.classList.add('open');
    }
    console.log('Sidebar should now be open');
  }

  /**
   * Close the sidebar
   */
  closeSidebar(): void {
    if (this.sidebar) {
      this.sidebar.classList.remove('open');
    }
  }

  /**
   * Show build info modal
   */
  showBuildInfo(): void {
    if (this.buildInfoModal) {
      this.buildInfoModal.classList.add('show');
    }
  }

  /**
   * Hide build info modal
   */
  hideBuildInfo(): void {
    if (this.buildInfoModal) {
      this.buildInfoModal.classList.remove('show');
    }
  }

  /**
   * Show context menu
   */
  showContextMenu(x: number, y: number, options: ContextMenuOptions = {}): void {
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
    // Check if we clicked on an annotation element
    const target = options.target;

    if (target && target instanceof Element && target.classList.contains('annotation-rectangle')) {
      this.addMenuItem(menu, 'プロパティ編集', () => {
        this.emit('edit-rectangle-properties', { element: target });
        this.removeContextMenu();
      });
      this.addMenuItem(menu, '削除', () => {
        this.emit('delete-annotation', { element: target });
        this.removeContextMenu();
      });
    } else if (target && target instanceof Element && target.classList.contains('annotation-text')) {
      this.addMenuItem(menu, 'プロパティ編集', () => {
        this.emit('edit-text-properties', { element: target });
        this.removeContextMenu();
      });
      this.addMenuItem(menu, '削除', () => {
        this.emit('delete-annotation', { element: target });
        this.removeContextMenu();
      });
    } else {
      // Canvas background - add creation options
      this.addMenuItem(menu, '矩形追加', () => {
        this.emit('add-rectangle', { x: options.svgX || 100, y: options.svgY || 100 });
        this.removeContextMenu();
      });
      this.addMenuItem(menu, 'テキスト追加', () => {
        this.emit('add-text', { x: options.svgX || 100, y: options.svgY || 100 });
        this.removeContextMenu();
      });
    }

    // Add custom menu items from options
    if (options.items) {
      options.items.forEach((item) => {
        this.addMenuItem(menu, item.label, item.action);
      });
    }

    document.body.appendChild(menu);
    this.contextMenu = menu;

    // Remove menu when clicking elsewhere
    const removeMenu = (e: MouseEvent): void => {
      if (menu && e.target && !menu.contains(e.target as Node)) {
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
  removeContextMenu(): void {
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
   */
  private addMenuItem(menu: HTMLElement, label: string, action: () => void): void {
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
   */
  showLoading(message: string): void {
    const loading = document.createElement('div');
    loading.id = 'loading-overlay';
    loading.className = 'loading';
    loading.textContent = message;
    document.body.appendChild(loading);
  }

  /**
   * Hide loading overlay
   */
  hideLoading(): void {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
      loading.remove();
    }
  }

  /**
   * Show error message
   */
  showError(message: string, details?: string): void {
    this.showNotification(`エラー: ${message}${details ? '\n詳細: ' + details : ''}`, 'error');
  }

  /**
   * Show success message
   */
  showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  /**
   * Show notification
   */
  showNotification(message: string, type: NotificationType = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to DOM
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  /**
   * Apply syntax highlighting to DDL
   */
  private applySyntaxHighlighting(ddl: string): string {
    // SQL keywords
    const keywords: string[] = [
      'CREATE',
      'TABLE',
      'VIEW',
      'INDEX',
      'DATABASE',
      'SCHEMA',
      'DROP',
      'ALTER',
      'TRUNCATE',
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'FROM',
      'WHERE',
      'JOIN',
      'ON',
      'AS',
      'WITH',
      'UNION',
      'ALL',
      'DISTINCT',
      'PRIMARY',
      'KEY',
      'FOREIGN',
      'REFERENCES',
      'UNIQUE',
      'CHECK',
      'DEFAULT',
      'NOT',
      'NULL',
      'AUTO_INCREMENT',
      'IDENTITY',
      'CONSTRAINT',
      'CASCADE',
      'RESTRICT',
      'NO',
      'ACTION',
      'ENGINE',
      'CHARSET',
      'COLLATE',
      'COMMENT',
      'BEGIN',
      'END',
      'COMMIT',
      'ROLLBACK',
      'TRANSACTION',
      'IF',
      'EXISTS',
      'THEN',
      'ELSE',
      'CASE',
      'WHEN',
      'AND',
      'OR',
      'IN',
      'BETWEEN',
      'LIKE',
      'IS',
      'ORDER',
      'BY',
      'GROUP',
      'HAVING',
      'LIMIT',
      'OFFSET',
      'ASC',
      'DESC',
      'INNER',
      'LEFT',
      'RIGHT',
      'FULL',
      'OUTER',
      'CROSS',
    ];

    // Data types
    const dataTypes: string[] = [
      'INT',
      'INTEGER',
      'BIGINT',
      'SMALLINT',
      'TINYINT',
      'DECIMAL',
      'NUMERIC',
      'FLOAT',
      'DOUBLE',
      'REAL',
      'CHAR',
      'VARCHAR',
      'TEXT',
      'NCHAR',
      'NVARCHAR',
      'NTEXT',
      'DATE',
      'DATETIME',
      'TIMESTAMP',
      'TIME',
      'YEAR',
      'BOOLEAN',
      'BOOL',
      'BIT',
      'BLOB',
      'BINARY',
      'VARBINARY',
      'JSON',
      'XML',
      'UUID',
      'ENUM',
      'SET',
    ];

    // Functions
    const functions: string[] = [
      'COUNT',
      'SUM',
      'AVG',
      'MIN',
      'MAX',
      'CONCAT',
      'SUBSTRING',
      'LENGTH',
      'TRIM',
      'UPPER',
      'LOWER',
      'NOW',
      'CURRENT_DATE',
      'CURRENT_TIME',
      'CURRENT_TIMESTAMP',
      'COALESCE',
      'NULLIF',
      'CAST',
      'CONVERT',
    ];

    let highlighted = ddl;

    // Step 1: Mark special tokens to protect them from further processing
    const tokens: { [key: string]: string } = {};
    let tokenId = 0;

    // Mark and store comments first (highest priority)
    highlighted = highlighted.replace(/--(.*)$/gm, (match) => {
      const token = `__TOKEN_${tokenId++}__`;
      tokens[token] = `<span class="sql-comment">${match}</span>`;
      return token;
    });

    highlighted = highlighted.replace(/\/\*([\s\S]*?)\*\//g, (match) => {
      const token = `__TOKEN_${tokenId++}__`;
      tokens[token] = `<span class="sql-comment">${match}</span>`;
      return token;
    });

    // Mark and store strings
    highlighted = highlighted.replace(/'([^']*)'/g, (_match, content) => {
      const token = `__TOKEN_${tokenId++}__`;
      tokens[token] = `<span class="sql-string">'${content}'</span>`;
      return token;
    });

    highlighted = highlighted.replace(/"([^"]*)"/g, (_match, content) => {
      const token = `__TOKEN_${tokenId++}__`;
      tokens[token] = `<span class="sql-identifier">"${content}"</span>`;
      return token;
    });

    highlighted = highlighted.replace(/`([^`]*)`/g, (_match, content) => {
      const token = `__TOKEN_${tokenId++}__`;
      tokens[token] = `<span class="sql-identifier">\`${content}\`</span>`;
      return token;
    });

    // Escape HTML in the remaining text
    highlighted = highlighted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');

    // Highlight keywords (case-insensitive)
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      highlighted = highlighted.replace(regex, '<span class="sql-keyword">$1</span>');
    });

    // Highlight data types (case-insensitive)
    dataTypes.forEach((dataType) => {
      const regex = new RegExp(`\\b(${dataType})\\b`, 'gi');
      highlighted = highlighted.replace(regex, '<span class="sql-datatype">$1</span>');
    });

    // Highlight functions (case-insensitive)
    functions.forEach((func) => {
      const regex = new RegExp(`\\b(${func})\\b(?=\\s*\\()`, 'gi');
      highlighted = highlighted.replace(regex, '<span class="sql-function">$1</span>');
    });

    // Highlight operators (simple pattern)
    highlighted = highlighted.replace(/\s([=<>!]+)\s/g, ' <span class="sql-operator">$1</span> ');
    highlighted = highlighted.replace(/\s([+\-*/])\s/g, ' <span class="sql-operator">$1</span> ');

    // Highlight parentheses and commas
    highlighted = highlighted.replace(/([(),;])/g, '<span class="sql-punctuation">$1</span>');

    // Restore the protected tokens
    Object.keys(tokens).forEach((token) => {
      const replacement = tokens[token];
      if (replacement !== undefined) {
        highlighted = highlighted.replace(token, replacement);
      }
    });

    return highlighted;
  }

  // Event emitter functionality

  /**
   * Emit UI event
   */
  emit(eventName: string, data: any): void {
    const customEvent = new CustomEvent(`ui-${eventName}`, { detail: data });
    document.dispatchEvent(customEvent);
  }

  /**
   * Subscribe to UI event
   */
  on(eventName: string, handler: EventListener): void {
    document.addEventListener(`ui-${eventName}`, handler);
  }

  /**
   * Unsubscribe from UI event
   */
  off(eventName: string, handler: EventListener): void {
    document.removeEventListener(`ui-${eventName}`, handler);
  }
}
