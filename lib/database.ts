import mysql from 'mysql2/promise';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: any;
  extra: string;
}

interface ForeignKeyInfo {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

interface EntityInfo {
  name: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  ddl: string;
}

interface RelationshipInfo {
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
  constraintName: string;
}

interface ERData {
  entities: EntityInfo[];
  relationships: RelationshipInfo[];
}

class DatabaseManager {
  private connection: mysql.Connection | null;

  constructor() {
    console.log('DatabaseManager constructor called');
    this.connection = null;
    console.log('DatabaseManager constructor completed');
  }

  async connect(): Promise<void> {
    console.log('DatabaseManager.connect() called');
    try {
      const config: DatabaseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'test',
      };
      console.log('Database config prepared:', { ...config, password: '***' });

      console.log('Attempting to create MySQL connection...');
      this.connection = await mysql.createConnection(config);
      console.log('Connected to MySQL database successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
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

  async getTables(): Promise<string[]> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    const [rows] = await this.connection.execute('SHOW TABLES');
    return (rows as any[]).map((row) => Object.values(row)[0] as string);
  }

  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    const [rows] = await this.connection.execute(`SHOW COLUMNS FROM \`${tableName.replace(/`/g, '``')}\``);
    return (rows as any[]).map((row) => ({
      name: row.Field,
      type: row.Type,
      nullable: row.Null === 'YES',
      key: row.Key,
      default: row.Default,
      extra: row.Extra,
    }));
  }

  async getForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    const [rows] = await this.connection.execute(
      `
            SELECT 
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME,
                CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = ? 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `,
      [process.env.DB_NAME || 'test', tableName],
    );

    return (rows as any[]).map((row) => ({
      column: row.COLUMN_NAME,
      referencedTable: row.REFERENCED_TABLE_NAME,
      referencedColumn: row.REFERENCED_COLUMN_NAME,
      constraintName: row.CONSTRAINT_NAME,
    }));
  }

  async getTableDDL(tableName: string): Promise<string> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    const [rows] = await this.connection.execute(`SHOW CREATE TABLE \`${tableName.replace(/`/g, '``')}\``);
    return (rows as any[])[0]['Create Table'];
  }

  async generateERData(): Promise<ERData> {
    const tables = await this.getTables();
    const erData: ERData = {
      entities: [],
      relationships: [],
    };

    for (const tableName of tables) {
      const columns = await this.getTableColumns(tableName);
      const foreignKeys = await this.getForeignKeys(tableName);
      const ddl = await this.getTableDDL(tableName);

      erData.entities.push({
        name: tableName,
        columns: columns,
        foreignKeys: foreignKeys,
        ddl: ddl,
      });

      for (const fk of foreignKeys) {
        erData.relationships.push({
          from: tableName,
          fromColumn: fk.column,
          to: fk.referencedTable,
          toColumn: fk.referencedColumn,
          constraintName: fk.constraintName,
        });
      }
    }

    return erData;
  }
}

export default DatabaseManager;
export type { DatabaseConfig, ColumnInfo, ForeignKeyInfo, EntityInfo, RelationshipInfo, ERData };
