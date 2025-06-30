import { DOMInterface } from '../interfaces/dom-interface';
import type { EventHandler } from '../../types/infrastructure';
/**
 * DOMインタフェースの実装
 * 実際のDOM操作を行う
 */
export declare class DOMImplementation extends DOMInterface {
    private _eventListeners;
    constructor();
    querySelector<T extends Element = Element>(selector: string): T | null;
    querySelectorAll<T extends Element = Element>(selector: string): T[];
    getElementById<T extends Element = Element>(id: string): T | null;
    createElement<T extends Element = Element>(tagName: string, namespace?: string | null): T;
    appendChild<T extends Node>(parent: Node, child: T): T;
    removeElement(element: Element): void;
    setAttribute(element: Element, name: string, value: string): void;
    getAttribute(element: Element, name: string): string | null;
    setStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void;
    addClass(element: Element, className: string): void;
    removeClass(element: Element, className: string): void;
    hasClass(element: Element, className: string): boolean;
    setInnerHTML(element: Element, html: string): void;
    addEventListener(element: Element, event: string, handler: EventHandler, options?: AddEventListenerOptions): void;
    removeEventListener(element: Element, event: string, handler: EventHandler): void;
    dispatchEvent(element: Element, eventName: string, detail?: unknown): void;
    getBoundingClientRect(element: Element): DOMRect;
    getOffsetWidth(element: HTMLElement): number;
    getOffsetHeight(element: HTMLElement): number;
    getParentElement(element: Element): Element | null;
    closest<T extends Element = Element>(element: Element, selector: string): T | null;
    matches(element: Element, selector: string): boolean;
    getDocumentElement(): HTMLElement;
    getBodyElement(): HTMLElement;
}
//# sourceMappingURL=dom-implementation.d.ts.map