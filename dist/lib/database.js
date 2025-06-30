"use strict";
const mysql = require('mysql2/promise');
class DatabaseManager {
    constructor() {
        this.connection = null;
    }
    async connect() {
        try {
            this.connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || 'password',
                database: process.env.DB_NAME || 'test',
            });
            console.log('Connected to MySQL database');
        }
        catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }
    async getTables() {
        const [rows] = await this.connection.execute('SHOW TABLES');
        return rows.map((row) => Object.values(row)[0]);
    }
    async getTableColumns(tableName) {
        const [rows] = await this.connection.execute(`SHOW COLUMNS FROM \`${tableName.replace(/`/g, '``')}\``);
        return rows.map((row) => ({
            name: row.Field,
            type: row.Type,
            nullable: row.Null === 'YES',
            key: row.Key,
            default: row.Default,
            extra: row.Extra,
        }));
    }
    async getForeignKeys(tableName) {
        const [rows] = await this.connection.execute(`
            SELECT 
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME,
                CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = ? 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [process.env.DB_NAME || 'test', tableName]);
        return rows.map((row) => ({
            column: row.COLUMN_NAME,
            referencedTable: row.REFERENCED_TABLE_NAME,
            referencedColumn: row.REFERENCED_COLUMN_NAME,
            constraintName: row.CONSTRAINT_NAME,
        }));
    }
    async getTableDDL(tableName) {
        const [rows] = await this.connection.execute(`SHOW CREATE TABLE \`${tableName.replace(/`/g, '``')}\``);
        return rows[0]['Create Table'];
    }
    async generateERData() {
        const tables = await this.getTables();
        const erData = {
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
module.exports = DatabaseManager;
//# sourceMappingURL=database.js.map