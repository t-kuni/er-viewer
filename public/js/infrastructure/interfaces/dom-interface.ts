import type {
  DOMInterface as IDOMInterface,
  EventHandler,
  BoundingRect,
  EventListenerOptions,
  CustomEventDetail,
} from '../../types/infrastructure.js';

/**
 * DOM操作の抽象インタフェース
 * 副作用を含む全てのDOM操作をこのインタフェースを通して行う
 */
export abstract class DOMInterface implements IDOMInterface {
  /**
   * 要素を取得
   */
  abstract querySelector(selector: string): Element | null;

  /**
   * 全ての要素を取得
   */
  abstract querySelectorAll(selector: string): Element[];

  /**
   * IDで要素を取得
   */
  abstract getElementById(id: string): Element | null;

  /**
   * 要素を作成
   */
  abstract createElement(tagName: string, namespace?: string | null): Element;

  /**
   * 要素に子要素を追加
   */
  abstract appendChild(parent: Element, child: Element): void;

  /**
   * 要素を削除
   */
  abstract removeElement(element: Element): void;

  /**
   * 要素の属性を設定
   */
  abstract setAttribute(element: Element, name: string, value: string): void;

  /**
   * 要素の属性を取得
   */
  abstract getAttribute(element: Element, name: string): string | null;

  /**
   * 要素のスタイルを設定
   */
  abstract setStyles(element: Element, styles: Record<string, string>): void;

  /**
   * 要素のクラスを追加
   */
  abstract addClass(element: Element, className: string): void;

  /**
   * 要素のクラスを削除
   */
  abstract removeClass(element: Element, className: string): void;

  /**
   * 要素がクラスを持っているか確認
   */
  abstract hasClass(element: Element, className: string): boolean;

  /**
   * 要素のHTMLを設定
   */
  abstract setInnerHTML(element: Element, html: string): void;

  /**
   * イベントリスナーを追加
   */
  abstract addEventListener(
    element: Element,
    event: string,
    handler: EventHandler,
    options?: EventListenerOptions,
  ): void;

  /**
   * イベントリスナーを削除
   */
  abstract removeEventListener(element: Element, event: string, handler: EventHandler): void;

  /**
   * カスタムイベントを発火
   */
  abstract dispatchEvent(element: Element, eventName: string, detail?: CustomEventDetail): void;

  /**
   * 要素の境界ボックスを取得
   */
  abstract getBoundingClientRect(element: Element): BoundingRect;

  /**
   * 要素のオフセット幅を取得
   */
  abstract getOffsetWidth(element: Element): number;

  /**
   * 要素のオフセット高さを取得
   */
  abstract getOffsetHeight(element: Element): number;

  /**
   * 要素の親要素を取得
   */
  abstract getParentElement(element: Element): Element | null;

  /**
   * 最も近い祖先要素を取得
   */
  abstract closest(element: Element, selector: string): Element | null;

  /**
   * 要素がセレクタにマッチするか確認
   */
  abstract matches(element: Element, selector: string): boolean;

  /**
   * ドキュメントのルート要素を取得
   */
  abstract getDocumentElement(): Element;

  /**
   * ボディ要素を取得
   */
  abstract getBodyElement(): Element;
}
