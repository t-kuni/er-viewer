import { ApplicationState, ERData, LayoutData, InteractionMode } from '../types/index.js';
type StateChangeCallback = (oldState: ApplicationState, newState: ApplicationState) => void;
type PropertyChangeCallback<T = any> = (oldValue: T, newValue: T) => void;
/**
 * Centralized state management system
 * Handles application state, change notifications, and state persistence
 */
export declare class StateManager {
    private state;
    private subscribers;
    private history;
    private historyIndex;
    private readonly maxHistorySize;
    constructor();
    /**
     * Get current state (read-only)
     */
    getState(): ApplicationState;
    /**
     * Get specific state property
     */
    get<K extends keyof ApplicationState>(key: K): ApplicationState[K];
    get(key: string): any;
    /**
     * Set state with automatic change detection and notifications
     */
    setState(updates: Partial<ApplicationState>, saveToHistory?: boolean): void;
    setState(key: string, value: any, saveToHistory?: boolean): void;
    /**
     * Subscribe to state changes
     */
    subscribe(callback: StateChangeCallback): () => void;
    /**
     * Subscribe to specific state property changes
     */
    subscribeToProperty<T = any>(key: string, callback: PropertyChangeCallback<T>): () => void;
    /**
     * Update viewport state
     */
    updateViewport(panX: number, panY: number, scale: number): void;
    /**
     * Set ER data and initialize layout
     */
    setERData(erData: ERData): void;
    /**
     * Update layout data
     */
    updateLayoutData(layoutData: LayoutData): void;
    /**
     * Set layout data directly
     */
    setLayoutData(layoutData: LayoutData): void;
    /**
     * Set interaction mode
     */
    setInteractionMode(mode: InteractionMode, data?: any): void;
    /**
     * Set loading state
     */
    setLoading(loading: boolean): void;
    /**
     * Set error state
     */
    setError(error: string | null): void;
    /**
     * Clear error state
     */
    clearError(): void;
    /**
     * Save current state to history for undo/redo
     */
    private saveToHistory;
    /**
     * Undo last state change
     */
    undo(): boolean;
    /**
     * Redo last undone state change
     */
    redo(): boolean;
    /**
     * Reset state to initial values
     */
    reset(): void;
    /**
     * Export state for persistence
     */
    exportState(): string;
    /**
     * Import state from persistence
     */
    importState(serializedState: string): void;
    /**
     * Get nested property using dot notation
     */
    private getNestedProperty;
    /**
     * Set nested property using dot notation
     */
    private setNestedProperty;
    /**
     * Notify all subscribers of state change
     */
    private notifySubscribers;
}
export {};
//# sourceMappingURL=state-manager.d.ts.map