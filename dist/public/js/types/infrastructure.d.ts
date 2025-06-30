/**
 * ER Viewer Application - Infrastructure Type Definitions
 */
export type EventHandler = (...args: any[]) => void;
export type CustomEventDetail = any;
export interface BoundingRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
    toJSON: () => any;
}
export interface EventListenerOptions {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
}
export interface CreateElementOptions {
    namespace?: string;
    classes?: string[];
    attributes?: Record<string, string>;
    styles?: Record<string, string>;
}
export interface DOMInterface {
    querySelector(selector: string): Element | null;
    querySelectorAll(selector: string): Element[];
    getElementById(id: string): Element | null;
    createElement(tagName: string, namespace?: string | null): Element;
    appendChild(parent: Element, child: Element): void;
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
export interface NetworkInterface {
    fetch(url: string, options?: RequestOptions): Promise<Response>;
    postJSON<T = unknown>(url: string, data: unknown): Promise<T>;
    getJSON<T = unknown>(url: string): Promise<T>;
}
export interface StorageInterface {
    setItem<T = unknown>(key: string, value: T): void;
    getItem<T = unknown>(key: string): T | null;
    removeItem(key: string): void;
    clear(): void;
}
export interface BrowserAPIInterface {
    prompt(message: string, defaultValue?: string): string | null;
    alert(message: string): void;
    confirm(message: string): boolean;
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    setTimeout(callback: () => void, delay: number): number;
    clearTimeout(timerId: number): void;
    getWindowSize(): WindowSize;
    getLocationHref(): string;
    getUserAgent(): string;
    addWindowEventListener(event: string, handler: EventHandler): void;
    removeWindowEventListener(event: string, handler: EventHandler): void;
}
export interface Infrastructure {
    dom: DOMInterface;
    network: NetworkInterface;
    storage: StorageInterface;
    browserAPI: BrowserAPIInterface;
}
export interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    timeout?: number;
}
export interface UploadOptions extends RequestOptions {
    onProgress?: (progress: UploadProgress) => void;
    metadata?: Record<string, any>;
}
export interface UploadProgress {
    loaded: number;
    total: number;
    percent: number;
}
export interface UploadResponse {
    url: string;
    filename: string;
    size: number;
    type: string;
}
export type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
export type ResponseInterceptor = <T = any>(response: Response) => T | Promise<T>;
export interface PerformanceMetrics {
    navigationTiming: PerformanceNavigationTiming;
    resourceTimings: PerformanceResourceTiming[];
    marks: PerformanceMark[];
    measures: PerformanceMeasure[];
    memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
    };
}
export interface MockDOMState {
    elements: Map<string, MockElement>;
    activeElement: MockElement | null;
    eventListeners: Map<string, Set<EventListener>>;
}
export interface MockElement {
    tagName: string;
    id: string;
    className: string;
    attributes: Map<string, string>;
    style: Record<string, string>;
    children: MockElement[];
    parent: MockElement | null;
    textContent: string;
}
export interface MockNetworkState {
    requests: MockRequest[];
    responses: Map<string, MockResponse>;
    defaultHeaders: Record<string, string>;
    baseURL: string;
}
export interface MockRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
    timestamp: number;
    options?: RequestInit;
}
export interface MockNetworkResponse {
    data?: any;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    delay?: number;
    text?: string;
}
export type MockRequestHistory = MockRequest;
export interface MockLogEntry {
    args: any[];
    timestamp: number;
}
export interface MockPromptEntry {
    message: string;
    defaultValue?: string;
    response: string | null;
    timestamp?: number;
}
export interface MockAlertEntry {
    message: string;
    timestamp?: number;
}
export interface MockConfirmEntry {
    message: string;
    response: boolean;
    timestamp?: number;
}
export interface MockTimer {
    id?: number;
    callback: () => void;
    delay: number;
    type: 'timeout' | 'interval';
    executed?: boolean;
}
export interface MockResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
}
export interface MockStorageState {
    items: Map<string, string>;
    sizeLimit: number;
}
export interface MockBrowserAPIState {
    timers: Map<number, NodeJS.Timeout>;
    console: MockConsole;
    location: URL;
    performance: MockPerformance;
}
export interface MockConsole {
    logs: Array<{
        level: string;
        args: any[];
        timestamp: number;
    }>;
}
export interface MockPerformance {
    marks: Map<string, number>;
    measures: Map<string, {
        start: number;
        end: number;
        duration: number;
    }>;
}
export interface MockData {
    networkResponses?: Record<string, MockNetworkResponse>;
    storageData?: Record<string, any>;
    promptResponses?: string[];
    confirmResponses?: boolean[];
    windowSize?: WindowSize;
}
export interface WindowSize {
    width: number;
    height: number;
}
export interface InteractionHistory {
    networkRequests: MockRequest[];
    logs: MockLogEntry[];
    warnings: MockLogEntry[];
    errors: MockLogEntry[];
    prompts: MockPromptEntry[];
    alerts: MockAlertEntry[];
    confirms: MockConfirmEntry[];
    storageOperations: Record<string, string>;
}
//# sourceMappingURL=infrastructure.d.ts.map