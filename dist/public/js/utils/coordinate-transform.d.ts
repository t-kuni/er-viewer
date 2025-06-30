import { Viewport, Position, Bounds } from '../types/index';
/**
 * Centralized coordinate transformation system
 * Handles all coordinate system conversions and viewport calculations
 */
export declare class CoordinateTransform {
    private viewport;
    constructor();
    /**
     * Update the current viewport state
     */
    updateViewport(panX: number, panY: number, scale: number): void;
    /**
     * Convert screen coordinates to SVG coordinates
     */
    screenToSVG(screenX: number, screenY: number, canvas: Element, viewport?: Viewport | null): Position;
    /**
     * Convert SVG coordinates to screen coordinates
     */
    svgToScreen(svgX: number, svgY: number, canvas: Element, viewport?: Viewport | null): Position;
    /**
     * Check if a point is within given bounds
     */
    isPointInBounds(point: Position, bounds: Bounds): boolean;
    /**
     * Calculate viewport bounds in SVG coordinates
     */
    getViewportBounds(canvas: Element): Bounds;
    /**
     * Calculate distance between two points
     */
    distance(p1: Position, p2: Position): number;
    /**
     * Find the closest point on a line segment to a given point
     */
    closestPointOnLine(point: Position, lineStart: Position, lineEnd: Position): Position;
    /**
     * Apply transformation matrix to SVG element
     */
    applyTransform(element: Element, viewport?: Viewport | null): void;
    /**
     * Calculate optimal scale to fit content in viewport
     */
    calculateFitScale(contentBounds: Bounds, viewportSize: {
        width: number;
        height: number;
    }, padding?: number): number;
    /**
     * Calculate center point of viewport for fitting content
     */
    calculateCenterPan(contentBounds: Bounds, viewportSize: {
        width: number;
        height: number;
    }, scale: number): {
        panX: number;
        panY: number;
    };
}
//# sourceMappingURL=coordinate-transform.d.ts.map