import mysql from 'mysql2/promise';
import type { DatabaseAdapter, ConnectionConfig, TableRef, Column, ForeignKey } from '../DatabaseAdapter.js';

export class MySqlAdapter implements DatabaseAdapter {
  readonly type = 'mysql' as const;
  private connection: mysql.Connection | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    console.log('MySqlAdapter.connect() called');
    try {
      const mysqlConfig = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
      };
      console.log('MySQL config prepared:', { ...mysqlConfig, password: '***' });

      console.log('Attempting to create MySQL connection...');
      this.connection = await mysql.createConnection(mysqlConfig);
      console.log('Connected to MySQL database successfully');
    } catch (error) {
      console.error('MySQL connection failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async getTables(params?: { schema?: string }): Promise<Array<{ name: string; schema?: string }>> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    // MySQL does not have schema concept within a database
    // schema parameter is ignored
    const [rows] = await this.connection.execute('SHOW TABLES');
    return (rows as any[]).map((row) => ({
      name: Object.values(row)[0] as string,
    }));
  }

  async getTableColumns(table: TableRef): Promise<Column[]> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    // Column information with primary key detection
    // Note: isForeignKey will be derived from Relationships later in ERDataBuilder
    const [rows] = await this.connection.execute(
      `
      SELECT 
        c.COLUMN_NAME as Field,
        c.COLUMN_KEY as \`Key\`
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() 
        AND c.TABLE_NAME = ?
      ORDER BY c.ORDINAL_POSITION
      `,
      [table.name]
    );

    return (rows as any[]).map((row) => ({
      id: crypto.randomUUID(),
      name: row.Field,
      key: row.Key === 'PRI' ? 'PRI' : null,
      isForeignKey: false, // Will be derived from Relationships in ERDataBuilder
    }));
  }

  async getForeignKeys(table: TableRef): Promise<ForeignKey[]> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    // Note: This method is deprecated but kept for backward compatibility
    // Foreign keys will be converted to Relationships in ERDataBuilder
    const [rows] = await this.connection.execute(
      `
      SELECT 
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME,
        CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `,
      [table.name]
    );

    return (rows as any[]).map((row) => ({
      id: crypto.randomUUID(),
      columnId: '', // Will be resolved in ERDataBuilder
      referencedTableId: '', // Will be resolved in ERDataBuilder
      referencedColumnId: '', // Will be resolved in ERDataBuilder
      constraintName: row.CONSTRAINT_NAME,
      // Store raw data for resolution
      _columnName: row.COLUMN_NAME,
      _referencedTableName: row.REFERENCED_TABLE_NAME,
      _referencedColumnName: row.REFERENCED_COLUMN_NAME,
    })) as any[];
  }

  async getTableDDL(table: TableRef): Promise<string> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    try {
      const [rows] = await this.connection.execute(
        `SHOW CREATE TABLE \`${table.name.replace(/`/g, '``')}\``
      );
      return (rows as any[])[0]['Create Table'] || '';
    } catch (error) {
      console.error(`Failed to get DDL for table ${table.name}:`, error);
      return ''; // Return empty string if DDL cannot be obtained
    }
  }
}
