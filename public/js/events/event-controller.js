/**
 * Centralized event management system
 * Handles all canvas events, interaction modes, and event delegation
 */
export class EventController {
    constructor(canvas, stateManager, coordinateTransform, highlightManager, layerManager = null) {
        this.canvas = canvas;
        this.stateManager = stateManager;
        this.coordinateTransform = coordinateTransform;
        this.highlightManager = highlightManager;
        this.layerManager = layerManager;
        
        // Event delegation map
        this.eventHandlers = new Map();
        
        // Interaction state
        this.dragThreshold = 5; // pixels
        this.dragStartPoint = null;
        this.dragCurrentPoint = null;
        this.hasDragMovement = false;
        this.lastHadDragMovement = false;
        
        // Rectangle selection state
        this.selectedRectangle = null;
        
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
                // Check if user clicked on a resize handle first
                const resizeHandle = event.target && event.target.classList && event.target.classList.contains('resize-handle') ? event.target : null;
                if (resizeHandle) {
                    this.startRectangleResizing(event, resizeHandle);
                } else {
                    // Check if user clicked on a text annotation
                    const textElement = event.target && event.target.closest ? event.target.closest('.annotation-text') : null;
                    if (textElement) {
                        this.startTextDragging(event, textElement);
                    } else {
                        // Check if user clicked on a rectangle or rectangle group
                        const rectangleElement = event.target && event.target.closest ? (
                            event.target.closest('.annotation-rectangle') || 
                            event.target.closest('.annotation-rectangle-group')
                        ) : null;
                        if (rectangleElement) {
                            this.startRectangleDragging(event, rectangleElement);
                        } else {
                            // Check if user clicked on an entity
                            const entityElement = event.target && event.target.closest ? event.target.closest('.entity') : null;
                            if (entityElement) {
                                this.startEntityDragging(event, entityElement);
                            } else {
                                this.clearRectangleSelection();
                                this.startPanning(event);
                            }
                        }
                    }
                }
                break;
        }
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        // Update drag tracking (this happens regardless of interaction mode)
        if (this.dragStartPoint) {
            this.dragCurrentPoint = { x: event.clientX, y: event.clientY };
            
            const dragDistance = this.coordinateTransform.distance(
                this.dragStartPoint, this.dragCurrentPoint
            );
            
            if (dragDistance > this.dragThreshold) {
                this.hasDragMovement = true;
            }
        }
        
        const currentState = this.stateManager.getState();
        
        // Handle interaction modes
        switch (currentState.interactionMode) {
            case 'panning':
                this.handlePanning(event);
                break;
            case 'dragging-entity':
                this.handleEntityDragging(event);
                break;
            case 'dragging-text':
                this.handleTextDragging(event);
                break;
            case 'dragging-rectangle':
                this.handleRectangleDragging(event);
                break;
            case 'resizing-rectangle':
                this.handleRectangleResizing(event);
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
            case 'dragging-text':
                this.endTextDragging(event);
                break;
            case 'dragging-rectangle':
                this.endRectangleDragging(event);
                break;
            case 'resizing-rectangle':
                this.endRectangleResizing(event);
                break;
            case 'creating-rectangle':
                this.endRectangleCreation(event);
                break;
        }
        
        // Store drag movement state for click detection
        this.lastHadDragMovement = this.hasDragMovement;
        
        // Reset drag tracking
        this.dragStartPoint = null;
        this.dragCurrentPoint = null;
        this.hasDragMovement = false;
        
        // Reset the drag movement flag after a short delay to allow click handler to see it
        setTimeout(() => {
            this.lastHadDragMovement = false;
        }, 10);
    }

    /**
     * Handle click events
     * @param {MouseEvent} event - Mouse event
     */
    handleClick(event) {
        // Don't trigger click if we were dragging
        if (this.hasDragMovement || this.lastHadDragMovement) {
            return;
        }
        
        // Check for delegated handlers first
        if (this.delegateEvent(event, 'click')) {
            return;
        }
        
        // Handle entity clicks (prioritize entities over text annotations)
        if (event.target && event.target.closest) {
            const entityElement = event.target.closest('.entity');
            if (entityElement) {
                this.handleEntityClick(event, entityElement);
                return;
            }
        }
        
        // Handle text clicks
        if (event.target && event.target.closest) {
            const textElement = event.target.closest('.annotation-text');
            if (textElement) {
                this.handleTextClick(event, textElement);
                return;
            }
        }
        
        // Handle relationship clicks
        if (event.target && event.target.closest) {
            const relationshipElement = event.target.closest('.relationship');
            if (relationshipElement) {
                this.handleRelationshipClick(event, relationshipElement);
                return;
            }
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
        if (event.target && event.target.closest) {
            const entityElement = event.target.closest('.entity');
            if (entityElement) {
                this.handleEntityDoubleClick(event, entityElement);
            }
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
        
        // Handle global shortcuts - prevent default first for custom shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'r':
                    event.preventDefault();
                    event.stopPropagation();
                    console.log('Ctrl+R pressed - entering rectangle creation mode');
                    this.stateManager.setInteractionMode('creating-rectangle');
                    return;
                case 't':
                    event.preventDefault();
                    event.stopPropagation();
                    this.stateManager.setInteractionMode('creating-text');
                    return;
                case 'z':
                    event.preventDefault();
                    if (event.shiftKey) {
                        this.stateManager.redo();
                    } else {
                        this.stateManager.undo();
                    }
                    return;
            }
        }
        
        // Handle other shortcuts
        switch (event.key) {
            case 'Escape':
                this.handleEscape();
                break;
            case 'Delete':
            case 'Backspace':
                this.handleDelete();
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
        let entityPos = currentState.layoutData.entities[tableName];
        
        // If entity doesn't have a position, get it from the DOM element
        if (!entityPos) {
            const transform = entityElement.getAttribute('transform');
            const match = transform ? transform.match(/translate\(([^,]+),\s*([^)]+)\)/) : null;
            if (match) {
                entityPos = {
                    x: parseFloat(match[1]),
                    y: parseFloat(match[2])
                };
            } else {
                // Fallback to default position
                entityPos = { x: 0, y: 0 };
            }
        }
        
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
     * Start rectangle dragging
     * @param {MouseEvent} event - Mouse event
     * @param {Element} rectangleElement - Rectangle DOM element
     */
    startRectangleDragging(event, rectangleElement) {
        const rectangleIndex = parseInt(rectangleElement.getAttribute('data-index'));
        const currentState = this.stateManager.getState();
        const rectangleData = currentState.layoutData.rectangles[rectangleIndex];
        
        if (!rectangleData) return;
        
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        this.stateManager.setInteractionMode('dragging-rectangle', {
            rectangleIndex,
            startPosition: { x: rectangleData.x, y: rectangleData.y },
            startMouse: svgPoint,
            offset: {
                x: svgPoint.x - rectangleData.x,
                y: svgPoint.y - rectangleData.y
            }
        });
        
        // Show resize handles for the selected rectangle
        this.showRectangleResizeHandles(rectangleIndex);
    }

    /**
     * Handle rectangle dragging movement
     * @param {MouseEvent} event - Mouse event
     */
    handleRectangleDragging(event) {
        const dragState = this.stateManager.get('dragState');
        if (!dragState) return;
        
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        const newPosition = {
            x: svgPoint.x - dragState.offset.x,
            y: svgPoint.y - dragState.offset.y
        };
        
        // Update rectangle position in layout data
        const currentState = this.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        newLayoutData.rectangles = [...newLayoutData.rectangles];
        newLayoutData.rectangles[dragState.rectangleIndex] = {
            ...newLayoutData.rectangles[dragState.rectangleIndex],
            x: newPosition.x,
            y: newPosition.y
        };
        
        this.stateManager.updateLayoutData(newLayoutData);
    }

    /**
     * End rectangle dragging
     * @param {MouseEvent} event - Mouse event
     */
    endRectangleDragging(event) {
        this.stateManager.setInteractionMode('default');
    }

    /**
     * Start rectangle resizing
     * @param {MouseEvent} event - Mouse event
     * @param {Element} resizeHandle - Resize handle element
     */
    startRectangleResizing(event, resizeHandle) {
        const rectangleIndex = parseInt(resizeHandle.getAttribute('data-rectangle-index'));
        const handleType = resizeHandle.getAttribute('data-handle-type');
        const currentState = this.stateManager.getState();
        const rectangleData = currentState.layoutData.rectangles[rectangleIndex];
        
        if (!rectangleData) return;
        
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        this.stateManager.setInteractionMode('resizing-rectangle', {
            rectangleIndex,
            handleType,
            startMouse: svgPoint,
            originalRect: {
                x: rectangleData.x,
                y: rectangleData.y,
                width: rectangleData.width,
                height: rectangleData.height
            }
        });
    }

    /**
     * Handle rectangle resizing movement
     * @param {MouseEvent} event - Mouse event
     */
    handleRectangleResizing(event) {
        const dragState = this.stateManager.get('dragState');
        if (!dragState) return;
        
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        const deltaX = svgPoint.x - dragState.startMouse.x;
        const deltaY = svgPoint.y - dragState.startMouse.y;
        
        const newRect = this.calculateNewRectangleSize(
            dragState.originalRect, 
            dragState.handleType, 
            deltaX, 
            deltaY
        );
        
        // Update rectangle in layout data
        const currentState = this.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        newLayoutData.rectangles = [...newLayoutData.rectangles];
        newLayoutData.rectangles[dragState.rectangleIndex] = {
            ...newLayoutData.rectangles[dragState.rectangleIndex],
            ...newRect
        };
        
        this.stateManager.updateLayoutData(newLayoutData);
    }

    /**
     * Calculate new rectangle size based on handle type and mouse movement
     * @param {Object} originalRect - Original rectangle dimensions
     * @param {string} handleType - Type of resize handle
     * @param {number} deltaX - X movement delta
     * @param {number} deltaY - Y movement delta
     * @returns {Object} New rectangle dimensions
     */
    calculateNewRectangleSize(originalRect, handleType, deltaX, deltaY) {
        const minSize = 10; // Minimum width/height
        let newRect = { ...originalRect };
        
        switch (handleType) {
            case 'nw': // Top-left
                newRect.x = originalRect.x + deltaX;
                newRect.y = originalRect.y + deltaY;
                newRect.width = Math.max(minSize, originalRect.width - deltaX);
                newRect.height = Math.max(minSize, originalRect.height - deltaY);
                break;
            case 'n': // Top
                newRect.y = originalRect.y + deltaY;
                newRect.height = Math.max(minSize, originalRect.height - deltaY);
                break;
            case 'ne': // Top-right
                newRect.y = originalRect.y + deltaY;
                newRect.width = Math.max(minSize, originalRect.width + deltaX);
                newRect.height = Math.max(minSize, originalRect.height - deltaY);
                break;
            case 'e': // Right
                newRect.width = Math.max(minSize, originalRect.width + deltaX);
                break;
            case 'se': // Bottom-right
                newRect.width = Math.max(minSize, originalRect.width + deltaX);
                newRect.height = Math.max(minSize, originalRect.height + deltaY);
                break;
            case 's': // Bottom
                newRect.height = Math.max(minSize, originalRect.height + deltaY);
                break;
            case 'sw': // Bottom-left
                newRect.x = originalRect.x + deltaX;
                newRect.width = Math.max(minSize, originalRect.width - deltaX);
                newRect.height = Math.max(minSize, originalRect.height + deltaY);
                break;
            case 'w': // Left
                newRect.x = originalRect.x + deltaX;
                newRect.width = Math.max(minSize, originalRect.width - deltaX);
                break;
        }
        
        return newRect;
    }

    /**
     * End rectangle resizing
     * @param {MouseEvent} event - Mouse event
     */
    endRectangleResizing(event) {
        this.stateManager.setInteractionMode('default');
    }

    /**
     * Show resize handles for a rectangle
     * @param {number} rectangleIndex - Index of rectangle to show handles for
     */
    showRectangleResizeHandles(rectangleIndex) {
        // Hide all resize handles first
        this.hideAllResizeHandles();
        
        // Show handles for the selected rectangle
        const handles = document.querySelectorAll(`[data-rectangle-index="${rectangleIndex}"].resize-handle`);
        handles.forEach(handle => {
            handle.style.display = 'block';
        });
        
        this.selectedRectangle = rectangleIndex;
    }

    /**
     * Hide all resize handles
     */
    hideAllResizeHandles() {
        const handles = document.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.style.display = 'none';
        });
    }

    /**
     * Clear rectangle selection
     */
    clearRectangleSelection() {
        this.hideAllResizeHandles();
        this.selectedRectangle = null;
    }

    /**
     * Start rectangle creation
     * @param {MouseEvent} event - Mouse event
     */
    startRectangleCreation(event) {
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        console.log('Starting rectangle creation at:', svgPoint);
        
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
     * Start text creation
     * @param {MouseEvent} event - Mouse event
     */
    startTextCreation(event) {
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        console.log('Starting text creation at:', svgPoint);
        
        // Prompt user for text input
        const textContent = prompt('テキストを入力してください:');
        if (textContent && textContent.trim()) {
            // Create text annotation
            const textAnnotation = {
                x: svgPoint.x,
                y: svgPoint.y,
                content: textContent.trim(),
                color: '#2c3e50',
                size: 14
            };
            
            // Add text to layout data
            const currentState = this.stateManager.getState();
            const newLayoutData = { ...currentState.layoutData };
            if (!newLayoutData.texts) {
                newLayoutData.texts = [];
            }
            newLayoutData.texts.push(textAnnotation);
            
            this.stateManager.updateLayoutData(newLayoutData);
            
            // Add layer for new text (ensure layer manager is called even for subsequent texts)
            if (this.layerManager) {
                console.log('Adding text layer for:', textContent.trim());
                this.layerManager.addTextLayer(textContent.trim());
            } else {
                console.warn('LayerManager not available when adding text');
            }
            
            console.log('Text annotation created:', textAnnotation);
        }
        
        this.stateManager.setInteractionMode('default');
    }

    /**
     * End rectangle creation
     * @param {MouseEvent} event - Mouse event
     */
    endRectangleCreation(event) {
        const dragState = this.stateManager.get('dragState');
        if (!dragState) {
            console.log('Rectangle creation ended without drag state');
            this.stateManager.setInteractionMode('default');
            return;
        }
        
        // If no drag movement, create a default-sized rectangle at the start point
        let rectToAdd;
        if (!this.hasDragMovement) {
            console.log('Rectangle creation with minimal drag - creating default size rectangle');
            rectToAdd = {
                x: dragState.startPoint.x,
                y: dragState.startPoint.y,
                width: 100,
                height: 60,
                fill: '#e3f2fd',
                stroke: '#1976d2',
                strokeWidth: 2
            };
        } else {
            console.log('Ending rectangle creation, adding to layout:', dragState.currentRect);
            rectToAdd = dragState.currentRect;
        }
        
        // Add rectangle to layout data
        const currentState = this.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        if (!newLayoutData.rectangles) {
            newLayoutData.rectangles = [];
        }
        newLayoutData.rectangles.push(rectToAdd);
        
        this.stateManager.updateLayoutData(newLayoutData);
        
        // Add layer for new rectangle
        if (this.layerManager) {
            const rectangleNumber = newLayoutData.rectangles.length; // Use 1-based numbering
            this.layerManager.addRectangleLayer(rectangleNumber);
        }
        
        this.stateManager.setInteractionMode('default');
    }

    // Text interaction handlers

    /**
     * Start text dragging
     * @param {MouseEvent} event - Mouse event
     * @param {Element} textElement - Text DOM element
     */
    startTextDragging(event, textElement) {
        const textIndex = parseInt(textElement.getAttribute('data-index'));
        const currentState = this.stateManager.getState();
        const textData = currentState.layoutData.texts && currentState.layoutData.texts[textIndex];
        
        if (!textData) return;
        
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        this.stateManager.setInteractionMode('dragging-text', {
            textIndex,
            startPosition: { x: textData.x, y: textData.y },
            startMouse: svgPoint,
            offset: {
                x: svgPoint.x - textData.x,
                y: svgPoint.y - textData.y
            }
        });
        
        // Select the text
        this.stateManager.setState({ selectedAnnotation: { type: 'text', index: textIndex } });
    }

    /**
     * Handle text dragging movement
     * @param {MouseEvent} event - Mouse event
     */
    handleTextDragging(event) {
        const dragState = this.stateManager.get('dragState');
        if (!dragState) return;
        
        const svgPoint = this.coordinateTransform.screenToSVG(
            event.clientX, event.clientY, this.canvas
        );
        
        const newPosition = {
            x: svgPoint.x - dragState.offset.x,
            y: svgPoint.y - dragState.offset.y
        };
        
        // Update text position in layout data
        const currentState = this.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        if (newLayoutData.texts && newLayoutData.texts[dragState.textIndex]) {
            newLayoutData.texts = [...newLayoutData.texts];
            newLayoutData.texts[dragState.textIndex] = {
                ...newLayoutData.texts[dragState.textIndex],
                x: newPosition.x,
                y: newPosition.y
            };
            
            this.stateManager.updateLayoutData(newLayoutData);
        }
    }

    /**
     * End text dragging
     * @param {MouseEvent} event - Mouse event
     */
    endTextDragging(event) {
        this.stateManager.setInteractionMode('default');
    }

    /**
     * Handle text click
     * @param {MouseEvent} event - Mouse event
     * @param {Element} textElement - Text DOM element
     */
    handleTextClick(event, textElement) {
        const textIndex = parseInt(textElement.getAttribute('data-index'));
        console.log('Text clicked:', textIndex);
        
        // Select the text
        this.stateManager.setState({ selectedAnnotation: { type: 'text', index: textIndex } });
        
        // Emit custom event for text click
        this.emit('text-click', { textIndex, event });
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
        let hoverTarget = null;
        
        // Check if hovering over an entity
        if (event.target && event.target.closest) {
            const entityElement = event.target.closest('.entity');
            if (entityElement) {
                hoverTarget = entityElement;
            } else {
                // Check if hovering over a relationship
                const relationshipElement = event.target.closest('.relationship');
                if (relationshipElement) {
                    hoverTarget = relationshipElement;
                }
            }
        }
        
        // Delegate to highlight manager
        if (this.highlightManager) {
            this.highlightManager.handleHover(hoverTarget);
        }
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
            target: event.target,
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