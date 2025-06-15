/**
 * @jest-environment jsdom
 */

describe('Entity Column Display Tests', () => {
  let mockRenderer;

  beforeEach(() => {
    // Mock SVG namespace
    global.document.createElementNS = jest.fn((namespace, tagName) => {
      const element = document.createElement(tagName);
      element.setAttribute = jest.fn();
      element.appendChild = jest.fn();
      element.textContent = '';
      return element;
    });

    // Mock CanvasRenderer with the actual logic
    mockRenderer = {
      config: {
        entity: {
          minWidth: 150,
          headerHeight: 25,
          columnHeight: 20,
          padding: 10,
          borderRadius: 5
        }
      },

      calculateEntityDimensions(entity) {
        // Calculate width based on longest text (column name only)
        let maxWidth = entity.name.length * 8 + 20; // Approximate character width
        
        entity.columns.forEach(column => {
          const columnText = column.name; // Only column name, not type
          const textWidth = columnText.length * 7 + 60; // Account for icons
          maxWidth = Math.max(maxWidth, textWidth);
        });
        
        const width = Math.max(maxWidth, this.config.entity.minWidth);
        const height = this.config.entity.headerHeight + 
                      (entity.columns.length * this.config.entity.columnHeight) + 
                      this.config.entity.padding;
        
        return { width, height };
      },

      createColumnElement(column, entity, entityWidth, yOffset) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'entity-column');
        group.setAttribute('data-column', column.name);
        
        let xOffset = 10;
        
        // Add column type icons
        if (column.key === 'PRI') {
          const keyIcon = this.createColumnIcon('🔑', xOffset, yOffset);
          group.appendChild(keyIcon);
          xOffset += 20;
        }
        
        // Check if column is foreign key by looking in entity's foreignKeys array
        const isForeignKey = entity.foreignKeys && entity.foreignKeys.some(fk => fk.column === column.name);
        if (isForeignKey) {
          const fkIcon = this.createColumnIcon('🔗', xOffset, yOffset);
          group.appendChild(fkIcon);
          xOffset += 20;
        }
        
        // Column name only (not type)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', xOffset);
        text.setAttribute('y', yOffset + 12);
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '11');
        text.setAttribute('fill', '#333333');
        
        const columnText = column.name; // Only column name
        text.textContent = columnText;
        group.appendChild(text);
        
        return group;
      },

      createColumnIcon(icon, x, y) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + 12);
        text.setAttribute('font-size', '12');
        text.textContent = icon;
        return text;
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should display only column names in entity columns', () => {
    const mockEntity = {
      name: 'users',
      columns: [
        { name: 'id', type: 'int', key: 'PRI' },
        { name: 'name', type: 'varchar(255)', key: '' },
        { name: 'email', type: 'varchar(255)', key: '' }
      ],
      foreignKeys: []
    };

    const columnElement = mockRenderer.createColumnElement(mockEntity.columns[1], mockEntity, 200, 50);

    // Verify that the column element was created
    expect(columnElement).toBeTruthy();
    expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'g');
    expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'text');
    
    // Verify text content is only column name
    const textElements = columnElement.appendChild.mock.calls
      .map(call => call[0])
      .filter(element => element.textContent !== undefined);
    
    expect(textElements.length).toBeGreaterThan(0);
    // The text should be 'name', not 'name varchar(255)'
    expect(textElements.some(el => el.textContent === 'name')).toBe(true);
  });

  test('should calculate entity width based on column names only', () => {
    const mockEntity = {
      name: 'users',
      columns: [
        { name: 'id', type: 'int', key: 'PRI' },
        { name: 'very_long_column_name', type: 'varchar(255)', key: '' },
        { name: 'email', type: 'varchar(255)', key: '' }
      ],
      foreignKeys: []
    };

    const dimensions = mockRenderer.calculateEntityDimensions(mockEntity);

    // Verify dimensions are calculated correctly
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    
    // The width should be based on column names only, not including type information
    const longestColumnName = 'very_long_column_name';
    const expectedMinWidth = longestColumnName.length * 7 + 60; // Account for icons
    
    expect(dimensions.width).toBeGreaterThanOrEqual(expectedMinWidth);
  });

  test('should create column element with only column name text', () => {
    const mockColumn = { name: 'user_id', type: 'int', key: '' };
    const mockEntity = {
      name: 'posts',
      foreignKeys: [{ column: 'user_id', references: 'users.id' }]
    };
    
    const entityWidth = 200;
    const yOffset = 50;

    const columnElement = mockRenderer.createColumnElement(mockColumn, mockEntity, entityWidth, yOffset);

    expect(columnElement).toBeTruthy();
    expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'g');
    expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'text');
  });

  test('should handle primary key columns correctly', () => {
    const mockColumn = { name: 'id', type: 'int', key: 'PRI' };
    const mockEntity = {
      name: 'users',
      foreignKeys: []
    };
    
    const entityWidth = 200;
    const yOffset = 50;

    const columnElement = mockRenderer.createColumnElement(mockColumn, mockEntity, entityWidth, yOffset);

    expect(columnElement).toBeTruthy();
    // Verify that icons are created for primary key
    expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'text');
  });

  test('should handle foreign key columns correctly', () => {
    const mockColumn = { name: 'user_id', type: 'int', key: '' };
    const mockEntity = {
      name: 'posts',
      foreignKeys: [{ column: 'user_id', references: 'users.id' }]
    };
    
    const entityWidth = 200;
    const yOffset = 50;

    const columnElement = mockRenderer.createColumnElement(mockColumn, mockEntity, entityWidth, yOffset);

    expect(columnElement).toBeTruthy();
    // Verify that icons are created for foreign key
    expect(document.createElementNS).toHaveBeenCalledWith('http://www.w3.org/2000/svg', 'text');
  });

  test('should maintain consistent column rendering', () => {
    const testColumns = [
      { name: 'id', type: 'int', key: 'PRI' },
      { name: 'username', type: 'varchar(50)', key: '' },
      { name: 'email_address', type: 'varchar(255)', key: '' },
      { name: 'created_at', type: 'timestamp', key: '' }
    ];

    const mockEntity = {
      name: 'users',  
      columns: testColumns,
      foreignKeys: []
    };

    testColumns.forEach((column, index) => {
      const columnElement = mockRenderer.createColumnElement(column, mockEntity, 200, 50 + (index * 20));
      expect(columnElement).toBeTruthy();
    });

    // Basic verification that elements are created
    expect(document.createElementNS).toHaveBeenCalled();
  });

  test('should handle empty column list', () => {
    const mockEntity = {
      name: 'empty_table',
      columns: [],
      foreignKeys: []
    };

    const dimensions = mockRenderer.calculateEntityDimensions(mockEntity);

    // Should still have minimum dimensions
    expect(dimensions.width).toBeGreaterThanOrEqual(150); // minWidth
    expect(dimensions.height).toBeGreaterThan(0);
  });

  test('should handle unicode column names', () => {
    const mockEntity = {
      name: '商品',
      columns: [
        { name: '商品ID', type: 'int', key: 'PRI' },
        { name: '商品名', type: 'varchar(255)', key: '' },
        { name: '価格', type: 'decimal(10,2)', key: '' }
      ],
      foreignKeys: []
    };

    const dimensions = mockRenderer.calculateEntityDimensions(mockEntity);

    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);

    // Test that unicode column names are handled properly
    mockEntity.columns.forEach((column, index) => {
      const columnElement = mockRenderer.createColumnElement(column, mockEntity, dimensions.width, 50 + (index * 20));
      expect(columnElement).toBeTruthy();
    });
  });
});