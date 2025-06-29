/**
 * ブラウザAPI操作の抽象インタフェース
 * prompt、alert、console、window操作などを抽象化
 */
export class BrowserAPIInterface {
    /**
     * プロンプトダイアログを表示
     * @param {string} message - メッセージ
     * @param {string} defaultValue - デフォルト値
     * @returns {string|null} 入力値またはnull
     */
    prompt(message, defaultValue = '') {
        throw new Error('Not implemented');
    }

    /**
     * アラートダイアログを表示
     * @param {string} message - メッセージ
     */
    alert(message) {
        throw new Error('Not implemented');
    }

    /**
     * 確認ダイアログを表示
     * @param {string} message - メッセージ
     * @returns {boolean} 確認結果
     */
    confirm(message) {
        throw new Error('Not implemented');
    }

    /**
     * コンソールログ出力
     * @param {...any} args - ログ引数
     */
    log(...args) {
        throw new Error('Not implemented');
    }

    /**
     * コンソール警告出力
     * @param {...any} args - 警告引数
     */
    warn(...args) {
        throw new Error('Not implemented');
    }

    /**
     * コンソールエラー出力
     * @param {...any} args - エラー引数
     */
    error(...args) {
        throw new Error('Not implemented');
    }

    /**
     * タイマーを設定
     * @param {Function} callback - コールバック関数
     * @param {number} delay - 遅延時間（ミリ秒）
     * @returns {number} タイマーID
     */
    setTimeout(callback, delay) {
        throw new Error('Not implemented');
    }

    /**
     * タイマーをクリア
     * @param {number} timerId - タイマーID
     */
    clearTimeout(timerId) {
        throw new Error('Not implemented');
    }

    /**
     * ウィンドウサイズを取得
     * @returns {Object} { width, height }
     */
    getWindowSize() {
        throw new Error('Not implemented');
    }

    /**
     * 現在のURLを取得
     * @returns {string} URL
     */
    getLocationHref() {
        throw new Error('Not implemented');
    }

    /**
     * ユーザーエージェントを取得
     * @returns {string} ユーザーエージェント文字列
     */
    getUserAgent() {
        throw new Error('Not implemented');
    }

    /**
     * ウィンドウイベントリスナーを追加
     * @param {string} event - イベント名
     * @param {Function} handler - ハンドラー関数
     */
    addWindowEventListener(event, handler) {
        throw new Error('Not implemented');
    }

    /**
     * ウィンドウイベントリスナーを削除
     * @param {string} event - イベント名
     * @param {Function} handler - ハンドラー関数
     */
    removeWindowEventListener(event, handler) {
        throw new Error('Not implemented');
    }
}