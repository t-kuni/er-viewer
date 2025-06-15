/**
 * Centralized event management system
 * Handles all canvas events, interaction modes, and event delegation
 */
export class EventController {
    constructor(canvas, stateManager, coordinateTransform) {
        this.canvas = canvas;
        this.stateManager = stateManager;
        this.coordinateTransform = coordinateTransform;
        
        // Event delegation map
        this.eventHandlers = new Map();
        
        // Interaction state
        this.dragThreshold = 5; // pixels
        this.dragStartPoint = null;
        this.dragCurrentPoint = null;
        this.hasDragMovement = false;
        
        // Event handler bindings
        this.boundHandlers = {
            wheel: this.handleWheel.bind(this),
            mousedown: this.handleMouseDown.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            click: this.handleClick.bind(this),
            dblclick: this.handleDoubleClick.bind(this),
            contextmenu: this.handleContextMenu.bind(this),
            keydown: this.handleKeyDown.bind(this),
            keyup: this.handleKeyUp.bind(this)
        };
        
        this.initializeEventListeners();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener('wheel', this.boundHandlers.wheel);
        this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
        this.canvas.addEventListener('click', this.boundHandlers.click);
        this.canvas.addEventListener('dblclick', this.boundHandlers.dblclick);
        this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
        
        // Global keyboard events
        document.addEventListener('keydown', this.boundHandlers.keydown);
        document.addEventListener('keyup', this.boundHandlers.keyup);
    }

    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
        this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
        this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
        this.canvas.removeEventListener('click', this.boundHandlers.click);
        this.canvas.removeEventListener('dblclick', this.boundHandlers.dblclick);
        this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
        
        document.removeEventListener('keydown', this.boundHandlers.keydown);
        document.removeEventListener('keyup', this.boundHandlers.keyup);
    }

    /**
     * Register event handler for specific event type and element
     * @param {string} eventType - Event type (e.g., 'click', 'mouseover')
     * @param {string} selector - Element selector or class
     * @param {Function} handler - Event handler function
     */
    registerHandler(eventType, selector, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Map());
        }
        this.eventHandlers.get(eventType).set(selector, handler);
    }

    /**
     * Delegate event to appropriate handler
     * @param {Event} event - DOM event
     * @param {string} eventType - Event type
     */
    delegateEvent(event, eventType) {
        if (!this.eventHandlers.has(eventType)) return false;
        
        const handlers = this.eventHandlers.get(eventType);
        let target = event.target;
        
        // Walk up the DOM tree to find matching handlers
        while (target && target !== this.canvas) {
            for (const [selector, handler] of handlers) {
                if (target.matches && target.matches(selector)) {
                    return handler(event, target);
                }
                if (target.classList && target.classList.contains(selector)) {
                    return handler(event, target);
                }
            }
            target = target.parentElement;
        }
        
        return false;
    }

    /**
     * Handle wheel events (zoom)
     * @param {WheelEvent} event - Wheel event
     */
    handleWheel(event) {
        event.preventDefault();
        
        const currentState = this.stateManager.getState();
        const { viewport } = currentState;
        
        // Calculate zoom
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, viewport.scale * zoomFactor));
        
        // Calculate zoom center point
        const mousePos = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas, viewport
        );
        
        // Calculate new pan to keep mouse position stable
        const newPanX = viewport.panX - (mousePos.x * (newScale - viewport.scale));
        const newPanY = viewport.panY - (mousePos.y * (newScale - viewport.scale));
        
        // Update state
        this.stateManager.updateViewport(newPanX, newPanY, newScale);
        this.coordinateTransform.updateViewport(newPanX, newPanY, newScale);
    }

    /**
     * Handle mouse down events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        event.preventDefault();
        
        // Check for delegated handlers first
        if (this.delegateEvent(event, 'mousedown')) {
            return;
        }
        
        const currentState = this.stateManager.getState();
        
        // Start drag tracking
        this.dragStartPoint = { x: event.clientX, y: event.clientY };
        this.dragCurrentPoint = { x: event.clientX, y: event.clientY };
        this.hasDragMovement = false;
        
        // Handle different interaction modes
        switch (currentState.interactionMode) {
            case 'creating-rectangle':
                this.startRectangleCreation(event);
                break;
            case 'creating-text':
                this.startTextCreation(event);
                break;
            default:
                this.startPanning(event);
                break;
        }
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        const currentState = this.stateManager.getState();
        
        // Update drag tracking
        if (this.dragStartPoint) {
            this.dragCurrentPoint = { x: event.clientX, y: event.clientY };
            
            const dragDistance = this.coordinateTransform.distance(
                this.dragStartPoint, this.dragCurrentPoint
            );
            
            if (dragDistance > this.dragThreshold) {
                this.hasDragMovement = true;
            }
        }
        
        // Handle interaction modes
        switch (currentState.interactionMode) {
            case 'panning':
                this.handlePanning(event);
                break;
            case 'dragging-entity':
                this.handleEntityDragging(event);
                break;
            case 'creating-rectangle':
                this.handleRectangleCreation(event);
                break;
            default:
                // Check for hover effects
                this.handleHover(event);
                break;
        }
    }

    /**
     * Handle mouse up events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        const currentState = this.stateManager.getState();
        
        // Handle interaction modes
        switch (currentState.interactionMode) {
            case 'panning':
                this.endPanning();
                break;
            case 'dragging-entity':
                this.endEntityDragging(event);
                break;
            case 'creating-rectangle':
                this.endRectangleCreation(event);
                break;
        }
        
        // Reset drag tracking
        this.dragStartPoint = null;
        this.dragCurrentPoint = null;
        this.hasDragMovement = false;
    }

    /**
     * Handle click events
     * @param {MouseEvent} event - Mouse event
     */
    handleClick(event) {
        // Don't trigger click if we were dragging
        if (this.hasDragMovement) {
            return;
        }
        
        // Check for delegated handlers first
        if (this.delegateEvent(event, 'click')) {
            return;
        }
        
        // Handle entity clicks
        const entityElement = event.target.closest('.entity');
        if (entityElement) {
            this.handleEntityClick(event, entityElement);
            return;
        }
        
        // Handle relationship clicks
        const relationshipElement = event.target.closest('.relationship');
        if (relationshipElement) {
            this.handleRelationshipClick(event, relationshipElement);
            return;
        }
        
        // Handle canvas background click
        this.handleCanvasClick(event);
    }

    /**
     * Handle double click events
     * @param {MouseEvent} event - Mouse event
     */
    handleDoubleClick(event) {
        event.preventDefault();
        
        // Check for delegated handlers first
        if (this.delegateEvent(event, 'dblclick')) {
            return;
        }
        
        // Handle entity double-click
        const entityElement = event.target.closest('.entity');
        if (entityElement) {
            this.handleEntityDoubleClick(event, entityElement);
        }
    }

    /**
     * Handle context menu events
     * @param {MouseEvent} event - Mouse event
     */
    handleContextMenu(event) {
        event.preventDefault();
        
        // Check for delegated handlers first
        if (this.delegateEvent(event, 'contextmenu')) {
            return;
        }
        
        // Show context menu
        this.showContextMenu(event);
    }

    /**
     * Handle keyboard down events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        const currentState = this.stateManager.getState();
        
        // Handle global shortcuts
        switch (event.key) {
            case 'Escape':
                this.handleEscape();
                break;
            case 'Delete':
            case 'Backspace':
                this.handleDelete();
                break;
            case 'z':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (event.shiftKey) {
                        this.stateManager.redo();
                    } else {
                        this.stateManager.undo();
                    }
                }
                break;
            case 'r':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.stateManager.setInteractionMode('creating-rectangle');
                }
                break;
            case 't':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.stateManager.setInteractionMode('creating-text');
                }
                break;
        }
    }

    /**
     * Handle keyboard up events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
        // Handle key release events if needed
    }

    // Interaction mode handlers

    /**
     * Start panning mode
     * @param {MouseEvent} event - Mouse event
     */
    startPanning(event) {
        this.stateManager.setInteractionMode('panning', {
            startViewport: { ...this.stateManager.get('viewport') },
            startMouse: { x: event.clientX, y: event.clientY }
        });
    }

    /**
     * Handle panning movement
     * @param {MouseEvent} event - Mouse event
     */
    handlePanning(event) {
        const dragState = this.stateManager.get('dragState');
        if (!dragState) return;
        
        const deltaX = event.clientX - dragState.startMouse.x;
        const deltaY = event.clientY - dragState.startMouse.y;
        
        const newPanX = dragState.startViewport.panX + deltaX;
        const newPanY = dragState.startViewport.panY + deltaY;
        
        this.stateManager.updateViewport(
            newPanX, newPanY, dragState.startViewport.scale
        );
        this.coordinateTransform.updateViewport(
            newPanX, newPanY, dragState.startViewport.scale
        );
    }

    /**
     * End panning mode
     */
    endPanning() {
        this.stateManager.setInteractionMode('default');
    }

    /**
     * Start entity dragging
     * @param {MouseEvent} event - Mouse event
     * @param {Element} entityElement - Entity DOM element
     */
    startEntityDragging(event, entityElement) {
        const tableName = entityElement.getAttribute('data-table');
        const currentState = this.stateManager.getState();
        const entityPos = currentState.layoutData.entities[tableName];
        
        if (!entityPos) return;
        
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        this.stateManager.setInteractionMode('dragging-entity', {
            tableName,
            startPosition: { ...entityPos },
            startMouse: svgPoint,
            offset: {
                x: svgPoint.x - entityPos.x,
                y: svgPoint.y - entityPos.y
            }
        });
    }

    /**
     * Handle entity dragging movement
     * @param {MouseEvent} event - Mouse event
     */
    handleEntityDragging(event) {
        const dragState = this.stateManager.get('dragState');
        if (!dragState) return;
        
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        const newPosition = {
            x: svgPoint.x - dragState.offset.x,
            y: svgPoint.y - dragState.offset.y
        };
        
        // Update entity position in layout data
        const currentState = this.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        newLayoutData.entities[dragState.tableName] = newPosition;
        
        this.stateManager.updateLayoutData(newLayoutData);
    }

    /**
     * End entity dragging
     * @param {MouseEvent} event - Mouse event
     */
    endEntityDragging(event) {
        this.stateManager.setInteractionMode('default');
    }

    /**
     * Start rectangle creation
     * @param {MouseEvent} event - Mouse event
     */
    startRectangleCreation(event) {
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        this.stateManager.setInteractionMode('creating-rectangle', {
            startPoint: svgPoint,
            currentRect: {
                x: svgPoint.x,
                y: svgPoint.y,
                width: 0,
                height: 0
            }
        });
    }

    /**
     * Handle rectangle creation movement
     * @param {MouseEvent} event - Mouse event
     */
    handleRectangleCreation(event) {
        const dragState = this.stateManager.get('dragState');
        if (!dragState) return;
        
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        const rect = {
            x: Math.min(dragState.startPoint.x, svgPoint.x),
            y: Math.min(dragState.startPoint.y, svgPoint.y),
            width: Math.abs(svgPoint.x - dragState.startPoint.x),
            height: Math.abs(svgPoint.y - dragState.startPoint.y)
        };
        
        // Update drag state with current rectangle
        this.stateManager.setInteractionMode('creating-rectangle', {
            ...dragState,
            currentRect: rect
        });
    }

    /**
     * End rectangle creation
     * @param {MouseEvent} event - Mouse event
     */
    endRectangleCreation(event) {
        const dragState = this.stateManager.get('dragState');
        if (!dragState || !this.hasDragMovement) {
            this.stateManager.setInteractionMode('default');
            return;
        }
        
        // Add rectangle to layout data
        const currentState = this.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        newLayoutData.rectangles.push(dragState.currentRect);
        
        this.stateManager.updateLayoutData(newLayoutData);
        this.stateManager.setInteractionMode('default');
    }

    // Event-specific handlers

    /**
     * Handle entity click
     * @param {MouseEvent} event - Mouse event
     * @param {Element} entityElement - Entity DOM element
     */
    handleEntityClick(event, entityElement) {
        const tableName = entityElement.getAttribute('data-table');
        console.log('Entity clicked:', tableName);
        
        // Emit custom event for entity click
        this.emit('entity-click', { tableName, event });
    }

    /**
     * Handle entity double-click
     * @param {MouseEvent} event - Mouse event
     * @param {Element} entityElement - Entity DOM element
     */
    handleEntityDoubleClick(event, entityElement) {
        const tableName = entityElement.getAttribute('data-table');
        console.log('Entity double-clicked:', tableName);
        
        // Emit custom event for entity double-click
        this.emit('entity-dblclick', { tableName, event });
    }

    /**
     * Handle relationship click
     * @param {MouseEvent} event - Mouse event
     * @param {Element} relationshipElement - Relationship DOM element
     */
    handleRelationshipClick(event, relationshipElement) {
        const fromTable = relationshipElement.getAttribute('data-from');
        const toTable = relationshipElement.getAttribute('data-to');
        
        console.log('Relationship clicked:', fromTable, '->', toTable);
        
        // Emit custom event for relationship click
        this.emit('relationship-click', { fromTable, toTable, event });
    }

    /**
     * Handle canvas background click
     * @param {MouseEvent} event - Mouse event
     */
    handleCanvasClick(event) {
        // Clear selections
        this.stateManager.setState({ selectedAnnotation: null });
        
        // Emit custom event for canvas click
        this.emit('canvas-click', { event });
    }

    /**
     * Handle hover effects
     * @param {MouseEvent} event - Mouse event
     */
    handleHover(event) {
        // Implement hover highlighting logic
        // This could be delegated to the HighlightManager
    }

    /**
     * Show context menu
     * @param {MouseEvent} event - Mouse event
     */
    showContextMenu(event) {
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        // Emit custom event for context menu
        this.emit('context-menu', { 
            screenX: event.clientX, 
            screenY: event.clientY,
            svgX: svgPoint.x,
            svgY: svgPoint.y,
            event 
        });
    }

    /**
     * Handle escape key
     */
    handleEscape() {
        this.stateManager.setInteractionMode('default');
        this.stateManager.setState({ selectedAnnotation: null });
    }

    /**
     * Handle delete key
     */
    handleDelete() {
        const selectedAnnotation = this.stateManager.get('selectedAnnotation');
        if (selectedAnnotation) {
            // Emit custom event for annotation deletion
            this.emit('delete-annotation', { selectedAnnotation });
        }
    }

    // Event emitter functionality

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    emit(eventName, data) {
        const customEvent = new CustomEvent(eventName, { detail: data });
        this.canvas.dispatchEvent(customEvent);
    }

    /**
     * Add custom event listener
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     */
    on(eventName, handler) {
        this.canvas.addEventListener(eventName, handler);
    }

    /**
     * Remove custom event listener
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     */
    off(eventName, handler) {
        this.canvas.removeEventListener(eventName, handler);
    }
}