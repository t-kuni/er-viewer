/**
 * Jest test setup file
 * Global configurations and utilities for tests
 */
declare global {
    const SVG_NAMESPACE: string;
    interface Window {
        SVG_NAMESPACE: string;
    }
    interface Immediate {
        _id?: number;
    }
}
export {};
//# sourceMappingURL=setup.d.ts.map