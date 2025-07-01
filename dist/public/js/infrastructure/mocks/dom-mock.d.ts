/**
 * DOM操作のモック実装
 * テスト用に副作用を排除したDOM操作を提供
 */
import { DOMInterface } from '../interfaces/dom-interface.js';
import type { EventHandler, BoundingRect, EventListenerOptions, CustomEventDetail } from '../../types/infrastructure.js';
export interface MockElementAttributes {
    tagName: string;
    namespace: string | null;
    attributes: Map<string, string>;
    children: MockElement[];
    parentNode: MockElement | null;
    innerHTML: string;
    textContent: string;
    classList: MockClassList;
    style: MockStyle;
    eventListeners: Map<string, Set<EventHandler>>;
    offsetWidth: number;
    offsetHeight: number;
    boundingClientRect: BoundingRect;
}
export declare class MockElement implements MockElementAttributes {
    tagName: string;
    namespace: string | null;
    attributes: Map<string, string>;
    children: MockElement[];
    parentNode: MockElement | null;
    innerHTML: string;
    textContent: string;
    classList: MockClassList;
    style: MockStyle;
    eventListeners: Map<string, Set<EventHandler>>;
    offsetWidth: number;
    offsetHeight: number;
    boundingClientRect: BoundingRect;
    constructor(tagName: string, namespace?: string | null);
    setAttribute(name: string, value: string): void;
    getAttribute(name: string): string | null;
    removeAttribute(name: string): void;
    hasAttribute(name: string): boolean;
    appendChild(child: MockElement): MockElement;
    insertBefore(newChild: MockElement, referenceChild: MockElement | null): MockElement;
    removeChild(child: MockElement): MockElement;
    querySelector(selector: string): MockElement | null;
    querySelectorAll(selector: string): MockElement[];
    get firstChild(): MockElement | null;
    get lastChild(): MockElement | null;
    findElement(selector: string): MockElement | null;
    findAllElements(selector: string): MockElement[];
    findAllElementsRecursive(selector: string, results: MockElement[]): void;
    findById(id: string): MockElement | null;
    findByClass(className: string): MockElement | null;
    findByTag(tagName: string): MockElement | null;
    closest(selector: string): MockElement | null;
    matches(selector: string): boolean;
    addEventListener(event: string, handler: EventHandler, _options?: EventListenerOptions): void;
    removeEventListener(event: string, handler: EventHandler): void;
    dispatchEvent(event: Event | string | Record<string, any>): boolean;
    getBoundingClientRect(): BoundingRect;
}
declare class MockClassList {
    private classes;
    constructor();
    add(className: string): void;
    remove(className: string): void;
    contains(className: string): boolean;
    toggle(className: string): boolean;
}
declare class MockStyle {
    private _styles;
    constructor();
    setProperty(property: string, value: string): void;
    getProperty(property: string): string;
    [key: string]: any;
}
export declare class DOMMock extends DOMInterface {
    private document;
    private body;
    private documentElement;
    constructor();
    private setupMockERViewerElements;
    querySelector(selector: string): Element | null;
    querySelectorAll(selector: string): Element[];
    getElementById(id: string): Element | null;
    createElement(tagName: string, namespace?: string | null): Element;
    createElementSvg(tagName: string): Element;
    appendChild(parent: Element, child: Element): void;
    insertBefore(parent: Element, newChild: Element, referenceChild: Element | null): void;
    removeElement(element: Element): void;
    setAttribute(element: Element, name: string, value: string): void;
    getAttribute(element: Element, name: string): string | null;
    setStyles(element: Element, styles: Record<string, string>): void;
    addClass(element: Element, className: string): void;
    removeClass(element: Element, className: string): void;
    hasClass(element: Element, className: string): boolean;
    setInnerHTML(element: Element, html: string): void;
    addEventListener(element: Element, event: string, handler: EventHandler, options?: EventListenerOptions): void;
    removeEventListener(element: Element, event: string, handler: EventHandler): void;
    dispatchEvent(element: Element, eventName: string, detail?: CustomEventDetail): void;
    getBoundingClientRect(element: Element): BoundingRect;
    getOffsetWidth(element: Element): number;
    getOffsetHeight(element: Element): number;
    getParentElement(element: Element): Element | null;
    closest(element: Element, selector: string): Element | null;
    matches(element: Element, selector: string): boolean;
    getDocumentElement(): Element;
    getBodyElement(): Element;
}
export {};
//# sourceMappingURL=dom-mock.d.ts.map