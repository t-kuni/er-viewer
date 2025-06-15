/**
 * @jest-environment node
 */

// Mock mysql2/promise at the module level
const mockConnection = {
  execute: jest.fn(),
  end: jest.fn()
};

const mockMysql = {
  createConnection: jest.fn().mockResolvedValue(mockConnection)
};

// Replace the actual mysql2/promise module
jest.doMock('mysql2/promise', () => mockMysql);

describe('Database Manager Unit Tests', () => {
  let DatabaseManager;
  let dbManager;
  
  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Import DatabaseManager after mocks are set up
    // Since we're using CommonJS, we need to clear the require cache
    delete require.cache[require.resolve('../lib/database.js')];
    const module = require('../lib/database.js');
    DatabaseManager = module.default || module;
    
    dbManager = new DatabaseManager();
  });

  describe('constructor', () => {
    test('should initialize with null connection', () => {
      expect(dbManager.connection).toBeNull();
    });
  });

  describe('connect', () => {
    test('should connect with default configuration', async () => {
      await dbManager.connect();
      
      expect(mockMysql.createConnection).toHaveBeenCalledWith({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'test'
      });
      
      expect(dbManager.connection).toBe(mockConnection);
    });

    test('should use environment variables when available', async () => {
      // Mock process.env for this test
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        DB_HOST: 'test-host',
        DB_PORT: '3307',
        DB_USER: 'test-user',
        DB_PASSWORD: 'test-password',
        DB_NAME: 'test-database'
      };
      
      await dbManager.connect();
      
      expect(mockMysql.createConnection).toHaveBeenCalledWith({
        host: 'test-host',
        port: '3307',
        user: 'test-user',
        password: 'test-password',
        database: 'test-database'
      });
      
      // Restore original environment
      process.env = originalEnv;
    });

    test('should throw error when connection fails', async () => {
      const connectionError = new Error('Connection failed');
      mockMysql.createConnection.mockRejectedValueOnce(connectionError);
      
      await expect(dbManager.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect', () => {
    test('should disconnect when connection exists', async () => {
      // First connect
      await dbManager.connect();
      expect(dbManager.connection).toBe(mockConnection);
      
      // Then disconnect
      await dbManager.disconnect();
      expect(mockConnection.end).toHaveBeenCalled();
      expect(dbManager.connection).toBeNull();
    });

    test('should handle disconnect when no connection exists', async () => {
      await dbManager.disconnect();
      expect(mockConnection.end).not.toHaveBeenCalled();
    });
  });

  describe('getTables', () => {
    test('should return list of table names', async () => {
      const mockTables = [
        { 'Tables_in_test': 'users' },
        { 'Tables_in_test': 'posts' },
        { 'Tables_in_test': 'comments' }
      ];
      
      mockConnection.execute.mockResolvedValueOnce([mockTables]);
      
      // First connect to set up the connection
      await dbManager.connect();
      const tables = await dbManager.getTables();
      
      expect(mockConnection.execute).toHaveBeenCalledWith('SHOW TABLES');
      expect(tables).toEqual(['users', 'posts', 'comments']);
    });

    test('should handle empty table list', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);
      
      await dbManager.connect();
      const tables = await dbManager.getTables();
      
      expect(tables).toEqual([]);
    });
  });

  describe('getTableColumns', () => {
    test('should return formatted column information', async () => {
      const mockColumns = [
        {
          Field: 'id',
          Type: 'int(11)',
          Null: 'NO',
          Key: 'PRI',
          Default: null,
          Extra: 'auto_increment'
        },
        {
          Field: 'name',
          Type: 'varchar(255)',
          Null: 'YES',
          Key: '',
          Default: null,
          Extra: ''
        }
      ];
      
      mockConnection.execute.mockResolvedValueOnce([mockColumns]);
      
      await dbManager.connect();
      const columns = await dbManager.getTableColumns('users');
      
      expect(mockConnection.execute).toHaveBeenCalledWith('SHOW COLUMNS FROM `users`');
      expect(columns).toEqual([
        {
          name: 'id',
          type: 'int(11)',
          nullable: false,
          key: 'PRI',
          default: null,
          extra: 'auto_increment'
        },
        {
          name: 'name',
          type: 'varchar(255)',
          nullable: true,
          key: '',
          default: null,
          extra: ''
        }
      ]);
    });

    test('should properly escape table names with backticks', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);
      
      await dbManager.connect();
      await dbManager.getTableColumns('table`with`backticks');
      
      expect(mockConnection.execute).toHaveBeenCalledWith('SHOW COLUMNS FROM `table``with``backticks`');
    });
  });

  describe('error handling', () => {
    test('should handle database query errors', async () => {
      const queryError = new Error('Query failed');
      mockConnection.execute.mockRejectedValueOnce(queryError);
      
      await dbManager.connect();
      await expect(dbManager.getTables()).rejects.toThrow('Query failed');
    });
  });

  describe('integration workflow simulation', () => {
    test('should simulate complete reverse engineering workflow', async () => {
      // Mock all required responses
      const mockTables = [
        { 'Tables_in_test': 'users' },
        { 'Tables_in_test': 'posts' }
      ];
      
      const mockUsersColumns = [
        { Field: 'id', Type: 'int(11)', Null: 'NO', Key: 'PRI', Default: null, Extra: 'auto_increment' },
        { Field: 'email', Type: 'varchar(255)', Null: 'NO', Key: 'UNI', Default: null, Extra: '' }
      ];
      
      const mockPostsColumns = [
        { Field: 'id', Type: 'int(11)', Null: 'NO', Key: 'PRI', Default: null, Extra: 'auto_increment' },
        { Field: 'user_id', Type: 'int(11)', Null: 'NO', Key: 'MUL', Default: null, Extra: '' },
        { Field: 'title', Type: 'varchar(255)', Null: 'NO', Key: '', Default: null, Extra: '' }
      ];
      
      mockConnection.execute
        .mockResolvedValueOnce([mockTables])
        .mockResolvedValueOnce([mockUsersColumns])
        .mockResolvedValueOnce([mockPostsColumns]);
      
      // Simulate the workflow
      await dbManager.connect();
      
      const tables = await dbManager.getTables();
      expect(tables).toEqual(['users', 'posts']);
      
      // Get columns for each table
      const usersColumns = await dbManager.getTableColumns('users');
      const postsColumns = await dbManager.getTableColumns('posts');
      
      // Verify structure
      expect(usersColumns).toHaveLength(2);
      expect(postsColumns).toHaveLength(3);
      
      // Verify primary keys
      expect(usersColumns.find(col => col.key === 'PRI')).toBeTruthy();
      expect(postsColumns.find(col => col.key === 'PRI')).toBeTruthy();
      
      // Verify foreign key (MUL indicates an index, often foreign key)
      expect(postsColumns.find(col => col.key === 'MUL')).toBeTruthy();
      
      await dbManager.disconnect();
    });
  });
});