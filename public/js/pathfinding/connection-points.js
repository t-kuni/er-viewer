// Connection point calculations for relationships
import { CoordinateTransform } from '../utils/coordinate-transform';
export class ConnectionPoints {
    constructor(erData) {
        this.erData = erData || null;
        this.coordinateTransform = new CoordinateTransform();
    }
    setERData(erData) {
        this.erData = erData;
    }
    findOptimalConnectionPoints(fromBounds, toBounds, relationship) {
        // If column information is available, use column-level connection points
        if (relationship?.fromColumn && relationship.toColumn) {
            return this.getColumnConnectionPoints(fromBounds, toBounds, relationship);
        }
        // Fallback to entity-level connection points
        return this.getEntityConnectionPoints(fromBounds, toBounds);
    }
    getColumnConnectionPoints(fromBounds, toBounds, relationship) {
        const fromColumnPoint = this.getColumnPosition(fromBounds, relationship.from, relationship.fromColumn);
        const toColumnPoint = this.getColumnPosition(toBounds, relationship.to, relationship.toColumn);
        if (!fromColumnPoint || !toColumnPoint) {
            // Fallback to entity-level points if column positions can't be determined
            return this.getEntityConnectionPoints(fromBounds, toBounds);
        }
        // Determine which side of the entity to connect from/to based on column positions
        const fromConnectionPoint = this.getColumnConnectionPoint(fromBounds, fromColumnPoint, toBounds);
        const toConnectionPoint = this.getColumnConnectionPoint(toBounds, toColumnPoint, fromBounds);
        return {
            from: fromConnectionPoint,
            to: toConnectionPoint,
        };
    }
    getColumnPosition(entityBounds, entityName, columnName) {
        if (!this.erData) {
            return null;
        }
        // Find the entity in the data
        const entity = this.erData.entities.find((e) => e.name === entityName);
        if (!entity) {
            return null;
        }
        // Find the column index
        const columnIndex = entity.columns.findIndex((col) => col.name === columnName);
        if (columnIndex === -1) {
            return null;
        }
        // Calculate column position within the entity
        const headerHeight = 30;
        const rowHeight = 20;
        const columnY = entityBounds.top + headerHeight + (columnIndex + 1) * rowHeight - rowHeight / 2;
        return {
            x: entityBounds.centerX,
            y: columnY,
            columnIndex: columnIndex,
        };
    }
    getColumnConnectionPoint(entityBounds, columnPosition, targetBounds) {
        const margin = 5;
        // Determine which side to connect from based on target position
        const targetCenterX = targetBounds.centerX;
        const entityCenterX = entityBounds.centerX;
        const toTargetCenter = targetCenterX - entityCenterX;
        if (toTargetCenter > 0) {
            // Target is to the right, connect from right edge
            return {
                x: entityBounds.right + margin,
                y: columnPosition.y,
            };
        }
        else {
            // Target is to the left, connect from left edge
            return {
                x: entityBounds.left - margin,
                y: columnPosition.y,
            };
        }
    }
    getEntityConnectionPoints(fromBounds, toBounds) {
        // Get edge points for both entities
        const fromEdges = this.getEntityEdgePoints(fromBounds);
        const toEdges = this.getEntityEdgePoints(toBounds);
        // Find the closest edge points
        let bestDistance = Infinity;
        let bestFromPoint = fromEdges.right;
        let bestToPoint = toEdges.left;
        const edgeKeys = ['top', 'bottom', 'left', 'right'];
        for (const fromEdgeKey of edgeKeys) {
            for (const toEdgeKey of edgeKeys) {
                const fromEdge = fromEdges[fromEdgeKey];
                const toEdge = toEdges[toEdgeKey];
                const distance = this.coordinateTransform.distance(fromEdge, toEdge);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestFromPoint = fromEdge;
                    bestToPoint = toEdge;
                }
            }
        }
        return {
            from: bestFromPoint,
            to: bestToPoint,
        };
    }
    getEntityEdgePoints(bounds) {
        const margin = 5; // Small margin from the exact edge for visual clarity
        const centerX = bounds.centerX;
        const centerY = bounds.centerY;
        return {
            top: { x: centerX, y: bounds.top - margin },
            bottom: { x: centerX, y: bounds.bottom + margin },
            left: { x: bounds.left - margin, y: centerY },
            right: { x: bounds.right + margin, y: centerY },
        };
    }
    getAllEntityBounds(entities) {
        if (!entities) {
            return [];
        }
        return entities.map((entity) => {
            return this.getEntityBounds(entity);
        });
    }
    getEntityBounds(entity) {
        const pos = entity.position || { x: 50, y: 50 };
        const headerHeight = 30;
        const rowHeight = 20;
        const bottomPadding = 8;
        const width = 180;
        const height = headerHeight + entity.columns.length * rowHeight + bottomPadding;
        return {
            left: pos.x,
            top: pos.y,
            right: pos.x + width,
            bottom: pos.y + height,
            width: width,
            height: height,
            centerX: pos.x + width / 2,
            centerY: pos.y + height / 2,
            x: pos.x,
            y: pos.y,
        };
    }
}
