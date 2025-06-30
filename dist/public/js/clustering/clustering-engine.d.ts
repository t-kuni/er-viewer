import { ERData, Entity, Position } from '../types/index.js';
export declare class ClusteringEngine {
    private erData;
    private relationshipClusters;
    constructor(erData?: ERData | null);
    setERData(erData: ERData): void;
    calculateClusteredPosition(entity: Entity, index: number): Position;
    private shouldApplyInitialClustering;
    private getInitialClusteredPosition;
    private buildRelationshipClusters;
    private findConnectedEntities;
    private findEntityCluster;
    private calculateClusterPosition;
    private calculateEntityPositionInCluster;
    private getSmallClusterPosition;
    private getCircularClusterPosition;
    private getForceDirectedPosition;
    private calculateForceDirectedLayout;
    private findAvailableSpace;
}
//# sourceMappingURL=clustering-engine.d.ts.map