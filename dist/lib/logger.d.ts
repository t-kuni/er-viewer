export = Logger;
declare class Logger {
    logsDir: string;
    serverLogFile: string;
    clientLogFile: string;
    errorLogFile: string;
    ensureLogsDir(): Promise<void>;
    formatLogEntry(level: any, message: any, extra?: {}): string;
    writeToFile(filePath: any, logEntry: any): Promise<void>;
    logServer(level: any, message: any, extra?: {}): Promise<void>;
    logClient(level: any, message: any, extra?: {}): Promise<void>;
    info(message: any, extra?: {}): Promise<void>;
    warn(message: any, extra?: {}): Promise<void>;
    error(message: any, error?: null, extra?: {}): Promise<void>;
    readLogFile(filePath: any, lines?: number): Promise<any[]>;
    getServerLogs(lines?: number): Promise<any[]>;
    getClientLogs(lines?: number): Promise<any[]>;
    getErrorLogs(lines?: number): Promise<any[]>;
    getAllLogs(lines?: number): Promise<any[]>;
}
//# sourceMappingURL=logger.d.ts.map