# Test Environment Setup

This directory contains the test suite for the ER Viewer application.

## Test Framework

- **Jest** - JavaScript testing framework
- **@testing-library/jest-dom** - Additional Jest matchers for DOM testing
- **@testing-library/dom** - DOM testing utilities
- **jsdom** - DOM environment for Node.js testing

## Test Structure

### Current Tests

1. **simple-integration.test.js** - Basic integration tests
   - DOM element validation
   - File structure verification
   - Package.json configuration validation
   - Basic user interaction simulation
   - Error handling validation
   - Data structure validation

2. **database-unit.test.js** - Database layer unit tests
   - Connection management
   - Query execution
   - Error handling
   - MySQL table and column information retrieval
   - SQL injection prevention (backtick escaping)

### Test Coverage Areas

✅ **Completed**
- Basic DOM setup and validation
- Database connection and query functionality
- Package configuration validation
- Basic error handling patterns
- Data structure validation

⚠️ **Needs Implementation**
- Frontend module testing (ES modules compatibility issues)
- API endpoint testing
- Event handler testing
- UI component testing
- E2E testing

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/simple-integration.test.js
```

## Test Configuration

- **jest.config.js** - Main Jest configuration
- **tests/setup.js** - Test environment setup and mocks
- **babel.config.js** - Babel configuration for ES module support

## Common Test Patterns

### Database Testing
```javascript
// Mock mysql2/promise
const mockConnection = {
  execute: jest.fn(),
  end: jest.fn()
};

jest.doMock('mysql2/promise', () => ({
  createConnection: jest.fn().mockResolvedValue(mockConnection)
}));
```

### DOM Testing
```javascript
// Setup DOM elements
document.body.innerHTML = `
  <div id="er-canvas"></div>
  <button id="test-button">Test</button>
`;

// Test DOM interactions
expect(document.getElementById('er-canvas')).toBeTruthy();
```

### API Testing
```javascript
// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' })
});
```

## Known Issues

1. **ES Module Compatibility** - Frontend modules use ES6 imports which require additional configuration for Jest
2. **Mock Complexity** - Complex interdependencies between frontend modules make mocking challenging
3. **DOM Environment** - Some DOM APIs may not be fully available in jsdom

## Next Steps

1. Resolve ES module import issues for frontend testing
2. Add API endpoint integration tests
3. Implement E2E testing with Playwright or similar
4. Add visual regression testing
5. Improve test coverage reporting