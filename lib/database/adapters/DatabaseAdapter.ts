import type { components } from '../../generated/api-types.js';

// Generated types from TypeSpec
export type Column = components['schemas']['Column'];
export type ForeignKey = components['schemas']['ForeignKey'];
export type Relationship = components['schemas']['Relationship'];

// Connection configuration
export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema?: string; // For PostgreSQL, Oracle, etc.
}

// Table reference
export interface TableRef {
  name: string;
  schema?: string;
}

// Database adapter interface
export interface DatabaseAdapter {
  readonly type: 'mysql' | 'postgresql';

  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;

  // Schema information retrieval
  getTables(params?: { schema?: string }): Promise<Array<{ name: string; schema?: string }>>;
  getTableColumns(table: TableRef): Promise<Column[]>;
  
  // Deprecated: Foreign keys should be derived from Relationships
  // This method is kept for backward compatibility during migration
  getForeignKeys(table: TableRef): Promise<ForeignKey[]>;
  
  getTableDDL(table: TableRef): Promise<string>;
}
