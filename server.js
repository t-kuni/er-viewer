const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const DatabaseManager = require('./lib/database');
const StorageManager = require('./lib/storage');

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`ER Viewer server running on port ${port}`);
});