/**
 * ブラウザAPI操作のモック実装
 * テスト用に副作用を排除したブラウザAPI操作を提供
 */
import { BrowserAPIInterface } from '../interfaces/browser-api-interface.js';
import type { WindowSize, EventHandler, MockLogEntry, MockPromptEntry, MockAlertEntry, MockConfirmEntry, MockTimer } from '../../types/infrastructure.js';
export declare class BrowserAPIMock extends BrowserAPIInterface {
    private logs;
    private warnings;
    private errors;
    private prompts;
    private alerts;
    private confirms;
    private timers;
    private timerIdCounter;
    private windowSize;
    private locationHref;
    private userAgent;
    private windowEventListeners;
    private promptResponses;
    private confirmResponses;
    constructor();
    /**
     * プロンプトレスポンスを設定
     */
    setPromptResponses(responses: (string | null)[]): void;
    /**
     * 確認ダイアログレスポンスを設定
     */
    setConfirmResponses(responses: boolean[]): void;
    prompt(message: string, defaultValue?: string): string | null;
    alert(message: string): void;
    confirm(message: string): boolean;
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    setTimeout(callback: () => void, delay: number): number;
    clearTimeout(timerId: number): void;
    getWindowSize(): WindowSize;
    setWindowSize(width: number, height: number): void;
    getLocationHref(): string;
    setLocationHref(href: string): void;
    getUserAgent(): string;
    setUserAgent(userAgent: string): void;
    addWindowEventListener(event: string, handler: EventHandler): void;
    removeWindowEventListener(event: string, handler: EventHandler): void;
    /**
     * ウィンドウイベントを発火（テスト用）
     */
    triggerWindowEvent(event: string, eventData?: Event | Record<string, unknown>): void;
    /**
     * ログ出力履歴を取得
     */
    getLogs(): MockLogEntry[];
    /**
     * 警告出力履歴を取得
     */
    getWarnings(): MockLogEntry[];
    /**
     * エラー出力履歴を取得
     */
    getErrors(): MockLogEntry[];
    /**
     * プロンプト履歴を取得
     */
    getPrompts(): MockPromptEntry[];
    /**
     * アラート履歴を取得
     */
    getAlerts(): MockAlertEntry[];
    /**
     * 確認ダイアログ履歴を取得
     */
    getConfirms(): MockConfirmEntry[];
    /**
     * タイマー情報を取得
     */
    getTimers(): Map<number, MockTimer>;
    /**
     * 全ての履歴をクリア
     */
    clearHistory(): void;
}
//# sourceMappingURL=browser-api-mock.d.ts.map