/**
 * Summary test for the requested fixes:
 * 1. Alert usage banned and replaced with notifications
 * 2. Right sidebar DDL highlighting fixed (no HTML tags showing)
 */

import { UIController } from '../public/js/ui/ui-controller.js';
import { StateManager } from '../public/js/state/state-manager.js';

describe('Requested Fixes Summary', () => {
    let uiController;
    let stateManager;
    let mockSidebar;
    let mockSidebarContent;
    let mockCodeElement;

    beforeEach(() => {
        // Mock DOM elements for testing
        mockCodeElement = { innerHTML: '' };
        mockSidebarContent = {
            innerHTML: '',
            querySelector: jest.fn().mockReturnValue(mockCodeElement)
        };
        mockSidebar = {
            classList: { add: jest.fn(), remove: jest.fn() }
        };

        // Setup UIController
        stateManager = new StateManager();
        uiController = new UIController(stateManager);
        uiController.sidebar = mockSidebar;
        uiController.sidebarContent = mockSidebarContent;

        // Mock notification system elements
        global.document = {
            createElement: jest.fn().mockReturnValue({
                className: '',
                textContent: '',
                classList: { add: jest.fn(), remove: jest.fn() },
                style: {},
                parentNode: { removeChild: jest.fn() }
            }),
            body: { appendChild: jest.fn() }
        };
        global.setTimeout = jest.fn();
        global.console = { log: jest.fn() };
    });

    describe('Fix 1: Alert Usage Banned', () => {
        test('showError uses notification system instead of alert', () => {
            const spy = jest.spyOn(uiController, 'showNotification');
            
            uiController.showError('Test error', 'Test details');
            
            expect(spy).toHaveBeenCalledWith('エラー: Test error\n詳細: Test details', 'error');
            expect(spy).toHaveBeenCalledTimes(1);
        });

        test('showSuccess uses notification system instead of alert', () => {
            const spy = jest.spyOn(uiController, 'showNotification');
            
            uiController.showSuccess('Success message');
            
            expect(spy).toHaveBeenCalledWith('Success message', 'success');
            expect(spy).toHaveBeenCalledTimes(1);
        });

        test('notification system works without using alert', () => {
            // Mock alert to ensure it's not called
            global.alert = jest.fn();
            
            uiController.showError('Test error');
            uiController.showSuccess('Test success');
            
            // Verify alert was never called
            expect(global.alert).not.toHaveBeenCalled();
        });
    });

    describe('Fix 2: DDL Highlighting Fixed', () => {
        test('HTML tags are rendered as DOM elements, not escaped text', () => {
            const ddl = 'CREATE TABLE test (id INT PRIMARY KEY)';
            
            uiController.showTableDetails('test', ddl);
            
            const result = mockCodeElement.innerHTML;
            
            // Should contain properly rendered HTML spans
            expect(result).toContain('<span class="sql-keyword">CREATE</span>');
            expect(result).toContain('<span class="sql-keyword">TABLE</span>');
            expect(result).toContain('<span class="sql-datatype">INT</span>');
            
            // Should NOT contain escaped HTML tags as text
            expect(result).not.toContain('&lt;span');
            expect(result).not.toContain('&gt;');
        });

        test('complex DDL with multiple elements highlights correctly', () => {
            const ddl = `CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                -- This is a comment
                created_at TIMESTAMP DEFAULT NOW()
            )`;
            
            uiController.showTableDetails('users', ddl);
            
            const result = mockCodeElement.innerHTML;
            
            // Should contain all types of syntax highlighting
            expect(result).toContain('<span class="sql-keyword">');     // Keywords
            expect(result).toContain('<span class="sql-datatype">');    // Data types
            expect(result).toContain('<span class="sql-comment">');     // Comments
            expect(result).toContain('<span class="sql-function">');    // Functions
            expect(result).toContain('<span class="sql-number">');      // Numbers
        });

        test('syntax highlighting preserves text content correctly', () => {
            const ddl = 'SELECT * FROM users WHERE id = 123';
            
            const highlighted = uiController.applySyntaxHighlighting(ddl);
            
            // Should highlight keywords
            expect(highlighted).toContain('<span class="sql-keyword">SELECT</span>');
            expect(highlighted).toContain('<span class="sql-keyword">FROM</span>');
            expect(highlighted).toContain('<span class="sql-keyword">WHERE</span>');
            
            // Should highlight numbers
            expect(highlighted).toContain('<span class="sql-number">123</span>');
            
            // Should not have broken the text structure
            expect(highlighted).toContain('users');
            expect(highlighted).toContain('id');
        });
    });

    describe('Integration: Both Fixes Working Together', () => {
        test('can display DDL in sidebar and show success notification', () => {
            const ddl = 'CREATE TABLE test (id INT)';
            
            // Test DDL highlighting
            uiController.showTableDetails('test', ddl);
            expect(mockCodeElement.innerHTML).toContain('<span class="sql-keyword">CREATE</span>');
            
            // Test notification system
            const spy = jest.spyOn(uiController, 'showNotification');
            uiController.showSuccess('DDL loaded successfully');
            expect(spy).toHaveBeenCalledWith('DDL loaded successfully', 'success');
        });
    });

    describe('Regression: Existing Functionality Preserved', () => {
        test('sidebar opens when showing table details', () => {
            const ddl = 'CREATE TABLE test (id INT)';
            
            uiController.showTableDetails('test', ddl);
            
            expect(mockSidebar.classList.add).toHaveBeenCalledWith('open');
        });

        test('sidebar content is properly structured', () => {
            const ddl = 'CREATE TABLE test (id INT)';
            
            uiController.showTableDetails('test', ddl);
            
            expect(mockSidebarContent.innerHTML).toContain('<h4>test</h4>');
            expect(mockSidebarContent.innerHTML).toContain('<pre class="ddl-content syntax-highlighted">');
            expect(mockSidebarContent.querySelector).toHaveBeenCalledWith('code');
        });
    });
});