import type { DatabaseAdapter } from './adapters/DatabaseAdapter.js';
import { MySqlAdapter } from './adapters/mysql/MySqlAdapter.js';
import { PostgresAdapter } from './adapters/postgres/PostgresAdapter.js';

export type DatabaseType = 'mysql' | 'postgresql';

/**
 * DatabaseAdapterFactory
 * 
 * Factory for creating DatabaseAdapter instances based on database type.
 */
export class DatabaseAdapterFactory {
  /**
   * Create a DatabaseAdapter instance
   * 
   * @param type Database type ('mysql' | 'postgresql')
   * @returns DatabaseAdapter instance
   * @throws Error if database type is not supported
   */
  static createAdapter(type: DatabaseType): DatabaseAdapter {
    switch (type) {
      case 'mysql':
        return new MySqlAdapter();
      case 'postgresql':
        return new PostgresAdapter();
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
}
