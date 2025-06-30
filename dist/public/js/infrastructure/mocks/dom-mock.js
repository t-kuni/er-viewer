/**
 * DOM操作のモック実装
 * テスト用に副作用を排除したDOM操作を提供
 */
import { DOMInterface } from '../interfaces/dom-interface';
export class MockElement {
    constructor(tagName, namespace = null) {
        this.tagName = tagName.toLowerCase();
        this.namespace = namespace;
        this.attributes = new Map();
        this.children = [];
        this.parentNode = null;
        this.innerHTML = '';
        this.textContent = '';
        this.classList = new MockClassList();
        this.style = new MockStyle();
        this.eventListeners = new Map();
        this.offsetWidth = 100;
        this.offsetHeight = 50;
        this.boundingClientRect = {
            x: 0,
            y: 0,
            left: 0,
            top: 0,
            width: 100,
            height: 50,
            right: 100,
            bottom: 50,
            toJSON: () => ({
                x: 0,
                y: 0,
                left: 0,
                top: 0,
                width: 100,
                height: 50,
                right: 100,
                bottom: 50,
            }),
        };
    }
    setAttribute(name, value) {
        this.attributes.set(name, value);
    }
    getAttribute(name) {
        return this.attributes.get(name) || null;
    }
    removeAttribute(name) {
        this.attributes.delete(name);
    }
    hasAttribute(name) {
        return this.attributes.has(name);
    }
    appendChild(child) {
        if (child.parentNode) {
            child.parentNode.removeChild(child);
        }
        this.children.push(child);
        child.parentNode = this;
        return child;
    }
    insertBefore(newChild, referenceChild) {
        if (newChild.parentNode) {
            newChild.parentNode.removeChild(newChild);
        }
        if (!referenceChild) {
            this.children.push(newChild);
        }
        else {
            const index = this.children.indexOf(referenceChild);
            if (index === -1) {
                // If reference child not found, append at the end
                this.children.push(newChild);
            }
            else {
                this.children.splice(index, 0, newChild);
            }
        }
        newChild.parentNode = this;
        return newChild;
    }
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
        return child;
    }
    querySelector(selector) {
        return this.findElement(selector);
    }
    querySelectorAll(selector) {
        return this.findAllElements(selector);
    }
    get firstChild() {
        return this.children[0] || null;
    }
    get lastChild() {
        return this.children[this.children.length - 1] || null;
    }
    findElement(selector) {
        if (selector.startsWith('#')) {
            const id = selector.substring(1);
            return this.findById(id);
        }
        if (selector.startsWith('.')) {
            const className = selector.substring(1);
            return this.findByClass(className);
        }
        return this.findByTag(selector);
    }
    findAllElements(selector) {
        const results = [];
        this.findAllElementsRecursive(selector, results);
        return results;
    }
    findAllElementsRecursive(selector, results) {
        if (this.matches(selector)) {
            results.push(this);
        }
        for (const child of this.children) {
            if (child.findAllElementsRecursive) {
                child.findAllElementsRecursive(selector, results);
            }
        }
    }
    findById(id) {
        if (this.getAttribute('id') === id) {
            return this;
        }
        for (const child of this.children) {
            if (child.findById) {
                const found = child.findById(id);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
    findByClass(className) {
        if (this.classList.contains(className)) {
            return this;
        }
        for (const child of this.children) {
            if (child.findByClass) {
                const found = child.findByClass(className);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
    findByTag(tagName) {
        if (this.tagName === tagName.toLowerCase()) {
            return this;
        }
        for (const child of this.children) {
            if (child.findByTag) {
                const found = child.findByTag(tagName);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
    closest(selector) {
        let current = this;
        while (current) {
            if (current.matches && current.matches(selector)) {
                return current;
            }
            current = current.parentNode;
        }
        return null;
    }
    matches(selector) {
        if (selector.startsWith('#')) {
            return this.getAttribute('id') === selector.substring(1);
        }
        if (selector.startsWith('.')) {
            return this.classList.contains(selector.substring(1));
        }
        return this.tagName === selector.toLowerCase();
    }
    addEventListener(event, handler, _options) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(handler);
    }
    removeEventListener(event, handler) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).delete(handler);
        }
    }
    dispatchEvent(event) {
        const eventType = typeof event === 'string' ? event : event.type;
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach((handler) => {
                try {
                    handler(event);
                }
                catch (e) {
                    // Ignore errors in mock
                }
            });
        }
        return true;
    }
    getBoundingClientRect() {
        return { ...this.boundingClientRect };
    }
}
class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    add(className) {
        this.classes.add(className);
    }
    remove(className) {
        this.classes.delete(className);
    }
    contains(className) {
        return this.classes.has(className);
    }
    toggle(className) {
        if (this.classes.has(className)) {
            this.classes.delete(className);
            return false;
        }
        else {
            this.classes.add(className);
            return true;
        }
    }
}
class MockStyle {
    constructor() {
        this._styles = new Map();
    }
    setProperty(property, value) {
        this._styles.set(property, value);
    }
    getProperty(property) {
        return this._styles.get(property) || '';
    }
}
export class DOMMock extends DOMInterface {
    constructor() {
        super();
        this.document = new MockElement('document');
        this.body = new MockElement('body');
        this.documentElement = new MockElement('html');
        // Add readyState property
        this.documentElement.readyState = 'complete';
        // Set up basic structure
        this.document.appendChild(this.documentElement);
        this.documentElement.appendChild(this.body);
        this.setupMockERViewerElements();
    }
    setupMockERViewerElements() {
        // Create mock canvas
        const canvas = new MockElement('svg', 'http://www.w3.org/2000/svg');
        canvas.setAttribute('id', 'er-canvas');
        canvas.boundingClientRect = {
            x: 0,
            y: 0,
            left: 0,
            top: 0,
            width: 800,
            height: 600,
            right: 800,
            bottom: 600,
            toJSON: () => ({
                x: 0,
                y: 0,
                left: 0,
                top: 0,
                width: 800,
                height: 600,
                right: 800,
                bottom: 600,
            }),
        };
        this.body.appendChild(canvas);
        // Create mock sidebar
        const sidebar = new MockElement('div');
        sidebar.setAttribute('id', 'sidebar');
        sidebar.classList.add('hidden');
        this.body.appendChild(sidebar);
        const sidebarContent = new MockElement('div');
        sidebarContent.setAttribute('id', 'sidebar-content');
        sidebar.appendChild(sidebarContent);
        // Create mock buttons
        const reverseBtn = new MockElement('button');
        reverseBtn.setAttribute('id', 'reverse-engineer');
        this.body.appendChild(reverseBtn);
        const saveBtn = new MockElement('button');
        saveBtn.setAttribute('id', 'save-layout');
        this.body.appendChild(saveBtn);
        const closeSidebarBtn = new MockElement('button');
        closeSidebarBtn.setAttribute('id', 'close-sidebar');
        this.body.appendChild(closeSidebarBtn);
        // Help panel elements
        const helpPanel = new MockElement('div');
        helpPanel.setAttribute('id', 'help-panel');
        this.body.appendChild(helpPanel);
        const helpToggle = new MockElement('button');
        helpToggle.setAttribute('id', 'help-toggle');
        helpPanel.appendChild(helpToggle);
        const helpContent = new MockElement('div');
        helpContent.setAttribute('id', 'help-content');
        helpPanel.appendChild(helpContent);
        const helpHeader = new MockElement('div');
        helpHeader.classList.add('help-panel-header');
        helpPanel.appendChild(helpHeader);
        // Build info modal
        const buildInfoModal = new MockElement('div');
        buildInfoModal.setAttribute('id', 'build-info-modal');
        buildInfoModal.classList.add('hidden');
        this.body.appendChild(buildInfoModal);
        const buildInfo = new MockElement('div');
        buildInfo.setAttribute('id', 'build-info');
        this.body.appendChild(buildInfo);
        const closeBuildInfo = new MockElement('button');
        closeBuildInfo.setAttribute('id', 'close-build-info');
        buildInfoModal.appendChild(closeBuildInfo);
    }
    querySelector(selector) {
        const result = this.document.querySelector(selector);
        return result ? result : null;
    }
    querySelectorAll(selector) {
        const results = this.document.querySelectorAll(selector);
        return results.map((el) => el);
    }
    getElementById(id) {
        const result = this.document.findById(id);
        return result ? result : null;
    }
    createElement(tagName, namespace) {
        const element = new MockElement(tagName, namespace || null);
        if (namespace) {
            element.namespace = namespace;
        }
        // Create a proxy for style to handle dynamic property access
        element.style = new Proxy(element.style, {
            set(target, property, value) {
                target.setProperty(property, value);
                return true;
            },
            get(target, property) {
                if (property in target) {
                    return target[property];
                }
                return target.getProperty(property);
            },
        });
        return element;
    }
    appendChild(parent, child) {
        parent.appendChild(child);
    }
    insertBefore(parent, newChild, referenceChild) {
        parent.insertBefore(newChild, referenceChild);
    }
    removeElement(element) {
        const mockElement = element;
        if (mockElement && mockElement.parentNode) {
            mockElement.parentNode.removeChild(mockElement);
        }
    }
    setAttribute(element, name, value) {
        element.setAttribute(name, value);
    }
    getAttribute(element, name) {
        return element.getAttribute(name);
    }
    setStyles(element, styles) {
        const mockElement = element;
        Object.entries(styles).forEach(([key, value]) => {
            mockElement.style.setProperty(key, value);
        });
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
        const mockElement = element;
        mockElement.innerHTML = html;
        mockElement.textContent = html.replace(/<[^>]*>/g, '');
    }
    addEventListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
    }
    removeEventListener(element, event, handler) {
        element.removeEventListener(event, handler);
    }
    dispatchEvent(element, eventName, detail) {
        const event = {
            type: eventName,
            detail,
            bubbles: true,
            cancelable: true,
            target: element,
            currentTarget: element,
        };
        element.dispatchEvent(event);
    }
    getBoundingClientRect(element) {
        return element.getBoundingClientRect();
    }
    getOffsetWidth(element) {
        return element.offsetWidth;
    }
    getOffsetHeight(element) {
        return element.offsetHeight;
    }
    getParentElement(element) {
        const parent = element.parentNode;
        return parent ? parent : null;
    }
    closest(element, selector) {
        const result = element.closest(selector);
        return result ? result : null;
    }
    matches(element, selector) {
        return element.matches(selector);
    }
    getDocumentElement() {
        return this.documentElement;
    }
    getBodyElement() {
        return this.body;
    }
}
//# sourceMappingURL=dom-mock.js.map