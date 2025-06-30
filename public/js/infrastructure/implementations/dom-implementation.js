import { DOMInterface } from '../interfaces/dom-interface';
/**
 * DOMインタフェースの実装
 * 実際のDOM操作を行う
 */
export class DOMImplementation extends DOMInterface {
    constructor() {
        super();
        this._eventListeners = new WeakMap();
    }
    querySelector(selector) {
        return document.querySelector(selector);
    }
    querySelectorAll(selector) {
        return Array.from(document.querySelectorAll(selector));
    }
    getElementById(id) {
        return document.getElementById(id);
    }
    createElement(tagName, namespace) {
        if (namespace) {
            return document.createElementNS(namespace, tagName);
        }
        return document.createElement(tagName);
    }
    appendChild(parent, child) {
        return parent.appendChild(child);
    }
    removeElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }
    setAttribute(element, name, value) {
        element.setAttribute(name, value);
    }
    getAttribute(element, name) {
        return element.getAttribute(name);
    }
    setStyles(element, styles) {
        Object.assign(element.style, styles);
    }
    addClass(element, className) {
        element.classList.add(className);
    }
    removeClass(element, className) {
        element.classList.remove(className);
    }
    hasClass(element, className) {
        return element.classList.contains(className);
    }
    setInnerHTML(element, html) {
        element.innerHTML = html;
    }
    addEventListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        // イベントリスナーを追跡（テスト用）
        if (!this._eventListeners.has(element)) {
            this._eventListeners.set(element, new Map());
        }
        const elementListeners = this._eventListeners.get(element);
        if (!elementListeners.has(event)) {
            elementListeners.set(event, new Set());
        }
        elementListeners.get(event).add(handler);
    }
    removeEventListener(element, event, handler) {
        element.removeEventListener(event, handler);
        // イベントリスナーの追跡を削除
        if (this._eventListeners.has(element)) {
            const elementListeners = this._eventListeners.get(element);
            if (elementListeners.has(event)) {
                elementListeners.get(event).delete(handler);
            }
        }
    }
    dispatchEvent(element, eventName, detail) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true,
        });
        element.dispatchEvent(event);
    }
    getBoundingClientRect(element) {
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
    getOffsetWidth(element) {
        return element.offsetWidth;
    }
    getOffsetHeight(element) {
        return element.offsetHeight;
    }
    getParentElement(element) {
        return element.parentElement;
    }
    closest(element, selector) {
        return element.closest(selector);
    }
    matches(element, selector) {
        return element.matches(selector);
    }
    getDocumentElement() {
        return document.documentElement;
    }
    getBodyElement() {
        return document.body;
    }
}
