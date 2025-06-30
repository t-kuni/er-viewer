/**
 * ER Viewer Application - DOM Type Definitions and Extensions
 */

// Custom SVG element attributes
export interface ERViewerSVGAttributes {
  'data-entity-id'?: string;
  'data-annotation-id'?: string;
  'data-layer-id'?: string;
  'data-relationship-id'?: string;
  'data-type'?: string;
}

// Extended SVG element interfaces
export interface ERViewerSVGElement extends SVGElement {
  dataset: DOMStringMap & {
    entityId?: string;
    annotationId?: string;
    layerId?: string;
    relationshipId?: string;
    type?: string;
  };
}

// Custom event detail for entity events
export interface EntityEventDetail {
  entityName: string;
  position: { x: number; y: number };
  element: SVGElement;
}

// Custom event detail for annotation events
export interface AnnotationEventDetail {
  annotationId: string;
  annotationType: 'rectangle' | 'text';
  position: { x: number; y: number };
  element: SVGElement;
}

// Custom event detail for layer events
export interface LayerEventDetail {
  layerId: string;
  layerName: string;
  action: 'show' | 'hide' | 'reorder' | 'delete';
  newIndex?: number;
}

// Custom events
export interface ERViewerEventMap {
  'entity:click': CustomEvent<EntityEventDetail>;
  'entity:hover': CustomEvent<EntityEventDetail>;
  'entity:dragstart': CustomEvent<EntityEventDetail>;
  'entity:dragend': CustomEvent<EntityEventDetail>;
  'annotation:create': CustomEvent<AnnotationEventDetail>;
  'annotation:update': CustomEvent<AnnotationEventDetail>;
  'annotation:delete': CustomEvent<AnnotationEventDetail>;
  'layer:change': CustomEvent<LayerEventDetail>;
  'viewport:change': CustomEvent<{ panX: number; panY: number; scale: number }>;
}

// SVG namespace helper
export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Common SVG element types used in the application
export type ERViewerSVGGroupElement = SVGGElement & ERViewerSVGElement;
export type ERViewerSVGRectElement = SVGRectElement & ERViewerSVGElement;
export type ERViewerSVGTextElement = SVGTextElement & ERViewerSVGElement;
export type ERViewerSVGPathElement = SVGPathElement & ERViewerSVGElement;
export type ERViewerSVGLineElement = SVGLineElement & ERViewerSVGElement;

// DOM element creation options
export interface CreateElementOptions {
  className?: string;
  id?: string;
  attributes?: Record<string, string | number | boolean>;
  styles?: Partial<CSSStyleDeclaration>;
  dataset?: Record<string, string>;
  children?: (HTMLElement | SVGElement | string)[];
}

// SVG element creation options
export interface CreateSVGElementOptions extends CreateElementOptions {
  namespace?: string;
  viewBox?: string;
  preserveAspectRatio?: string;
}

// Mouse position relative to SVG canvas
export interface SVGMousePosition {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  svgX: number;
  svgY: number;
}

// Touch position relative to SVG canvas
export interface SVGTouchPosition extends SVGMousePosition {
  identifier: number;
}

// Drag and drop data
export interface DragDropData {
  type: 'entity' | 'annotation' | 'layer';
  id: string;
  sourceElement: HTMLElement | SVGElement;
  offsetX: number;
  offsetY: number;
}

// Sidebar panel configuration
export interface SidebarPanel {
  id: string;
  title: string;
  content: HTMLElement | string;
  icon?: string;
  closable?: boolean;
  onClose?: () => void;
}

// Modal dialog configuration
export interface ModalConfig {
  id: string;
  title: string;
  content: HTMLElement | string;
  width?: string;
  height?: string;
  closable?: boolean;
  overlay?: boolean;
  onClose?: () => void;
  buttons?: ModalButton[];
}

// Modal button configuration
export interface ModalButton {
  label: string;
  action: () => void | Promise<void>;
  type?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

// Tooltip configuration
export interface TooltipConfig {
  content: string | HTMLElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  offset?: { x: number; y: number };
  className?: string;
}

// Context menu configuration
export interface ContextMenuConfig {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose?: () => void;
}

// Context menu item configuration
export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
}

// Notification configuration
export interface NotificationConfig {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

// Keyboard shortcut configuration
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}
