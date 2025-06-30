/**
 * New application entry point using unified architecture
 * Uses ERViewerApplication with Infrastructure layer for clean E2E testing
 */
import { ERViewerApplication } from './er-viewer-application';
import { InfrastructureImplementation } from './infrastructure/implementations/infrastructure-implementation';

// Extend window interface for global access
declare global {
  interface Window {
    erViewerApp: ERViewerApplication;
  }
}

// Initialize the application with real infrastructure
const infrastructure = new InfrastructureImplementation();
const erViewerApp = new ERViewerApplication(infrastructure);

// Export for global access (for debugging and testing)
window.erViewerApp = erViewerApp;
