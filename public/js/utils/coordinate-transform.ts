import { Viewport, Position, Bounds } from '../types/index.js';

/**
 * Centralized coordinate transformation system
 * Handles all coordinate system conversions and viewport calculations
 */
export class CoordinateTransform {
  private viewport: Viewport;

  constructor() {
    this.viewport = {
      panX: 0,
      panY: 0,
      scale: 1,
    };
  }

  /**
   * Update the current viewport state
   */
  updateViewport(panX: number, panY: number, scale: number): void {
    this.viewport = { panX, panY, scale };
  }

  /**
   * Convert screen coordinates to SVG coordinates
   */
  screenToSVG(screenX: number, screenY: number, canvas: Element, viewport: Viewport | null = null): Position {
    const vp = viewport || this.viewport;
    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - vp.panX) / vp.scale;
    const y = (screenY - rect.top - vp.panY) / vp.scale;
    return { x, y };
  }

  /**
   * Convert SVG coordinates to screen coordinates
   */
  svgToScreen(svgX: number, svgY: number, canvas: Element, viewport: Viewport | null = null): Position {
    const vp = viewport || this.viewport;
    const rect = canvas.getBoundingClientRect();
    const x = svgX * vp.scale + vp.panX + rect.left;
    const y = svgY * vp.scale + vp.panY + rect.top;
    return { x, y };
  }

  /**
   * Check if a point is within given bounds
   */
  isPointInBounds(point: Position, bounds: Bounds): boolean {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * Calculate viewport bounds in SVG coordinates
   */
  getViewportBounds(canvas: Element): Bounds {
    const rect = canvas.getBoundingClientRect();
    const topLeft = this.screenToSVG(0, 0, canvas);
    const bottomRight = this.screenToSVG(rect.width, rect.height, canvas);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  /**
   * Calculate distance between two points
   */
  distance(p1: Position, p2: Position): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Find the closest point on a line segment to a given point
   */
  closestPointOnLine(point: Position, lineStart: Position, lineEnd: Position): Position {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = dx * dx + dy * dy;

    if (length === 0) {
      return lineStart;
    }

    const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / length));

    return {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    };
  }

  /**
   * Apply transformation matrix to SVG element
   */
  applyTransform(element: Element, viewport: Viewport | null = null): void {
    const vp = viewport || this.viewport;
    element.setAttribute('transform', `translate(${vp.panX}, ${vp.panY}) scale(${vp.scale})`);
  }

  /**
   * Calculate optimal scale to fit content in viewport
   */
  calculateFitScale(
    contentBounds: Bounds,
    viewportSize: { width: number; height: number },
    padding: number = 0.1,
  ): number {
    if (contentBounds.width === 0 || contentBounds.height === 0) {
      return 1;
    }

    const availableWidth = viewportSize.width * (1 - padding * 2);
    const availableHeight = viewportSize.height * (1 - padding * 2);

    const scaleX = availableWidth / contentBounds.width;
    const scaleY = availableHeight / contentBounds.height;

    return Math.min(scaleX, scaleY);
  }

  /**
   * Calculate center point of viewport for fitting content
   */
  calculateCenterPan(
    contentBounds: Bounds,
    viewportSize: { width: number; height: number },
    scale: number,
  ): { panX: number; panY: number } {
    const scaledContentWidth = contentBounds.width * scale;
    const scaledContentHeight = contentBounds.height * scale;

    const panX = (viewportSize.width - scaledContentWidth) / 2 - contentBounds.x * scale;
    const panY = (viewportSize.height - scaledContentHeight) / 2 - contentBounds.y * scale;

    return { panX, panY };
  }
}
