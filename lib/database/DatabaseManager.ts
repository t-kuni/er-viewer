import type { components } from '../generated/api-types.js';
import type { DatabaseAdapter, ConnectionConfig } from './adapters/DatabaseAdapter.js';
import { DatabaseAdapterFactory, type DatabaseType } from './DatabaseAdapterFactory.js';
import { ERDataBuilder } from './ERDataBuilder.js';

// Generated types from TypeSpec
type ERData = components['schemas']['ERData'];
type DataSourceRef = components['schemas']['DataSourceRef'];

interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema?: string;
}

/**
 * DatabaseManager (Facade)
 * 
 * Orchestrates database operations using DatabaseAdapter and ERDataBuilder.
 * This class provides a simple interface for database connection and ER data generation.
 */
class DatabaseManager {
  private adapter: DatabaseAdapter | null = null;
  private config: DatabaseConfig | null = null;

  constructor() {
    console.log('DatabaseManager constructor called');
    console.log('DatabaseManager constructor completed');
  }

  /**
   * Connect to database
   * 
   * @param config Database connection configuration
   */
  async connect(config?: Partial<DatabaseConfig>): Promise<void> {
    console.log('DatabaseManager.connect() called');
    try {
      // Resolve connection configuration: priority is argument > environment variable > error
      const resolvedConfig: DatabaseConfig = {
        type: config?.type ?? (process.env.DB_TYPE as DatabaseType) ?? (() => { throw new Error('Database type is not specified'); })(),
        host: config?.host ?? process.env.DB_HOST ?? (() => { throw new Error('Database host is not specified'); })(),
        port: config?.port ?? (process.env.DB_PORT ? parseInt(process.env.DB_PORT) : (() => { throw new Error('Database port is not specified'); })()),
        user: config?.user ?? process.env.DB_USER ?? (() => { throw new Error('Database user is not specified'); })(),
        password: config?.password ?? process.env.DB_PASSWORD ?? (() => { throw new Error('Database password is not specified'); })(),
        database: config?.database ?? process.env.DB_NAME ?? (() => { throw new Error('Database name is not specified'); })(),
        schema: config?.schema ?? process.env.DB_SCHEMA,
      };
      console.log('Database config prepared:', { ...resolvedConfig, password: '***' });

      // Create adapter
      this.adapter = DatabaseAdapterFactory.createAdapter(resolvedConfig.type);
      
      // Connect to database
      const connectionConfig: ConnectionConfig = {
        host: resolvedConfig.host,
        port: resolvedConfig.port,
        user: resolvedConfig.user,
        password: resolvedConfig.password,
        database: resolvedConfig.database,
        schema: resolvedConfig.schema,
      };
      
      await this.adapter.connect(connectionConfig);
      this.config = resolvedConfig;
      
      console.log('Connected to database successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
      this.config = null;
    }
  }

  /**
   * Generate ER data from connected database
   * 
   * @returns ERData
   * @throws Error if database is not connected
   */
  async generateERData(): Promise<ERData> {
    if (!this.adapter || !this.config) {
      throw new Error('Database not connected');
    }

    // Build DataSourceRef
    const source: DataSourceRef = {
      dialect: this.config.type,
      database: this.config.database,
      schema: this.config.schema,
    };

    // Delegate to ERDataBuilder
    const builder = new ERDataBuilder();
    return builder.buildERData(this.adapter, source);
  }
}

export default DatabaseManager;
export type { DatabaseConfig };
