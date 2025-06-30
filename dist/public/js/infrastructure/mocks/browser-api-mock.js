/**
 * ブラウザAPI操作のモック実装
 * テスト用に副作用を排除したブラウザAPI操作を提供
 */
import { BrowserAPIInterface } from '../interfaces/browser-api-interface.js';
export class BrowserAPIMock extends BrowserAPIInterface {
    constructor() {
        super();
        this.logs = [];
        this.warnings = [];
        this.errors = [];
        this.prompts = [];
        this.alerts = [];
        this.confirms = [];
        this.timers = new Map();
        this.timerIdCounter = 1;
        this.windowSize = { width: 1024, height: 768 };
        this.locationHref = 'http://localhost:30033';
        this.userAgent = 'MockBrowser/1.0';
        this.windowEventListeners = new Map();
        // Mock responses
        this.promptResponses = [];
        this.confirmResponses = [];
    }
    /**
     * プロンプトレスポンスを設定
     */
    setPromptResponses(responses) {
        this.promptResponses = [...responses];
    }
    /**
     * 確認ダイアログレスポンスを設定
     */
    setConfirmResponses(responses) {
        this.confirmResponses = [...responses];
    }
    prompt(message, defaultValue = '') {
        let response;
        if (this.promptResponses.length > 0) {
            const shifted = this.promptResponses.shift();
            // nullを明示的に処理
            response = shifted === null ? null : (shifted ?? defaultValue);
        }
        else {
            response = defaultValue;
        }
        this.prompts.push({
            message,
            defaultValue,
            response,
            timestamp: Date.now(),
        });
        return response;
    }
    alert(message) {
        this.alerts.push({ message, timestamp: Date.now() });
    }
    confirm(message) {
        const response = this.confirmResponses.length > 0 ? (this.confirmResponses.shift() ?? true) : true;
        this.confirms.push({ message, response, timestamp: Date.now() });
        return response;
    }
    log(...args) {
        this.logs.push({ args, timestamp: Date.now() });
    }
    warn(...args) {
        this.warnings.push({ args, timestamp: Date.now() });
    }
    error(...args) {
        this.errors.push({ args, timestamp: Date.now() });
    }
    setTimeout(callback, delay) {
        const timerId = this.timerIdCounter++;
        const timer = {
            id: timerId,
            callback,
            delay,
            type: 'timeout',
            executed: false,
        };
        this.timers.set(timerId, timer);
        // すぐに実行する（テスト環境では時間を待たない）
        const executeCallback = () => {
            const currentTimer = this.timers.get(timerId);
            if (currentTimer && !currentTimer.executed) {
                timer.executed = true;
                try {
                    callback();
                }
                catch (error) {
                    this.error('Error in setTimeout callback:', error);
                }
            }
        };
        if (typeof setImmediate !== 'undefined') {
            setImmediate(executeCallback);
        }
        else {
            // setImmediateが利用できない場合はPromise.resolve()を使用
            Promise.resolve().then(executeCallback);
        }
        return timerId;
    }
    clearTimeout(timerId) {
        if (this.timers.has(timerId)) {
            const timer = this.timers.get(timerId);
            if (timer) {
                timer.executed = true;
            }
            this.timers.delete(timerId);
        }
    }
    getWindowSize() {
        return { ...this.windowSize };
    }
    setWindowSize(width, height) {
        this.windowSize = { width, height };
    }
    getLocationHref() {
        return this.locationHref;
    }
    setLocationHref(href) {
        this.locationHref = href;
    }
    getUserAgent() {
        return this.userAgent;
    }
    setUserAgent(userAgent) {
        this.userAgent = userAgent;
    }
    addWindowEventListener(event, handler) {
        if (!this.windowEventListeners.has(event)) {
            this.windowEventListeners.set(event, new Set());
        }
        this.windowEventListeners.get(event)?.add(handler);
    }
    removeWindowEventListener(event, handler) {
        if (this.windowEventListeners.has(event)) {
            this.windowEventListeners.get(event)?.delete(handler);
        }
    }
    /**
     * ウィンドウイベントを発火（テスト用）
     */
    triggerWindowEvent(event, eventData = {}) {
        if (this.windowEventListeners.has(event)) {
            this.windowEventListeners.get(event)?.forEach((handler) => {
                try {
                    handler(eventData);
                }
                catch (error) {
                    this.error('Error in window event handler:', error);
                }
            });
        }
    }
    // テスト用ヘルパーメソッド
    /**
     * ログ出力履歴を取得
     */
    getLogs() {
        return [...this.logs];
    }
    /**
     * 警告出力履歴を取得
     */
    getWarnings() {
        return [...this.warnings];
    }
    /**
     * エラー出力履歴を取得
     */
    getErrors() {
        return [...this.errors];
    }
    /**
     * プロンプト履歴を取得
     */
    getPrompts() {
        return [...this.prompts];
    }
    /**
     * アラート履歴を取得
     */
    getAlerts() {
        return [...this.alerts];
    }
    /**
     * 確認ダイアログ履歴を取得
     */
    getConfirms() {
        return [...this.confirms];
    }
    /**
     * タイマー情報を取得
     */
    getTimers() {
        return new Map(this.timers);
    }
    /**
     * 全ての履歴をクリア
     */
    clearHistory() {
        this.logs = [];
        this.warnings = [];
        this.errors = [];
        this.prompts = [];
        this.alerts = [];
        this.confirms = [];
        this.timers.clear();
    }
}
//# sourceMappingURL=browser-api-mock.js.map