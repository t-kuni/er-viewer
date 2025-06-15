// Mouse event handler
import { SVGUtils } from '../utils/svg-utils.js';

export class MouseHandler {
    constructor(erViewer) {
        this.viewer = erViewer;
        this.isDragging = false;
        this.dragTarget = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isPanning = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeTarget = null;
        this.lastPanPoint = { x: 0, y: 0 };
    }

    handleWheel(e) {
        e.preventDefault();
        const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(0.1, Math.min(3, this.viewer.scale * scaleFactor));
        
        if (newScale !== this.viewer.scale) {
            const rect = this.viewer.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            this.viewer.panX = mouseX - (mouseX - this.viewer.panX) * (newScale / this.viewer.scale);
            this.viewer.panY = mouseY - (mouseY - this.viewer.panY) * (newScale / this.viewer.scale);
            this.viewer.scale = newScale;
            
            this.viewer.updateTransform();
        }
    }

    handleMouseDown(e) {
        const rect = this.viewer.canvas.getBoundingClientRect();
        const svgPoint = SVGUtils.screenToSVG(
            e.clientX - rect.left, 
            e.clientY - rect.top,
            this.viewer.canvas,
            this.viewer.panX,
            this.viewer.panY,
            this.viewer.scale
        );

        const target = e.target.closest('.entity, .custom-rectangle, .custom-text, .resize-handle');
        
        if (e.button === 0) { // Left click
            if ((this.viewer.keyboardHandler.isSpacePressed && e.target === this.viewer.canvas) || 
                (!target && this.viewer.keyboardHandler.isSpacePressed)) {
                this.isPanning = true;
                this.lastPanPoint = { x: e.clientX, y: e.clientY };
                this.viewer.canvas.style.cursor = 'grabbing';
            } else if (target) {
                if (target.classList.contains('resize-handle')) {
                    this.isResizing = true;
                    this.resizeHandle = target.getAttribute('data-handle');
                    this.resizeTarget = target.parentElement.querySelector('.custom-rectangle');
                } else {
                    this.isDragging = true;
                    this.dragTarget = target;
                    
                    if (target.classList.contains('entity')) {
                        const transform = target.getAttribute('transform');
                        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                        const entityX = match ? parseFloat(match[1]) : 0;
                        const entityY = match ? parseFloat(match[2]) : 0;
                        this.dragOffset = { x: svgPoint.x - entityX, y: svgPoint.y - entityY };
                    } else {
                        const elementX = parseFloat(target.getAttribute('x')) || 0;
                        const elementY = parseFloat(target.getAttribute('y')) || 0;
                        this.dragOffset = { x: svgPoint.x - elementX, y: svgPoint.y - elementY };
                    }
                }
                
                if (target.classList.contains('custom-rectangle') || target.classList.contains('custom-text')) {
                    this.viewer.selectAnnotation(target);
                }
            }
        } else if (e.button === 1) { // Middle click (wheel button)
            e.preventDefault();
            this.isPanning = true;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.viewer.canvas.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.lastPanPoint.x;
            const dy = e.clientY - this.lastPanPoint.y;
            this.viewer.panX += dx;
            this.viewer.panY += dy;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.viewer.updateTransform();
        } else if (this.isResizing && this.resizeTarget) {
            const rect = this.viewer.canvas.getBoundingClientRect();
            const svgPoint = SVGUtils.screenToSVG(
                e.clientX - rect.left, 
                e.clientY - rect.top,
                this.viewer.canvas,
                this.viewer.panX,
                this.viewer.panY,
                this.viewer.scale
            );
            this.viewer.handleResize(svgPoint);
        } else if (this.isDragging && this.dragTarget) {
            const rect = this.viewer.canvas.getBoundingClientRect();
            const svgPoint = SVGUtils.screenToSVG(
                e.clientX - rect.left, 
                e.clientY - rect.top,
                this.viewer.canvas,
                this.viewer.panX,
                this.viewer.panY,
                this.viewer.scale
            );
            
            if (this.dragTarget.classList.contains('entity')) {
                const newX = svgPoint.x - this.dragOffset.x;
                const newY = svgPoint.y - this.dragOffset.y;
                this.dragTarget.setAttribute('transform', `translate(${newX}, ${newY})`);
                
                const tableName = this.dragTarget.getAttribute('data-table');
                if (tableName) {
                    if (!this.viewer.layoutData.entities[tableName]) {
                        this.viewer.layoutData.entities[tableName] = {};
                    }
                    this.viewer.layoutData.entities[tableName].position = { x: newX, y: newY };
                    
                    const entity = this.viewer.erData.entities.find(e => e.name === tableName);
                    if (entity) {
                        entity.position = { x: newX, y: newY };
                    }
                }
            } else if (this.dragTarget.classList.contains('custom-rectangle')) {
                const newX = svgPoint.x - this.dragOffset.x;
                const newY = svgPoint.y - this.dragOffset.y;
                this.dragTarget.setAttribute('x', newX);
                this.dragTarget.setAttribute('y', newY);
                
                const index = parseInt(this.dragTarget.getAttribute('data-index'));
                if (this.viewer.layoutData.rectangles[index]) {
                    this.viewer.layoutData.rectangles[index].x = newX;
                    this.viewer.layoutData.rectangles[index].y = newY;
                }
            } else if (this.dragTarget.classList.contains('custom-text')) {
                const newX = svgPoint.x - this.dragOffset.x;
                const newY = svgPoint.y - this.dragOffset.y;
                this.dragTarget.setAttribute('x', newX);
                this.dragTarget.setAttribute('y', newY);
                
                const index = parseInt(this.dragTarget.getAttribute('data-index'));
                if (this.viewer.layoutData.texts[index]) {
                    this.viewer.layoutData.texts[index].x = newX;
                    this.viewer.layoutData.texts[index].y = newY;
                }
            }
        } else {
            // Handle hover effects
            const target = e.target.closest('.entity, .relationship');
            if (this.viewer.highlightManager) {
                this.viewer.highlightManager.handleHover(target);
            }
        }
    }

    handleMouseUp(e) {
        const wasEntityDragging = this.isDragging && this.dragTarget && this.dragTarget.classList.contains('entity');
        
        this.isDragging = false;
        this.dragTarget = null;
        this.isPanning = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeTarget = null;
        this.viewer.canvas.style.cursor = 'default';
        
        // エンティティドラッグ完了時のみリレーション線を再描画
        if (wasEntityDragging) {
            this.viewer.renderER();
        }
    }

    handleClick(e) {
        const entity = e.target.closest('.entity');
        if (entity) {
            const tableName = entity.getAttribute('data-table');
            this.viewer.showTableDetails(tableName);
        }
    }

    handleDoubleClick(e) {
        const textElement = e.target.closest('.custom-text');
        if (textElement) {
            const index = parseInt(textElement.getAttribute('data-index'));
            this.viewer.editText(index, textElement);
        }
    }

    handleContextMenu(e) {
        console.log('handleContextMenu called', e.target);
        const annotation = e.target.closest('.custom-rectangle, .custom-text');
        console.log('Found annotation:', annotation);
        if (annotation) {
            e.preventDefault();
            this.viewer.selectAnnotation(annotation);
            this.viewer.showContextMenu(e.clientX, e.clientY);
        }
    }
}