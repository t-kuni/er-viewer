/**
 * Centralized state management system
 * Handles application state, change notifications, and state persistence
 */
export class StateManager {
    constructor() {
        this.maxHistorySize = 50;
        this.state = {
            // Application data
            erData: null,
            layoutData: { entities: {}, rectangles: [], texts: [], layers: [] },
            // View state
            viewport: {
                panX: 0,
                panY: 0,
                scale: 1,
            },
            // UI state
            selectedAnnotation: null,
            sidebarVisible: false,
            currentTable: null,
            contextMenu: null,
            // Interaction state
            interactionMode: 'default',
            dragState: null,
            // Application state
            loading: false,
            error: null,
            // Canvas and UI elements
            canvas: null,
            sidebar: null,
            sidebarContent: null,
            buildInfoModal: null,
            contextMenuElement: null,
            // Event handlers
            eventHandlers: new Map(),
            windowResizeHandler: null,
            // Highlight state
            highlightedEntities: new Set(),
            highlightedRelationships: new Set(),
            // Layer management
            layers: [],
            layerOrder: [],
            // History for undo/redo
            history: [],
            historyIndex: -1,
            maxHistorySize: 50,
            // Clustering and routing
            clusteredPositions: new Map(),
            entityBounds: new Map(),
            routingCache: new Map(),
        };
        this.subscribers = new Set();
        this.history = [];
        this.historyIndex = -1;
    }
    /**
     * Get current state (read-only)
     */
    getState() {
        return { ...this.state };
    }
    get(key) {
        return this.getNestedProperty(this.state, key);
    }
    setState(updatesOrKey, valueOrSaveToHistory, saveToHistory) {
        const oldState = { ...this.state };
        let shouldSaveToHistory = true;
        if (typeof updatesOrKey === 'string') {
            const key = updatesOrKey;
            const value = valueOrSaveToHistory;
            this.setNestedProperty(this.state, key, value);
            shouldSaveToHistory = saveToHistory !== undefined ? saveToHistory : true;
        }
        else {
            const updates = updatesOrKey;
            if (typeof valueOrSaveToHistory === 'boolean') {
                shouldSaveToHistory = valueOrSaveToHistory;
            }
            else if (saveToHistory !== undefined) {
                shouldSaveToHistory = saveToHistory;
            }
            this.state = { ...this.state, ...updates };
        }
        // Save to history for undo/redo
        if (shouldSaveToHistory) {
            this.saveToHistory(oldState);
        }
        // Notify subscribers of state change
        this.notifySubscribers(oldState, this.state);
    }
    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    /**
     * Subscribe to specific state property changes
     */
    subscribeToProperty(key, callback) {
        const wrappedCallback = (oldState, newState) => {
            const oldValue = this.getNestedProperty(oldState, key);
            const newValue = this.getNestedProperty(newState, key);
            if (oldValue !== newValue) {
                callback(oldValue, newValue);
            }
        };
        this.subscribers.add(wrappedCallback);
        return () => this.subscribers.delete(wrappedCallback);
    }
    /**
     * Update viewport state
     */
    updateViewport(panX, panY, scale) {
        this.setState({
            viewport: { panX, panY, scale },
        });
    }
    /**
     * Set ER data and initialize layout
     */
    setERData(erData) {
        const layoutData = erData.layout || { entities: {}, rectangles: [], texts: [], layers: [] };
        this.setState({
            erData,
            layoutData,
        });
    }
    /**
     * Update layout data
     */
    updateLayoutData(layoutData) {
        this.setState({ layoutData });
    }
    /**
     * Set layout data directly
     */
    setLayoutData(layoutData) {
        this.setState({ layoutData });
    }
    /**
     * Set interaction mode
     */
    setInteractionMode(mode, data = null) {
        this.setState({
            interactionMode: mode,
            dragState: data,
        });
    }
    /**
     * Set loading state
     */
    setLoading(loading) {
        this.setState({ loading });
    }
    /**
     * Set error state
     */
    setError(error) {
        this.setState({ error });
    }
    /**
     * Clear error state
     */
    clearError() {
        this.setState({ error: null });
    }
    /**
     * Save current state to history for undo/redo
     */
    saveToHistory(state) {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        // Add new state to history
        this.history.push(JSON.parse(JSON.stringify(state)));
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
        else {
            this.historyIndex++;
        }
    }
    /**
     * Undo last state change
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const previousState = this.history[this.historyIndex];
            this.state = JSON.parse(JSON.stringify(previousState));
            this.notifySubscribers(this.state, this.state);
            return true;
        }
        return false;
    }
    /**
     * Redo last undone state change
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const nextState = this.history[this.historyIndex];
            this.state = JSON.parse(JSON.stringify(nextState));
            this.notifySubscribers(this.state, this.state);
            return true;
        }
        return false;
    }
    /**
     * Reset state to initial values
     */
    reset() {
        const initialState = {
            // Application data
            erData: null,
            layoutData: { entities: {}, rectangles: [], texts: [], layers: [] },
            // View state
            viewport: { panX: 0, panY: 0, scale: 1 },
            // UI state
            selectedAnnotation: null,
            sidebarVisible: false,
            currentTable: null,
            contextMenu: null,
            // Interaction state
            interactionMode: 'default',
            dragState: null,
            // Application state
            loading: false,
            error: null,
            // Canvas and UI elements
            canvas: null,
            sidebar: null,
            sidebarContent: null,
            buildInfoModal: null,
            contextMenuElement: null,
            // Event handlers
            eventHandlers: new Map(),
            windowResizeHandler: null,
            // Highlight state
            highlightedEntities: new Set(),
            highlightedRelationships: new Set(),
            // Layer management
            layers: [],
            layerOrder: [],
            // History for undo/redo
            history: [],
            historyIndex: -1,
            maxHistorySize: 50,
            // Clustering and routing
            clusteredPositions: new Map(),
            entityBounds: new Map(),
            routingCache: new Map(),
        };
        this.setState(initialState);
    }
    /**
     * Export state for persistence
     */
    exportState() {
        return JSON.stringify(this.state);
    }
    /**
     * Import state from persistence
     */
    importState(serializedState) {
        try {
            const importedState = JSON.parse(serializedState);
            this.setState(importedState);
        }
        catch (error) {
            console.error('Failed to import state:', error);
        }
    }
    // Private helper methods
    /**
     * Get nested property using dot notation
     */
    getNestedProperty(obj, key) {
        return key
            .split('.')
            .reduce((current, prop) => (current && current[prop] !== undefined ? current[prop] : undefined), obj);
    }
    /**
     * Set nested property using dot notation
     */
    setNestedProperty(obj, key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, prop) => {
            if (!current[prop] || typeof current[prop] !== 'object') {
                current[prop] = {};
            }
            return current[prop];
        }, obj);
        target[lastKey] = value;
    }
    /**
     * Notify all subscribers of state change
     */
    notifySubscribers(oldState, newState) {
        this.subscribers.forEach((callback) => {
            try {
                callback(oldState, newState);
            }
            catch (error) {
                console.error('Error in state change subscriber:', error);
            }
        });
    }
}
