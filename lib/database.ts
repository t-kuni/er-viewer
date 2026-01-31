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
type TextBox = components['schemas']['TextBox'];

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

  async connect(config?: Partial<DatabaseConfig>): Promise<void> {
    console.log('DatabaseManager.connect() called');
    try {
      // 接続情報の解決: 優先順位は 引数 > 環境変数 > エラー
      const resolvedConfig: DatabaseConfig = {
        host: config?.host ?? process.env.DB_HOST ?? (() => { throw new Error('Database host is not specified'); })(),
        port: config?.port ?? (process.env.DB_PORT ? parseInt(process.env.DB_PORT) : (() => { throw new Error('Database port is not specified'); })()),
        user: config?.user ?? process.env.DB_USER ?? (() => { throw new Error('Database user is not specified'); })(),
        password: config?.password ?? process.env.DB_PASSWORD ?? (() => { throw new Error('Database password is not specified'); })(),
        database: config?.database ?? process.env.DB_NAME ?? (() => { throw new Error('Database name is not specified'); })(),
      };
      console.log('Database config prepared:', { ...resolvedConfig, password: '***' });

      console.log('Attempting to create MySQL connection...');
      this.connection = await mysql.createConnection(resolvedConfig);
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

  async getForeignKeys(
    tableName: string,
    columnNameToIdMap: Map<string, string>,
    tableNameToIdMap: Map<string, string>
  ): Promise<ForeignKey[]> {
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
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ? 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `,
      [tableName],
    );

    return (rows as any[]).map((row) => {
      const columnId = columnNameToIdMap.get(row.COLUMN_NAME);
      const referencedTableId = tableNameToIdMap.get(row.REFERENCED_TABLE_NAME);
      
      // 参照先テーブルのカラムIDを取得するため、マップのキーを作成
      const referencedColumnKey = `${row.REFERENCED_TABLE_NAME}:${row.REFERENCED_COLUMN_NAME}`;
      const referencedColumnId = columnNameToIdMap.get(referencedColumnKey);

      if (!columnId || !referencedTableId || !referencedColumnId) {
        console.warn(`Could not resolve IDs for foreign key: ${tableName}.${row.COLUMN_NAME} -> ${row.REFERENCED_TABLE_NAME}.${row.REFERENCED_COLUMN_NAME}`);
        // エラーの場合は仮のUUIDを生成（本来は存在すべき）
        return {
          id: crypto.randomUUID(),
          columnId: columnId || crypto.randomUUID(),
          referencedTableId: referencedTableId || crypto.randomUUID(),
          referencedColumnId: referencedColumnId || crypto.randomUUID(),
          constraintName: row.CONSTRAINT_NAME,
        };
      }

      return {
        id: crypto.randomUUID(),
        columnId,
        referencedTableId,
        referencedColumnId,
        constraintName: row.CONSTRAINT_NAME,
      };
    });
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
    // カラム名→カラムIDのマップを作成（キー: "テーブル名:カラム名"）
    const columnNameToIdMap = new Map<string, string>();

    // 第1段階: 全テーブルのカラムを取得してマップを構築
    const tablesData = new Map<string, { entityId: string; columns: Column[]; ddl: string }>();
    
    for (const tableName of tables) {
      const columns = await this.getTableColumns(tableName);
      const ddl = await this.getTableDDL(tableName);
      const entityId = crypto.randomUUID();
      
      tableNameToIdMap.set(tableName, entityId);
      
      // カラム名→IDマップを構築（自テーブル用と参照用の両方のキーを登録）
      for (const column of columns) {
        columnNameToIdMap.set(column.name, column.id); // 自テーブルのカラム用
        columnNameToIdMap.set(`${tableName}:${column.name}`, column.id); // 参照用
      }
      
      tablesData.set(tableName, { entityId, columns, ddl });
    }

    // 第2段階: ForeignKeyを取得してエンティティを生成
    for (const tableName of tables) {
      const data = tablesData.get(tableName)!;
      
      // カラムIDマップをリセットして、現在のテーブルのカラムのみを自カラム用に登録
      const currentColumnNameToIdMap = new Map<string, string>();
      for (const column of data.columns) {
        currentColumnNameToIdMap.set(column.name, column.id);
      }
      // 他のテーブルのカラムは「テーブル名:カラム名」形式でのみアクセス可能
      for (const [key, value] of columnNameToIdMap.entries()) {
        if (key.includes(':')) {
          currentColumnNameToIdMap.set(key, value);
        }
      }
      
      const foreignKeys = await this.getForeignKeys(tableName, currentColumnNameToIdMap, tableNameToIdMap);

      erData.entities.push({
        id: data.entityId,
        name: tableName,
        columns: data.columns,
        foreignKeys: foreignKeys,
        ddl: data.ddl,
      });
    }

    // 第3段階: リレーションシップを生成
    for (const entity of erData.entities) {
      for (const fk of entity.foreignKeys) {
        erData.relationships.push({
          id: crypto.randomUUID(),
          fromEntityId: entity.id,
          fromColumnId: fk.columnId,
          toEntityId: fk.referencedTableId,
          toColumnId: fk.referencedColumnId,
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
  TextBox,
};
