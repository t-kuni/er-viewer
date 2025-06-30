// Smart path routing for relationship lines
import { GeometryUtils, SVGUtils } from '../utils/svg-utils';
import { Position, Bounds } from '../types/index.js';
import type { ConnectionBounds } from './connection-points.js';

// Routing direction type
type RoutingDirection = 'horizontal' | 'vertical';

// Routing strategy function type
type RoutingStrategy = () => Position[] | null;

export class SmartRouting {
  private entityBounds: ConnectionBounds[];

  constructor() {
    this.entityBounds = [];
  }

  setEntityBounds(bounds: ConnectionBounds[]): void {
    this.entityBounds = bounds;
  }

  createPolylinePath(from: Position, to: Position): string {
    const path = this.findSmartPath(from, to);
    return SVGUtils.pathPointsToSVG(path);
  }

  findSmartPath(from: Position, to: Position): Position[] {
    // Try direct L-shaped path first
    const directPath = this.createLShapedPath(from, to);
    if (!this.pathIntersectsEntities(directPath)) {
      return directPath;
    }

    // If direct path intersects, find alternative route
    return this.findAlternativePath(from, to);
  }

  private createLShapedPath(from: Position, to: Position): Position[] {
    const midX = (from.x + to.x) / 2;
    return [
      { x: from.x, y: from.y },
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      { x: to.x, y: to.y },
    ];
  }

  private findAlternativePath(from: Position, to: Position): Position[] {
    // Try different routing strategies
    const strategies: RoutingStrategy[] = [
      () => this.routeAroundEntities(from, to, 'horizontal'),
      () => this.routeAroundEntities(from, to, 'vertical'),
      () => this.routeWithOffset(from, to, 50),
      () => this.routeWithOffset(from, to, -50),
    ];

    for (const strategy of strategies) {
      const path = strategy();
      if (path && !this.pathIntersectsEntities(path)) {
        return path;
      }
    }

    // Fallback to simple L-shaped path if no smart route found
    return this.createLShapedPath(from, to);
  }

  private routeAroundEntities(from: Position, to: Position, direction: RoutingDirection): Position[] {
    const padding = 20;

    if (direction === 'horizontal') {
      // Route horizontally first, then vertically around obstacles
      const intermediateY = from.y;
      const clearX = this.findClearHorizontalPath(from.x, to.x, intermediateY, padding);

      return [
        { x: from.x, y: from.y },
        { x: clearX, y: from.y },
        { x: clearX, y: to.y },
        { x: to.x, y: to.y },
      ];
    } else {
      // Route vertically first, then horizontally around obstacles
      const intermediateX = from.x;
      const clearY = this.findClearVerticalPath(from.y, to.y, intermediateX, padding);

      return [
        { x: from.x, y: from.y },
        { x: from.x, y: clearY },
        { x: to.x, y: clearY },
        { x: to.x, y: to.y },
      ];
    }
  }

  private routeWithOffset(from: Position, to: Position, offset: number): Position[] {
    const midX = (from.x + to.x) / 2 + offset;
    const midY = (from.y + to.y) / 2 + offset;

    return [
      { x: from.x, y: from.y },
      { x: midX, y: from.y },
      { x: midX, y: midY },
      { x: to.x, y: midY },
      { x: to.x, y: to.y },
    ];
  }

  private findClearHorizontalPath(startX: number, endX: number, y: number, padding: number): number {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);

    // Check for entities that intersect with the horizontal line
    for (const bounds of this.entityBounds) {
      if (
        y >= bounds.top - padding &&
        y <= bounds.bottom + padding &&
        bounds.left <= maxX + padding &&
        bounds.right >= minX - padding
      ) {
        // Entity blocks the path, route around it
        if (startX < endX) {
          return bounds.right + padding;
        } else {
          return bounds.left - padding;
        }
      }
    }

    return (startX + endX) / 2;
  }

  private findClearVerticalPath(startY: number, endY: number, x: number, padding: number): number {
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    // Check for entities that intersect with the vertical line
    for (const bounds of this.entityBounds) {
      if (
        x >= bounds.left - padding &&
        x <= bounds.right + padding &&
        bounds.top <= maxY + padding &&
        bounds.bottom >= minY - padding
      ) {
        // Entity blocks the path, route around it
        if (startY < endY) {
          return bounds.bottom + padding;
        } else {
          return bounds.top - padding;
        }
      }
    }

    return (startY + endY) / 2;
  }

  // Helper method to check path intersection with entities using standard Bounds
  private pathIntersectsEntities(pathPoints: Position[]): boolean {
    // Convert ConnectionBounds to standard Bounds for GeometryUtils
    const standardBounds: Bounds[] = this.entityBounds.map((cb) => ({
      x: cb.x,
      y: cb.y,
      width: cb.width,
      height: cb.height,
    }));

    return GeometryUtils.pathIntersectsEntities(pathPoints, standardBounds);
  }
}
