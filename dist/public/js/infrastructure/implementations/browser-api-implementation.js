import { BrowserAPIInterface } from '../interfaces/browser-api-interface';
/**
 * ブラウザAPIインタフェースの実装
 * 実際のブラウザAPI呼び出しを行う
 */
export class BrowserAPIImplementation extends BrowserAPIInterface {
    constructor() {
        super();
        this._windowEventListeners = new Map();
    }
    prompt(message, defaultValue) {
        return window.prompt(message, defaultValue || '');
    }
    alert(message) {
        window.alert(message);
    }
    confirm(message) {
        return window.confirm(message);
    }
    log(...args) {
        console.log(...args);
    }
    warn(...args) {
        console.warn(...args);
    }
    error(...args) {
        console.error(...args);
    }
    setTimeout(callback, delay) {
        return window.setTimeout(callback, delay);
    }
    clearTimeout(timerId) {
        window.clearTimeout(timerId);
    }
    getWindowSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }
    getLocationHref() {
        return window.location.href;
    }
    getUserAgent() {
        return navigator.userAgent;
    }
    addWindowEventListener(event, handler) {
        window.addEventListener(event, handler);
        // イベントリスナーを追跡
        if (!this._windowEventListeners.has(event)) {
            this._windowEventListeners.set(event, new Set());
        }
        this._windowEventListeners.get(event).add(handler);
    }
    removeWindowEventListener(event, handler) {
        window.removeEventListener(event, handler);
        // イベントリスナーの追跡を削除
        if (this._windowEventListeners.has(event)) {
            this._windowEventListeners.get(event).delete(handler);
        }
    }
}
//# sourceMappingURL=browser-api-implementation.js.map