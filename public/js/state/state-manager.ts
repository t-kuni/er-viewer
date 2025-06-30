import { ApplicationState, ERData, LayoutData, InteractionMode } from '../types/index';

// Type definitions
type StateChangeCallback = (oldState: ApplicationState, newState: ApplicationState) => void;
type PropertyChangeCallback<T = any> = (oldValue: T, newValue: T) => void;

/**
 * Centralized state management system
 * Handles application state, change notifications, and state persistence
 */
export class StateManager {
  private state: ApplicationState;
  private subscribers: Set<StateChangeCallback>;
  private history: ApplicationState[];
  private historyIndex: number;
  private readonly maxHistorySize: number = 50;

  constructor() {
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
      interactionMode: 'default' as InteractionMode,
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
  getState(): ApplicationState {
    return { ...this.state };
  }

  /**
   * Get specific state property
   */
  get<K extends keyof ApplicationState>(key: K): ApplicationState[K];
  get(key: string): any;
  get(key: string): any {
    return this.getNestedProperty(this.state, key);
  }

  /**
   * Set state with automatic change detection and notifications
   */
  setState(updates: Partial<ApplicationState>, saveToHistory?: boolean): void;
  setState(key: string, value: any, saveToHistory?: boolean): void;
  setState(
    updatesOrKey: Partial<ApplicationState> | string,
    valueOrSaveToHistory?: any | boolean,
    saveToHistory?: boolean,
  ): void {
    const oldState = { ...this.state };
    let shouldSaveToHistory = true;

    if (typeof updatesOrKey === 'string') {
      const key = updatesOrKey;
      const value = valueOrSaveToHistory;
      this.setNestedProperty(this.state, key, value);
      shouldSaveToHistory = saveToHistory !== undefined ? saveToHistory : true;
    } else {
      const updates = updatesOrKey;
      if (typeof valueOrSaveToHistory === 'boolean') {
        shouldSaveToHistory = valueOrSaveToHistory;
      } else if (saveToHistory !== undefined) {
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
  subscribe(callback: StateChangeCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Subscribe to specific state property changes
   */
  subscribeToProperty<T = any>(key: string, callback: PropertyChangeCallback<T>): () => void {
    const wrappedCallback: StateChangeCallback = (oldState, newState) => {
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
  updateViewport(panX: number, panY: number, scale: number): void {
    this.setState({
      viewport: { panX, panY, scale },
    });
  }

  /**
   * Set ER data and initialize layout
   */
  setERData(erData: ERData): void {
    const layoutData = (erData as any).layout || { entities: {}, rectangles: [], texts: [], layers: [] };
    this.setState({
      erData,
      layoutData,
    });
  }

  /**
   * Update layout data
   */
  updateLayoutData(layoutData: LayoutData): void {
    this.setState({ layoutData });
  }

  /**
   * Set layout data directly
   */
  setLayoutData(layoutData: LayoutData): void {
    this.setState({ layoutData });
  }

  /**
   * Set interaction mode
   */
  setInteractionMode(mode: InteractionMode, data: any = null): void {
    this.setState({
      interactionMode: mode,
      dragState: data,
    });
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    this.setState({ error });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.setState({ error: null });
  }

  /**
   * Save current state to history for undo/redo
   */
  private saveToHistory(state: ApplicationState): void {
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
   */
  undo(): boolean {
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
  redo(): boolean {
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
  reset(): void {
    const initialState: ApplicationState = {
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
      interactionMode: 'default' as InteractionMode,
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
  exportState(): string {
    return JSON.stringify(this.state);
  }

  /**
   * Import state from persistence
   */
  importState(serializedState: string): void {
    try {
      const importedState = JSON.parse(serializedState) as ApplicationState;
      this.setState(importedState);
    } catch (error) {
      console.error('Failed to import state:', error);
    }
  }

  // Private helper methods

  /**
   * Get nested property using dot notation
   */
  private getNestedProperty(obj: any, key: string): any {
    return key
      .split('.')
      .reduce((current, prop) => (current && current[prop] !== undefined ? current[prop] : undefined), obj);
  }

  /**
   * Set nested property using dot notation
   */
  private setNestedProperty(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    const lastKey = keys.pop()!;
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
  private notifySubscribers(oldState: ApplicationState, newState: ApplicationState): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(oldState, newState);
      } catch (error) {
        console.error('Error in state change subscriber:', error);
      }
    });
  }
}
