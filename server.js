const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const DatabaseManager = require('./lib/database');
const StorageManager = require('./lib/storage');

// Development hot reload setup
let livereload, chokidar;
if (process.env.NODE_ENV === 'development') {
    livereload = require('livereload');
    chokidar = require('chokidar');
}

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const dbManager = new DatabaseManager();
const storageManager = new StorageManager();

app.get('/api/er-data', async (req, res) => {
    try {
        const erData = await storageManager.loadERData();
        if (erData) {
            res.json(erData);
        } else {
            res.status(404).json({ error: 'No ER data found' });
        }
    } catch (error) {
        console.error('Error loading ER data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/reverse-engineer', async (req, res) => {
    try {
        await dbManager.connect();
        const newERData = await dbManager.generateERData();
        const mergedData = await storageManager.performIncrementalUpdate(newERData);
        await dbManager.disconnect();
        
        res.json(mergedData);
    } catch (error) {
        console.error('Error during reverse engineering:', error);
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

app.get('/api/build-info', (req, res) => {
    try {
        const fs = require('fs');
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
                    tag: null
                },
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            });
        }
    } catch (error) {
        console.error('Error getting build info:', error);
        res.status(500).json({ error: 'Failed to get build info' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`ER Viewer server running on port ${port}`);
    
    // Setup livereload in development mode
    if (process.env.NODE_ENV === 'development') {
        const liveReloadServer = livereload.createServer({
            port: 35729,
            host: '0.0.0.0',
            exts: ['html', 'css', 'js'],
            applyJSLive: true,
            applyCSSLive: true
        });
        
        // Watch public directory for changes
        liveReloadServer.watch(path.join(__dirname, 'public'));
        
        // Watch lib directory for server-side changes
        const watcher = chokidar.watch([
            path.join(__dirname, 'lib'),
            path.join(__dirname, 'public')
        ], {
            ignored: /node_modules/,
            persistent: true
        });
        
        watcher.on('change', (filePath) => {
            console.log(`File changed: ${filePath}`);
            liveReloadServer.refresh(filePath);
        });
        
        console.log('LiveReload server running on port 35729');
    }
});