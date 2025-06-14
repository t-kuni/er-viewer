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
        this.erData.entities.forEach(entity => {
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
        
        relationships.forEach(rel => {
            if (rel.from === startEntity && !visited.has(rel.to)) {
                connectedEntities.add(rel.to);
            } else if (rel.to === startEntity && !visited.has(rel.from)) {
                connectedEntities.add(rel.from);
            }
        });
        
        // Recursively find all entities in this connected component
        connectedEntities.forEach(connectedEntity => {
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
                return entityIndex === 0 
                    ? { x: baseX, y: baseY }
                    : { x: baseX + spacing, y: baseY };
            
            case 3:
                const trianglePositions = [
                    { x: baseX, y: baseY },
                    { x: baseX + spacing, y: baseY },
                    { x: baseX + spacing/2, y: baseY + spacing * 0.866 }
                ];
                return trianglePositions[entityIndex];
            
            case 4:
                const squarePositions = [
                    { x: baseX, y: baseY },
                    { x: baseX + spacing, y: baseY },
                    { x: baseX, y: baseY + spacing },
                    { x: baseX + spacing, y: baseY + spacing }
                ];
                return squarePositions[entityIndex];
            
            default:
                return { x: baseX, y: baseY };
        }
    }

    getCircularClusterPosition(entityIndex, clusterSize, baseX, baseY) {
        const radius = Math.max(150, clusterSize * 30);
        const angleStep = (2 * Math.PI) / clusterSize;
        const angle = entityIndex * angleStep;
        
        return {
            x: baseX + radius * Math.cos(angle),
            y: baseY + radius * Math.sin(angle)
        };
    }

    findAvailableSpace() {
        // Simple algorithm to find space not occupied by other entities
        const occupiedSpaces = new Set();
        
        if (this.erData && this.erData.entities) {
            this.erData.entities.forEach(entity => {
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
                        y: 50 + y * 150
                    };
                }
            }
        }
        
        // Fallback to default position
        return { x: 50, y: 50 };
    }
}