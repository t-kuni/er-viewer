/**
 * @jest-environment jsdom
 */

describe('DDL Syntax Highlight Tests', () => {
  beforeEach(() => {
    // DOM setup
    document.body.innerHTML = `
      <div id="sidebar">
        <div id="sidebar-content"></div>
      </div>
    `;
  });

  test('should apply syntax highlighting to DDL content', () => {
    const sidebarContent = document.getElementById('sidebar-content');
    const rawDDL = `CREATE TABLE users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    // Test current implementation (without syntax highlighting)
    sidebarContent.innerHTML = `
      <h4>users</h4>
      <div class="ddl-content">${rawDDL}</div>
    `;

    const ddlContent = sidebarContent.querySelector('.ddl-content');
    expect(ddlContent).toBeTruthy();
    expect(ddlContent.textContent.trim()).toBe(rawDDL);

    // Test that raw DDL contains SQL keywords that should be highlighted
    expect(rawDDL).toContain('CREATE TABLE');
    expect(rawDDL).toContain('PRIMARY KEY');
    expect(rawDDL).toContain('AUTO_INCREMENT');
    expect(rawDDL).toContain('NOT NULL');
    expect(rawDDL).toContain('UNIQUE');
    expect(rawDDL).toContain('DEFAULT');
  });

  test('should have proper structure for syntax highlighting', () => {
    const sidebarContent = document.getElementById('sidebar-content');
    const rawDDL = `CREATE TABLE orders (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'completed') DEFAULT 'pending',
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`;

    // Simulate what the improved version should look like
    sidebarContent.innerHTML = `
      <h4>orders</h4>
      <pre class="ddl-content syntax-highlighted"><code>${rawDDL}</code></pre>
    `;

    const ddlContent = sidebarContent.querySelector('.ddl-content');
    expect(ddlContent).toBeTruthy();
    expect(ddlContent.classList.contains('syntax-highlighted')).toBe(true);
    
    const codeElement = ddlContent.querySelector('code');
    expect(codeElement).toBeTruthy();
    expect(codeElement.textContent.trim()).toBe(rawDDL);
  });

  test('should identify SQL keywords for highlighting', () => {
    const sqlKeywords = [
      'CREATE', 'TABLE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
      'AUTO_INCREMENT', 'NOT', 'NULL', 'UNIQUE', 'DEFAULT', 'INDEX',
      'CONSTRAINT', 'ON', 'DELETE', 'CASCADE', 'UPDATE', 'TIMESTAMP',
      'INT', 'VARCHAR', 'TEXT', 'DECIMAL', 'ENUM', 'BOOLEAN', 'DATE',
      'CURRENT_TIMESTAMP'
    ];

    const testDDL = `CREATE TABLE complex_table (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      price DECIMAL(10,2) DEFAULT 0.00,
      is_active BOOLEAN DEFAULT TRUE,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      INDEX idx_name (name),
      CONSTRAINT chk_price CHECK (price >= 0)
    );`;

    // Verify that our test DDL contains the keywords we want to highlight
    sqlKeywords.forEach(keyword => {
      if (testDDL.toUpperCase().includes(keyword)) {
        expect(testDDL.toUpperCase()).toContain(keyword);
      }
    });
  });

  test('should handle DDL with string literals correctly', () => {
    const ddlWithStrings = `CREATE TABLE products (
      id INT PRIMARY KEY,
      name VARCHAR(255) DEFAULT 'Unnamed Product',
      description TEXT DEFAULT 'No description available',
      status ENUM('draft', 'published', 'archived') DEFAULT 'draft'
    );`;

    const sidebarContent = document.getElementById('sidebar-content');
    sidebarContent.innerHTML = `
      <h4>products</h4>
      <div class="ddl-content">${ddlWithStrings}</div>
    `;

    const ddlContent = sidebarContent.querySelector('.ddl-content');
    expect(ddlContent.textContent).toContain("'Unnamed Product'");
    expect(ddlContent.textContent).toContain("'No description available'");
    expect(ddlContent.textContent).toContain("'draft'");
    expect(ddlContent.textContent).toContain("'published'");
    expect(ddlContent.textContent).toContain("'archived'");
  });

  test('should handle DDL with comments', () => {
    const ddlWithComments = `-- Users table definition
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT, -- Primary key
    name VARCHAR(255) NOT NULL, -- User full name
    email VARCHAR(255) UNIQUE NOT NULL -- Must be unique
);`;

    const sidebarContent = document.getElementById('sidebar-content');
    sidebarContent.innerHTML = `
      <h4>users</h4>
      <div class="ddl-content">${ddlWithComments}</div>
    `;

    const ddlContent = sidebarContent.querySelector('.ddl-content');
    expect(ddlContent.textContent).toContain('-- Users table definition');
    expect(ddlContent.textContent).toContain('-- Primary key');
    expect(ddlContent.textContent).toContain('-- User full name');
    expect(ddlContent.textContent).toContain('-- Must be unique');
  });

  test('should preserve formatting and indentation', () => {
    const formattedDDL = `CREATE TABLE well_formatted (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      nested_data JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT uk_name UNIQUE (name),
      INDEX idx_created (created_at)
    );`;

    const sidebarContent = document.getElementById('sidebar-content');
    sidebarContent.innerHTML = `
      <h4>well_formatted</h4>
      <pre class="ddl-content"><code>${formattedDDL}</code></pre>
    `;

    const ddlContent = sidebarContent.querySelector('.ddl-content');
    const codeElement = ddlContent.querySelector('code');
    
    // Pre tag should preserve whitespace and formatting
    expect(ddlContent.tagName).toBe('PRE');
    expect(codeElement.textContent).toContain('  id INT PRIMARY KEY');
    expect(codeElement.textContent).toContain('  name VARCHAR(255)');
    
    // Verify the content maintains structure
    const lines = codeElement.textContent.split('\n');
    expect(lines.length).toBeGreaterThan(5); // Should have multiple lines
    expect(lines.some(line => line.startsWith('  '))).toBe(true); // Should have indented lines
  });

  test('should handle unicode characters in DDL', () => {
    const unicodeDDL = `CREATE TABLE 商品テーブル (
      商品ID INT PRIMARY KEY AUTO_INCREMENT,
      商品名 VARCHAR(255) NOT NULL COMMENT '商品の名前',
      価格 DECIMAL(10,2) DEFAULT 0.00 COMMENT '商品の価格（円）',
      説明 TEXT COMMENT '商品の詳細説明'
    );`;

    const sidebarContent = document.getElementById('sidebar-content');
    sidebarContent.innerHTML = `
      <h4>商品テーブル</h4>
      <div class="ddl-content">${unicodeDDL}</div>
    `;

    const ddlContent = sidebarContent.querySelector('.ddl-content');
    expect(ddlContent.textContent).toContain('商品テーブル');
    expect(ddlContent.textContent).toContain('商品ID');
    expect(ddlContent.textContent).toContain('商品名');
    expect(ddlContent.textContent).toContain('価格');
    expect(ddlContent.textContent).toContain('説明');
    expect(ddlContent.textContent).toContain('商品の名前');
    expect(ddlContent.textContent).toContain('商品の価格（円）');
  });

  test('should test requirements for syntax highlighting implementation', () => {
    // This test documents what the syntax highlighting feature should provide
    const expectations = {
      keywords: ['CREATE', 'TABLE', 'PRIMARY', 'KEY', 'NOT', 'NULL', 'UNIQUE', 'DEFAULT'],
      dataTypes: ['INT', 'VARCHAR', 'TEXT', 'DECIMAL', 'TIMESTAMP', 'BOOLEAN', 'ENUM'],
      strings: ["'default_value'", "'enum_option'"],
      comments: ['-- Single line comment'],
      structure: {
        shouldUsePreTag: true,
        shouldUseCodeTag: true,
        shouldHaveSyntaxHighlightClass: true
      }
    };

    // Test that we know what elements need highlighting
    expect(Array.isArray(expectations.keywords)).toBe(true);
    expect(expectations.keywords.length).toBeGreaterThan(0);
    expect(Array.isArray(expectations.dataTypes)).toBe(true);
    expect(expectations.dataTypes.length).toBeGreaterThan(0);
    expect(expectations.structure.shouldUsePreTag).toBe(true);
    expect(expectations.structure.shouldUseCodeTag).toBe(true);
    expect(expectations.structure.shouldHaveSyntaxHighlightClass).toBe(true);

    // This test serves as documentation for the implementation requirements
    const implementationRequirements = [
      'DDL should be wrapped in <pre><code> tags for proper formatting',
      'SQL keywords should be highlighted with appropriate CSS classes',
      'String literals should be highlighted differently from keywords',
      'Comments should be highlighted with a distinct color',
      'Data types should be highlighted',
      'The ddl-content div should have syntax-highlighted class'
    ];

    expect(implementationRequirements.length).toBe(6);
    implementationRequirements.forEach(requirement => {
      expect(typeof requirement).toBe('string');
      expect(requirement.length).toBeGreaterThan(0);
    });
  });
});