/**
 * DOM操作の抽象インタフェース
 * 副作用を含む全てのDOM操作をこのインタフェースを通して行う
 */
export class DOMInterface {
    // Element selection
    querySelector(selector) {
        throw new Error('Not implemented');
    }
    
    querySelectorAll(selector) {
        throw new Error('Not implemented');
    }
    
    getElementById(id) {
        throw new Error('Not implemented');
    }
    
    // Element creation and manipulation
    createElement(tagName, namespace) {
        throw new Error('Not implemented');
    }
    
    appendChild(parent, child) {
        throw new Error('Not implemented');
    }
    
    insertBefore(parent, newChild, referenceChild) {
        throw new Error('Not implemented');
    }
    
    removeElement(element) {
        throw new Error('Not implemented');
    }
    
    cloneNode(element, deep) {
        throw new Error('Not implemented');
    }
    
    // Attributes
    setAttribute(element, name, value) {
        throw new Error('Not implemented');
    }
    
    getAttribute(element, name) {
        throw new Error('Not implemented');
    }
    
    // Styles
    setStyles(element, styles) {
        throw new Error('Not implemented');
    }
    
    // Classes
    addClass(element, className) {
        throw new Error('Not implemented');
    }
    
    removeClass(element, className) {
        throw new Error('Not implemented');
    }
    
    hasClass(element, className) {
        throw new Error('Not implemented');
    }
    
    // Content
    setInnerHTML(element, html) {
        throw new Error('Not implemented');
    }
    
    setTextContent(element, text) {
        throw new Error('Not implemented');
    }
    
    // Events
    addEventListener(element, event, handler, options) {
        throw new Error('Not implemented');
    }
    
    removeEventListener(element, event, handler) {
        throw new Error('Not implemented');
    }
    
    dispatchEvent(element, eventName, detail) {
        throw new Error('Not implemented');
    }
    
    // Measurements
    getBoundingClientRect(element) {
        throw new Error('Not implemented');
    }
    
    getOffsetWidth(element) {
        throw new Error('Not implemented');
    }
    
    getOffsetHeight(element) {
        throw new Error('Not implemented');
    }
    
    // Traversal
    getParentElement(element) {
        throw new Error('Not implemented');
    }
    
    closest(element, selector) {
        throw new Error('Not implemented');
    }
    
    matches(element, selector) {
        throw new Error('Not implemented');
    }
    
    // Document
    getDocumentElement() {
        throw new Error('Not implemented');
    }
    
    getBodyElement() {
        throw new Error('Not implemented');
    }
}
