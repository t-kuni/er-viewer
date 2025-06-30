/**
 * ER Viewer Application - Event Type Definitions
 */

import { Position, Entity, Rectangle, Text, Layer } from './index.js';

// Base event data
export interface BaseEventData {
  timestamp: number;
  source: 'user' | 'system' | 'api';
}

// Mouse event data
export interface MouseEventData extends BaseEventData {
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  button: number;
  buttons: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

// Keyboard event data
export interface KeyboardEventData extends BaseEventData {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  repeat: boolean;
}

// Touch event data
export interface TouchEventData extends BaseEventData {
  touches: Array<{
    identifier: number;
    clientX: number;
    clientY: number;
    screenX: number;
    screenY: number;
  }>;
  targetTouches: Array<{
    identifier: number;
    clientX: number;
    clientY: number;
  }>;
  changedTouches: Array<{
    identifier: number;
    clientX: number;
    clientY: number;
  }>;
}

// Wheel event data
export interface WheelEventData extends MouseEventData {
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  deltaMode: number;
}

// Entity-related events
export interface EntityClickEvent extends MouseEventData {
  entity: Entity;
  element: SVGElement;
}

export interface EntityHoverEvent extends MouseEventData {
  entity: Entity;
  element: SVGElement;
  entering: boolean;
}

export interface EntityDragEvent extends MouseEventData {
  entity: Entity;
  element: SVGElement;
  startPosition: Position;
  currentPosition: Position;
  deltaX: number;
  deltaY: number;
}

export interface EntityDropEvent extends MouseEventData {
  entity: Entity;
  element: SVGElement;
  startPosition: Position;
  endPosition: Position;
  totalDeltaX: number;
  totalDeltaY: number;
}

// Annotation-related events
export interface AnnotationCreateEvent extends BaseEventData {
  annotation: Rectangle | Text;
  annotationType: 'rectangle' | 'text';
}

export interface AnnotationUpdateEvent extends BaseEventData {
  annotation: Rectangle | Text;
  annotationType: 'rectangle' | 'text';
  previousValues: Partial<Rectangle | Text>;
}

export interface AnnotationDeleteEvent extends BaseEventData {
  annotationId: string;
  annotationType: 'rectangle' | 'text';
  annotation: Rectangle | Text;
}

export interface AnnotationSelectEvent extends MouseEventData {
  annotationId: string;
  annotationType: 'rectangle' | 'text';
  annotation: Rectangle | Text;
  element: SVGElement;
}

// Layer-related events
export interface LayerCreateEvent extends BaseEventData {
  layer: Layer;
}

export interface LayerUpdateEvent extends BaseEventData {
  layer: Layer;
  previousValues: Partial<Layer>;
}

export interface LayerDeleteEvent extends BaseEventData {
  layerId: string;
  layer: Layer;
}

export interface LayerReorderEvent extends BaseEventData {
  layerId: string;
  oldIndex: number;
  newIndex: number;
}

export interface LayerVisibilityEvent extends BaseEventData {
  layerId: string;
  visible: boolean;
}

// Viewport-related events
export interface ViewportPanEvent extends BaseEventData {
  previousPanX: number;
  previousPanY: number;
  currentPanX: number;
  currentPanY: number;
  deltaX: number;
  deltaY: number;
}

export interface ViewportZoomEvent extends BaseEventData {
  previousScale: number;
  currentScale: number;
  zoomCenter: Position;
  zoomDirection: 'in' | 'out';
}

export interface ViewportResetEvent extends BaseEventData {
  previousState: {
    panX: number;
    panY: number;
    scale: number;
  };
}

// Application state events
export interface StateChangeEvent<T = any> extends BaseEventData {
  propertyPath: string;
  previousValue: T;
  currentValue: T;
}

export interface HistoryEvent extends BaseEventData {
  action: 'undo' | 'redo' | 'push';
  historyEntry?: {
    timestamp: number;
    action: string;
    description?: string;
  };
}

// Data loading events
export interface DataLoadStartEvent extends BaseEventData {
  dataType: 'er' | 'layout' | 'all';
}

export interface DataLoadSuccessEvent extends BaseEventData {
  dataType: 'er' | 'layout' | 'all';
  data: any;
}

export interface DataLoadErrorEvent extends BaseEventData {
  dataType: 'er' | 'layout' | 'all';
  error: Error;
  message: string;
}

// API events
export interface ApiRequestEvent extends BaseEventData {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ApiResponseEvent extends BaseEventData {
  method: string;
  url: string;
  status: number;
  statusText: string;
  data?: any;
  error?: Error;
}

// UI interaction events
export interface ContextMenuOpenEvent extends MouseEventData {
  menuItems: Array<{
    label: string;
    action: string;
    enabled: boolean;
  }>;
  target: HTMLElement | SVGElement;
}

export interface ContextMenuCloseEvent extends BaseEventData {
  reason: 'click' | 'escape' | 'blur' | 'action';
}

export interface SidebarToggleEvent extends BaseEventData {
  visible: boolean;
  panelId?: string;
}

export interface ModalOpenEvent extends BaseEventData {
  modalId: string;
  modalType: string;
  data?: any;
}

export interface ModalCloseEvent extends BaseEventData {
  modalId: string;
  reason: 'close' | 'cancel' | 'confirm' | 'escape';
  data?: any;
}

// Event handler types
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

// Event subscription interface
export interface EventSubscription {
  unsubscribe: () => void;
}

// Event emitter interface
export interface EventEmitter {
  on<T>(eventName: string, handler: EventHandler<T>): EventSubscription;
  off(eventName: string, handler: EventHandler): void;
  emit<T>(eventName: string, data: T): void;
  once<T>(eventName: string, handler: EventHandler<T>): EventSubscription;
}

// Global event types mapping
export interface ERViewerEvents {
  // Entity events
  'entity:click': EntityClickEvent;
  'entity:hover': EntityHoverEvent;
  'entity:drag': EntityDragEvent;
  'entity:drop': EntityDropEvent;

  // Annotation events
  'annotation:create': AnnotationCreateEvent;
  'annotation:update': AnnotationUpdateEvent;
  'annotation:delete': AnnotationDeleteEvent;
  'annotation:select': AnnotationSelectEvent;

  // Layer events
  'layer:create': LayerCreateEvent;
  'layer:update': LayerUpdateEvent;
  'layer:delete': LayerDeleteEvent;
  'layer:reorder': LayerReorderEvent;
  'layer:visibility': LayerVisibilityEvent;

  // Viewport events
  'viewport:pan': ViewportPanEvent;
  'viewport:zoom': ViewportZoomEvent;
  'viewport:reset': ViewportResetEvent;

  // State events
  'state:change': StateChangeEvent;
  'history:change': HistoryEvent;

  // Data events
  'data:load:start': DataLoadStartEvent;
  'data:load:success': DataLoadSuccessEvent;
  'data:load:error': DataLoadErrorEvent;

  // API events
  'api:request': ApiRequestEvent;
  'api:response': ApiResponseEvent;

  // UI events
  'contextmenu:open': ContextMenuOpenEvent;
  'contextmenu:close': ContextMenuCloseEvent;
  'sidebar:toggle': SidebarToggleEvent;
  'modal:open': ModalOpenEvent;
  'modal:close': ModalCloseEvent;
}
