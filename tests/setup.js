require('@testing-library/jest-dom');

// Mock DOM methods that might not be available in jsdom
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock SVG methods
global.SVGElement = global.SVGElement || class SVGElement {};
global.SVGSVGElement = global.SVGSVGElement || class SVGSVGElement extends global.SVGElement {};

// Mock requestAnimationFrame
global.requestAnimationFrame = global.requestAnimationFrame || function(cb) {
  return setTimeout(cb, 0);
};

global.cancelAnimationFrame = global.cancelAnimationFrame || function(id) {
  clearTimeout(id);
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock window.alert and console methods to avoid noise in tests
global.alert = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();