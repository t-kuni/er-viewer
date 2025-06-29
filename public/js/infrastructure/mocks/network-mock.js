/**
 * ネットワーク操作のモック実装
 * テスト用に副作用を排除したネットワーク操作を提供
 */
import { NetworkInterface } from '../interfaces/network-interface.js';

export class NetworkMock extends NetworkInterface {
    constructor() {
        super();
        this.responses = new Map();
        this.requests = [];
        this.defaultDelay = 0;
    }

    /**
     * モック応答を設定
     * @param {string} url - URL
     * @param {Object} response - レスポンスオブジェクト
     */
    setMockResponse(url, response) {
        this.responses.set(url, response);
    }

    /**
     * 複数のモック応答を設定
     * @param {Object} responses - URL->レスポンスのマップ
     */
    setMockResponses(responses) {
        Object.entries(responses).forEach(([url, response]) => {
            this.setMockResponse(url, response);
        });
    }

    /**
     * リクエスト履歴を取得
     * @returns {Array} リクエスト履歴
     */
    getRequestHistory() {
        return [...this.requests];
    }

    /**
     * リクエスト履歴をクリア
     */
    clearRequestHistory() {
        this.requests = [];
    }

    /**
     * デフォルト遅延を設定
     * @param {number} delay - 遅延時間（ミリ秒）
     */
    setDefaultDelay(delay) {
        this.defaultDelay = delay;
    }

    async fetch(url, options = {}) {
        // リクエストを記録
        this.requests.push({
            url,
            options,
            timestamp: Date.now()
        });

        // 遅延をシミュレート
        if (this.defaultDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.defaultDelay));
        }

        // モック応答を取得
        const mockResponse = this.responses.get(url) || this.responses.get('*');
        
        if (!mockResponse) {
            return {
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: new Map(),
                text: () => Promise.resolve('Not Found'),
                json: () => Promise.reject(new Error('Not Found')),
                blob: () => Promise.reject(new Error('Not Found'))
            };
        }

        // モック応答を返す
        return {
            ok: mockResponse.status >= 200 && mockResponse.status < 300,
            status: mockResponse.status || 200,
            statusText: mockResponse.statusText || 'OK',
            headers: new Map(Object.entries(mockResponse.headers || {})),
            text: () => Promise.resolve(mockResponse.text || JSON.stringify(mockResponse.data || {})),
            json: () => Promise.resolve(mockResponse.data || {}),
            blob: () => Promise.resolve(new Blob([mockResponse.text || JSON.stringify(mockResponse.data || {})]))
        };
    }

    async postJSON(url, data) {
        const response = await this.fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            return await response.json();
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    async getJSON(url) {
        const response = await this.fetch(url);
        
        if (response.ok) {
            return await response.json();
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
    }
}