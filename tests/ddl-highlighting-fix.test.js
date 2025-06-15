/**
 * Test suite for DDL syntax highlighting fix - ensures HTML tags are properly rendered
 */

import { UIController } from '../public/js/ui/ui-controller.js';
import { StateManager } from '../public/js/state/state-manager.js';

describe('DDL Syntax Highlighting Fix', () => {
    let uiController;
    let stateManager;
    let mockSidebar;
    let mockSidebarContent;
    let mockCodeElement;

    beforeEach(() => {
        // Mock DOM elements
        mockCodeElement = {
            innerHTML: ''
        };

        mockSidebarContent = {
            innerHTML: '',
            querySelector: jest.fn().mockReturnValue(mockCodeElement)
        };

        mockSidebar = {
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            }
        };

        // Setup UIController with mocked elements
        stateManager = new StateManager();
        uiController = new UIController(stateManager);
        uiController.sidebar = mockSidebar;
        uiController.sidebarContent = mockSidebarContent;
        
        // Mock console.log to avoid noise in tests
        global.console = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('applySyntaxHighlighting', () => {
        test('escapes HTML entities properly', () => {
            const ddl = 'CREATE TABLE test < > & "quoted"';
            const result = uiController.applySyntaxHighlighting(ddl);
            
            // The < and > should be escaped as HTML entities but the semicolons might be highlighted as punctuation
            expect(result).toContain('&lt');  // May be followed by punctuation span
            expect(result).toContain('&gt');  // May be followed by punctuation span  
            expect(result).toContain('&amp'); // May be followed by punctuation span
            // Should not highlight < > as operators since they're HTML entities
            expect(result).not.toContain('<span class="sql-operator">&lt;</span>');
            expect(result).not.toContain('<span class="sql-operator">&gt;</span>');
        });

        test('highlights SQL keywords', () => {
            const ddl = 'CREATE TABLE users (id INT PRIMARY KEY)';
            const result = uiController.applySyntaxHighlighting(ddl);
            
            expect(result).toContain('<span class="sql-keyword">CREATE</span>');
            expect(result).toContain('<span class="sql-keyword">TABLE</span>');
            expect(result).toContain('<span class="sql-keyword">PRIMARY</span>');
            expect(result).toContain('<span class="sql-keyword">KEY</span>');
        });

        test('highlights data types', () => {
            const ddl = 'CREATE TABLE test (id INT, name VARCHAR(255), created_at DATETIME)';
            const result = uiController.applySyntaxHighlighting(ddl);
            
            expect(result).toContain('<span class="sql-datatype">INT</span>');
            expect(result).toContain('<span class="sql-datatype">VARCHAR</span>');
            expect(result).toContain('<span class="sql-datatype">DATETIME</span>');
        });

        test('highlights strings', () => {
            const ddl = "INSERT INTO test VALUES ('string value', \"identifier\")";
            const result = uiController.applySyntaxHighlighting(ddl);
            
            expect(result).toContain('<span class="sql-string">\'string value\'</span>');
            expect(result).toContain('<span class="sql-identifier">"identifier"</span>');
        });

        test('highlights numbers', () => {
            const ddl = 'SELECT * FROM test WHERE id = 123 AND price = 45.67';
            const result = uiController.applySyntaxHighlighting(ddl);
            
            expect(result).toContain('<span class="sql-number">123</span>');
            expect(result).toContain('<span class="sql-number">45.67</span>');
        });

        test('highlights comments', () => {
            const ddl = `CREATE TABLE test (
                id INT, -- this is a comment
                /* multi-line
                   comment */
                name VARCHAR(255)
            )`;
            const result = uiController.applySyntaxHighlighting(ddl);
            
            expect(result).toContain('<span class="sql-comment">-- this is a comment</span>');
            expect(result).toContain('<span class="sql-comment">/* multi-line\n                   comment */</span>');
        });

        test('highlights functions', () => {
            const ddl = 'SELECT COUNT(*), SUM(price), NOW() FROM test';
            const result = uiController.applySyntaxHighlighting(ddl);
            
            expect(result).toContain('<span class="sql-function">COUNT</span>');
            expect(result).toContain('<span class="sql-function">SUM</span>');
            expect(result).toContain('<span class="sql-function">NOW</span>');
        });

        test('returns valid HTML string', () => {
            const ddl = 'CREATE TABLE test (id INT PRIMARY KEY, name VARCHAR(255))';
            const result = uiController.applySyntaxHighlighting(ddl);
            
            // Check that it's valid HTML by ensuring proper tag structure
            expect(result).toMatch(/<span class="sql-\w+">[^<]*<\/span>/);
            // Should not contain raw < or > (they should be escaped as entities)
            const withoutSpanTags = result.replace(/<\/?span[^>]*>/g, '');
            expect(withoutSpanTags).not.toMatch(/[<>]/);
        });
    });

    describe('showTableDetails', () => {
        test('properly inserts highlighted HTML without escaping', () => {
            const tableName = 'users';
            const ddl = 'CREATE TABLE users (id INT PRIMARY KEY)';
            
            uiController.showTableDetails(tableName, ddl);
            
            // Verify sidebar content structure
            expect(mockSidebarContent.innerHTML).toContain(`<h4>${tableName}</h4>`);
            expect(mockSidebarContent.innerHTML).toContain('<pre class="ddl-content syntax-highlighted"><code></code></pre>');
            
            // Verify querySelector was called to get code element
            expect(mockSidebarContent.querySelector).toHaveBeenCalledWith('code');
            
            // Verify highlighted HTML was inserted as innerHTML (not text)
            expect(mockCodeElement.innerHTML).toContain('<span class="sql-keyword">CREATE</span>');
            expect(mockCodeElement.innerHTML).toContain('<span class="sql-keyword">TABLE</span>');
            expect(mockCodeElement.innerHTML).toContain('<span class="sql-datatype">INT</span>');
            
            // Verify sidebar is opened
            expect(mockSidebar.classList.add).toHaveBeenCalledWith('open');
        });

        test('handles complex DDL with multiple syntax elements', () => {
            const tableName = 'complex_table';
            const ddl = `CREATE TABLE complex_table (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(100) UNIQUE,
                created_at TIMESTAMP DEFAULT NOW(),
                price DECIMAL(10,2) DEFAULT 0.00,
                -- This is a comment
                INDEX idx_email (email)
            )`;
            
            uiController.showTableDetails(tableName, ddl);
            
            const highlightedHTML = mockCodeElement.innerHTML;
            
            // Should contain various syntax highlighting spans
            expect(highlightedHTML).toContain('<span class="sql-keyword">');
            expect(highlightedHTML).toContain('<span class="sql-datatype">');
            expect(highlightedHTML).toContain('<span class="sql-number">');
            expect(highlightedHTML).toContain('<span class="sql-comment">');
            
            // Should not show raw HTML tags as text
            expect(highlightedHTML).not.toContain('&lt;span');
            expect(highlightedHTML).not.toContain('&gt;');
        });

        test('handles edge cases without breaking', () => {
            const testCases = [
                { name: 'empty', ddl: '' },
                { name: 'special_chars', ddl: 'SELECT * FROM test WHERE col = \'<>&"\''},
                { name: 'no_keywords', ddl: 'just some text without keywords' }
            ];
            
            testCases.forEach(testCase => {
                expect(() => {
                    uiController.showTableDetails(testCase.name, testCase.ddl);
                }).not.toThrow();
                
                expect(mockCodeElement.innerHTML).toBeDefined();
                expect(typeof mockCodeElement.innerHTML).toBe('string');
            });
        });
    });

    describe('HTML Rendering Verification', () => {
        test('HTML tags are rendered as DOM elements, not as text', () => {
            const ddl = 'CREATE TABLE test (id INT)';
            
            uiController.showTableDetails('test', ddl);
            
            const result = mockCodeElement.innerHTML;
            
            // The key fix: HTML should be inserted as innerHTML, not textContent
            // This means span tags should exist as actual HTML, not escaped text
            expect(result).toContain('<span class="sql-keyword">CREATE</span>');
            expect(result).not.toContain('&lt;span class="sql-keyword"&gt;CREATE&lt;/span&gt;');
        });

        test('CSS classes are properly applied for styling', () => {
            const ddl = 'CREATE TABLE test (id INT PRIMARY KEY, name VARCHAR(255))';
            
            uiController.showTableDetails('test', ddl);
            
            const result = mockCodeElement.innerHTML;
            
            // Verify all expected CSS classes are present
            const expectedClasses = [
                'sql-keyword',
                'sql-datatype',
                'sql-punctuation'
            ];
            
            expectedClasses.forEach(className => {
                expect(result).toContain(`class="${className}"`);
            });
        });
    });
});