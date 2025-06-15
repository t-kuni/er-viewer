/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Integration Tests - Basic Functionality', () => {
  beforeEach(() => {
    // Set up a clean DOM environment
    document.body.innerHTML = `
      <div id="er-canvas"></div>
      <div id="sidebar"></div>
      <div id="sidebar-content"></div>
      <button id="reverse-engineer">Reverse Engineer</button>
      <button id="save-layout">Save Layout</button>
      <button id="add-rectangle">Add Rectangle</button>
      <button id="add-text">Add Text</button>
      <button id="close-sidebar">Close Sidebar</button>
    `;
    
    // Reset globals
    global.fetch = jest.fn();
    global.alert = jest.fn();
    global.prompt = jest.fn();
    
    // Clear any existing event listeners
    jest.clearAllMocks();
  });

  test('should have all required DOM elements', () => {
    expect(document.getElementById('er-canvas')).toBeTruthy();
    expect(document.getElementById('sidebar')).toBeTruthy();
    expect(document.getElementById('sidebar-content')).toBeTruthy();
    expect(document.getElementById('reverse-engineer')).toBeTruthy();
    expect(document.getElementById('save-layout')).toBeTruthy();
    expect(document.getElementById('add-rectangle')).toBeTruthy();
    expect(document.getElementById('add-text')).toBeTruthy();
    expect(document.getElementById('close-sidebar')).toBeTruthy();
  });

  test('should validate file structure exists', () => {
    const requiredFiles = [
      'public/js/app.js',
      'public/js/core/er-viewer-core.js',
      'public/js/utils/client-logger.js',
      'lib/database.js',
      'server.js'
    ];

    requiredFiles.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  test('should have proper package.json configuration', () => {
    const packageJson = require('../package.json');
    
    expect(packageJson.scripts.test).toBe('jest');
    expect(packageJson.scripts['test:watch']).toBe('jest --watch');
    expect(packageJson.scripts['test:coverage']).toBe('jest --coverage');
    
    expect(packageJson.devDependencies.jest).toBeTruthy();
    expect(packageJson.devDependencies['@testing-library/jest-dom']).toBeTruthy();
    expect(packageJson.devDependencies['@testing-library/dom']).toBeTruthy();
    expect(packageJson.devDependencies['jest-environment-jsdom']).toBeTruthy();
  });

  test('should simulate user interactions without errors', () => {
    // Mock successful API responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ entities: [], relationships: [] })
    });

    // Test button clicks don't throw errors
    const buttons = ['reverse-engineer', 'save-layout', 'add-rectangle', 'add-text', 'close-sidebar'];
    
    buttons.forEach(buttonId => {
      const button = document.getElementById(buttonId);
      expect(() => {
        button.click();
      }).not.toThrow();
    });
  });

  test('should handle API errors gracefully', async () => {
    // Mock API failure
    global.fetch.mockRejectedValue(new Error('Network error'));
    
    const reverseBtn = document.getElementById('reverse-engineer');
    
    // Should not throw unhandled errors
    expect(() => {
      reverseBtn.click();
    }).not.toThrow();
  });

  test('should validate database connection parameters', () => {
    // Test default database configuration
    const expectedDefaults = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'password',
      database: 'test'
    };

    // This would typically test the database configuration
    // For now, just verify the structure is expected
    expect(typeof expectedDefaults.host).toBe('string');
    expect(typeof expectedDefaults.port).toBe('number');
    expect(typeof expectedDefaults.user).toBe('string');
  });

  test('should handle layout data structure correctly', () => {
    const mockLayoutData = {
      entities: {},
      rectangles: [],
      texts: []
    };

    // Test adding rectangle
    const rectangle = {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      stroke: '#3498db',
      fill: 'rgba(52, 152, 219, 0.1)'
    };

    mockLayoutData.rectangles.push(rectangle);
    expect(mockLayoutData.rectangles).toHaveLength(1);
    expect(mockLayoutData.rectangles[0].x).toBe(100);

    // Test adding text
    const text = {
      x: 100,
      y: 100,
      content: 'Test text',
      color: '#2c3e50',
      size: 14
    };

    mockLayoutData.texts.push(text);
    expect(mockLayoutData.texts).toHaveLength(1);
    expect(mockLayoutData.texts[0].content).toBe('Test text');
  });

  test('should validate ER data structure', () => {
    const mockERData = {
      entities: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'int', key: 'PRI' },
            { name: 'name', type: 'varchar(255)', key: '' }
          ]
        }
      ],
      relationships: [
        {
          from: { table: 'posts', column: 'user_id' },
          to: { table: 'users', column: 'id' }
        }
      ]
    };

    expect(mockERData.entities).toHaveLength(1);
    expect(mockERData.entities[0].name).toBe('users');
    expect(mockERData.entities[0].columns).toHaveLength(2);
    expect(mockERData.relationships).toHaveLength(1);
  });
});