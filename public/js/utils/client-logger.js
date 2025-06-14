// Client-side logging system
class ClientLogger {
    static sendLog(level, message, error = null) {
        const logData = {
            level,
            message,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        if (error && error.stack) {
            logData.stack = error.stack;
            logData.line = error.line || error.lineno;
            logData.column = error.column || error.colno;
        }
        
        fetch('/api/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
        }).catch(err => console.warn('Failed to send log to server:', err));
    }
    
    static info(message) {
        console.log(message);
        this.sendLog('info', message);
    }
    
    static warn(message) {
        console.warn(message);
        this.sendLog('warn', message);
    }
    
    static error(message, error = null) {
        console.error(message, error);
        this.sendLog('error', message, error);
    }
}

// Override console methods to capture all logs
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function(...args) {
    originalLog.apply(console, args);
    ClientLogger.sendLog('info', args.join(' '));
};

console.warn = function(...args) {
    originalWarn.apply(console, args);
    ClientLogger.sendLog('warn', args.join(' '));
};

console.error = function(...args) {
    originalError.apply(console, args);
    ClientLogger.sendLog('error', args.join(' '));
};

// Global error handler
window.addEventListener('error', (event) => {
    ClientLogger.sendLog('error', `${event.message}`, {
        stack: event.error ? event.error.stack : '',
        line: event.lineno,
        column: event.colno,
        filename: event.filename
    });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    ClientLogger.sendLog('error', `Unhandled promise rejection: ${event.reason}`, {
        stack: event.reason && event.reason.stack ? event.reason.stack : ''
    });
});

export default ClientLogger;