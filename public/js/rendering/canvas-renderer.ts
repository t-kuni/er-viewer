/**
 * Canvas rendering system
 * Handles all SVG drawing operations and visual presentation
 */
import { SVGUtils } from '../utils/svg-utils';
import { SmartRouting } from '../pathfinding/smart-routing.js';
import { ConnectionPoints } from '../pathfinding/connection-points';
import type { ERData, Entity, Relationship, LayoutData, Position, Bounds, Rectangle, Text } from '../types/index.js';

// Type definitions for Canvas Renderer
interface CanvasRendererConfig {
  entity: {
    minWidth: number;
    minHeight: number;
    padding: number;
    headerHeight: number;
    columnHeight: number;
    borderRadius: number;
  };
  relationship: {
    strokeWidth: number;
    arrowSize: number;
  };
  annotation: {
    rectangle: {
      defaultFill: string;
      defaultStroke: string;
      strokeWidth: number;
    };
    text: {
      defaultFill: string;
      fontSize: number;
      fontFamily: string;
    };
  };
}

interface EntityBounds extends Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

interface Layer {
  id: string;
  type: 'er-diagram' | 'rectangle' | 'text';
  name: string;
  icon?: string;
  order: number;
}

interface LayerManager {
  getLayerOrder(): Layer[];
}

interface EntityPositions {
  [entityName: string]: Position;
}

interface EntityLayouts {
  [entityName: string]: EntityLayout;
}

interface EntityLayout {
  position: Position;
  width: number;
  height: number;
}

// Helper function to convert EntityLayouts to EntityPositions
function convertLayoutsToPositions(layouts: EntityLayouts): EntityPositions {
  const positions: EntityPositions = {};
  Object.entries(layouts).forEach(([name, layout]) => {
    if (layout && layout.position) {
      positions[name] = layout.position;
    }
  });
  return positions;
}

export class CanvasRenderer {
  private readonly canvas: SVGSVGElement;
  // Removed coordinateTransform as it was not being used
  private readonly smartRouting: SmartRouting;
  private readonly connectionPoints: ConnectionPoints;
  private currentERData: ERData | null = null;
  private currentLayoutData: LayoutData | null = null;
  private layerManager: LayerManager | null = null;
  private readonly config: CanvasRendererConfig;

  constructor(canvas: SVGSVGElement) {
    this.canvas = canvas;
    this.smartRouting = new SmartRouting();
    this.connectionPoints = new ConnectionPoints();

    // Rendering configuration
    this.config = {
      entity: {
        minWidth: 150,
        minHeight: 80,
        padding: 10,
        headerHeight: 25,
        columnHeight: 20,
        borderRadius: 4,
      },
      relationship: {
        strokeWidth: 2,
        arrowSize: 8,
      },
      annotation: {
        rectangle: {
          defaultFill: 'rgba(255, 255, 0, 0.1)',
          defaultStroke: '#ffcc00',
          strokeWidth: 2,
        },
        text: {
          defaultFill: '#000000',
          fontSize: 14,
          fontFamily: 'Arial, sans-serif',
        },
      },
    };

    // Listen for layer order changes
    this.setupLayerOrderListener();
  }

  /**
   * Setup listener for layer order changes
   */
  private setupLayerOrderListener(): void {
    document.addEventListener('layerOrderChanged', () => {
      console.log('Layer order changed, re-rendering canvas');
      if (this.currentERData && this.currentLayoutData && this.layerManager) {
        this.renderByLayerOrder(this.currentERData, this.currentLayoutData, this.layerManager);
      }
    });
  }

  /**
   * Initialize canvas with base structure
   */
  public initializeCanvas(): void {
    // Clear existing content
    this.canvas.innerHTML = '';

    // Set canvas dimensions to match container
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.setAttribute('width', container.clientWidth.toString());
      this.canvas.setAttribute('height', container.clientHeight.toString());
    } else {
      // Fallback to default size if no container
      this.canvas.setAttribute('width', '800');
      this.canvas.setAttribute('height', '600');
    }

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

    // Create required SVG groups for compatibility with tests and proper rendering order
    // Relationships group first (background)
    const relationshipsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    relationshipsGroup.setAttribute('id', 'relationships-group');
    mainGroup.appendChild(relationshipsGroup);

    // Entities group second (foreground)
    const entitiesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    entitiesGroup.setAttribute('id', 'entities-group');
    mainGroup.appendChild(entitiesGroup);

    const annotationsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    annotationsGroup.setAttribute('id', 'annotations-group');
    mainGroup.appendChild(annotationsGroup);

    // Create single layer for dynamic ordering (for layer-based rendering)
    const dynamicLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dynamicLayer.setAttribute('id', 'dynamic-layer');
    mainGroup.appendChild(dynamicLayer);
  }

  /**
   * Render complete ER diagram
   */
  public renderER(
    erData: ERData | null,
    layoutData: LayoutData | null,
    layerManager: LayerManager | null = null,
  ): void {
    // Store current data for re-rendering
    this.currentERData = erData;
    this.currentLayoutData = layoutData;
    this.layerManager = layerManager;

    this.initializeCanvas();

    if (layerManager && layerManager.getLayerOrder()) {
      // Render based on layer order
      this.renderByLayerOrder(
        erData || { entities: [], relationships: [] },
        layoutData || { entities: {}, rectangles: [], texts: [], layers: [] },
        layerManager,
      );
    } else {
      // Fallback to default order
      if (erData && erData.relationships && layoutData) {
        // Render relationships first (behind entities)
        const positions = convertLayoutsToPositions(layoutData.entities as EntityLayouts);
        this.renderRelationships(erData.relationships, positions, erData.entities);
      }
      if (erData && erData.entities && layoutData) {
        // Then render entities (in front of relationships)
        const entityLayouts = layoutData.entities as EntityLayouts;
        const positions = convertLayoutsToPositions(entityLayouts);
        this.renderEntities(erData.entities, positions);
      }
      // Always render annotations, even if ER data is empty
      if (layoutData) {
        this.renderAnnotations(layoutData.rectangles || [], layoutData.texts || []);
      }
    }

    // Always ensure annotations are rendered even if layer order fails
    if (layoutData && layoutData.rectangles && layoutData.rectangles.length > 0) {
      console.log('Debug: Rendering rectangles:', layoutData.rectangles);
    }
    if (layoutData && layoutData.texts && layoutData.texts.length > 0) {
      console.log('Debug: Rendering texts:', layoutData.texts);
    }
  }

  /**
   * Render elements based on layer order
   */
  private renderByLayerOrder(erData: ERData, layoutData: LayoutData, layerManager: LayerManager): void {
    const layerOrder = layerManager.getLayerOrder();

    // Clear existing content first
    const dynamicLayer = document.getElementById('dynamic-layer');
    if (dynamicLayer) {
      dynamicLayer.innerHTML = '';
    }

    // Sort layers by order (descending order = bottom to top in layer list = back to front rendering)
    // Higher order numbers (bottom of layer list) are rendered first (background)
    // Lower order numbers (top of layer list) are rendered last (foreground)
    const sortedLayers = [...layerOrder].sort((a, b) => b.order - a.order);

    // Track which rectangles and texts have been rendered
    const renderedRectangles = new Set<number>();
    const renderedTexts = new Set<number>();

    // Render elements in layer order to dynamic layer
    sortedLayers.forEach((layer) => {
      switch (layer.type) {
        case 'er-diagram':
          if (erData && erData.relationships && layoutData.entities) {
            // Render relationships first (behind entities within ER diagram layer)
            const positions = convertLayoutsToPositions(layoutData.entities as EntityLayouts);
            this.renderRelationshipsInDynamicLayer(erData.relationships, positions, erData.entities);
          }
          if (erData && erData.entities && layoutData.entities) {
            // Then render entities (in front of relationships within ER diagram layer)
            this.renderEntitiesInDynamicLayer(erData.entities, layoutData.entities as EntityLayouts);
          }
          break;
        case 'rectangle':
          if (layoutData.rectangles) {
            const rectIndex = this.renderRectangleByLayer(layoutData.rectangles, layer);
            if (rectIndex !== -1) {
              renderedRectangles.add(rectIndex);
            }
          }
          break;
        case 'text':
          if (layoutData.texts) {
            const textIndex = this.renderTextByLayer(layoutData.texts, layer);
            if (textIndex !== -1) {
              renderedTexts.add(textIndex);
            }
          }
          break;
      }
    });

    // Render any rectangles or texts that don't have layers yet
    if (layoutData.rectangles) {
      layoutData.rectangles.forEach((rect, index) => {
        if (!renderedRectangles.has(index)) {
          const rectElement = this.createRectangleAnnotation(rect, index);
          if (dynamicLayer) {
            dynamicLayer.appendChild(rectElement);
          }
        }
      });
    }

    if (layoutData.texts) {
      layoutData.texts.forEach((text, index) => {
        if (!renderedTexts.has(index)) {
          const textElement = this.createTextAnnotation(text, index);
          if (dynamicLayer) {
            dynamicLayer.appendChild(textElement);
          }
        }
      });
    }
  }

  /**
   * Render entities in dynamic layer to respect layer order
   */
  private renderEntitiesInDynamicLayer(entities: Entity[], entityLayouts: EntityLayouts): void {
    const dynamicLayer = document.getElementById('dynamic-layer');
    if (!dynamicLayer) {
      return;
    }

    entities.forEach((entity) => {
      const layout = entityLayouts[entity.name];
      const position = layout ? layout.position : { x: 50, y: 50 };
      const entityElement = this.createEntityElement(entity, position);
      dynamicLayer.appendChild(entityElement);
    });
  }

  /**
   * Render relationships in dynamic layer to respect layer order
   */
  private renderRelationshipsInDynamicLayer(
    relationships: Relationship[],
    entityPositions: EntityPositions,
    entities: Entity[],
  ): void {
    const dynamicLayer = document.getElementById('dynamic-layer');
    if (!dynamicLayer) {
      return;
    }

    // Update connection points with entity data
    if (entities) {
      this.connectionPoints.setERData({ entities, relationships: [] });
    }

    relationships.forEach((relationship) => {
      const pathElement = this.createRelationshipPath(relationship, entityPositions);
      if (pathElement) {
        dynamicLayer.appendChild(pathElement);
      }
    });
  }

  /**
   * Render specific rectangle by layer
   */
  private renderRectangleByLayer(rectangles: Rectangle[], layer: Layer): number {
    if (!rectangles || rectangles.length === 0) {
      return -1;
    }

    const dynamicLayer = document.getElementById('dynamic-layer');
    if (!dynamicLayer) {
      return -1;
    }

    // Check if layer has a name property
    if (!layer?.name) {
      console.warn('Layer missing name property:', layer);
      return -1;
    }

    // Extract rectangle number from layer name (e.g., "矩形No1" -> number 1)
    const match = layer.name.match(/矩形No(\d+)/);
    if (match?.[1]) {
      const rectNumber = parseInt(match[1], 10) - 1; // Convert to 0-based index
      if (rectNumber < rectangles.length) {
        const rect = rectangles[rectNumber];
        if (!rect) {
          return -1;
        }
        const rectElement = this.createRectangleAnnotation(rect, rectNumber);
        dynamicLayer.appendChild(rectElement);
        return rectNumber;
      }
    }
    return -1;
  }

  /**
   * Render specific text by layer
   */
  private renderTextByLayer(texts: Text[], layer: Layer): number {
    if (!texts || texts.length === 0) {
      return -1;
    }

    const dynamicLayer = document.getElementById('dynamic-layer');
    if (!dynamicLayer) {
      return -1;
    }

    // Extract text from layer name
    const text = texts.find((t) => t.content === layer.name);
    if (text) {
      const index = texts.indexOf(text);
      const textElement = this.createTextAnnotation(text, index);
      dynamicLayer.appendChild(textElement);
      return index;
    }
    return -1;
  }

  /**
   * Render entities
   */
  private renderEntities(entities: Entity[], entityPositions: EntityPositions): void {
    const entitiesGroup = document.getElementById('entities-group');
    if (!entitiesGroup) {
      return;
    }

    entities.forEach((entity) => {
      const position = entityPositions[entity.name] || { x: 50, y: 50 };
      const entityElement = this.createEntityElement(entity, position);
      entitiesGroup.appendChild(entityElement);
    });
  }

  /**
   * Render relationships
   */
  private renderRelationships(
    relationships: Relationship[],
    entityPositions: EntityPositions,
    entities: Entity[],
  ): void {
    const relationshipsGroup = document.getElementById('relationships-group');
    if (!relationshipsGroup) {
      return;
    }

    // Update connection points with entity data
    if (entities) {
      this.connectionPoints.setERData({ entities, relationships: [] });
    }

    relationships.forEach((relationship) => {
      const pathElement = this.createRelationshipPath(relationship, entityPositions);
      if (pathElement) {
        relationshipsGroup.appendChild(pathElement);
      }
    });
  }

  /**
   * Render annotations (rectangles and texts)
   */
  private renderAnnotations(rectangles: Rectangle[], texts: Text[]): void {
    const annotationsGroup = document.getElementById('annotations-group');
    if (!annotationsGroup) {
      return;
    }

    // Render rectangles
    rectangles.forEach((rect, index) => {
      const rectElement = this.createRectangleAnnotation(rect, index);
      annotationsGroup.appendChild(rectElement);
    });

    // Render texts
    texts.forEach((text, index) => {
      const textElement = this.createTextAnnotation(text, index);
      annotationsGroup.appendChild(textElement);
    });
  }

  /**
   * Create entity element
   */
  private createEntityElement(entity: Entity, position: Position | undefined): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'entity');
    group.setAttribute('data-table', entity.name);
    const pos = position || { x: 50, y: 50 };
    group.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

    // Calculate entity dimensions
    const columnCount = entity.columns.length;
    const entityHeight =
      this.config.entity.headerHeight + columnCount * this.config.entity.columnHeight + this.config.entity.padding;
    const entityWidth = this.calculateEntityWidth(entity);

    // Background rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', entityWidth.toString());
    rect.setAttribute('height', entityHeight.toString());
    rect.setAttribute('rx', this.config.entity.borderRadius.toString());
    rect.setAttribute('fill', '#f8f9fa');
    rect.setAttribute('stroke', '#343a40');
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('filter', 'url(#entity-shadow)');
    group.appendChild(rect);

    // Header background
    const headerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    headerRect.setAttribute('width', entityWidth.toString());
    headerRect.setAttribute('height', this.config.entity.headerHeight.toString());
    headerRect.setAttribute('rx', this.config.entity.borderRadius.toString());
    headerRect.setAttribute('fill', '#343a40');
    group.appendChild(headerRect);

    // Entity name
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', (entityWidth / 2).toString());
    text.setAttribute('y', (this.config.entity.headerHeight / 2 + 4).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-weight', 'bold');
    text.textContent = entity.name;
    group.appendChild(text);

    // Columns
    entity.columns.forEach((column, index) => {
      const y = this.config.entity.headerHeight + index * this.config.entity.columnHeight + 15;

      // Column text
      const columnText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      columnText.setAttribute('x', '10');
      columnText.setAttribute('y', y.toString());
      columnText.setAttribute('fill', '#495057');
      columnText.setAttribute('font-size', '12');

      // Column name with key indicator
      let displayText = column.name;
      if (column.key === 'PRI') {
        displayText = '🔑 ' + displayText;
      } else if (column.key === 'MUL' || column.key === 'FK') {
        displayText = '🔗 ' + displayText;
      }
      columnText.textContent = displayText;
      group.appendChild(columnText);

      // Column type
      const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      typeText.setAttribute('x', (entityWidth - 10).toString());
      typeText.setAttribute('y', y.toString());
      typeText.setAttribute('text-anchor', 'end');
      typeText.setAttribute('fill', '#6c757d');
      typeText.setAttribute('font-size', '10');
      typeText.textContent = column.type;
      group.appendChild(typeText);
    });

    return group;
  }

  /**
   * Calculate entity width based on content
   */
  private calculateEntityWidth(entity: Entity): number {
    // Estimate width based on entity name and column content
    const nameWidth = entity.name.length * 8 + 40;
    const columnWidth = Math.max(...entity.columns.map((col) => (col.name.length + col.type.length) * 6 + 80));
    return Math.max(this.config.entity.minWidth, nameWidth, columnWidth);
  }

  /**
   * Create relationship path
   */
  private createRelationshipPath(relationship: Relationship, entityPositions: EntityPositions): SVGPathElement | null {
    const fromPos = entityPositions[relationship.from];
    const toPos = entityPositions[relationship.to];

    if (!fromPos || !toPos) {
      console.warn('Missing position for relationship:', relationship);
      return null;
    }

    // Get entity bounds
    const fromBounds = this.getEntityBounds(relationship.from, entityPositions);
    const toBounds = this.getEntityBounds(relationship.to, entityPositions);

    // Get optimal connection points
    const endpoints = this.connectionPoints.findOptimalConnectionPoints(fromBounds, toBounds, relationship);

    // Get routed path
    const path = this.smartRouting.findSmartPath(endpoints.from, endpoints.to);

    // Create path element
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', SVGUtils.pathPointsToSVG(path));
    pathElement.setAttribute('fill', 'none');
    pathElement.setAttribute('stroke', '#28a745');
    pathElement.setAttribute('stroke-width', this.config.relationship.strokeWidth.toString());
    pathElement.setAttribute('marker-end', 'url(#arrowhead)');
    pathElement.setAttribute('data-from', relationship.from);
    pathElement.setAttribute('data-to', relationship.to);
    pathElement.setAttribute('data-constraint', relationship.constraintName || '');

    return pathElement;
  }

  /**
   * Create rectangle annotation
   */
  private createRectangleAnnotation(rect: Rectangle, index: number): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'annotation-rectangle');
    group.setAttribute('data-annotation-type', 'rectangle');
    group.setAttribute('data-annotation-index', index.toString());

    const rectElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rectElement.setAttribute('x', rect.x.toString());
    rectElement.setAttribute('y', rect.y.toString());
    rectElement.setAttribute('width', rect.width.toString());
    rectElement.setAttribute('height', rect.height.toString());
    rectElement.setAttribute('fill', rect.color || this.config.annotation.rectangle.defaultFill);
    rectElement.setAttribute('stroke', rect.stroke || this.config.annotation.rectangle.defaultStroke);
    rectElement.setAttribute('stroke-width', this.config.annotation.rectangle.strokeWidth.toString());

    group.appendChild(rectElement);

    // Add resize handles
    this.addResizeHandles(group, rect);

    return group;
  }

  /**
   * Create text annotation
   */
  private createTextAnnotation(text: Text, index: number): SVGTextElement {
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElement.setAttribute('class', 'annotation-text');
    textElement.setAttribute('x', text.x.toString());
    textElement.setAttribute('y', text.y.toString());
    textElement.setAttribute('fill', text.color || this.config.annotation.text.defaultFill);
    textElement.setAttribute('font-size', (text.fontSize || this.config.annotation.text.fontSize).toString());
    textElement.setAttribute('font-family', this.config.annotation.text.fontFamily);
    textElement.setAttribute('data-annotation-type', 'text');
    textElement.setAttribute('data-annotation-index', index.toString());
    textElement.textContent = text.content;

    return textElement;
  }

  /**
   * Add resize handles to rectangle
   */
  private addResizeHandles(group: SVGGElement, rect: Rectangle): void {
    const handleSize = 6;
    const handles = [
      { position: 'nw', x: rect.x, y: rect.y },
      { position: 'ne', x: rect.x + rect.width, y: rect.y },
      { position: 'sw', x: rect.x, y: rect.y + rect.height },
      { position: 'se', x: rect.x + rect.width, y: rect.y + rect.height },
    ];

    handles.forEach((handle) => {
      const handleElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      handleElement.setAttribute('class', 'resize-handle');
      handleElement.setAttribute('data-handle-position', handle.position);
      handleElement.setAttribute('x', (handle.x - handleSize / 2).toString());
      handleElement.setAttribute('y', (handle.y - handleSize / 2).toString());
      handleElement.setAttribute('width', handleSize.toString());
      handleElement.setAttribute('height', handleSize.toString());
      handleElement.setAttribute('fill', '#007bff');
      handleElement.setAttribute('stroke', '#ffffff');
      handleElement.setAttribute('stroke-width', '1');
      handleElement.setAttribute('cursor', `${handle.position}-resize`);
      handleElement.style.display = 'none'; // Initially hidden
      group.appendChild(handleElement);
    });
  }

  /**
   * Create arrow markers
   */
  private createArrowMarkers(defs: SVGDefsElement): void {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3, 0 6');
    polygon.setAttribute('fill', '#28a745');

    marker.appendChild(polygon);
    defs.appendChild(marker);
  }

  /**
   * Create filters for visual effects
   */
  private createFilters(defs: SVGDefsElement): void {
    // Entity shadow filter
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'entity-shadow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
    feDropShadow.setAttribute('dx', '2');
    feDropShadow.setAttribute('dy', '2');
    feDropShadow.setAttribute('stdDeviation', '3');
    feDropShadow.setAttribute('flood-opacity', '0.3');

    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
  }

  // Method removed - was unused

  /**
   * Get bounds for a specific entity
   */
  private getEntityBounds(entityName: string, entityPositions: EntityPositions): EntityBounds {
    const position = entityPositions[entityName];
    if (!position) {
      // Return default bounds if position not found
      return {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        left: 0,
        top: 0,
        right: 100,
        bottom: 50,
        centerX: 50,
        centerY: 25,
      };
    }
    const dimensions = this.getEntityDimensions(entityName);
    return {
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      left: position.x,
      top: position.y,
      right: position.x + dimensions.width,
      bottom: position.y + dimensions.height,
      centerX: position.x + dimensions.width / 2,
      centerY: position.y + dimensions.height / 2,
    };
  }

  /**
   * Get dimensions for an entity by name
   */
  private getEntityDimensions(entityName: string): { width: number; height: number } {
    // Try to find existing entity element to get actual dimensions
    const entityElement = document.querySelector(`[data-table="${entityName}"]`);
    if (entityElement) {
      const rect = entityElement.querySelector('rect');
      if (rect) {
        return {
          width: parseFloat(rect.getAttribute('width') || '0'),
          height: parseFloat(rect.getAttribute('height') || '0'),
        };
      }
    }

    // Fallback to default dimensions
    return {
      width: this.config.entity.minWidth,
      height: this.config.entity.minHeight,
    };
  }

  /**
   * Resize canvas to fit container
   */
  public resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.setAttribute('width', container.clientWidth.toString());
      this.canvas.setAttribute('height', container.clientHeight.toString());
      // Re-render to fit new size if data exists
      if (this.currentERData && this.currentLayoutData) {
        this.renderER(this.currentERData, this.currentLayoutData, this.layerManager);
      }
    }
  }
}
