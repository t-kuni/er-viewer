import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
          texts: [],
        };
      }
      throw error;
    }
  }

  async mergeERDataWithLayout(erData, layoutData) {
    const mergedData = {
      ...erData,
      layout: layoutData,
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

    // Calculate positions for new entities in the top-left area
    const newEntityNames = [];
    for (const newEntity of newERData.entities) {
      const existingEntity = existingERData.entities.find((e) => e.name === newEntity.name);
      if (!existingEntity && !updatedLayoutData.entities[newEntity.name]) {
        newEntityNames.push(newEntity.name);
      }
    }

    // Position new entities in the top-left clustering area
    newEntityNames.forEach((entityName, index) => {
      updatedLayoutData.entities[entityName] = {
        position: this.calculateNewEntityPosition(index, updatedLayoutData),
      };
    });

    const mergedData = await this.mergeERDataWithLayout(newERData, updatedLayoutData);
    await this.saveERData(mergedData);
    await this.saveLayoutData(updatedLayoutData);

    return mergedData;
  }

  calculateNewEntityPosition(index, layoutData) {
    // Define the top-left clustering area
    const newEntityArea = {
      startX: 50,
      startY: 50,
      maxWidth: 400,
      entityWidth: 180,
      entityHeight: 120, // Approximate entity height
      spacing: 20,
    };

    // Calculate grid position within the new entity area
    const entitiesPerRow = Math.floor(newEntityArea.maxWidth / (newEntityArea.entityWidth + newEntityArea.spacing));
    const row = Math.floor(index / entitiesPerRow);
    const col = index % entitiesPerRow;

    const x = newEntityArea.startX + col * (newEntityArea.entityWidth + newEntityArea.spacing);
    const y = newEntityArea.startY + row * (newEntityArea.entityHeight + newEntityArea.spacing);

    // Check for collisions with existing entities and adjust if necessary
    return this.adjustPositionForCollisions({ x, y }, layoutData);
  }

  adjustPositionForCollisions(proposedPosition, layoutData) {
    const entityWidth = 180;
    const entityHeight = 120;
    const buffer = 20;

    const existingPositions = Object.values(layoutData.entities)
      .map((entity) => entity.position)
      .filter((pos) => pos && pos.x !== undefined && pos.y !== undefined);

    // Check if the proposed position overlaps with any existing entity
    const isColliding = existingPositions.some((existingPos) => {
      return (
        proposedPosition.x < existingPos.x + entityWidth + buffer &&
        proposedPosition.x + entityWidth + buffer > existingPos.x &&
        proposedPosition.y < existingPos.y + entityHeight + buffer &&
        proposedPosition.y + entityHeight + buffer > existingPos.y
      );
    });

    if (!isColliding) {
      return proposedPosition;
    }

    // If colliding, try to find an alternative position in the clustering area
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const offsetX = (attempt % 4) * (entityWidth + buffer);
      const offsetY = Math.floor(attempt / 4) * (entityHeight + buffer);

      const alternativePosition = {
        x: proposedPosition.x + offsetX,
        y: proposedPosition.y + offsetY,
      };

      const stillColliding = existingPositions.some((existingPos) => {
        return (
          alternativePosition.x < existingPos.x + entityWidth + buffer &&
          alternativePosition.x + entityWidth + buffer > existingPos.x &&
          alternativePosition.y < existingPos.y + entityHeight + buffer &&
          alternativePosition.y + entityHeight + buffer > existingPos.y
        );
      });

      if (!stillColliding) {
        return alternativePosition;
      }
    }

    // Fallback: place further away if no suitable position found
    return {
      x: proposedPosition.x + 600,
      y: proposedPosition.y,
    };
  }
}

export default StorageManager;
