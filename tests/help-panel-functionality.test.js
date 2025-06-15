// Help Panel functionality tests
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

describe('Help Panel Functionality', () => {
    let mockDocument;
    let mockLocalStorage;
    let helpPanelHTML;

    beforeEach(() => {
        // Read HTML file for content verification
        const htmlPath = path.join(__dirname, '../public/index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Extract help panel HTML
        const helpPanelMatch = htmlContent.match(/<div id="help-panel".*?<\/div>(?=\s*<svg)/s);
        helpPanelHTML = helpPanelMatch ? helpPanelMatch[0] : '';

        // Mock localStorage
        mockLocalStorage = {
            store: {},
            getItem: function(key) {
                return this.store[key] || null;
            },
            setItem: function(key, value) {
                this.store[key] = value.toString();
            },
            removeItem: function(key) {
                delete this.store[key];
            },
            clear: function() {
                this.store = {};
            }
        };
        
        // Mock basic DOM elements
        mockDocument = {
            getElementById: jest.fn(),
            querySelector: jest.fn(),
            addEventListener: jest.fn()
        };
        
        // Set up global mocks
        global.localStorage = mockLocalStorage;
        global.ClientLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
    });

    afterEach(() => {
        mockLocalStorage.clear();
        jest.clearAllMocks();
    });

    test('should have help panel structure in HTML', () => {
        // Verify help panel HTML structure exists
        expect(helpPanelHTML).toContain('id="help-panel"');
        expect(helpPanelHTML).toContain('id="help-toggle"');
        expect(helpPanelHTML).toContain('id="help-content"');
        expect(helpPanelHTML).toContain('class="help-panel-header"');
    });

    test('should display operation guide content', () => {
        // Check for basic operations section in HTML content
        expect(helpPanelHTML).toContain('基本操作');
        expect(helpPanelHTML).toContain('マウスドラッグ');
        expect(helpPanelHTML).toContain('エンティティクリック');
        expect(helpPanelHTML).toContain('エンティティドラッグ');
        expect(helpPanelHTML).toContain('右クリック');
        
        // Check for shortcut keys section
        expect(helpPanelHTML).toContain('ショートカットキー');
        expect(helpPanelHTML).toContain('<strong>Ctrl+Z:</strong>');
        expect(helpPanelHTML).toContain('<strong>Shift+Ctrl+Z:</strong>');
    });

    test('should have correct CSS classes in HTML structure', () => {
        // Verify CSS classes are present in HTML
        expect(helpPanelHTML).toContain('class="help-panel"');
        expect(helpPanelHTML).toContain('class="help-panel-header"');
        expect(helpPanelHTML).toContain('class="help-toggle"');
        expect(helpPanelHTML).toContain('class="help-content"');
    });

    test('should include toggle button with correct initial state', () => {
        // Verify toggle button structure
        expect(helpPanelHTML).toContain('▼');
        expect(helpPanelHTML).toContain('id="help-toggle"');
    });

    test('should contain all required help sections', () => {
        // Verify main sections are present
        const sections = ['基本操作', 'ショートカットキー'];
        sections.forEach(section => {
            expect(helpPanelHTML).toContain(`<h5>${section}</h5>`);
        });
    });

    test('should have proper HTML structure for collapsible content', () => {
        // Check for header and content structure
        expect(helpPanelHTML).toContain('<div class="help-panel-header">');
        expect(helpPanelHTML).toContain('<div id="help-content" class="help-content">');
        expect(helpPanelHTML).toContain('<button id="help-toggle" class="help-toggle">');
    });

    test('localStorage helper functions work correctly', () => {
        // Test localStorage functionality used by help panel
        mockLocalStorage.setItem('helpPanelCollapsed', 'true');
        expect(mockLocalStorage.getItem('helpPanelCollapsed')).toBe('true');
        
        mockLocalStorage.setItem('helpPanelCollapsed', 'false');
        expect(mockLocalStorage.getItem('helpPanelCollapsed')).toBe('false');
        
        mockLocalStorage.removeItem('helpPanelCollapsed');
        expect(mockLocalStorage.getItem('helpPanelCollapsed')).toBeNull();
    });
});