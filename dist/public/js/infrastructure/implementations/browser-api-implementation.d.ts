import { BrowserAPIInterface } from '../interfaces/browser-api-interface';
import type { EventHandler, WindowSize } from '../../types/infrastructure';
/**
 * ブラウザAPIインタフェースの実装
 * 実際のブラウザAPI呼び出しを行う
 */
export declare class BrowserAPIImplementation extends BrowserAPIInterface {
    private _windowEventListeners;
    constructor();
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
//# sourceMappingURL=browser-api-implementation.d.ts.map