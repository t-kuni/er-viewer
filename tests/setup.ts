/**
 * Jest test setup file
 * Global configurations and utilities for tests
 */

// CustomEvent type augmentation for test environment
interface CustomEventInit<T = unknown> extends EventInit {
  detail?: T;
}

// Mock global functions that might be missing in test environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).CustomEvent = class CustomEvent<T = unknown> extends Event {
  detail?: T;

  constructor(event: string, params: CustomEventInit<T> = {}) {
    super(event, params);
    this.detail = params.detail;
  }
};

// Mock for setImmediate if not available
if (typeof global.setImmediate === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).setImmediate = (callback: () => void): ReturnType<typeof setTimeout> => {
    return setTimeout(callback, 0);
  };
}

// Mock for SVG namespace URI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Type augmentation for global namespace
declare global {
  const SVG_NAMESPACE: string;

  interface Window {
    SVG_NAMESPACE: string;
  }

  // Using module augmentation instead of namespace
  interface Immediate {
    _id?: number;
  }
}

// Export empty object to make this a module
export {};
