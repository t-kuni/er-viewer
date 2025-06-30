import type { BrowserAPIInterface as IBrowserAPIInterface, WindowSize, EventHandler } from '../../types/infrastructure.js';

/**
 * ブラウザAPI操作の抽象インタフェース
 * prompt、alert、console、window操作などを抽象化
 */
export abstract class BrowserAPIInterface implements IBrowserAPIInterface {
  /**
   * プロンプトダイアログを表示
   */
  abstract prompt(message: string, defaultValue?: string): string | null;

  /**
   * アラートダイアログを表示
   */
  abstract alert(message: string): void;

  /**
   * 確認ダイアログを表示
   */
  abstract confirm(message: string): boolean;

  /**
   * コンソールログ出力
   */
  abstract log(...args: unknown[]): void;

  /**
   * コンソール警告出力
   */
  abstract warn(...args: unknown[]): void;

  /**
   * コンソールエラー出力
   */
  abstract error(...args: unknown[]): void;

  /**
   * タイマーを設定
   */
  abstract setTimeout(callback: () => void, delay: number): number;

  /**
   * タイマーをクリア
   */
  abstract clearTimeout(timerId: number): void;

  /**
   * ウィンドウサイズを取得
   */
  abstract getWindowSize(): WindowSize;

  /**
   * 現在のURLを取得
   */
  abstract getLocationHref(): string;

  /**
   * ユーザーエージェントを取得
   */
  abstract getUserAgent(): string;

  /**
   * ウィンドウイベントリスナーを追加
   */
  abstract addWindowEventListener(event: string, handler: EventHandler): void;

  /**
   * ウィンドウイベントリスナーを削除
   */
  abstract removeWindowEventListener(event: string, handler: EventHandler): void;
}
