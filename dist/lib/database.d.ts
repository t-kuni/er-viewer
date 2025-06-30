export = DatabaseManager;
declare class DatabaseManager {
    connection: mysql.Connection | null;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getTables(): Promise<any>;
    getTableColumns(tableName: any): Promise<any>;
    getForeignKeys(tableName: any): Promise<any>;
    getTableDDL(tableName: any): Promise<any>;
    generateERData(): Promise<{
        entities: never[];
        relationships: never[];
    }>;
}
import mysql = require("mysql2/promise");
//# sourceMappingURL=database.d.ts.map