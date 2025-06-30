// Entity clustering and positioning engine
export class ClusteringEngine {
  constructor(erData) {
    this.erData = erData;
    this.relationshipClusters = null;
  }

  setERData(erData) {
    this.erData = erData;
    this.relationshipClusters = null; // Reset clusters when data changes
  }

  calculateClusteredPosition(entity, index) {
    // If this is the initial load and all entities are at default position, apply clustering
    if (this.shouldApplyInitialClustering()) {
      return this.getInitialClusteredPosition(entity, index);
    }

    // Fallback to grid layout for single entities
    return { x: 50 + (index % 4) * 200, y: 50 + Math.floor(index / 4) * 150 };
  }

  shouldApplyInitialClustering() {
    if (!this.erData || !this.erData.entities) return false;

    // Always apply clustering on initial reverse engineering
    return true;
  }

  getInitialClusteredPosition(entity, index) {
    if (!this.relationshipClusters) {
      this.relationshipClusters = this.buildRelationshipClusters();
    }

    const cluster = this.findEntityCluster(entity.name);
    return this.calculateClusterPosition(cluster, entity.name);
  }

  buildRelationshipClusters() {
    const clusters = [];
    const processedEntities = new Set();

    // Build connected components based on relationships
    this.erData.entities.forEach((entity) => {
      if (processedEntities.has(entity.name)) return;

      const cluster = this.findConnectedEntities(entity.name, processedEntities);
      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    });

    // Sort clusters by size (larger clusters get better positions)
    clusters.sort((a, b) => b.length - a.length);

    return clusters;
  }

  findConnectedEntities(startEntity, processedEntities, visited = new Set()) {
    if (visited.has(startEntity) || processedEntities.has(startEntity)) {
      return [];
    }

    visited.add(startEntity);
    processedEntities.add(startEntity);

    const cluster = [startEntity];

    // Find all directly connected entities
    const relationships = this.erData.relationships || [];
    const connectedEntities = new Set();

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

  findEntityCluster(entityName) {
    if (!this.relationshipClusters) return null;

    for (let i = 0; i < this.relationshipClusters.length; i++) {
      if (this.relationshipClusters[i].includes(entityName)) {
        return { index: i, entities: this.relationshipClusters[i] };
      }
    }

    return null;
  }

  calculateClusterPosition(cluster, entityName) {
    if (!cluster) {
      // Single entity with no relationships - place in available space
      return this.findAvailableSpace();
    }

    const clusterIndex = cluster.index;
    const entityIndex = cluster.entities.indexOf(entityName);

    // Calculate cluster base position
    const clustersPerRow = 2;
    const clusterSpacing = { x: 600, y: 400 };
    const baseX = 100 + (clusterIndex % clustersPerRow) * clusterSpacing.x;
    const baseY = 100 + Math.floor(clusterIndex / clustersPerRow) * clusterSpacing.y;

    // Arrange entities within cluster using force-directed approach
    return this.calculateEntityPositionInCluster(cluster.entities, entityName, baseX, baseY);
  }

  calculateEntityPositionInCluster(clusterEntities, entityName, baseX, baseY) {
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

  getSmallClusterPosition(entityIndex, clusterSize, baseX, baseY) {
    const spacing = 220; // Space between entities

    switch (clusterSize) {
      case 2:
        return entityIndex === 0 ? { x: baseX, y: baseY } : { x: baseX + spacing, y: baseY };

      case 3:
        const trianglePositions = [
          { x: baseX, y: baseY },
          { x: baseX + spacing, y: baseY },
          { x: baseX + spacing / 2, y: baseY + spacing * 0.866 },
        ];
        return trianglePositions[entityIndex];

      case 4:
        const squarePositions = [
          { x: baseX, y: baseY },
          { x: baseX + spacing, y: baseY },
          { x: baseX, y: baseY + spacing },
          { x: baseX + spacing, y: baseY + spacing },
        ];
        return squarePositions[entityIndex];

      default:
        return { x: baseX, y: baseY };
    }
  }

  getCircularClusterPosition(entityIndex, clusterSize, baseX, baseY) {
    // Use force-directed layout instead of circular
    return this.getForceDirectedPosition(entityIndex, clusterSize, baseX, baseY);
  }

  getForceDirectedPosition(entityIndex, clusterSize, baseX, baseY) {
    const positions = this.calculateForceDirectedLayout(clusterSize, baseX, baseY);
    return positions[entityIndex] || { x: baseX, y: baseY };
  }

  calculateForceDirectedLayout(clusterSize, baseX, baseY) {
    const positions = [];
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
          if (i === j) continue;

          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
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
        const toCenterX = centerX - positions[i].x;
        const toCenterY = centerY - positions[i].y;
        const centerDistance = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);

        if (centerDistance > minSpacing * 3) {
          forceX += toCenterX * 0.005; // Reduced attraction
          forceY += toCenterY * 0.005;
        }

        // Apply forces with damping
        positions[i].x += forceX * 0.8;
        positions[i].y += forceY * 0.8;
      }
    }

    return positions;
  }

  findAvailableSpace() {
    // Simple algorithm to find space not occupied by other entities
    const occupiedSpaces = new Set();

    if (this.erData && this.erData.entities) {
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
