/**
 * New application entry point using unified architecture
 * Uses ERViewerApplication with Infrastructure layer for clean E2E testing
 */
import { ERViewerApplication } from './er-viewer-application.js';
declare global {
    interface Window {
        erViewerApp: ERViewerApplication;
    }
}
//# sourceMappingURL=app-new.d.ts.map