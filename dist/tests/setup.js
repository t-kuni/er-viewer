/**
 * Jest test setup file
 * Global configurations and utilities for tests
 */
// Mock global functions that might be missing in test environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.CustomEvent = class CustomEvent extends Event {
    constructor(event, params = {}) {
        super(event, params);
        this.detail = params.detail;
    }
};
// Mock for setImmediate if not available
if (typeof global.setImmediate === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.setImmediate = (callback) => {
        return setTimeout(callback, 0);
    };
}
// Mock for SVG namespace URI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export {};
//# sourceMappingURL=setup.js.map