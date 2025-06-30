/**
 * ブラウザAPI操作のモック実装
 * テスト用に副作用を排除したブラウザAPI操作を提供
 */
import { BrowserAPIInterface } from '../interfaces/browser-api-interface.js';
import type {
  WindowSize,
  EventHandler,
  MockLogEntry,
  MockPromptEntry,
  MockAlertEntry,
  MockConfirmEntry,
  MockTimer,
} from '../../types/infrastructure.js';

export class BrowserAPIMock extends BrowserAPIInterface {
  private logs: MockLogEntry[];
  private warnings: MockLogEntry[];
  private errors: MockLogEntry[];
  private prompts: MockPromptEntry[];
  private alerts: MockAlertEntry[];
  private confirms: MockConfirmEntry[];
  private timers: Map<number, MockTimer>;
  private timerIdCounter: number;
  private windowSize: WindowSize;
  private locationHref: string;
  private userAgent: string;
  private windowEventListeners: Map<string, Set<EventHandler>>;

  // Mock responses
  private promptResponses: (string | null)[];
  private confirmResponses: boolean[];

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
  setPromptResponses(responses: (string | null)[]): void {
    this.promptResponses = [...responses];
  }

  /**
   * 確認ダイアログレスポンスを設定
   */
  setConfirmResponses(responses: boolean[]): void {
    this.confirmResponses = [...responses];
  }

  prompt(message: string, defaultValue: string = ''): string | null {
    let response: string | null;
    if (this.promptResponses.length > 0) {
      const shifted = this.promptResponses.shift();
      // nullを明示的に処理
      response = shifted === null ? null : (shifted ?? defaultValue);
    } else {
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

  alert(message: string): void {
    this.alerts.push({ message, timestamp: Date.now() });
  }

  confirm(message: string): boolean {
    const response = this.confirmResponses.length > 0 ? (this.confirmResponses.shift() ?? true) : true;
    this.confirms.push({ message, response, timestamp: Date.now() });
    return response;
  }

  log(...args: unknown[]): void {
    this.logs.push({ args, timestamp: Date.now() });
  }

  warn(...args: unknown[]): void {
    this.warnings.push({ args, timestamp: Date.now() });
  }

  error(...args: unknown[]): void {
    this.errors.push({ args, timestamp: Date.now() });
  }

  setTimeout(callback: () => void, delay: number): number {
    const timerId = this.timerIdCounter++;

    const timer: MockTimer = {
      id: timerId,
      callback,
      delay,
      type: 'timeout',
      executed: false,
    };

    this.timers.set(timerId, timer);

    // すぐに実行する（テスト環境では時間を待たない）
    const executeCallback = (): void => {
      const currentTimer = this.timers.get(timerId);
      if (currentTimer && !currentTimer.executed) {
        timer.executed = true;
        try {
          callback();
        } catch (error) {
          this.error('Error in setTimeout callback:', error);
        }
      }
    };

    if (typeof setImmediate !== 'undefined') {
      setImmediate(executeCallback);
    } else {
      // setImmediateが利用できない場合はPromise.resolve()を使用
      Promise.resolve().then(executeCallback);
    }

    return timerId;
  }

  clearTimeout(timerId: number): void {
    if (this.timers.has(timerId)) {
      const timer = this.timers.get(timerId);
      if (timer) {
        timer.executed = true;
      }
      this.timers.delete(timerId);
    }
  }

  getWindowSize(): WindowSize {
    return { ...this.windowSize };
  }

  setWindowSize(width: number, height: number): void {
    this.windowSize = { width, height };
  }

  getLocationHref(): string {
    return this.locationHref;
  }

  setLocationHref(href: string): void {
    this.locationHref = href;
  }

  getUserAgent(): string {
    return this.userAgent;
  }

  setUserAgent(userAgent: string): void {
    this.userAgent = userAgent;
  }

  addWindowEventListener(event: string, handler: EventHandler): void {
    if (!this.windowEventListeners.has(event)) {
      this.windowEventListeners.set(event, new Set());
    }
    this.windowEventListeners.get(event)?.add(handler);
  }

  removeWindowEventListener(event: string, handler: EventHandler): void {
    if (this.windowEventListeners.has(event)) {
      this.windowEventListeners.get(event)?.delete(handler);
    }
  }

  /**
   * ウィンドウイベントを発火（テスト用）
   */
  triggerWindowEvent(event: string, eventData: Event | Record<string, unknown> = {}): void {
    if (this.windowEventListeners.has(event)) {
      this.windowEventListeners.get(event)?.forEach((handler) => {
        try {
          handler(eventData as Event);
        } catch (error) {
          this.error('Error in window event handler:', error);
        }
      });
    }
  }

  // テスト用ヘルパーメソッド

  /**
   * ログ出力履歴を取得
   */
  getLogs(): MockLogEntry[] {
    return [...this.logs];
  }

  /**
   * 警告出力履歴を取得
   */
  getWarnings(): MockLogEntry[] {
    return [...this.warnings];
  }

  /**
   * エラー出力履歴を取得
   */
  getErrors(): MockLogEntry[] {
    return [...this.errors];
  }

  /**
   * プロンプト履歴を取得
   */
  getPrompts(): MockPromptEntry[] {
    return [...this.prompts];
  }

  /**
   * アラート履歴を取得
   */
  getAlerts(): MockAlertEntry[] {
    return [...this.alerts];
  }

  /**
   * 確認ダイアログ履歴を取得
   */
  getConfirms(): MockConfirmEntry[] {
    return [...this.confirms];
  }

  /**
   * タイマー情報を取得
   */
  getTimers(): Map<number, MockTimer> {
    return new Map(this.timers);
  }

  /**
   * 全ての履歴をクリア
   */
  clearHistory(): void {
    this.logs = [];
    this.warnings = [];
    this.errors = [];
    this.prompts = [];
    this.alerts = [];
    this.confirms = [];
    this.timers.clear();
  }
}
