import { BrowserAPIInterface } from '../interfaces/browser-api-interface.js';
import type { EventHandler, WindowSize } from '../../types/infrastructure.js';

/**
 * ブラウザAPIインタフェースの実装
 * 実際のブラウザAPI呼び出しを行う
 */
export class BrowserAPIImplementation extends BrowserAPIInterface {
  private _windowEventListeners: Map<string, Set<EventHandler<any>>>;

  constructor() {
    super();
    this._windowEventListeners = new Map();
  }

  prompt(message: string, defaultValue?: string): string | null {
    return window.prompt(message, defaultValue || '');
  }

  alert(message: string): void {
    window.alert(message);
  }

  confirm(message: string): boolean {
    return window.confirm(message);
  }

  log(...args: unknown[]): void {
    console.log(...args);
  }

  warn(...args: unknown[]): void {
    console.warn(...args);
  }

  error(...args: unknown[]): void {
    console.error(...args);
  }

  setTimeout(callback: () => void, delay: number): number {
    return window.setTimeout(callback, delay);
  }

  clearTimeout(timerId: number): void {
    window.clearTimeout(timerId);
  }

  getWindowSize(): WindowSize {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  getLocationHref(): string {
    return window.location.href;
  }

  getUserAgent(): string {
    return navigator.userAgent;
  }

  addWindowEventListener<T extends Event = Event>(event: string, handler: EventHandler<T>): void {
    window.addEventListener(event, handler as EventListener);

    // イベントリスナーを追跡
    if (!this._windowEventListeners.has(event)) {
      this._windowEventListeners.set(event, new Set());
    }
    this._windowEventListeners.get(event)!.add(handler as EventHandler<any>);
  }

  removeWindowEventListener<T extends Event = Event>(event: string, handler: EventHandler<T>): void {
    window.removeEventListener(event, handler as EventListener);

    // イベントリスナーの追跡を削除
    if (this._windowEventListeners.has(event)) {
      this._windowEventListeners.get(event)!.delete(handler as EventHandler<any>);
    }
  }
}
