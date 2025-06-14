const fs = require('fs').promises;
const path = require('path');

class StorageManager {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.erDataFile = path.join(this.dataDir, 'er-data.json');
        this.layoutDataFile = path.join(this.dataDir, 'layout-data.json');
    }

    async ensureDataDir() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }

    async saveERData(erData) {
        await this.ensureDataDir();
        await fs.writeFile(this.erDataFile, JSON.stringify(erData, null, 2));
    }

    async loadERData() {
        try {
            const data = await fs.readFile(this.erDataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    async saveLayoutData(layoutData) {
        await this.ensureDataDir();
        await fs.writeFile(this.layoutDataFile, JSON.stringify(layoutData, null, 2));
    }

    async loadLayoutData() {
        try {
            const data = await fs.readFile(this.layoutDataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    entities: {},
                    rectangles: [],
                    texts: []
                };
            }
            throw error;
        }
    }

    async mergeERDataWithLayout(erData, layoutData) {
        const mergedData = {
            ...erData,
            layout: layoutData
        };

        for (const entity of mergedData.entities) {
            if (layoutData.entities[entity.name]) {
                entity.position = layoutData.entities[entity.name].position;
            } else {
                entity.position = { x: 50, y: 50 };
            }
        }

        return mergedData;
    }

    async performIncrementalUpdate(newERData) {
        const existingERData = await this.loadERData();
        const layoutData = await this.loadLayoutData();

        if (!existingERData) {
            const mergedData = await this.mergeERDataWithLayout(newERData, layoutData);
            await this.saveERData(mergedData);
            return mergedData;
        }

        const updatedLayoutData = { ...layoutData };
        
        for (const newEntity of newERData.entities) {
            const existingEntity = existingERData.entities.find(e => e.name === newEntity.name);
            if (!existingEntity && !updatedLayoutData.entities[newEntity.name]) {
                updatedLayoutData.entities[newEntity.name] = {
                    position: { x: 50, y: 50 }
                };
            }
        }

        const mergedData = await this.mergeERDataWithLayout(newERData, updatedLayoutData);
        await this.saveERData(mergedData);
        await this.saveLayoutData(updatedLayoutData);
        
        return mergedData;
    }
}

module.exports = StorageManager;