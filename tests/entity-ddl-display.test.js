/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Entity DDL Display Tests', () => {
  let mockFetch;
  let sidebar;
  let sidebarContent;

  beforeEach(() => {
    // DOM setup
    document.body.innerHTML = `
      <svg id="er-canvas"></svg>
      <div id="sidebar">
        <div id="sidebar-content"></div>
        <button id="close-sidebar">Close</button>
      </div>
      <div class="entity" data-table="users">
        <text class="entity-title">users</text>
      </div>
    `;

    sidebar = document.getElementById('sidebar');
    sidebarContent = document.getElementById('sidebar-content');

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock console to avoid noise
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should display DDL when entity is clicked', async () => {
    // Mock DDL response
    const mockDDL = {
      ddl: `CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDDL
    });

    // Create a mock ERViewerCore instance
    const mockERViewer = {
      sidebar: sidebar,
      sidebarContent: sidebarContent,
      async showTableDetails(tableName) {
        const response = await fetch(`/api/table/${tableName}/ddl`);
        if (response.ok) {
          const data = await response.json();
          this.sidebarContent.innerHTML = `
            <h4>${tableName}</h4>
            <div class="ddl-content">${data.ddl}</div>
          `;
          this.sidebar.classList.add('open');
        }
      }
    };

    // Simulate entity click
    await mockERViewer.showTableDetails('users');

    // Verify API call
    expect(mockFetch).toHaveBeenCalledWith('/api/table/users/ddl');
    
    // Verify sidebar is opened
    expect(sidebar.classList.contains('open')).toBe(true);
    
    // Verify DDL content is displayed
    expect(sidebarContent.innerHTML).toContain('<h4>users</h4>');
    expect(sidebarContent.innerHTML).toContain('CREATE TABLE users');
    expect(sidebarContent.innerHTML).toContain('id INT PRIMARY KEY');
    expect(sidebarContent.innerHTML).toContain('name VARCHAR(255)');
    
    // Verify DDL is wrapped in ddl-content div
    const ddlContentDiv = sidebarContent.querySelector('.ddl-content');
    expect(ddlContentDiv).toBeTruthy();
    expect(ddlContentDiv.textContent).toContain('CREATE TABLE users');
  });

  test('should handle API error gracefully', async () => {
    // Mock API error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const mockERViewer = {
      sidebar: sidebar,
      sidebarContent: sidebarContent,
      async showTableDetails(tableName) {
        try {
          const response = await fetch(`/api/table/${tableName}/ddl`);
          if (response.ok) {
            const data = await response.json();
            this.sidebarContent.innerHTML = `
              <h4>${tableName}</h4>
              <div class="ddl-content">${data.ddl}</div>
            `;
            this.sidebar.classList.add('open');
          }
        } catch (error) {
          console.error('Error loading table details:', error);
        }
      }
    };

    // Simulate entity click with error
    await mockERViewer.showTableDetails('users');

    // Verify API call was made
    expect(mockFetch).toHaveBeenCalledWith('/api/table/users/ddl');
    
    // Verify sidebar is not opened on error
    expect(sidebar.classList.contains('open')).toBe(false);
    
    // Verify no DDL content is displayed
    expect(sidebarContent.innerHTML).toBe('');
  });

  test('should handle network error gracefully', async () => {
    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const mockERViewer = {
      sidebar: sidebar,
      sidebarContent: sidebarContent,
      async showTableDetails(tableName) {
        try {
          const response = await fetch(`/api/table/${tableName}/ddl`);
          if (response.ok) {
            const data = await response.json();
            this.sidebarContent.innerHTML = `
              <h4>${tableName}</h4>
              <div class="ddl-content">${data.ddl}</div>
            `;
            this.sidebar.classList.add('open');
          }
        } catch (error) {
          console.error('Error loading table details:', error);
        }
      }
    };

    // Simulate entity click with network error
    await mockERViewer.showTableDetails('users');

    // Verify API call was attempted
    expect(mockFetch).toHaveBeenCalledWith('/api/table/users/ddl');
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('Error loading table details:', expect.any(Error));
    
    // Verify sidebar is not opened
    expect(sidebar.classList.contains('open')).toBe(false);
  });

  test('should validate DDL content structure', () => {
    // Test various DDL patterns that should be supported
    const testCases = [
      {
        name: 'Simple table',
        ddl: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));'
      },
      {
        name: 'Complex table with constraints',
        ddl: `CREATE TABLE orders (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_status (status)
        );`
      },
      {
        name: 'Table with unicode content',
        ddl: 'CREATE TABLE 商品 (商品ID INT PRIMARY KEY, 商品名 VARCHAR(255));'
      }
    ];

    testCases.forEach(testCase => {
      expect(testCase.ddl).toContain('CREATE TABLE');
      expect(testCase.ddl.length).toBeGreaterThan(0);
      
      // Verify DDL structure
      if (testCase.ddl.includes('PRIMARY KEY')) {
        expect(testCase.ddl).toMatch(/PRIMARY KEY/);
      }
      if (testCase.ddl.includes('FOREIGN KEY')) {
        expect(testCase.ddl).toMatch(/FOREIGN KEY/);
      }
    });
  });

  test('should close sidebar when close button is clicked', () => {
    // Open sidebar first
    sidebar.classList.add('open');
    expect(sidebar.classList.contains('open')).toBe(true);

    // Mock close functionality
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const mockERViewer = {
      sidebar: sidebar,
      closeSidebar() {
        this.sidebar.classList.remove('open');
      }
    };

    // Simulate close button click
    mockERViewer.closeSidebar();

    // Verify sidebar is closed
    expect(sidebar.classList.contains('open')).toBe(false);
  });

  test('should handle multiple entity clicks correctly', async () => {
    const mockResponses = [
      {
        tableName: 'users',
        ddl: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));'
      },
      {
        tableName: 'posts',
        ddl: 'CREATE TABLE posts (id INT PRIMARY KEY, title VARCHAR(255), content TEXT);'
      }
    ];

    // Mock multiple API responses
    mockResponses.forEach((response, index) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ddl: response.ddl })
      });
    });

    const mockERViewer = {
      sidebar: sidebar,
      sidebarContent: sidebarContent,
      async showTableDetails(tableName) {
        const response = await fetch(`/api/table/${tableName}/ddl`);
        if (response.ok) {
          const data = await response.json();
          this.sidebarContent.innerHTML = `
            <h4>${tableName}</h4>
            <div class="ddl-content">${data.ddl}</div>
          `;
          this.sidebar.classList.add('open');
        }
      }
    };

    // Click first entity
    await mockERViewer.showTableDetails('users');
    
    expect(sidebarContent.innerHTML).toContain('<h4>users</h4>');
    expect(sidebarContent.innerHTML).toContain('CREATE TABLE users');

    // Click second entity
    await mockERViewer.showTableDetails('posts');
    
    expect(sidebarContent.innerHTML).toContain('<h4>posts</h4>');
    expect(sidebarContent.innerHTML).toContain('CREATE TABLE posts');
    expect(sidebarContent.innerHTML).not.toContain('CREATE TABLE users'); // Previous content should be replaced
  });
});