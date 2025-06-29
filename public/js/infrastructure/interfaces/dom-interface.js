/**
 * DOM操作の抽象インタフェース
 * 副作用を含む全てのDOM操作をこのインタフェースを通して行う
 */
export class DOMInterface {
    /**
     * 要素を取得
     * @param {string} selector - CSSセレクタまたはID
     * @returns {Object} 要素の抽象表現
     */
    querySelector(selector) {
        throw new Error('Not implemented');
    }

    /**
     * 全ての要素を取得
     * @param {string} selector - CSSセレクタ
     * @returns {Array} 要素の抽象表現の配列
     */
    querySelectorAll(selector) {
        throw new Error('Not implemented');
    }

    /**
     * IDで要素を取得
     * @param {string} id - 要素ID
     * @returns {Object} 要素の抽象表現
     */
    getElementById(id) {
        throw new Error('Not implemented');
    }

    /**
     * 要素を作成
     * @param {string} tagName - タグ名
     * @param {string} namespace - 名前空間（オプション）
     * @returns {Object} 作成された要素の抽象表現
     */
    createElement(tagName, namespace = null) {
        throw new Error('Not implemented');
    }

    /**
     * 要素に子要素を追加
     * @param {Object} parent - 親要素
     * @param {Object} child - 子要素
     */
    appendChild(parent, child) {
        throw new Error('Not implemented');
    }

    /**
     * 要素を削除
     * @param {Object} element - 削除する要素
     */
    removeElement(element) {
        throw new Error('Not implemented');
    }

    /**
     * 要素の属性を設定
     * @param {Object} element - 要素
     * @param {string} name - 属性名
     * @param {string} value - 属性値
     */
    setAttribute(element, name, value) {
        throw new Error('Not implemented');
    }

    /**
     * 要素の属性を取得
     * @param {Object} element - 要素
     * @param {string} name - 属性名
     * @returns {string} 属性値
     */
    getAttribute(element, name) {
        throw new Error('Not implemented');
    }

    /**
     * 要素のスタイルを設定
     * @param {Object} element - 要素
     * @param {Object} styles - スタイルオブジェクト
     */
    setStyles(element, styles) {
        throw new Error('Not implemented');
    }

    /**
     * 要素のクラスを追加
     * @param {Object} element - 要素
     * @param {string} className - クラス名
     */
    addClass(element, className) {
        throw new Error('Not implemented');
    }

    /**
     * 要素のクラスを削除
     * @param {Object} element - 要素
     * @param {string} className - クラス名
     */
    removeClass(element, className) {
        throw new Error('Not implemented');
    }

    /**
     * 要素がクラスを持っているか確認
     * @param {Object} element - 要素
     * @param {string} className - クラス名
     * @returns {boolean}
     */
    hasClass(element, className) {
        throw new Error('Not implemented');
    }

    /**
     * 要素のHTMLを設定
     * @param {Object} element - 要素
     * @param {string} html - HTML文字列
     */
    setInnerHTML(element, html) {
        throw new Error('Not implemented');
    }

    /**
     * イベントリスナーを追加
     * @param {Object} element - 要素
     * @param {string} event - イベント名
     * @param {Function} handler - ハンドラー関数
     * @param {Object} options - オプション
     */
    addEventListener(element, event, handler, options = {}) {
        throw new Error('Not implemented');
    }

    /**
     * イベントリスナーを削除
     * @param {Object} element - 要素
     * @param {string} event - イベント名
     * @param {Function} handler - ハンドラー関数
     */
    removeEventListener(element, event, handler) {
        throw new Error('Not implemented');
    }

    /**
     * カスタムイベントを発火
     * @param {Object} element - 要素
     * @param {string} eventName - イベント名
     * @param {Object} detail - イベント詳細
     */
    dispatchEvent(element, eventName, detail = {}) {
        throw new Error('Not implemented');
    }

    /**
     * 要素の境界ボックスを取得
     * @param {Object} element - 要素
     * @returns {Object} { left, top, width, height }
     */
    getBoundingClientRect(element) {
        throw new Error('Not implemented');
    }

    /**
     * 要素のオフセット幅を取得
     * @param {Object} element - 要素
     * @returns {number}
     */
    getOffsetWidth(element) {
        throw new Error('Not implemented');
    }

    /**
     * 要素のオフセット高さを取得
     * @param {Object} element - 要素
     * @returns {number}
     */
    getOffsetHeight(element) {
        throw new Error('Not implemented');
    }

    /**
     * 要素の親要素を取得
     * @param {Object} element - 要素
     * @returns {Object}
     */
    getParentElement(element) {
        throw new Error('Not implemented');
    }

    /**
     * 最も近い祖先要素を取得
     * @param {Object} element - 要素
     * @param {string} selector - セレクタ
     * @returns {Object}
     */
    closest(element, selector) {
        throw new Error('Not implemented');
    }

    /**
     * 要素がセレクタにマッチするか確認
     * @param {Object} element - 要素
     * @param {string} selector - セレクタ
     * @returns {boolean}
     */
    matches(element, selector) {
        throw new Error('Not implemented');
    }

    /**
     * ドキュメントのルート要素を取得
     * @returns {Object}
     */
    getDocumentElement() {
        throw new Error('Not implemented');
    }

    /**
     * ボディ要素を取得
     * @returns {Object}
     */
    getBodyElement() {
        throw new Error('Not implemented');
    }
}