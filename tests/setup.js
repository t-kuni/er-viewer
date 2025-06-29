/**
 * Jest test setup file
 * Global configurations and utilities for tests
 */

// Mock global functions that might be missing in test environment
global.CustomEvent = class CustomEvent extends Event {
    constructor(event, params = {}) {
        super(event, params);
        this.detail = params.detail;
    }
};

// Mock for setImmediate if not available
if (typeof global.setImmediate === 'undefined') {
    global.setImmediate = (callback) => {
        return setTimeout(callback, 0);
    };
}

// Mock for SVG namespace URI
global.SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Add any additional global test utilities here