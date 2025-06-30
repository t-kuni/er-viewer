import { ERData, Entity, Relationship, Position, Bounds } from '../types/index.js';
export interface ConnectionBounds extends Bounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
    centerX: number;
    centerY: number;
}
interface ConnectionEndpoints {
    from: Position;
    to: Position;
}
export declare class ConnectionPoints {
    private erData;
    private coordinateTransform;
    constructor(erData?: ERData);
    setERData(erData: ERData): void;
    findOptimalConnectionPoints(fromBounds: ConnectionBounds, toBounds: ConnectionBounds, relationship?: Relationship): ConnectionEndpoints;
    private getColumnConnectionPoints;
    private getColumnPosition;
    private getColumnConnectionPoint;
    private getEntityConnectionPoints;
    private getEntityEdgePoints;
    getAllEntityBounds(entities?: Entity[]): ConnectionBounds[];
    getEntityBounds(entity: Entity): ConnectionBounds;
}
export {};
//# sourceMappingURL=connection-points.d.ts.map