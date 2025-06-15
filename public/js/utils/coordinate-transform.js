/**
 * Centralized coordinate transformation system
 * Handles all coordinate system conversions and viewport calculations
 */
export class CoordinateTransform {
    constructor() {
        this.viewport = {
            panX: 0,
            panY: 0,
            scale: 1
        };
    }

    /**
     * Update the current viewport state
     * @param {number} panX - X pan offset
     * @param {number} panY - Y pan offset
     * @param {number} scale - Scale factor
     */
    updateViewport(panX, panY, scale) {
        this.viewport = { panX, panY, scale };
    }

    /**
     * Convert screen coordinates to SVG coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {Element} canvas - SVG canvas element
     * @param {Object} viewport - Optional viewport override
     * @returns {Object} SVG coordinates {x, y}
     */
    screenToSVG(screenX, screenY, canvas, viewport = null) {
        const vp = viewport || this.viewport;
        const rect = canvas.getBoundingClientRect();
        const x = (screenX - rect.left - vp.panX) / vp.scale;
        const y = (screenY - rect.top - vp.panY) / vp.scale;
        return { x, y };
    }

    /**
     * Convert SVG coordinates to screen coordinates
     * @param {number} svgX - SVG X coordinate
     * @param {number} svgY - SVG Y coordinate
     * @param {Element} canvas - SVG canvas element
     * @param {Object} viewport - Optional viewport override
     * @returns {Object} Screen coordinates {x, y}
     */
    svgToScreen(svgX, svgY, canvas, viewport = null) {
        const vp = viewport || this.viewport;
        const rect = canvas.getBoundingClientRect();
        const x = svgX * vp.scale + vp.panX + rect.left;
        const y = svgY * vp.scale + vp.panY + rect.top;
        return { x, y };
    }

    /**
     * Check if a point is within given bounds
     * @param {Object} point - Point {x, y}
     * @param {Object} bounds - Bounds {x, y, width, height}
     * @returns {boolean} True if point is within bounds
     */
    isPointInBounds(point, bounds) {
        return point.x >= bounds.x && 
               point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y && 
               point.y <= bounds.y + bounds.height;
    }

    /**
     * Calculate viewport bounds in SVG coordinates
     * @param {Element} canvas - SVG canvas element
     * @returns {Object} Viewport bounds {x, y, width, height}
     */
    getViewportBounds(canvas) {
        const rect = canvas.getBoundingClientRect();
        const topLeft = this.screenToSVG(0, 0, canvas);
        const bottomRight = this.screenToSVG(rect.width, rect.height, canvas);
        
        return {
            x: topLeft.x,
            y: topLeft.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y
        };
    }

    /**
     * Calculate distance between two points
     * @param {Object} p1 - First point {x, y}
     * @param {Object} p2 - Second point {x, y}
     * @returns {number} Distance between points
     */
    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Find the closest point on a line segment to a given point
     * @param {Object} point - Target point {x, y}
     * @param {Object} lineStart - Line start point {x, y}
     * @param {Object} lineEnd - Line end point {x, y}
     * @returns {Object} Closest point on line {x, y}
     */
    closestPointOnLine(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const length = dx * dx + dy * dy;
        
        if (length === 0) return lineStart;
        
        const t = Math.max(0, Math.min(1, 
            ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / length
        ));
        
        return {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };
    }

    /**
     * Apply transformation matrix to SVG element
     * @param {Element} element - SVG element to transform
     * @param {Object} viewport - Optional viewport override
     */
    applyTransform(element, viewport = null) {
        const vp = viewport || this.viewport;
        element.setAttribute('transform', 
            `translate(${vp.panX}, ${vp.panY}) scale(${vp.scale})`
        );
    }

    /**
     * Calculate optimal scale to fit content in viewport
     * @param {Object} contentBounds - Content bounds {x, y, width, height}
     * @param {Object} viewportSize - Viewport size {width, height}
     * @param {number} padding - Padding factor (default 0.1)
     * @returns {number} Optimal scale factor
     */
    calculateFitScale(contentBounds, viewportSize, padding = 0.1) {
        if (contentBounds.width === 0 || contentBounds.height === 0) return 1;
        
        const availableWidth = viewportSize.width * (1 - padding * 2);
        const availableHeight = viewportSize.height * (1 - padding * 2);
        
        const scaleX = availableWidth / contentBounds.width;
        const scaleY = availableHeight / contentBounds.height;
        
        return Math.min(scaleX, scaleY);
    }

    /**
     * Calculate center point of viewport for fitting content
     * @param {Object} contentBounds - Content bounds {x, y, width, height}
     * @param {Object} viewportSize - Viewport size {width, height}
     * @param {number} scale - Scale factor
     * @returns {Object} Center pan offset {panX, panY}
     */
    calculateCenterPan(contentBounds, viewportSize, scale) {
        const scaledContentWidth = contentBounds.width * scale;
        const scaledContentHeight = contentBounds.height * scale;
        
        const panX = (viewportSize.width - scaledContentWidth) / 2 - contentBounds.x * scale;
        const panY = (viewportSize.height - scaledContentHeight) / 2 - contentBounds.y * scale;
        
        return { panX, panY };
    }
}