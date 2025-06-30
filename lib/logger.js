const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.serverLogFile = path.join(this.logsDir, 'server.log');
    this.clientLogFile = path.join(this.logsDir, 'client.log');
    this.errorLogFile = path.join(this.logsDir, 'error.log');

    this.ensureLogsDir();
  }

  async ensureLogsDir() {
    try {
      await fs.access(this.logsDir);
    } catch {
      await fs.mkdir(this.logsDir, { recursive: true });
    }
  }

  formatLogEntry(level, message, extra = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...extra,
    };
    return JSON.stringify(logEntry) + '\n';
  }

  async writeToFile(filePath, logEntry) {
    try {
      await fs.appendFile(filePath, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async logServer(level, message, extra = {}) {
    const logEntry = this.formatLogEntry(level, message, { source: 'server', ...extra });
    await this.writeToFile(this.serverLogFile, logEntry);

    // Also log errors to error.log
    if (level === 'error') {
      await this.writeToFile(this.errorLogFile, logEntry);
    }
  }

  async logClient(level, message, extra = {}) {
    const logEntry = this.formatLogEntry(level, message, { source: 'client', ...extra });
    await this.writeToFile(this.clientLogFile, logEntry);

    // Also log errors to error.log
    if (level === 'error') {
      await this.writeToFile(this.errorLogFile, logEntry);
    }
  }

  async info(message, extra = {}) {
    console.log(`[INFO] ${message}`);
    await this.logServer('info', message, extra);
  }

  async warn(message, extra = {}) {
    console.warn(`[WARN] ${message}`);
    await this.logServer('warn', message, extra);
  }

  async error(message, error = null, extra = {}) {
    console.error(`[ERROR] ${message}`, error);
    const logExtra = { ...extra };
    if (error) {
      logExtra.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }
    await this.logServer('error', message, logExtra);
  }

  async readLogFile(filePath, lines = 100) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const logLines = data
        .trim()
        .split('\n')
        .filter((line) => line);
      return logLines.slice(-lines).map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { timestamp: new Date().toISOString(), level: 'info', message: line };
        }
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async getServerLogs(lines = 100) {
    return this.readLogFile(this.serverLogFile, lines);
  }

  async getClientLogs(lines = 100) {
    return this.readLogFile(this.clientLogFile, lines);
  }

  async getErrorLogs(lines = 100) {
    return this.readLogFile(this.errorLogFile, lines);
  }

  async getAllLogs(lines = 100) {
    const [serverLogs, clientLogs] = await Promise.all([this.getServerLogs(lines), this.getClientLogs(lines)]);

    return [...serverLogs, ...clientLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).slice(-lines);
  }
}

module.exports = Logger;
