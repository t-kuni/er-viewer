interface ERViewerCore {
    loadERData(): void;
    closeSidebar(): void;
    stateManager: {
        setERData(erData: unknown): void;
        setLayoutData(layoutData: unknown): void;
        getState(): {
            layoutData: unknown;
        };
    };
}
declare global {
    interface Window {
        erViewer: ERViewerCore;
    }
}
export {};
//# sourceMappingURL=app.d.ts.map