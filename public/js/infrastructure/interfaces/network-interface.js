/**
 * ネットワーク通信の抽象インタフェース
 * API通信などの副作用を含む処理を抽象化
 */
export class NetworkInterface {
    /**
     * HTTPリクエストを送信
     * @param {string} url - リクエストURL
     * @param {Object} options - リクエストオプション
     * @returns {Promise<Object>} レスポンス
     */
    async fetch(url, options = {}) {
        throw new Error('Not implemented');
    }

    /**
     * JSONデータをPOST
     * @param {string} url - リクエストURL
     * @param {Object} data - 送信データ
     * @returns {Promise<Object>} レスポンス
     */
    async postJSON(url, data) {
        throw new Error('Not implemented');
    }

    /**
     * JSONデータを取得
     * @param {string} url - リクエストURL
     * @returns {Promise<Object>} JSONレスポンス
     */
    async getJSON(url) {
        throw new Error('Not implemented');
    }
}