/**
 * Annotation Controller - Manages rectangles and text annotations
 */
export class AnnotationController {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }
    /**
     * Edit rectangle properties
     */
    editRectangleProperties(rectangleElement) {
        const index = parseInt(rectangleElement.getAttribute('data-index') || '0');
        const currentState = this.stateManager.getState();
        const rect = currentState.layoutData.rectangles[index];
        if (!rect) {
            return;
        }
        // Create property dialog
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = '#ffffff';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        dialog.style.zIndex = '3000';
        dialog.style.minWidth = '300px';
        dialog.innerHTML = `
            <h3>矩形のプロパティ</h3>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">線の色:</label>
                <input type="color" id="rect-stroke-color" value="${rect.stroke || '#3498db'}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">塗りつぶし色:</label>
                <input type="color" id="rect-fill-color" value="${this.rgbaToHex(rect.fill) || '#3498db'}" style="width: 100%;">
                <input type="range" id="rect-fill-opacity" min="0" max="100" value="${this.getOpacityPercent(rect.fill)}" style="width: 100%; margin-top: 5px;">
                <span id="opacity-label">${this.getOpacityPercent(rect.fill)}%</span>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">位置 X:</label>
                <input type="number" id="rect-x" value="${rect.x}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">位置 Y:</label>
                <input type="number" id="rect-y" value="${rect.y}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">幅:</label>
                <input type="number" id="rect-width" value="${rect.width}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">高さ:</label>
                <input type="number" id="rect-height" value="${rect.height}" style="width: 100%;">
            </div>
            <div style="text-align: right;">
                <button id="cancel-rect-props" style="margin-right: 10px;">キャンセル</button>
                <button id="save-rect-props">保存</button>
            </div>
        `;
        document.body.appendChild(dialog);
        // Handle opacity slider
        const opacitySlider = document.getElementById('rect-fill-opacity');
        const opacityLabel = document.getElementById('opacity-label');
        opacitySlider.addEventListener('input', () => {
            opacityLabel.textContent = opacitySlider.value + '%';
        });
        // Handle save
        document.getElementById('save-rect-props')?.addEventListener('click', () => {
            const fillColor = document.getElementById('rect-fill-color').value;
            const opacity = parseInt(document.getElementById('rect-fill-opacity').value) / 100;
            const updatedRect = {
                ...rect,
                stroke: document.getElementById('rect-stroke-color').value,
                fill: this.hexToRgba(fillColor, opacity),
                x: parseFloat(document.getElementById('rect-x').value),
                y: parseFloat(document.getElementById('rect-y').value),
                width: parseFloat(document.getElementById('rect-width').value),
                height: parseFloat(document.getElementById('rect-height').value),
            };
            const newLayoutData = { ...currentState.layoutData };
            newLayoutData.rectangles[index] = updatedRect;
            this.stateManager.updateLayoutData(newLayoutData);
            document.body.removeChild(dialog);
        });
        // Handle cancel
        document.getElementById('cancel-rect-props')?.addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }
    /**
     * Edit text properties
     */
    editTextProperties(textElement) {
        const index = parseInt(textElement.getAttribute('data-index') || '0');
        const currentState = this.stateManager.getState();
        const text = currentState.layoutData.texts[index];
        if (!text) {
            return;
        }
        // Create property dialog
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = '#ffffff';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        dialog.style.zIndex = '3000';
        dialog.style.minWidth = '300px';
        dialog.innerHTML = `
            <h3>テキストのプロパティ</h3>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">テキスト:</label>
                <input type="text" id="text-content" value="${text.content}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">色:</label>
                <input type="color" id="text-color" value="${text.color || '#2c3e50'}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">サイズ:</label>
                <input type="number" id="text-size" value="${text.size || 14}" min="8" max="72" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">位置 X:</label>
                <input type="number" id="text-x" value="${text.x}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">位置 Y:</label>
                <input type="number" id="text-y" value="${text.y}" style="width: 100%;">
            </div>
            <div style="text-align: right;">
                <button id="cancel-text-props" style="margin-right: 10px;">キャンセル</button>
                <button id="save-text-props">保存</button>
            </div>
        `;
        document.body.appendChild(dialog);
        // Handle save
        document.getElementById('save-text-props')?.addEventListener('click', () => {
            const updatedText = {
                ...text,
                content: document.getElementById('text-content').value,
                color: document.getElementById('text-color').value,
                size: parseInt(document.getElementById('text-size').value),
                x: parseFloat(document.getElementById('text-x').value),
                y: parseFloat(document.getElementById('text-y').value),
            };
            // Get fresh state to avoid stale reference
            const freshState = this.stateManager.getState();
            const newLayoutData = { ...freshState.layoutData };
            newLayoutData.texts = [...newLayoutData.texts];
            newLayoutData.texts[index] = updatedText;
            this.stateManager.updateLayoutData(newLayoutData);
            document.body.removeChild(dialog);
        });
        // Handle cancel
        document.getElementById('cancel-text-props')?.addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }
    /**
     * Delete annotation
     */
    deleteAnnotation(annotationElement) {
        if (!annotationElement) {
            return;
        }
        const type = annotationElement.getAttribute('data-type');
        const index = parseInt(annotationElement.getAttribute('data-index') || '0');
        const currentState = this.stateManager.getState();
        const newLayoutData = { ...currentState.layoutData };
        if (type === 'rectangle') {
            newLayoutData.rectangles.splice(index, 1);
        }
        else if (type === 'text') {
            newLayoutData.texts.splice(index, 1);
        }
        this.stateManager.setState({ selectedAnnotation: null });
        this.stateManager.setLayoutData(newLayoutData);
    }
    /**
     * Convert RGBA string to hex color
     */
    rgbaToHex(rgba) {
        if (!rgba?.startsWith('rgba')) {
            return '#3498db';
        }
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match?.[1] || !match[2] || !match[3]) {
            return '#3498db';
        }
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
    /**
     * Get opacity percentage from RGBA string
     */
    getOpacityPercent(rgba) {
        if (!rgba?.startsWith('rgba')) {
            return 10;
        }
        const match = rgba.match(/rgba?\([\d\s,]+,\s*([\d.]+)\)/);
        if (!match?.[1]) {
            return 10;
        }
        return Math.round(parseFloat(match[1]) * 100);
    }
    /**
     * Convert hex color to RGBA
     */
    hexToRgba(hex, alpha) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result?.[1] || !result[2] || !result[3]) {
            return 'rgba(52, 152, 219, 0.1)';
        }
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
