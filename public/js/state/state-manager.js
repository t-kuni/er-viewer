/**
 * Centralized state management system
 * Handles application state, change notifications, and state persistence
 */
export class StateManager {
    constructor() {
        this.state = {
            // Application data
            erData: null,
            layoutData: { entities: {}, rectangles: [], texts: [], layers: [] },
            
            // View state
            viewport: {
                panX: 0,
                panY: 0,
                scale: 1
            },
            
            // UI state
            selectedAnnotation: null,
            sidebarVisible: false,
            currentTable: null,
            
            // Interaction state
            interactionMode: 'default', // 'default', 'panning', 'dragging', 'creating'
            dragState: null,
            
            // Application state
            loading: false,
            error: null
        };
        
        this.subscribers = new Set();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
    }

    /**
     * Get current state (read-only)
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get specific state property
     * @param {string} key - State key (supports dot notation)
     * @returns {*} State value
     */
    get(key) {
        return this.getNestedProperty(this.state, key);
    }

    /**
     * Set state with automatic change detection and notifications
     * @param {Object|string} updates - State updates or key
     * @param {*} value - Value if key is string
     * @param {boolean} saveToHistory - Whether to save to history (default true)
     */
    setState(updates, value = undefined, saveToHistory = true) {
        const oldState = { ...this.state };
        
        if (typeof updates === 'string') {
            this.setNestedProperty(this.state, updates, value);
        } else {
            this.state = { ...this.state, ...updates };
        }
        
        // Save to history for undo/redo
        if (saveToHistory) {
            this.saveToHistory(oldState);
        }
        
        // Notify subscribers of state change
        this.notifySubscribers(oldState, this.state);
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback - Callback function (oldState, newState) => void
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Subscribe to specific state property changes
     * @param {string} key - State key to watch
     * @param {Function} callback - Callback function (oldValue, newValue) => void
     * @returns {Function} Unsubscribe function
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
     * @param {number} panX - X pan offset
     * @param {number} panY - Y pan offset
     * @param {number} scale - Scale factor
     */
    updateViewport(panX, panY, scale) {
        this.setState({
            viewport: { panX, panY, scale }
        });
    }

    /**
     * Set ER data and initialize layout
     * @param {Object} erData - ER diagram data
     */
    setERData(erData) {
        this.setState({
            erData,
            layoutData: erData.layout || { entities: {}, rectangles: [], texts: [], layers: [] }
        });
    }

    /**
     * Update layout data
     * @param {Object} layoutData - Layout data
     */
    updateLayoutData(layoutData) {
        this.setState({ layoutData });
    }

    /**
     * Set layout data directly
     * @param {Object} layoutData - Layout data
     */
    setLayoutData(layoutData) {
        this.setState({ layoutData });
    }

    /**
     * Set interaction mode
     * @param {string} mode - Interaction mode
     * @param {Object} data - Optional mode-specific data
     */
    setInteractionMode(mode, data = null) {
        this.setState({
            interactionMode: mode,
            dragState: data
        });
    }

    /**
     * Set loading state
     * @param {boolean} loading - Loading state
     */
    setLoading(loading) {
        this.setState({ loading });
    }

    /**
     * Set error state
     * @param {string|null} error - Error message or null
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
     * @param {Object} state - State to save
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
        } else {
            this.historyIndex++;
        }
    }

    /**
     * Undo last state change
     * @returns {boolean} True if undo was successful
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
     * @returns {boolean} True if redo was successful
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
            erData: null,
            layoutData: { entities: {}, rectangles: [], texts: [], layers: [] },
            viewport: { panX: 0, panY: 0, scale: 1 },
            selectedAnnotation: null,
            sidebarVisible: false,
            currentTable: null,
            interactionMode: 'default',
            dragState: null,
            loading: false,
            error: null
        };
        
        this.setState(initialState);
    }

    /**
     * Export state for persistence
     * @returns {string} Serialized state
     */
    exportState() {
        return JSON.stringify(this.state);
    }

    /**
     * Import state from persistence
     * @param {string} serializedState - Serialized state
     */
    importState(serializedState) {
        try {
            const importedState = JSON.parse(serializedState);
            this.setState(importedState);
        } catch (error) {
            console.error('Failed to import state:', error);
        }
    }

    // Private helper methods

    /**
     * Get nested property using dot notation
     * @param {Object} obj - Object to traverse
     * @param {string} key - Key with dot notation
     * @returns {*} Property value
     */
    getNestedProperty(obj, key) {
        return key.split('.').reduce((current, prop) => 
            current && current[prop] !== undefined ? current[prop] : undefined, obj
        );
    }

    /**
     * Set nested property using dot notation
     * @param {Object} obj - Object to modify
     * @param {string} key - Key with dot notation
     * @param {*} value - Value to set
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
     * @param {Object} oldState - Previous state
     * @param {Object} newState - New state
     */
    notifySubscribers(oldState, newState) {
        this.subscribers.forEach(callback => {
            try {
                callback(oldState, newState);
            } catch (error) {
                console.error('Error in state change subscriber:', error);
            }
        });
    }
}