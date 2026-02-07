import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ConnectionConfig } from '../DatabaseAdapter.js';

const execFileAsync = promisify(execFile);

/**
 * Execute pg_dump to get DDL for a specific table
 * This module is designed to be mockable for testing
 */
export class PgDumpExecutor {
  /**
   * Execute pg_dump to get DDL for a specific table
   * @param config Database connection configuration
   * @param schema Schema name (e.g., 'public')
   * @param table Table name
   * @returns DDL string
   * @throws Error if pg_dump is not available or execution fails
   */
  async executePgDump(config: ConnectionConfig, schema: string, table: string): Promise<string> {
    try {
      const args = [
        '--schema-only',
        '--no-owner',
        '--no-privileges',
        `--host=${config.host}`,
        `--port=${config.port}`,
        `--username=${config.user}`,
        `--dbname=${config.database}`,
        `--table=${schema}.${table}`,
      ];

      const env = { ...process.env, PGPASSWORD: config.password };
      const { stdout } = await execFileAsync('pg_dump', args, { env });
      return stdout;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error('pg_dump command not found. Please install PostgreSQL client tools.');
      }
      console.error(`Failed to execute pg_dump for ${schema}.${table}:`, error);
      throw error;
    }
  }
}
