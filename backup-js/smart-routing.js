// Smart path routing for relationship lines
import { GeometryUtils, SVGUtils } from '../utils/svg-utils.js';

export class SmartRouting {
  constructor() {
    this.entityBounds = [];
  }

  setEntityBounds(bounds) {
    this.entityBounds = bounds;
  }

  createPolylinePath(from, to) {
    const path = this.findSmartPath(from, to);
    return SVGUtils.pathPointsToSVG(path);
  }

  findSmartPath(from, to) {
    // Try direct L-shaped path first
    const directPath = this.createLShapedPath(from, to);
    if (!GeometryUtils.pathIntersectsEntities(directPath, this.entityBounds)) {
      return directPath;
    }

    // If direct path intersects, find alternative route
    return this.findAlternativePath(from, to);
  }

  createLShapedPath(from, to) {
    const midX = (from.x + to.x) / 2;
    return [
      { x: from.x, y: from.y },
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      { x: to.x, y: to.y },
    ];
  }

  findAlternativePath(from, to) {
    // Try different routing strategies
    const strategies = [
      () => this.routeAroundEntities(from, to, 'horizontal'),
      () => this.routeAroundEntities(from, to, 'vertical'),
      () => this.routeWithOffset(from, to, 50),
      () => this.routeWithOffset(from, to, -50),
    ];

    for (const strategy of strategies) {
      const path = strategy();
      if (path && !GeometryUtils.pathIntersectsEntities(path, this.entityBounds)) {
        return path;
      }
    }

    // Fallback to simple L-shaped path if no smart route found
    return this.createLShapedPath(from, to);
  }

  routeAroundEntities(from, to, direction) {
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

  routeWithOffset(from, to, offset) {
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

  findClearHorizontalPath(startX, endX, y, padding) {
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

  findClearVerticalPath(startY, endY, x, padding) {
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
}
