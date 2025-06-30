import type { LogEntry } from '../types/index';

// Log level type
export type LogLevel = 'info' | 'warn' | 'error';

// Extended log data interface
interface LogData extends Omit<LogEntry, 'level'> {
  level: LogLevel;
  filename?: string;
}

// Error object interface for type safety
interface ErrorInfo {
  stack?: string;
  line?: number;
  lineno?: number;
  column?: number;
  colno?: number;
  filename?: string;
}

// Client-side logging system
class ClientLogger {
  static sendLog(level: LogLevel, message: string, error: ErrorInfo | null = null): void {
    const logData: LogData = {
      level,
      message,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    if (error?.stack) {
      logData.stack = error.stack;
      logData.line = error.line || error.lineno;
      logData.column = error.column || error.colno;
      if (error.filename) {
        logData.filename = error.filename;
      }
    }

    fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    }).catch((err: unknown) => console.warn('Failed to send log to server:', err));
  }

  static info(message: string): void {
    console.log(message);
    this.sendLog('info', message);
  }

  static warn(message: string): void {
    console.warn(message);
    this.sendLog('warn', message);
  }

  static error(message: string, error: Error | ErrorInfo | null = null): void {
    console.error(message, error);
    this.sendLog('error', message, error);
  }
}

// Override console methods to capture all logs
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function (...args: unknown[]): void {
  originalLog.apply(console, args);
  ClientLogger.sendLog('info', args.join(' '));
};

console.warn = function (...args: unknown[]): void {
  originalWarn.apply(console, args);
  ClientLogger.sendLog('warn', args.join(' '));
};

console.error = function (...args: unknown[]): void {
  originalError.apply(console, args);
  ClientLogger.sendLog('error', args.join(' '));
};

// Global error handler
window.addEventListener('error', (event: ErrorEvent) => {
  const errorInfo: ErrorInfo = {
    stack: event.error ? event.error.stack : '',
    line: event.lineno,
    column: event.colno,
    filename: event.filename,
  };
  ClientLogger.sendLog('error', `${event.message}`, errorInfo);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const errorInfo: ErrorInfo = {
    stack: event.reason?.stack ? event.reason.stack : '',
  };
  ClientLogger.sendLog('error', `Unhandled promise rejection: ${event.reason}`, errorInfo);
});

export default ClientLogger;
