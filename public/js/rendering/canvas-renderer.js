/**
 * Canvas rendering system
 * Handles all SVG drawing operations and visual presentation
 */
import { SVGUtils } from '../utils/svg-utils.js';
import { SmartRouting } from '../pathfinding/smart-routing.js';
import { ConnectionPoints } from '../pathfinding/connection-points.js';

export class CanvasRenderer {
    constructor(canvas, coordinateTransform) {
        this.canvas = canvas;
        this.coordinateTransform = coordinateTransform;
        this.smartRouting = new SmartRouting();
        this.connectionPoints = new ConnectionPoints();
        
        // Store current rendering data
        this.currentERData = null;
        this.currentLayoutData = null;
        
        // Rendering configuration
        this.config = {
            entity: {
                minWidth: 150,
                minHeight: 80,
                padding: 10,
                headerHeight: 25,
                columnHeight: 20,
                borderRadius: 4
            },
            relationship: {
                strokeWidth: 2,
                arrowSize: 8
            },
            annotation: {
                rectangle: {
                    defaultFill: 'rgba(255, 255, 0, 0.1)',
                    defaultStroke: '#ffcc00',
                    strokeWidth: 2
                },
                text: {
                    defaultFill: '#000000',
                    fontSize: 14,
                    fontFamily: 'Arial, sans-serif'
                }
            }
        };
    }

    /**
     * Initialize canvas with base structure
     */
    initializeCanvas() {
        // Clear existing content
        this.canvas.innerHTML = '';
        
        // Create base SVG structure
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Add arrow markers
        this.createArrowMarkers(defs);
        
        // Add filters for drop shadows and effects
        this.createFilters(defs);
        
        this.canvas.appendChild(defs);
        
        // Create main transformation group
        const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        mainGroup.setAttribute('id', 'main-group');
        this.canvas.appendChild(mainGroup);
        
        // Create layer groups
        const backgroundGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        backgroundGroup.setAttribute('id', 'background-layer');
        mainGroup.appendChild(backgroundGroup);
        
        const relationshipGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        relationshipGroup.setAttribute('id', 'relationship-layer');
        mainGroup.appendChild(relationshipGroup);
        
        const entityGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        entityGroup.setAttribute('id', 'entity-layer');
        mainGroup.appendChild(entityGroup);
        
        const annotationGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        annotationGroup.setAttribute('id', 'annotation-layer');
        mainGroup.appendChild(annotationGroup);
    }

    /**
     * Render complete ER diagram
     * @param {Object} erData - ER diagram data
     * @param {Object} layoutData - Layout positioning data
     */
    renderER(erData, layoutData) {
        if (!erData) return;
        
        // Store current data for re-rendering
        this.currentERData = erData;
        this.currentLayoutData = layoutData;
        
        this.initializeCanvas();
        
        // Render in correct order for proper layering
        this.renderEntities(erData.entities, layoutData.entities);
        this.renderRelationships(erData.relationships, layoutData.entities, erData.entities);
        this.renderAnnotations(layoutData.rectangles, layoutData.texts);
    }

    /**
     * Render entities on the canvas
     * @param {Array} entities - Entity data
     * @param {Object} entityPositions - Entity position data
     */
    renderEntities(entities, entityPositions) {
        const entityGroup = document.getElementById('entity-layer');
        if (!entityGroup) return;
        
        entityGroup.innerHTML = '';
        
        entities.forEach(entity => {
            const position = entityPositions[entity.name] || { x: 50, y: 50 };
            const entityElement = this.createEntityElement(entity, position);
            entityGroup.appendChild(entityElement);
        });
    }

    /**
     * Create SVG element for a single entity
     * @param {Object} entity - Entity data
     * @param {Object} position - Entity position {x, y}
     * @returns {Element} SVG group element
     */
    createEntityElement(entity, position) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'entity');
        group.setAttribute('data-table', entity.name);
        group.setAttribute('transform', `translate(${position.x}, ${position.y})`);
        
        // Calculate entity dimensions
        const dimensions = this.calculateEntityDimensions(entity);
        
        // Create background rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('width', dimensions.width);
        rect.setAttribute('height', dimensions.height);
        rect.setAttribute('rx', this.config.entity.borderRadius);
        rect.setAttribute('ry', this.config.entity.borderRadius);
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('stroke', '#cccccc');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('filter', 'url(#drop-shadow)');
        group.appendChild(rect);
        
        // Create header
        const headerGroup = this.createEntityHeader(entity, dimensions);
        group.appendChild(headerGroup);
        
        // Create columns
        const columnsGroup = this.createEntityColumns(entity, dimensions);
        group.appendChild(columnsGroup);
        
        return group;
    }

    /**
     * Create entity header with table name
     * @param {Object} entity - Entity data
     * @param {Object} dimensions - Entity dimensions
     * @returns {Element} SVG group element
     */
    createEntityHeader(entity, dimensions) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'entity-header');
        
        // Header background
        const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        headerRect.setAttribute('x', '0');
        headerRect.setAttribute('y', '0');
        headerRect.setAttribute('width', dimensions.width);
        headerRect.setAttribute('height', this.config.entity.headerHeight);
        headerRect.setAttribute('fill', '#f0f0f0');
        headerRect.setAttribute('stroke', '#cccccc');
        headerRect.setAttribute('stroke-width', '0.5');
        group.appendChild(headerRect);
        
        // Table name text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', dimensions.width / 2);
        text.setAttribute('y', this.config.entity.headerHeight / 2 + 4);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', '#333333');
        text.textContent = entity.name;
        group.appendChild(text);
        
        return group;
    }

    /**
     * Create entity columns list
     * @param {Object} entity - Entity data
     * @param {Object} dimensions - Entity dimensions
     * @returns {Element} SVG group element
     */
    createEntityColumns(entity, dimensions) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'entity-columns');
        
        let yOffset = this.config.entity.headerHeight + 5;
        
        entity.columns.forEach((column, index) => {
            const columnGroup = this.createColumnElement(column, entity, dimensions.width, yOffset);
            group.appendChild(columnGroup);
            yOffset += this.config.entity.columnHeight;
        });
        
        return group;
    }

    /**
     * Create individual column element
     * @param {Object} column - Column data
     * @param {Object} entity - Entity data (for foreign key lookup)
     * @param {number} entityWidth - Entity width
     * @param {number} yOffset - Y position offset
     * @returns {Element} SVG group element
     */
    createColumnElement(column, entity, entityWidth, yOffset) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'entity-column');
        group.setAttribute('data-column', column.name);
        
        let xOffset = 10;
        
        // Add column type icons
        if (column.key === 'PRI') {
            const keyIcon = this.createColumnIcon('🔑', xOffset, yOffset);
            group.appendChild(keyIcon);
            xOffset += 20;
        }
        
        // Check if column is foreign key by looking in entity's foreignKeys array
        const isForeignKey = entity.foreignKeys && entity.foreignKeys.some(fk => fk.column === column.name);
        if (isForeignKey) {
            const fkIcon = this.createColumnIcon('🔗', xOffset, yOffset);
            group.appendChild(fkIcon);
            xOffset += 20;
        }
        
        // Column name and type
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', xOffset);
        text.setAttribute('y', yOffset + 12);
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '11');
        text.setAttribute('fill', '#333333');
        
        const columnText = column.name;
        text.textContent = columnText;
        group.appendChild(text);
        
        return group;
    }

    /**
     * Create column type icon
     * @param {string} icon - Icon character
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Element} SVG text element
     */
    createColumnIcon(icon, x, y) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + 12);
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#666666');
        text.textContent = icon;
        return text;
    }

    /**
     * Calculate entity dimensions based on content
     * @param {Object} entity - Entity data
     * @returns {Object} Dimensions {width, height}
     */
    calculateEntityDimensions(entity) {
        // Calculate width based on longest text
        let maxWidth = entity.name.length * 8 + 20; // Approximate character width
        
        entity.columns.forEach(column => {
            const columnText = column.name;
            const textWidth = columnText.length * 7 + 60; // Account for icons
            maxWidth = Math.max(maxWidth, textWidth);
        });
        
        const width = Math.max(maxWidth, this.config.entity.minWidth);
        const height = this.config.entity.headerHeight + 
                      (entity.columns.length * this.config.entity.columnHeight) + 
                      this.config.entity.padding;
        
        return { width, height };
    }

    /**
     * Render relationships between entities
     * @param {Array} relationships - Relationship data
     * @param {Object} entityPositions - Entity position data
     * @param {Array} entities - Entity data for connection points
     */
    renderRelationships(relationships, entityPositions, entities) {
        const relationshipGroup = document.getElementById('relationship-layer');
        if (!relationshipGroup) return;
        
        relationshipGroup.innerHTML = '';
        
        // Update connection points with entity data
        if (entities) {
            this.connectionPoints.setERData({ entities });
        }
        
        relationships.forEach(relationship => {
            const pathElement = this.createRelationshipPath(relationship, entityPositions);
            if (pathElement) {
                relationshipGroup.appendChild(pathElement);
            }
        });
    }

    /**
     * Create SVG path for a relationship
     * @param {Object} relationship - Relationship data
     * @param {Object} entityPositions - Entity position data
     * @returns {Element|null} SVG path element
     */
    createRelationshipPath(relationship, entityPositions) {
        const fromPos = entityPositions[relationship.from];
        const toPos = entityPositions[relationship.to];
        
        if (!fromPos || !toPos) return null;
        
        // Get entity bounds for smart routing
        const entityBounds = this.calculateEntityBounds(entityPositions);
        this.smartRouting.setEntityBounds(entityBounds);
        
        // Calculate optimal connection points
        const fromEntityBounds = this.getEntityBounds(relationship.from, entityPositions);
        const toEntityBounds = this.getEntityBounds(relationship.to, entityPositions);
        
        const connectionPoints = this.connectionPoints.findOptimalConnectionPoints(
            fromEntityBounds, toEntityBounds, relationship
        );
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'relationship');
        path.setAttribute('data-from', relationship.from);
        path.setAttribute('data-to', relationship.to);
        path.setAttribute('data-from-column', relationship.fromColumn);
        path.setAttribute('data-to-column', relationship.toColumn);
        
        // Create smart polyline path (horizontal/vertical only)
        const pathData = this.smartRouting.createPolylinePath(connectionPoints.from, connectionPoints.to);
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#666666');
        path.setAttribute('stroke-width', this.config.relationship.strokeWidth);
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#arrow)');
        
        return path;
    }

    /**
     * Render annotations (rectangles and text)
     * @param {Array} rectangles - Rectangle annotations
     * @param {Array} texts - Text annotations
     */
    renderAnnotations(rectangles, texts) {
        const annotationGroup = document.getElementById('annotation-layer');
        if (!annotationGroup) return;
        
        console.log('Rendering annotations - rectangles:', rectangles, 'texts:', texts);
        
        annotationGroup.innerHTML = '';
        
        // Render rectangles
        if (rectangles && rectangles.length > 0) {
            rectangles.forEach((rect, index) => {
                console.log('Creating rectangle:', rect);
                const rectElement = this.createRectangleAnnotation(rect, index);
                annotationGroup.appendChild(rectElement);
            });
        }
        
        // Render texts
        if (texts && texts.length > 0) {
            texts.forEach((text, index) => {
                const textElement = this.createTextAnnotation(text, index);
                annotationGroup.appendChild(textElement);
            });
        }
    }

    /**
     * Create rectangle annotation element
     * @param {Object} rectData - Rectangle data
     * @param {number} index - Index in rectangles array
     * @returns {Element} SVG group element containing rectangle and resize handles
     */
    createRectangleAnnotation(rectData, index) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'annotation-rectangle-group');
        group.setAttribute('data-index', index);
        group.setAttribute('data-type', 'rectangle');
        
        // Main rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'annotation-rectangle');
        rect.setAttribute('data-index', index);
        rect.setAttribute('data-type', 'rectangle');
        rect.setAttribute('x', rectData.x || 0);
        rect.setAttribute('y', rectData.y || 0);
        rect.setAttribute('width', rectData.width || 100);
        rect.setAttribute('height', rectData.height || 50);
        rect.setAttribute('fill', rectData.fill || this.config.annotation.rectangle.defaultFill);
        rect.setAttribute('stroke', rectData.stroke || this.config.annotation.rectangle.defaultStroke);
        rect.setAttribute('stroke-width', this.config.annotation.rectangle.strokeWidth);
        rect.setAttribute('rx', rectData.rx || 0);
        rect.setAttribute('ry', rectData.ry || 0);
        
        group.appendChild(rect);
        
        // Add resize handles
        const resizeHandles = this.createResizeHandles(rectData, index);
        resizeHandles.forEach(handle => group.appendChild(handle));
        
        return group;
    }

    /**
     * Create resize handles for a rectangle
     * @param {Object} rectData - Rectangle data
     * @param {number} index - Rectangle index
     * @returns {Array} Array of SVG circle elements for resize handles
     */
    createResizeHandles(rectData, index) {
        const handles = [];
        const handleSize = 6;
        const x = rectData.x || 0;
        const y = rectData.y || 0;
        const width = rectData.width || 100;
        const height = rectData.height || 50;
        
        // Handle positions: top-left, top-right, bottom-left, bottom-right
        // and middle handles: top, right, bottom, left
        const handlePositions = [
            { name: 'nw', x: x, y: y, cursor: 'nw-resize' },
            { name: 'n', x: x + width/2, y: y, cursor: 'n-resize' },
            { name: 'ne', x: x + width, y: y, cursor: 'ne-resize' },
            { name: 'e', x: x + width, y: y + height/2, cursor: 'e-resize' },
            { name: 'se', x: x + width, y: y + height, cursor: 'se-resize' },
            { name: 's', x: x + width/2, y: y + height, cursor: 's-resize' },
            { name: 'sw', x: x, y: y + height, cursor: 'sw-resize' },
            { name: 'w', x: x, y: y + height/2, cursor: 'w-resize' }
        ];
        
        handlePositions.forEach(pos => {
            const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            handle.setAttribute('class', 'resize-handle');
            handle.setAttribute('data-rectangle-index', index);
            handle.setAttribute('data-handle-type', pos.name);
            handle.setAttribute('cx', pos.x);
            handle.setAttribute('cy', pos.y);
            handle.setAttribute('r', handleSize / 2);
            handle.setAttribute('fill', '#ffffff');
            handle.setAttribute('stroke', '#333333');
            handle.setAttribute('stroke-width', '1');
            handle.setAttribute('cursor', pos.cursor);
            handle.style.display = 'none'; // Initially hidden
            
            handles.push(handle);
        });
        
        return handles;
    }

    /**
     * Create text annotation element
     * @param {Object} textData - Text data
     * @returns {Element} SVG text element
     */
    createTextAnnotation(textData, index) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', 'annotation-text');
        text.setAttribute('data-index', index);
        text.setAttribute('data-type', 'text');
        text.setAttribute('x', textData.x || 0);
        text.setAttribute('y', textData.y || 0);
        text.setAttribute('fill', textData.fill || textData.color || this.config.annotation.text.defaultFill);
        text.setAttribute('font-size', textData.fontSize || textData.size || this.config.annotation.text.fontSize);
        text.setAttribute('font-family', textData.fontFamily || this.config.annotation.text.fontFamily);
        text.textContent = textData.content || '';
        
        return text;
    }

    /**
     * Apply viewport transformation to main group
     * @param {number} panX - X pan offset
     * @param {number} panY - Y pan offset
     * @param {number} scale - Scale factor
     */
    updateTransform(panX, panY, scale) {
        const mainGroup = document.getElementById('main-group');
        if (mainGroup) {
            this.coordinateTransform.applyTransform(mainGroup, { panX, panY, scale });
        }
    }

    /**
     * Clear canvas content
     */
    clear() {
        this.canvas.innerHTML = '';
    }

    /**
     * Create arrow markers for relationships
     * @param {Element} defs - SVG defs element
     */
    createArrowMarkers(defs) {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrow');
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M0,0 L0,6 L9,3 z');
        path.setAttribute('fill', '#666666');
        
        marker.appendChild(path);
        defs.appendChild(marker);
    }

    /**
     * Create visual filters
     * @param {Element} defs - SVG defs element
     */
    createFilters(defs) {
        // Drop shadow filter
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'drop-shadow');
        filter.setAttribute('x', '-20%');
        filter.setAttribute('y', '-20%');
        filter.setAttribute('width', '140%');
        filter.setAttribute('height', '140%');
        
        const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
        feDropShadow.setAttribute('dx', '2');
        feDropShadow.setAttribute('dy', '2');
        feDropShadow.setAttribute('stdDeviation', '2');
        feDropShadow.setAttribute('flood-opacity', '0.3');
        
        filter.appendChild(feDropShadow);
        defs.appendChild(filter);
    }

    /**
     * Calculate bounds for all entities
     * @param {Object} entityPositions - Entity positions
     * @returns {Array} Array of entity bounds
     */
    calculateEntityBounds(entityPositions) {
        const bounds = [];
        for (const [entityName, position] of Object.entries(entityPositions)) {
            const dimensions = this.getEntityDimensions(entityName);
            bounds.push({
                left: position.x,
                top: position.y,
                right: position.x + dimensions.width,
                bottom: position.y + dimensions.height
            });
        }
        return bounds;
    }

    /**
     * Get bounds for a specific entity
     * @param {string} entityName - Entity name
     * @param {Object} entityPositions - Entity positions
     * @returns {Object} Entity bounds
     */
    getEntityBounds(entityName, entityPositions) {
        const position = entityPositions[entityName];
        const dimensions = this.getEntityDimensions(entityName);
        return {
            left: position.x,
            top: position.y,
            right: position.x + dimensions.width,
            bottom: position.y + dimensions.height,
            width: dimensions.width,
            height: dimensions.height,
            centerX: position.x + dimensions.width / 2,
            centerY: position.y + dimensions.height / 2
        };
    }

    /**
     * Get dimensions for an entity by name
     * @param {string} entityName - Entity name
     * @returns {Object} Entity dimensions
     */
    getEntityDimensions(entityName) {
        // Try to find existing entity element to get actual dimensions
        const entityElement = document.querySelector(`[data-table="${entityName}"]`);
        if (entityElement) {
            const rect = entityElement.querySelector('rect');
            if (rect) {
                return {
                    width: parseFloat(rect.getAttribute('width')),
                    height: parseFloat(rect.getAttribute('height'))
                };
            }
        }
        
        // Fallback to default dimensions
        return {
            width: this.config.entity.minWidth,
            height: this.config.entity.minHeight
        };
    }
    
    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.setAttribute('width', container.clientWidth);
            this.canvas.setAttribute('height', container.clientHeight);
            // Re-render to fit new size if data exists
            if (this.currentERData && this.currentLayoutData) {
                this.renderER(this.currentERData, this.currentLayoutData);
            }
        }
    }
}