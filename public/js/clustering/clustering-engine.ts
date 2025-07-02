import { ERData, Entity, Position } from '../types/index.js';

// Type definitions for clustering
interface RelationshipCluster {
  index: number;
  entities: string[];
}

// Entity clustering and positioning engine
export class ClusteringEngine {
  private erData: ERData | null;
  private relationshipClusters: string[][] | null;

  constructor(erData: ERData | null = null) {
    this.erData = erData;
    this.relationshipClusters = null;
  }

  setERData(erData: ERData): void {
    this.erData = erData;
    this.relationshipClusters = null; // Reset clusters when data changes
  }

  calculateClusteredPosition(entity: Entity, index: number): Position {
    // If this is the initial load and all entities are at default position, apply clustering
    if (this.shouldApplyInitialClustering()) {
      return this.getInitialClusteredPosition(entity);
    }

    // Fallback to grid layout for single entities
    return { x: 50 + (index % 4) * 200, y: 50 + Math.floor(index / 4) * 150 };
  }

  private shouldApplyInitialClustering(): boolean {
    if (!this.erData?.entities) {
      return false;
    }

    // Always apply clustering on initial reverse engineering
    return true;
  }

  private getInitialClusteredPosition(entity: Entity): Position {
    if (!this.relationshipClusters) {
      this.relationshipClusters = this.buildRelationshipClusters();
    }

    const cluster = this.findEntityCluster(entity.name);
    return this.calculateClusterPosition(cluster, entity.name);
  }

  private buildRelationshipClusters(): string[][] {
    const clusters: string[][] = [];
    const processedEntities = new Set<string>();

    if (!this.erData) {
      return clusters;
    }

    // Build connected components based on relationships
    this.erData.entities.forEach((entity) => {
      if (processedEntities.has(entity.name)) {
        return;
      }

      const cluster = this.findConnectedEntities(entity.name, processedEntities);
      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    });

    // Sort clusters by size (larger clusters get better positions)
    clusters.sort((a, b) => b.length - a.length);

    return clusters;
  }

  private findConnectedEntities(
    startEntity: string,
    processedEntities: Set<string>,
    visited: Set<string> = new Set(),
  ): string[] {
    if (visited.has(startEntity) || processedEntities.has(startEntity)) {
      return [];
    }

    visited.add(startEntity);
    processedEntities.add(startEntity);

    const cluster: string[] = [startEntity];

    // Find all directly connected entities
    const relationships = this.erData?.relationships || [];
    const connectedEntities = new Set<string>();

    relationships.forEach((rel) => {
      if (rel.from === startEntity && !visited.has(rel.to)) {
        connectedEntities.add(rel.to);
      } else if (rel.to === startEntity && !visited.has(rel.from)) {
        connectedEntities.add(rel.from);
      }
    });

    // Recursively find all entities in this connected component
    connectedEntities.forEach((connectedEntity) => {
      cluster.push(...this.findConnectedEntities(connectedEntity, processedEntities, visited));
    });

    return cluster;
  }

  private findEntityCluster(entityName: string): RelationshipCluster | null {
    if (!this.relationshipClusters) {
      return null;
    }

    for (let i = 0; i < this.relationshipClusters.length; i++) {
      const cluster = this.relationshipClusters[i];
      if (cluster !== null && cluster !== undefined && cluster.includes(entityName)) {
        return { index: i, entities: cluster };
      }
    }

    return null;
  }

  private calculateClusterPosition(cluster: RelationshipCluster | null, entityName: string): Position {
    if (!cluster) {
      // Single entity with no relationships - place in available space
      return this.findAvailableSpace();
    }

    const clusterIndex = cluster.index;

    // Calculate cluster base position
    const clustersPerRow = 2;
    const clusterSpacing = { x: 600, y: 400 };
    const baseX = 100 + (clusterIndex % clustersPerRow) * clusterSpacing.x;
    const baseY = 100 + Math.floor(clusterIndex / clustersPerRow) * clusterSpacing.y;

    // Arrange entities within cluster using force-directed approach
    return this.calculateEntityPositionInCluster(cluster.entities, entityName, baseX, baseY);
  }

  private calculateEntityPositionInCluster(
    clusterEntities: string[],
    entityName: string,
    baseX: number,
    baseY: number,
  ): Position {
    const entityIndex = clusterEntities.indexOf(entityName);

    if (clusterEntities.length === 1) {
      return { x: baseX, y: baseY };
    }

    // For small clusters, use predefined patterns
    if (clusterEntities.length <= 4) {
      return this.getSmallClusterPosition(entityIndex, clusterEntities.length, baseX, baseY);
    }

    // For larger clusters, use circular arrangement
    return this.getCircularClusterPosition(entityIndex, clusterEntities.length, baseX, baseY);
  }

  private getSmallClusterPosition(entityIndex: number, clusterSize: number, baseX: number, baseY: number): Position {
    const spacing = 220; // Space between entities

    switch (clusterSize) {
      case 2:
        return entityIndex === 0 ? { x: baseX, y: baseY } : { x: baseX + spacing, y: baseY };

      case 3: {
        const trianglePositions: Position[] = [
          { x: baseX, y: baseY },
          { x: baseX + spacing, y: baseY },
          { x: baseX + spacing / 2, y: baseY + spacing * 0.866 },
        ];
        return trianglePositions[entityIndex] || { x: baseX, y: baseY };
      }

      case 4: {
        const squarePositions: Position[] = [
          { x: baseX, y: baseY },
          { x: baseX + spacing, y: baseY },
          { x: baseX, y: baseY + spacing },
          { x: baseX + spacing, y: baseY + spacing },
        ];
        return squarePositions[entityIndex] || { x: baseX, y: baseY };
      }

      default:
        return { x: baseX, y: baseY };
    }
  }

  private getCircularClusterPosition(entityIndex: number, clusterSize: number, baseX: number, baseY: number): Position {
    // Use force-directed layout instead of circular
    return this.getForceDirectedPosition(entityIndex, clusterSize, baseX, baseY);
  }

  private getForceDirectedPosition(entityIndex: number, clusterSize: number, baseX: number, baseY: number): Position {
    const positions = this.calculateForceDirectedLayout(clusterSize, baseX, baseY);
    return positions[entityIndex] || { x: baseX, y: baseY };
  }

  private calculateForceDirectedLayout(clusterSize: number, baseX: number, baseY: number): Position[] {
    const positions: Position[] = [];
    const minSpacing = 280; // Increased minimum distance between entities
    const initialSpacing = 320; // Wider initial grid spacing

    // Initialize positions in a wider grid to avoid overlap
    for (let i = 0; i < clusterSize; i++) {
      const cols = Math.ceil(Math.sqrt(clusterSize));
      const row = Math.floor(i / cols);
      const col = i % cols;

      positions.push({
        x: baseX + col * initialSpacing,
        y: baseY + row * initialSpacing,
      });
    }

    // Apply force-directed iterations with stronger repulsion
    for (let iteration = 0; iteration < 100; iteration++) {
      for (let i = 0; i < positions.length; i++) {
        let forceX = 0;
        let forceY = 0;

        // Stronger repulsive force from other entities
        for (let j = 0; j < positions.length; j++) {
          if (i === j) {
            continue;
          }

          const posI = positions[i];
          const posJ = positions[j];
          if (!posI || !posJ) {
            continue;
          }

          const dx = posI.x - posJ.x;
          const dy = posI.y - posJ.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minSpacing) {
            const force = (minSpacing - distance) / Math.max(distance, 1);
            forceX += dx * force * 0.3; // Increased repulsion strength
            forceY += dy * force * 0.3;
          }
        }

        // Weaker attractive force toward cluster center
        const centerX = baseX + (initialSpacing * Math.ceil(Math.sqrt(clusterSize))) / 2;
        const centerY = baseY + (initialSpacing * Math.ceil(Math.sqrt(clusterSize))) / 2;
        const posI = positions[i];
        if (!posI) {
          continue;
        }
        const toCenterX = centerX - posI.x;
        const toCenterY = centerY - posI.y;
        const centerDistance = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);

        if (centerDistance > minSpacing * 3) {
          forceX += toCenterX * 0.005; // Reduced attraction
          forceY += toCenterY * 0.005;
        }

        // Apply forces with damping
        posI.x += forceX * 0.8;
        posI.y += forceY * 0.8;
      }
    }

    return positions;
  }

  private findAvailableSpace(): Position {
    // Simple algorithm to find space not occupied by other entities
    const occupiedSpaces = new Set<string>();

    if (this.erData !== null && this.erData !== undefined && this.erData.entities !== null && this.erData.entities !== undefined && this.erData.entities.length > 0) {
      this.erData.entities.forEach((entity) => {
        if (entity.position) {
          const gridX = Math.floor(entity.position.x / 200);
          const gridY = Math.floor(entity.position.y / 150);
          occupiedSpaces.add(`${gridX},${gridY}`);
        }
      });
    }

    // Find first available grid space
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (!occupiedSpaces.has(`${x},${y}`)) {
          return {
            x: 50 + x * 200,
            y: 50 + y * 150,
          };
        }
      }
    }

    // Fallback to default position
    return { x: 50, y: 50 };
  }
}
