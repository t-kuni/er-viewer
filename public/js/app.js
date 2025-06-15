// Main application entry point - modularized
import ClientLogger from './utils/client-logger.js';
import { ERViewerCore } from './core/er-viewer-core.js';

// Initialize the application
let erViewer;

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize the ER Viewer core
        erViewer = new ERViewerCore();
        
        // Load initial data
        erViewer.loadERData();
        
        // Set up global button event listeners
        setupGlobalEventListeners();
        
        ClientLogger.info('ER Viewer application initialized successfully');
    } catch (error) {
        ClientLogger.error('Failed to initialize ER Viewer application', error);
    }
});

function setupGlobalEventListeners() {
    // Reverse Engineer button
    const reverseBtn = document.getElementById('reverse-engineer');
    if (reverseBtn) {
        reverseBtn.addEventListener('click', async () => {
            try {
                await reverseEngineer();
            } catch (error) {
                ClientLogger.error('Reverse engineering failed', error);
            }
        });
    }

    // Save Layout button
    const saveBtn = document.getElementById('save-layout');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                await saveLayout();
            } catch (error) {
                ClientLogger.error('Save layout failed', error);
            }
        });
    }

    // Add Rectangle button
    const addRectBtn = document.getElementById('add-rectangle');
    if (addRectBtn) {
        addRectBtn.addEventListener('click', () => {
            addRectangle();
        });
    }

    // Add Text button
    const addTextBtn = document.getElementById('add-text');
    if (addTextBtn) {
        addTextBtn.addEventListener('click', () => {
            addText();
        });
    }

    // Close Sidebar button
    const closeSidebarBtn = document.getElementById('close-sidebar');
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            erViewer.closeSidebar();
        });
    }
}

async function reverseEngineer() {
    console.log('Starting reverse engineering...');
    showLoading('リバースエンジニアリング中...');
    
    try {
        const response = await fetch('/api/reverse-engineer', { method: 'POST' });
        if (response.ok) {
            const erData = await response.json();
            
            // Clear existing positions to force clustering
            erData.entities.forEach(entity => {
                entity.position = null;
            });
            
            // Update state through StateManager
            erViewer.stateManager.setERData(erData);
            erViewer.stateManager.setLayoutData(erData.layout || { entities: {}, rectangles: [], texts: [] });
        } else {
            const errorText = await response.text();
            console.error(`Reverse engineering failed: ${response.status} ${response.statusText}`, errorText);
            showError('リバースエンジニアリングに失敗しました', `${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('Error during reverse engineering:', error);
        showError('リバースエンジニアリング中にエラーが発生しました', error.message);
    } finally {
        hideLoading();
    }
}

async function saveLayout() {
    try {
        const currentState = erViewer.stateManager.getState();
        const response = await fetch('/api/layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentState.layoutData)
        });
        
        if (response.ok) {
            showSuccess('レイアウトが保存されました');
        }
    } catch (error) {
        console.error('Error saving layout:', error);
        showError('レイアウトの保存に失敗しました', error.message);
    }
}

function addRectangle() {
    const rect = {
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        stroke: '#3498db',
        fill: 'rgba(52, 152, 219, 0.1)'
    };
    const currentState = erViewer.stateManager.getState();
    const newLayoutData = { ...currentState.layoutData };
    newLayoutData.rectangles.push(rect);
    erViewer.stateManager.updateLayoutData(newLayoutData);
}

function addText() {
    const text = prompt('テキストを入力してください:');
    if (text) {
        const textObj = {
            x: 100,
            y: 100,
            content: text,
            color: '#2c3e50',
            size: 14
        };
        const currentState = erViewer.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        newLayoutData.texts.push(textObj);
        erViewer.stateManager.updateLayoutData(newLayoutData);
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
    alert(`エラー: ${message}${details ? '\n詳細: ' + details : ''}`);
}

function showSuccess(message) {
    alert(message);
}

// Export for global access if needed
window.erViewer = erViewer;