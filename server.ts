import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';

import DatabaseManager from './lib/database';
import { createGetBuildInfoUsecase } from './lib/usecases/GetBuildInfoUsecase';
import { createReverseEngineerUsecase } from './lib/usecases/ReverseEngineerUsecase';
import { createGetInitialViewModelUsecase } from './lib/usecases/GetInitialViewModelUsecase';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port: number = parseInt(process.env.PORT || '30033', 10);

app.use(cors());
app.use(express.json());

// Serve static files from dist/public for TypeScript compiled files
app.use('/js', express.static(path.join(__dirname, 'dist/public/js')));
// Serve other static files from public directory
app.use(express.static('public'));

const dbManager = new DatabaseManager();

// GetBuildInfoUsecaseの依存性注入
const getBuildInfoUsecase = createGetBuildInfoUsecase({
  existsSync: fs.existsSync,
  readFileSync: (path: string, encoding: BufferEncoding) => fs.readFileSync(path, encoding),
  rootDir: __dirname,
  processVersion: process.version,
  processPlatform: process.platform,
  processArch: process.arch,
});

// GetInitialViewModelUsecaseの依存性注入
const getInitialViewModelUsecase = createGetInitialViewModelUsecase({
  getBuildInfo: getBuildInfoUsecase,
});

// ReverseEngineerUsecaseの依存性注入
const reverseEngineerUsecase = createReverseEngineerUsecase({
  createDatabaseManager: () => new DatabaseManager(),
});

// GET /api/init - 初期ViewModelを返却
app.get('/api/init', async (_req: Request, res: Response) => {
  try {
    const viewModel = getInitialViewModelUsecase();
    res.json(viewModel);
  } catch (error) {
    console.error('Error getting initial ViewModel:', error);
    res.status(500).json({ error: 'Failed to get initial ViewModel' });
  }
});

// POST /api/reverse-engineer - ReverseEngineerRequestを受け取り、ReverseEngineerResponseを返却
app.post('/api/reverse-engineer', async (req: Request, res: Response) => {
  try {
    const request = req.body; // ReverseEngineerRequest型
    const response = await reverseEngineerUsecase(request);
    res.json(response);
  } catch (error) {
    console.error('Error during reverse engineering:', error);
    res.status(500).json({ error: 'Failed to reverse engineer database' });
  }
});



app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, async () => {
  console.log(`ER Viewer server running on port ${port}`);

  // Setup livereload in development mode
  if (process.env.NODE_ENV === 'development') {
    try {
      const livereloadModule = await import('livereload');
      const chokidarModule = await import('chokidar');
      const livereload = livereloadModule.default;
      const chokidar = chokidarModule.default;

      const liveReloadServer = livereload.createServer({
        port: 35729,
        exts: ['html', 'css', 'js'],
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

      console.log('LiveReload server running on port 35729');
    } catch (error) {
      console.warn('LiveReload setup failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
});
