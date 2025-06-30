import { ApplicationState } from '../types/index';
interface StateManager {
    get<K extends keyof ApplicationState>(key: K): ApplicationState[K];
}
interface CanvasRenderer {
}
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
type NotificationType = 'info' | 'success' | 'error';
/**
 * UI Controller - Handles all UI-related operations
 * Manages sidebar, modals, context menus, and user feedback
 */
export declare class UIController {
    private readonly _stateManager;
    private sidebar;
    private sidebarContent;
    private buildInfoModal;
    private contextMenu;
    canvasRenderer: CanvasRenderer | null;
    constructor(stateManager: StateManager);
    /**
     * Show table details in sidebar
     */
    showTableDetails(tableName: string, ddl: string): void;
    /**
     * Close the sidebar
     */
    closeSidebar(): void;
    /**
     * Show build info modal
     */
    showBuildInfo(): void;
    /**
     * Hide build info modal
     */
    hideBuildInfo(): void;
    /**
     * Show context menu
     */
    showContextMenu(x: number, y: number, options?: ContextMenuOptions): void;
    /**
     * Remove context menu
     */
    removeContextMenu(): void;
    /**
     * Add menu item to context menu
     */
    private addMenuItem;
    /**
     * Show loading overlay
     */
    showLoading(message: string): void;
    /**
     * Hide loading overlay
     */
    hideLoading(): void;
    /**
     * Show error message
     */
    showError(message: string, details?: string): void;
    /**
     * Show success message
     */
    showSuccess(message: string): void;
    /**
     * Show notification
     */
    showNotification(message: string, type?: NotificationType): void;
    /**
     * Apply syntax highlighting to DDL
     */
    private applySyntaxHighlighting;
    /**
     * Emit UI event
     */
    emit(eventName: string, data: any): void;
    /**
     * Subscribe to UI event
     */
    on(eventName: string, handler: EventListener): void;
    /**
     * Unsubscribe from UI event
     */
    off(eventName: string, handler: EventListener): void;
}
export {};
//# sourceMappingURL=ui-controller.d.ts.map