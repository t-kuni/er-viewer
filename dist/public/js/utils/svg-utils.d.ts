import type { Position, Bounds } from '../types/index';
export declare class SVGUtils {
    static pathPointsToSVG(pathPoints: Position[]): string;
    static hexToRgba(hex: string, alpha: number): string;
    static extractColorFromFill(fill: string): string;
    static extractOpacityFromFill(fill: string): number;
}
export declare class GeometryUtils {
    static lineIntersectsRectangle(start: Position, end: Position, rect: Bounds): boolean;
    static lineIntersectsLine(p1: Position, p2: Position, p3: Position, p4: Position): boolean;
    static pointInRectangle(point: Position, rect: Bounds): boolean;
    static pathIntersectsEntities(pathPoints: Position[], entityBounds: Bounds[]): boolean;
}
//# sourceMappingURL=svg-utils.d.ts.map