// Keyboard event handler
export class KeyboardHandler {
    constructor(erViewer) {
        this.viewer = erViewer;
        this.isSpacePressed = false;
    }

    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.isSpacePressed = true;
            this.viewer.canvas.style.cursor = 'grab';
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            this.viewer.deleteSelectedAnnotation();
        }
    }

    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
            this.viewer.canvas.style.cursor = 'default';
        }
    }
}