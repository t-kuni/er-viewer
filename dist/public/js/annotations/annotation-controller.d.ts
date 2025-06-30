import { ApplicationState, LayoutData } from '../types/index.js';
interface AnnotationRectangle {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    stroke?: string;
    fill?: string;
    layerId?: string;
}
interface AnnotationText {
    id: string;
    x: number;
    y: number;
    content: string;
    color?: string;
    size?: number;
    layerId?: string;
}
interface AnnotationLayoutData extends Omit<LayoutData, 'rectangles' | 'texts'> {
    rectangles: AnnotationRectangle[];
    texts: AnnotationText[];
}
interface AnnotationApplicationState extends Omit<ApplicationState, 'layoutData'> {
    layoutData: AnnotationLayoutData;
}
interface StateManager {
    getState(): AnnotationApplicationState;
    setState(state: Partial<ApplicationState>): void;
    setLayoutData(layoutData: LayoutData): void;
    updateLayoutData(layoutData: LayoutData): void;
}
/**
 * Annotation Controller - Manages rectangles and text annotations
 */
export declare class AnnotationController {
    private stateManager;
    constructor(stateManager: StateManager);
    /**
     * Edit rectangle properties
     */
    editRectangleProperties(rectangleElement: Element): void;
    /**
     * Edit text properties
     */
    editTextProperties(textElement: Element): void;
    /**
     * Delete annotation
     */
    deleteAnnotation(annotationElement: Element | null): void;
    /**
     * Convert RGBA string to hex color
     */
    private rgbaToHex;
    /**
     * Get opacity percentage from RGBA string
     */
    private getOpacityPercent;
    /**
     * Convert hex color to RGBA
     */
    private hexToRgba;
}
export {};
//# sourceMappingURL=annotation-controller.d.ts.map