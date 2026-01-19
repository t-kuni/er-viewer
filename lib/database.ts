import mysql from 'mysql2/promise';
import type { components } from './generated/api-types.js';

// api-types.tsから生成された型を使用
type Column = components['schemas']['Column'];
type ForeignKey = components['schemas']['ForeignKey'];
type Entity = components['schemas']['Entity'];
type Relationship = components['schemas']['Relationship'];
type ERData = components['schemas']['ERData'];
type LayoutData = components['schemas']['LayoutData'];
type EntityLayoutItem = components['schemas']['EntityLayoutItem'];
type Rectangle = components['schemas']['Rectangle'];
type Text = components['schemas']['Text'];

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
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

  async getTableColumns(tableName: string): Promise<Column[]> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    const [rows] = await this.connection.execute(`SHOW COLUMNS FROM \`${tableName.replace(/`/g, '``')}\``);
    return (rows as any[]).map((row) => ({
      id: crypto.randomUUID(),
      name: row.Field,
      type: row.Type,
      nullable: row.Null === 'YES',
      key: row.Key,
      default: row.Default,
      extra: row.Extra,
    }));
  }

  async getForeignKeys(tableName: string): Promise<ForeignKey[]> {
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
      id: crypto.randomUUID(),
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

    // テーブル名→エンティティIDのマップを作成
    const tableNameToIdMap = new Map<string, string>();

    // 第1段階: 全エンティティを生成してマップを構築
    for (const tableName of tables) {
      const columns = await this.getTableColumns(tableName);
      const foreignKeys = await this.getForeignKeys(tableName);
      const ddl = await this.getTableDDL(tableName);

      const entityId = crypto.randomUUID();
      tableNameToIdMap.set(tableName, entityId);

      erData.entities.push({
        id: entityId,
        name: tableName,
        columns: columns,
        foreignKeys: foreignKeys,
        ddl: ddl,
      });
    }

    // 第2段階: リレーションシップを生成（エンティティIDを参照可能）
    for (const entity of erData.entities) {
      const tableName = entity.name;
      for (const fk of entity.foreignKeys) {
        const fromId = tableNameToIdMap.get(tableName);
        const toId = tableNameToIdMap.get(fk.referencedTable);
        
        if (!fromId || !toId) {
          console.warn(`Entity ID not found for relationship: ${tableName} -> ${fk.referencedTable}`);
          continue;
        }

        erData.relationships.push({
          id: crypto.randomUUID(),
          from: tableName,
          fromId: fromId,
          fromColumn: fk.column,
          to: fk.referencedTable,
          toId: toId,
          toColumn: fk.referencedColumn,
          constraintName: fk.constraintName,
        });
      }
    }

    return erData;
  }

  generateDefaultLayoutData(entities: Entity[]): LayoutData {
    const layoutEntities: Record<string, EntityLayoutItem> = {};
    
    entities.forEach((entity, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      layoutEntities[entity.id] = {
        id: entity.id,
        name: entity.name,
        x: 50 + col * 300,
        y: 50 + row * 200,
      };
    });
    
    return {
      entities: layoutEntities,
      rectangles: {},
      texts: {},
    };
  }
}

export default DatabaseManager;
export type { 
  DatabaseConfig, 
  Column, 
  ForeignKey, 
  Entity, 
  Relationship, 
  ERData,
  LayoutData,
  EntityLayoutItem,
  Rectangle,
  Text,
};
