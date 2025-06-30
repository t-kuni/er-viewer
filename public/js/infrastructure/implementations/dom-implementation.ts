import { DOMInterface } from '../interfaces/dom-interface';
import type { EventHandler } from '../../types/infrastructure';

/**
 * DOMインタフェースの実装
 * 実際のDOM操作を行う
 */
export class DOMImplementation extends DOMInterface {
  private _eventListeners: WeakMap<Element, Map<string, Set<EventHandler>>>;

  constructor() {
    super();
    this._eventListeners = new WeakMap();
  }

  querySelector<T extends Element = Element>(selector: string): T | null {
    return document.querySelector<T>(selector);
  }

  querySelectorAll<T extends Element = Element>(selector: string): T[] {
    return Array.from(document.querySelectorAll<T>(selector));
  }

  getElementById<T extends Element = Element>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  createElement<T extends Element = Element>(tagName: string, namespace?: string | null): T {
    if (namespace) {
      return document.createElementNS(namespace, tagName) as T;
    }
    return document.createElement(tagName) as unknown as T;
  }

  appendChild<T extends Node>(parent: Node, child: T): T {
    return parent.appendChild(child);
  }

  removeElement(element: Element): void {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  setAttribute(element: Element, name: string, value: string): void {
    element.setAttribute(name, value);
  }

  getAttribute(element: Element, name: string): string | null {
    return element.getAttribute(name);
  }

  setStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(element.style, styles);
  }

  addClass(element: Element, className: string): void {
    element.classList.add(className);
  }

  removeClass(element: Element, className: string): void {
    element.classList.remove(className);
  }

  hasClass(element: Element, className: string): boolean {
    return element.classList.contains(className);
  }

  setInnerHTML(element: Element, html: string): void {
    element.innerHTML = html;
  }

  addEventListener(element: Element, event: string, handler: EventHandler, options?: AddEventListenerOptions): void {
    element.addEventListener(event, handler as EventListener, options);

    // イベントリスナーを追跡（テスト用）
    if (!this._eventListeners.has(element)) {
      this._eventListeners.set(element, new Map());
    }
    const elementListeners = this._eventListeners.get(element)!;
    if (!elementListeners.has(event)) {
      elementListeners.set(event, new Set());
    }
    elementListeners.get(event)!.add(handler);
  }

  removeEventListener(element: Element, event: string, handler: EventHandler): void {
    element.removeEventListener(event, handler as EventListener);

    // イベントリスナーの追跡を削除
    if (this._eventListeners.has(element)) {
      const elementListeners = this._eventListeners.get(element)!;
      if (elementListeners.has(event)) {
        elementListeners.get(event)!.delete(handler);
      }
    }
  }

  dispatchEvent(element: Element, eventName: string, detail?: unknown): void {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
  }

  getBoundingClientRect(element: Element): DOMRect {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
      x: rect.x,
      y: rect.y,
      toJSON: rect.toJSON.bind(rect),
    };
  }

  getOffsetWidth(element: HTMLElement): number {
    return element.offsetWidth;
  }

  getOffsetHeight(element: HTMLElement): number {
    return element.offsetHeight;
  }

  getParentElement(element: Element): Element | null {
    return element.parentElement;
  }

  closest<T extends Element = Element>(element: Element, selector: string): T | null {
    return element.closest<T>(selector);
  }

  matches(element: Element, selector: string): boolean {
    return element.matches(selector);
  }

  getDocumentElement(): HTMLElement {
    return document.documentElement;
  }

  getBodyElement(): HTMLElement {
    return document.body;
  }
}
