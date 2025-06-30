export type LogLevel = 'info' | 'warn' | 'error';
interface ErrorInfo {
    stack?: string;
    line?: number;
    lineno?: number;
    column?: number;
    colno?: number;
    filename?: string;
}
declare class ClientLogger {
    static sendLog(level: LogLevel, message: string, error?: ErrorInfo | null): void;
    static info(message: string): void;
    static warn(message: string): void;
    static error(message: string, error?: Error | ErrorInfo | null): void;
}
export default ClientLogger;
//# sourceMappingURL=client-logger.d.ts.map