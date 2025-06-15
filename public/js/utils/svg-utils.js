// SVG and geometric utility functions
export class SVGUtils {

    static pathPointsToSVG(pathPoints) {
        return `M ${pathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`;
    }

    static hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    static extractColorFromFill(fill) {
        if (fill.startsWith('rgba(')) {
            const match = fill.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
            if (match) {
                const r = parseInt(match[1]).toString(16).padStart(2, '0');
                const g = parseInt(match[2]).toString(16).padStart(2, '0');
                const b = parseInt(match[3]).toString(16).padStart(2, '0');
                return `#${r}${g}${b}`;
            }
        }
        return fill;
    }

    static extractOpacityFromFill(fill) {
        if (fill.startsWith('rgba(')) {
            const match = fill.match(/rgba\(.*,\s*([0-9.]+)\)/);
            return match ? parseFloat(match[1]) : 1;
        }
        return 1;
    }
}

export class GeometryUtils {
    static lineIntersectsRectangle(start, end, rect) {
        const { x, y, width, height } = rect;
        const rectRight = x + width;
        const rectBottom = y + height;
        
        if (this.lineIntersectsLine(start, end, {x, y}, {x: rectRight, y}) ||
            this.lineIntersectsLine(start, end, {x: rectRight, y}, {x: rectRight, y: rectBottom}) ||
            this.lineIntersectsLine(start, end, {x: rectRight, y: rectBottom}, {x, y: rectBottom}) ||
            this.lineIntersectsLine(start, end, {x, y: rectBottom}, {x, y})) {
            return true;
        }
        
        return this.pointInRectangle(start, rect) || this.pointInRectangle(end, rect);
    }

    static lineIntersectsLine(p1, p2, p3, p4) {
        const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (Math.abs(denom) < 0.0001) return false;
        
        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
        
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    static pointInRectangle(point, rect) {
        return point.x >= rect.x && point.x <= rect.x + rect.width &&
               point.y >= rect.y && point.y <= rect.y + rect.height;
    }

    static pathIntersectsEntities(pathPoints, entityBounds) {
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const start = pathPoints[i];
            const end = pathPoints[i + 1];
            
            for (const bounds of entityBounds) {
                if (this.lineIntersectsRectangle(start, end, bounds)) {
                    return true;
                }
            }
        }
        return false;
    }
}