import type { components } from '../generated/api-types.js';
import type { DatabaseAdapter, TableRef } from './adapters/DatabaseAdapter.js';

// Generated types from TypeSpec
type ERData = components['schemas']['ERData'];
type Entity = components['schemas']['Entity'];
type Relationship = components['schemas']['Relationship'];
type DataSourceRef = components['schemas']['DataSourceRef'];
type Column = components['schemas']['Column'];

/**
 * ERDataBuilder
 * 
 * Database-agnostic ER data generation logic.
 * Builds ERData from DatabaseAdapter.
 */
export class ERDataBuilder {
  /**
   * Build ERData from DatabaseAdapter
   * 
   * @param adapter DatabaseAdapter instance
   * @param source Data source reference (dialect, database, schema)
   * @returns ERData
   */
  async buildERData(adapter: DatabaseAdapter, source: DataSourceRef): Promise<ERData> {
    // Get table list
    const tables = await adapter.getTables({ schema: source.schema });

    const erData: ERData = {
      source,
      entities: [],
      relationships: [],
    };

    // Map: table name → entity ID
    const tableNameToIdMap = new Map<string, string>();
    // Map: "tableName:columnName" → column ID
    const columnNameToIdMap = new Map<string, string>();

    // Phase 1: Get all table columns and build maps
    const tablesData = new Map<
      string,
      { entityId: string; columns: Column[]; ddl: string }
    >();

    for (const tableInfo of tables) {
      const tableName = tableInfo.name;
      const tableRef: TableRef = {
        name: tableName,
        schema: tableInfo.schema,
      };

      const columns = await adapter.getTableColumns(tableRef);
      const ddl = await adapter.getTableDDL(tableRef);
      const entityId = crypto.randomUUID();

      tableNameToIdMap.set(tableName, entityId);

      // Build column name → ID map
      for (const column of columns) {
        const columnKey = `${tableName}:${column.name}`;
        columnNameToIdMap.set(columnKey, column.id);
      }

      tablesData.set(tableName, { entityId, columns, ddl });
    }

    // Phase 2: Get foreign keys and build Relationships
    const foreignKeyInfoList: Array<{
      tableName: string;
      entityId: string;
      columnName: string;
      referencedTableName: string;
      referencedColumnName: string;
      constraintName: string;
    }> = [];

    for (const tableInfo of tables) {
      const tableName = tableInfo.name;
      const tableRef: TableRef = {
        name: tableName,
        schema: tableInfo.schema,
      };

      const foreignKeys = await adapter.getForeignKeys(tableRef);

      for (const fk of foreignKeys) {
        // Extract raw data from deprecated ForeignKey structure
        const rawFk = fk as any;
        foreignKeyInfoList.push({
          tableName,
          entityId: tableNameToIdMap.get(tableName)!,
          columnName: rawFk._columnName,
          referencedTableName: rawFk._referencedTableName,
          referencedColumnName: rawFk._referencedColumnName,
          constraintName: fk.constraintName,
        });
      }
    }

    // Build Relationships from foreign key info
    for (const fkInfo of foreignKeyInfoList) {
      const fromColumnId = columnNameToIdMap.get(
        `${fkInfo.tableName}:${fkInfo.columnName}`
      );
      const toEntityId = tableNameToIdMap.get(fkInfo.referencedTableName);
      const toColumnId = columnNameToIdMap.get(
        `${fkInfo.referencedTableName}:${fkInfo.referencedColumnName}`
      );

      if (!fromColumnId || !toEntityId || !toColumnId) {
        console.warn(
          `Could not resolve IDs for foreign key: ${fkInfo.tableName}.${fkInfo.columnName} -> ${fkInfo.referencedTableName}.${fkInfo.referencedColumnName}`
        );
        continue;
      }

      erData.relationships.push({
        id: crypto.randomUUID(),
        fromEntityId: fkInfo.entityId,
        fromColumnId,
        toEntityId,
        toColumnId,
        constraintName: fkInfo.constraintName,
      });
    }

    // Phase 3: Derive isForeignKey from Relationships
    const foreignKeyColumnIds = new Set<string>();
    for (const rel of erData.relationships) {
      foreignKeyColumnIds.add(rel.fromColumnId);
    }

    // Update isForeignKey for all columns
    for (const data of tablesData.values()) {
      for (const column of data.columns) {
        if (foreignKeyColumnIds.has(column.id)) {
          column.isForeignKey = true;
        }
      }
    }

    // Phase 4: Build entities
    for (const tableName of tablesData.keys()) {
      const data = tablesData.get(tableName)!;

      erData.entities.push({
        id: data.entityId,
        name: tableName,
        columns: data.columns,
        ddl: data.ddl,
      });
    }

    return erData;
  }
}
