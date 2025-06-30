import { Position } from '../types/index';
import type { ConnectionBounds } from './connection-points';
export declare class SmartRouting {
    private entityBounds;
    constructor();
    setEntityBounds(bounds: ConnectionBounds[]): void;
    createPolylinePath(from: Position, to: Position): string;
    findSmartPath(from: Position, to: Position): Position[];
    private createLShapedPath;
    private findAlternativePath;
    private routeAroundEntities;
    private routeWithOffset;
    private findClearHorizontalPath;
    private findClearVerticalPath;
    private pathIntersectsEntities;
}
//# sourceMappingURL=smart-routing.d.ts.map