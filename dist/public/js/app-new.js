/**
 * New application entry point using unified architecture
 * Uses ERViewerApplication with Infrastructure layer for clean E2E testing
 */
import { ERViewerApplication } from './er-viewer-application.js';
import { InfrastructureImplementation } from './infrastructure/implementations/infrastructure-implementation.js';
// Initialize the application with real infrastructure
const infrastructure = new InfrastructureImplementation();
const erViewerApp = new ERViewerApplication(infrastructure);
// Export for global access (for debugging and testing)
window.erViewerApp = erViewerApp;
//# sourceMappingURL=app-new.js.map