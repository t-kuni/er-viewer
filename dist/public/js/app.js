// Main application entry point - modularized (Legacy version)
import ClientLogger from './utils/client-logger.js';
// Import ERViewerCore as any since it's not migrated yet
import { ERViewerCore as ERViewerCoreClass } from './core/er-viewer-core.js';
// Initialize the application
let erViewer;
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize the ER Viewer core
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
        erViewer = new ERViewerCoreClass();
        // Export for global access
        window.erViewer = erViewer;
        // Load initial data
        erViewer.loadERData();
        // Set up global button event listeners
        setupGlobalEventListeners();
        ClientLogger.info('ER Viewer application initialized successfully');
    }
    catch (error) {
        ClientLogger.error('Failed to initialize ER Viewer application', error instanceof Error ? error : new Error(String(error)));
    }
});
function setupGlobalEventListeners() {
    // Reverse Engineer button
    const reverseBtn = document.getElementById('reverse-engineer');
    if (reverseBtn) {
        reverseBtn.addEventListener('click', () => {
            void (async () => {
                try {
                    await reverseEngineer();
                }
                catch (error) {
                    ClientLogger.error('Reverse engineering failed', error instanceof Error ? error : new Error(String(error)));
                }
            })();
        });
    }
    // Save Layout button
    const saveBtn = document.getElementById('save-layout');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            void (async () => {
                try {
                    await saveLayout();
                }
                catch (error) {
                    ClientLogger.error('Save layout failed', error instanceof Error ? error : new Error(String(error)));
                }
            })();
        });
    }
    // Close Sidebar button
    const closeSidebarBtn = document.getElementById('close-sidebar');
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            erViewer.closeSidebar();
        });
    }
    // Sidebar resize functionality
    const sidebar = document.getElementById('sidebar');
    const resizeHandle = sidebar?.querySelector('.sidebar-resize-handle');
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    if (sidebar && resizeHandle) {
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = sidebar.offsetWidth;
            resizeHandle.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) {
                return;
            }
            const deltaX = startX - e.clientX;
            const newWidth = startWidth + deltaX;
            // Respect min width constraint only
            if (newWidth >= 200) {
                sidebar.style.width = newWidth + 'px';
            }
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove('dragging');
                document.body.style.cursor = '';
            }
        });
    }
    // Help Panel toggle functionality
    setupHelpPanel();
}
function setupHelpPanel() {
    const helpPanel = document.getElementById('help-panel');
    const helpToggle = document.getElementById('help-toggle');
    const helpContent = document.getElementById('help-content');
    const helpHeader = document.querySelector('.help-panel-header');
    if (!helpPanel || !helpToggle || !helpContent || !helpHeader) {
        ClientLogger.warn('Help panel elements not found');
        return;
    }
    // Load collapsed state from localStorage
    const isCollapsed = localStorage.getItem('helpPanelCollapsed') === 'true';
    if (isCollapsed) {
        helpContent.classList.add('collapsed');
        helpToggle.classList.add('collapsed');
        helpToggle.textContent = '▶';
    }
    // Toggle function
    function toggleHelpPanel() {
        if (!helpContent || !helpToggle) {
            return;
        }
        const isCurrentlyCollapsed = helpContent.classList.contains('collapsed');
        if (isCurrentlyCollapsed) {
            // Expand
            helpContent.classList.remove('collapsed');
            helpToggle.classList.remove('collapsed');
            helpToggle.textContent = '▼';
            localStorage.setItem('helpPanelCollapsed', 'false');
        }
        else {
            // Collapse
            helpContent.classList.add('collapsed');
            helpToggle.classList.add('collapsed');
            helpToggle.textContent = '▶';
            localStorage.setItem('helpPanelCollapsed', 'true');
        }
    }
    // Add event listeners
    helpToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleHelpPanel();
    });
    helpHeader.addEventListener('click', toggleHelpPanel);
}
async function reverseEngineer() {
    // Log using ClientLogger instead of console
    ClientLogger.info('Starting reverse engineering...');
    showLoading('リバースエンジニアリング中...');
    try {
        const response = await fetch('/api/reverse-engineer', { method: 'POST' });
        if (response.ok) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const erData = await response.json();
            // Clear existing positions to force clustering
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            erData.entities.forEach((entity) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                entity.position = null;
            });
            // Update state through StateManager
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            erViewer.stateManager.setERData(erData);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            erViewer.stateManager.setLayoutData(erData.layout || { entities: {}, rectangles: [], texts: [] });
        }
        else {
            const errorText = await response.text();
            console.error(`Reverse engineering failed: ${response.status} ${response.statusText}`, errorText);
            showError('リバースエンジニアリングに失敗しました', `${response.status}: ${errorText}`);
        }
    }
    catch (error) {
        ClientLogger.error('Error during reverse engineering:', error instanceof Error ? error : new Error(String(error)));
        showError('リバースエンジニアリング中にエラーが発生しました', error instanceof Error ? error.message : String(error));
    }
    finally {
        hideLoading();
    }
}
async function saveLayout() {
    try {
        const currentState = erViewer.stateManager.getState();
        const response = await fetch('/api/layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentState.layoutData),
        });
        if (response.ok) {
            showSuccess('レイアウトが保存されました');
        }
    }
    catch (error) {
        ClientLogger.error('Error saving layout:', error instanceof Error ? error : new Error(String(error)));
        showError('レイアウトの保存に失敗しました', error instanceof Error ? error.message : String(error));
    }
}
// Simple UI utility functions (normally these would be in separate UI modules)
function showLoading(message) {
    const loading = document.createElement('div');
    loading.id = 'loading-overlay';
    loading.className = 'loading';
    loading.textContent = message;
    document.body.appendChild(loading);
}
function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
        document.body.removeChild(loading);
    }
}
function showError(message, details) {
    showNotification(`エラー: ${message}${details ? '\n詳細: ' + details : ''}`, 'error');
}
function showSuccess(message) {
    showNotification(message, 'success');
}
// Notification system
function showNotification(message, type = 'info') {
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
// Export for global access if needed (will be set inside DOMContentLoaded)
//# sourceMappingURL=app.js.map