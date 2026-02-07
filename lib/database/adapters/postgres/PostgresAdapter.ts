import pg from 'pg';
import type { DatabaseAdapter, ConnectionConfig, TableRef, Column, ForeignKey } from '../DatabaseAdapter.js';
import { PgDumpExecutor } from './PgDumpExecutor.js';

export class PostgresAdapter implements DatabaseAdapter {
  readonly type = 'postgresql' as const;
  private client: pg.Client | null = null;
  private connectionConfig: ConnectionConfig | null = null;
  private pgDumpExecutor: PgDumpExecutor;

  constructor(pgDumpExecutor?: PgDumpExecutor) {
    this.pgDumpExecutor = pgDumpExecutor || new PgDumpExecutor();
  }

  async connect(config: ConnectionConfig): Promise<void> {
    console.log('PostgresAdapter.connect() called');
    try {
      const pgConfig = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
      };
      console.log('PostgreSQL config prepared:', { ...pgConfig, password: '***' });

      console.log('Attempting to create PostgreSQL connection...');
      this.client = new pg.Client(pgConfig);
      await this.client.connect();
      this.connectionConfig = config;
      console.log('Connected to PostgreSQL database successfully');
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      this.connectionConfig = null;
    }
  }

  async getTables(params?: { schema?: string }): Promise<Array<{ name: string; schema?: string }>> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    const schema = params?.schema || 'public';
    const result = await this.client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [schema]
    );

    return result.rows.map((row) => ({
      name: row.table_name,
      schema: schema,
    }));
  }

  async getTableColumns(table: TableRef): Promise<Column[]> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    const schema = table.schema || 'public';

    // Get column information
    const columnsResult = await this.client.query(
      `SELECT
         column_name,
         ordinal_position
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, table.name]
    );

    // Get primary key columns
    const pkResult = await this.client.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.constraint_schema = kcu.constraint_schema
       WHERE tc.table_schema = $1
         AND tc.table_name = $2
         AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.ordinal_position`,
      [schema, table.name]
    );

    const pkColumns = new Set(pkResult.rows.map((row) => row.column_name));

    return columnsResult.rows.map((row) => ({
      id: crypto.randomUUID(),
      name: row.column_name,
      key: pkColumns.has(row.column_name) ? 'PRI' : null,
      isForeignKey: false, // Will be derived from Relationships in ERDataBuilder
    }));
  }

  async getForeignKeys(table: TableRef): Promise<ForeignKey[]> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    const schema = table.schema || 'public';

    // Note: This method is deprecated but kept for backward compatibility
    // Foreign keys will be converted to Relationships in ERDataBuilder
    const result = await this.client.query(
      `SELECT
         kcu.constraint_name,
         kcu.column_name              AS column_name,
         pkcu.table_name              AS referenced_table_name,
         pkcu.column_name             AS referenced_column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.constraint_schema = kcu.constraint_schema
       JOIN information_schema.referential_constraints rc
         ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.constraint_schema
       JOIN information_schema.key_column_usage pkcu
         ON pkcu.constraint_name = rc.unique_constraint_name
        AND pkcu.constraint_schema = rc.unique_constraint_schema
        AND pkcu.ordinal_position = kcu.position_in_unique_constraint
       WHERE tc.table_schema = $1
         AND tc.table_name = $2
         AND tc.constraint_type = 'FOREIGN KEY'
       ORDER BY kcu.constraint_name, kcu.ordinal_position`,
      [schema, table.name]
    );

    return result.rows.map((row) => ({
      id: crypto.randomUUID(),
      columnId: '', // Will be resolved in ERDataBuilder
      referencedTableId: '', // Will be resolved in ERDataBuilder
      referencedColumnId: '', // Will be resolved in ERDataBuilder
      constraintName: row.constraint_name,
      // Store raw data for resolution
      _columnName: row.column_name,
      _referencedTableName: row.referenced_table_name,
      _referencedColumnName: row.referenced_column_name,
    })) as any[];
  }

  async getTableDDL(table: TableRef): Promise<string> {
    if (!this.client || !this.connectionConfig) {
      throw new Error('Database not connected');
    }

    const schema = table.schema || 'public';

    try {
      // Use pg_dump to get DDL
      return await this.pgDumpExecutor.executePgDump(this.connectionConfig, schema, table.name);
    } catch (error) {
      console.error(`Failed to get DDL for table ${schema}.${table.name}:`, error);
      return ''; // Return empty string if DDL cannot be obtained
    }
  }
}
