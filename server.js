import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import DatabaseManager from './lib/database.js';
import StorageManager from './lib/storage.js';
import Logger from './lib/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from dist/public for TypeScript compiled files
app.use('/js', express.static(path.join(__dirname, 'dist/public/js')));
// Serve other static files from public directory
app.use(express.static('public'));

const dbManager = new DatabaseManager();
const storageManager = new StorageManager();
const logger = new Logger();

app.get('/api/er-data', async (req, res) => {
  try {
    await logger.info('Loading ER data requested');
    const erData = await storageManager.loadERData();
    if (erData) {
      // Merge with layout data to ensure positions are preserved
      const layoutData = await storageManager.loadLayoutData();
      const mergedData = await storageManager.mergeERDataWithLayout(erData, layoutData);
      await logger.info('ER data loaded and merged with layout successfully');
      res.json(mergedData);
    } else {
      await logger.warn('No ER data found');
      res.status(404).json({ error: 'No ER data found' });
    }
  } catch (error) {
    await logger.error('Error loading ER data', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/reverse-engineer', async (req, res) => {
  try {
    await logger.info('Starting reverse engineering process');
    await dbManager.connect();
    const newERData = await dbManager.generateERData();
    const mergedData = await storageManager.performIncrementalUpdate(newERData);
    await dbManager.disconnect();
    await logger.info('Reverse engineering completed successfully');

    res.json(mergedData);
  } catch (error) {
    await logger.error('Error during reverse engineering', error);
    res.status(500).json({ error: 'Failed to reverse engineer database' });
  }
});

app.post('/api/layout', async (req, res) => {
  try {
    const layoutData = req.body;
    await storageManager.saveLayoutData(layoutData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving layout data:', error);
    res.status(500).json({ error: 'Failed to save layout data' });
  }
});

app.get('/api/layout', async (req, res) => {
  try {
    const layoutData = await storageManager.loadLayoutData();
    res.json(layoutData);
  } catch (error) {
    console.error('Error loading layout data:', error);
    res.status(500).json({ error: 'Failed to load layout data' });
  }
});

app.get('/api/table/:tableName/ddl', async (req, res) => {
  try {
    await dbManager.connect();
    const ddl = await dbManager.getTableDDL(req.params.tableName);
    await dbManager.disconnect();
    res.json({ ddl });
  } catch (error) {
    console.error('Error getting table DDL:', error);
    res.status(500).json({ error: 'Failed to get table DDL' });
  }
});

app.get('/api/build-info', async (req, res) => {
  try {
    const fs = await import('fs');
    const buildInfoPath = path.join(__dirname, 'build-info.json');

    if (fs.existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      res.json(buildInfo);
    } else {
      // Fallback build info if file doesn't exist
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
      res.json({
        version: packageJson.version,
        name: packageJson.name,
        buildTime: 'unknown',
        buildDate: 'ビルド情報なし',
        git: {
          commit: 'unknown',
          commitShort: 'unknown',
          branch: 'unknown',
          tag: null,
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      });
    }
  } catch (error) {
    console.error('Error getting build info:', error);
    res.status(500).json({ error: 'Failed to get build info' });
  }
});

// Client-side log collection endpoint
app.post('/api/logs', async (req, res) => {
  const { level, message, timestamp, url, line, column, stack, userAgent } = req.body;

  const logExtra = {
    url,
    line,
    column,
    stack,
    userAgent,
    ip: req.ip || req.connection.remoteAddress,
  };

  // Format log output based on level
  const logMessage = `[CLIENT ${level.toUpperCase()}] ${message}`;
  const details = url ? ` (${url}:${line}:${column})` : '';

  switch (level) {
    case 'error':
      console.error(`${logMessage}${details}`);
      if (stack) console.error('Stack:', stack);
      await logger.logClient('error', message, logExtra);
      break;
    case 'warn':
      console.warn(`${logMessage}${details}`);
      await logger.logClient('warn', message, logExtra);
      break;
    case 'info':
      console.info(`${logMessage}${details}`);
      await logger.logClient('info', message, logExtra);
      break;
    default:
      console.log(`${logMessage}${details}`);
      await logger.logClient('info', message, logExtra);
  }

  res.json({ success: true });
});

// Log file access endpoints
app.get('/api/logs/server', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    const logs = await logger.getServerLogs(lines);
    res.json({ logs, type: 'server' });
  } catch (error) {
    console.error('Error reading server logs:', error);
    res.status(500).json({ error: 'Failed to read server logs' });
  }
});

app.get('/api/logs/client', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    const logs = await logger.getClientLogs(lines);
    res.json({ logs, type: 'client' });
  } catch (error) {
    console.error('Error reading client logs:', error);
    res.status(500).json({ error: 'Failed to read client logs' });
  }
});

app.get('/api/logs/error', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    const logs = await logger.getErrorLogs(lines);
    res.json({ logs, type: 'error' });
  } catch (error) {
    console.error('Error reading error logs:', error);
    res.status(500).json({ error: 'Failed to read error logs' });
  }
});

app.get('/api/logs/all', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    const logs = await logger.getAllLogs(lines);
    res.json({ logs, type: 'all' });
  } catch (error) {
    console.error('Error reading all logs:', error);
    res.status(500).json({ error: 'Failed to read all logs' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, async () => {
  await logger.info(`ER Viewer server running on port ${port}`);

  // Setup livereload in development mode
  if (process.env.NODE_ENV === 'development') {
    try {
      const livereloadModule = await import('livereload');
      const chokidarModule = await import('chokidar');
      const livereload = livereloadModule.default;
      const chokidar = chokidarModule.default;

      const liveReloadServer = livereload.createServer({
        port: 35729,
        host: '0.0.0.0',
        exts: ['html', 'css', 'js'],
        applyJSLive: true,
        applyCSSLive: true,
      });

      // Watch public directory for changes
      liveReloadServer.watch(path.join(__dirname, 'public'));

      // Watch lib directory for server-side changes
      const watcher = chokidar.watch([path.join(__dirname, 'lib'), path.join(__dirname, 'public')], {
        ignored: /node_modules/,
        persistent: true,
      });

      watcher.on('change', (filePath) => {
        console.log(`File changed: ${filePath}`);
        liveReloadServer.refresh(filePath);
      });

      await logger.info('LiveReload server running on port 35729');
    } catch (error) {
      console.warn('LiveReload setup failed:', error.message);
    }
  }
});
