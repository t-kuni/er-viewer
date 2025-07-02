/**
 * DOM操作のモック実装
 * テスト用に副作用を排除したDOM操作を提供
 */
import { DOMInterface } from '../interfaces/dom-interface.js';
import type {
  EventHandler,
  BoundingRect,
  EventListenerOptions,
  CustomEventDetail,
} from '../../types/infrastructure.js';

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

export class MockElement implements MockElementAttributes {
  public tagName: string;
  public namespace: string | null;
  public attributes: Map<string, string>;
  public children: MockElement[];
  public parentNode: MockElement | null;
  public innerHTML: string;
  public textContent: string;
  public classList: MockClassList;
  public style: MockStyle;
  public eventListeners: Map<string, Set<EventHandler>>;
  public offsetWidth: number;
  public offsetHeight: number;
  public boundingClientRect: BoundingRect;

  constructor(tagName: string, namespace: string | null = null) {
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

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) || null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  appendChild(child: MockElement): MockElement {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  insertBefore(newChild: MockElement, referenceChild: MockElement | null): MockElement {
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }

    if (!referenceChild) {
      this.children.push(newChild);
    } else {
      const index = this.children.indexOf(referenceChild);
      if (index === -1) {
        // If reference child not found, append at the end
        this.children.push(newChild);
      } else {
        this.children.splice(index, 0, newChild);
      }
    }

    newChild.parentNode = this;
    return newChild;
  }

  removeChild(child: MockElement): MockElement {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  querySelector(selector: string): MockElement | null {
    return this.findElement(selector);
  }

  querySelectorAll(selector: string): MockElement[] {
    return this.findAllElements(selector);
  }

  get firstChild(): MockElement | null {
    return this.children[0] || null;
  }

  get lastChild(): MockElement | null {
    return this.children[this.children.length - 1] || null;
  }

  findElement(selector: string): MockElement | null {
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return this.findById(id);
    }
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      return this.findByClass(className);
    }
    if (selector.startsWith('[') && selector.endsWith(']')) {
      // Handle attribute selector
      const attributeMatch = selector.match(/\[([^=]+)="([^"]+)"\]/);
      if (attributeMatch?.[1] && attributeMatch[2]) {
        const [, attrName, attrValue] = attributeMatch;
        return this.findByAttribute(attrName, attrValue);
      }
    }
    return this.findByTag(selector);
  }

  findAllElements(selector: string): MockElement[] {
    const results: MockElement[] = [];
    this.findAllElementsRecursive(selector, results);
    return results;
  }

  findAllElementsRecursive(selector: string, results: MockElement[]): void {
    if (this.matches(selector)) {
      results.push(this);
    }
    for (const child of this.children) {
      if (child.findAllElementsRecursive) {
        child.findAllElementsRecursive(selector, results);
      }
    }
  }

  findById(id: string): MockElement | null {
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

  findByClass(className: string): MockElement | null {
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

  findByTag(tagName: string): MockElement | null {
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

  findByAttribute(attrName: string, attrValue: string): MockElement | null {
    if (this.getAttribute(attrName) === attrValue) {
      return this;
    }
    for (const child of this.children) {
      if (child.findByAttribute) {
        const found = child.findByAttribute(attrName, attrValue);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  closest(selector: string): MockElement | null {
    let current: MockElement | null = this;
    while (current) {
      if (current.matches && current.matches(selector)) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  matches(selector: string): boolean {
    if (selector.startsWith('#')) {
      return this.getAttribute('id') === selector.substring(1);
    }
    if (selector.startsWith('.')) {
      return this.classList.contains(selector.substring(1));
    }
    if (selector.startsWith('[') && selector.endsWith(']')) {
      // Handle attribute selector
      const attributeMatch = selector.match(/\[([^=]+)="([^"]+)"\]/);
      if (attributeMatch?.[1] && attributeMatch[2]) {
        const [, attrName, attrValue] = attributeMatch;
        return this.getAttribute(attrName) === attrValue;
      }
    }
    return this.tagName === selector.toLowerCase();
  }

  addEventListener(event: string, handler: EventHandler, _options?: EventListenerOptions): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: EventHandler): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.delete(handler);
    }
  }

  dispatchEvent(event: Event | string | Record<string, unknown>): boolean {
    const eventType = typeof event === 'string' ? event : (event as Event).type;
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType)!.forEach((handler) => {
        try {
          handler(event as Event);
        } catch {
          // Ignore errors in mock
        }
      });
    }
    return true;
  }

  getBoundingClientRect(): BoundingRect {
    return { ...this.boundingClientRect };
  }
}

class MockClassList {
  private classes: Set<string>;

  constructor() {
    this.classes = new Set();
  }

  add(className: string): void {
    this.classes.add(className);
  }

  remove(className: string): void {
    this.classes.delete(className);
  }

  contains(className: string): boolean {
    return this.classes.has(className);
  }

  toggle(className: string): boolean {
    if (this.classes.has(className)) {
      this.classes.delete(className);
      return false;
    } else {
      this.classes.add(className);
      return true;
    }
  }

  get values(): Set<string> {
    return new Set(this.classes);
  }
}

class MockStyle {
  private _styles: Map<string, string>;

  constructor() {
    this._styles = new Map();
  }

  setProperty(property: string, value: string): void {
    this._styles.set(property, value);
  }

  getProperty(property: string): string {
    return this._styles.get(property) || '';
  }

  get entries(): Map<string, string> {
    return new Map(this._styles);
  }

  // Allow direct property access
  [key: string]: unknown;
}

export class DOMMock extends DOMInterface {
  private document: MockElement;
  private body: MockElement;
  private documentElement: MockElement;

  constructor() {
    super();
    this.document = new MockElement('document');
    this.body = new MockElement('body');
    this.documentElement = new MockElement('html');

    // Add readyState property
    (this.documentElement as MockElement & { readyState: string }).readyState = 'complete';

    // Set up basic structure
    this.document.appendChild(this.documentElement);
    this.documentElement.appendChild(this.body);

    this.setupMockERViewerElements();
  }

  private setupMockERViewerElements(): void {
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

    // Create SVG structure
    const mainGroup = new MockElement('g', 'http://www.w3.org/2000/svg');
    mainGroup.setAttribute('id', 'main-group');
    canvas.appendChild(mainGroup);

    const staticLayer = new MockElement('g', 'http://www.w3.org/2000/svg');
    staticLayer.setAttribute('id', 'static-layer');
    mainGroup.appendChild(staticLayer);

    const dynamicLayer = new MockElement('g', 'http://www.w3.org/2000/svg');
    dynamicLayer.setAttribute('id', 'dynamic-layer');
    mainGroup.appendChild(dynamicLayer);

    const annotationLayer = new MockElement('g', 'http://www.w3.org/2000/svg');
    annotationLayer.setAttribute('id', 'annotation-layer');
    mainGroup.appendChild(annotationLayer);

    const highlightLayer = new MockElement('g', 'http://www.w3.org/2000/svg');
    highlightLayer.setAttribute('id', 'highlight-layer');
    mainGroup.appendChild(highlightLayer);

    // Create mock layer sidebar
    const layerSidebar = new MockElement('div');
    layerSidebar.setAttribute('id', 'layer-sidebar');
    layerSidebar.classList.add('layer-sidebar');
    this.body.appendChild(layerSidebar);

    const collapseLayerSidebarBtn = new MockElement('button');
    collapseLayerSidebarBtn.setAttribute('id', 'collapse-layer-sidebar');
    collapseLayerSidebarBtn.classList.add('collapse-btn');
    layerSidebar.appendChild(collapseLayerSidebarBtn);

    // Create mock layer list
    const layerList = new MockElement('div');
    layerList.setAttribute('id', 'layer-list');
    layerList.classList.add('layer-list');
    layerSidebar.appendChild(layerList);

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

  querySelector(selector: string): Element | null {
    const result = this.document.querySelector(selector);
    return result ? (result as unknown as Element) : null;
  }

  querySelectorAll(selector: string): Element[] {
    const results = this.document.querySelectorAll(selector);
    return results.map((el) => el as unknown as Element);
  }

  getElementById(id: string): Element | null {
    const result = this.document.findById(id);
    return result ? (result as unknown as Element) : null;
  }

  createElement(tagName: string, namespace?: string | null): Element {
    const element = new MockElement(tagName, namespace || null);
    if (namespace) {
      element.namespace = namespace;
    }
    // Create a proxy for style to handle dynamic property access
    element.style = new Proxy(element.style, {
      set(target, property: string, value: string) {
        target.setProperty(property, value);
        return true;
      },
      get(target, property: string) {
        if (property in target) {
          return target[property];
        }
        return target.getProperty(property);
      },
    });
    return element as unknown as Element;
  }

  createElementSvg(tagName: string): Element {
    return this.createElement(tagName, 'http://www.w3.org/2000/svg');
  }

  appendChild(parent: Element, child: Element): void {
    (parent as unknown as MockElement).appendChild(child as unknown as MockElement);
  }

  insertBefore(parent: Element, newChild: Element, referenceChild: Element | null): void {
    (parent as unknown as MockElement).insertBefore(
      newChild as unknown as MockElement,
      referenceChild as unknown as MockElement | null,
    );
  }

  removeElement(element: Element): void {
    const mockElement = element as unknown as MockElement;
    if (mockElement && mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement);
    }
  }

  setAttribute(element: Element, name: string, value: string): void {
    (element as unknown as MockElement).setAttribute(name, value);
  }

  getAttribute(element: Element, name: string): string | null {
    return (element as unknown as MockElement).getAttribute(name);
  }

  setStyles(element: Element, styles: Record<string, string>): void {
    const mockElement = element as unknown as MockElement;
    Object.entries(styles).forEach(([key, value]) => {
      mockElement.style.setProperty(key, value);
    });
  }

  addClass(element: Element, className: string): void {
    (element as unknown as MockElement).classList.add(className);
  }

  removeClass(element: Element, className: string): void {
    (element as unknown as MockElement).classList.remove(className);
  }

  hasClass(element: Element, className: string): boolean {
    return (element as unknown as MockElement).classList.contains(className);
  }

  setInnerHTML(element: Element, html: string): void {
    const mockElement = element as unknown as MockElement;
    mockElement.innerHTML = html;
    mockElement.textContent = html.replace(/<[^>]*>/g, '');
    // Clear children when innerHTML is set (mimics real DOM behavior)
    mockElement.children = [];
  }

  setTextContent(element: Element, text: string): void {
    const mockElement = element as unknown as MockElement;
    mockElement.textContent = text;
  }

  addEventListener(element: Element, event: string, handler: EventHandler, options?: EventListenerOptions): void {
    (element as unknown as MockElement).addEventListener(event, handler, options);
  }

  removeEventListener(element: Element, event: string, handler: EventHandler): void {
    (element as unknown as MockElement).removeEventListener(event, handler);
  }

  dispatchEvent(element: Element, eventName: string, detail?: CustomEventDetail): void {
    const event = {
      type: eventName,
      detail,
      bubbles: true,
      cancelable: true,
      target: element,
      currentTarget: element,
    };
    (element as unknown as MockElement).dispatchEvent(event);
  }

  getBoundingClientRect(element: Element): BoundingRect {
    return (element as unknown as MockElement).getBoundingClientRect();
  }

  getOffsetWidth(element: Element): number {
    return (element as unknown as MockElement).offsetWidth;
  }

  getOffsetHeight(element: Element): number {
    return (element as unknown as MockElement).offsetHeight;
  }

  getParentElement(element: Element): Element | null {
    const parent = (element as unknown as MockElement).parentNode;
    return parent ? (parent as unknown as Element) : null;
  }

  closest(element: Element, selector: string): Element | null {
    const result = (element as unknown as MockElement).closest(selector);
    return result ? (result as unknown as Element) : null;
  }

  matches(element: Element, selector: string): boolean {
    return (element as unknown as MockElement).matches(selector);
  }

  getDocumentElement(): Element {
    return this.documentElement as unknown as Element;
  }

  getBodyElement(): Element {
    return this.body as unknown as Element;
  }

  cloneNode(element: Element, deep: boolean): Element {
    const mockElement = element as unknown as MockElement;
    const clone = new MockElement(mockElement.tagName, mockElement.namespace);

    // Copy attributes
    for (const [key, value] of mockElement.attributes) {
      clone.setAttribute(key, value);
    }

    // Copy styles
    for (const [key, value] of mockElement.style.entries) {
      clone.style.setProperty(key, value);
    }

    // Copy classes
    for (const className of mockElement.classList.values) {
      clone.classList.add(className);
    }

    // Deep clone children if requested
    if (deep && mockElement.children.length > 0) {
      for (const child of mockElement.children) {
        const childClone = this.cloneNode(child as unknown as Element, true);
        clone.appendChild(childClone as unknown as MockElement);
      }
    }

    return clone as unknown as Element;
  }
}
