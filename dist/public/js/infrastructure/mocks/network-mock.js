/**
 * ネットワーク操作のモック実装
 * テスト用に副作用を排除したネットワーク操作を提供
 */
import { NetworkInterface } from '../interfaces/network-interface.js';
/**
 * Mock Response class for testing
 */
class MockResponse {
    constructor(data, init) {
        this.body = null;
        this.bodyUsed = false;
        this.redirected = false;
        this.type = 'default';
        this._data = data;
        this.status = init?.status || 200;
        this.statusText = init?.statusText || 'OK';
        this.ok = this.status >= 200 && this.status < 300;
        this.headers = new Headers(init?.headers);
        this.url = '';
    }
    async arrayBuffer() {
        throw new Error('Not implemented');
    }
    async blob() {
        throw new Error('Not implemented');
    }
    async formData() {
        throw new Error('Not implemented');
    }
    async json() {
        return this._data;
    }
    async text() {
        if (typeof this._data === 'string') {
            return this._data;
        }
        return JSON.stringify(this._data);
    }
    async bytes() {
        const text = await this.text();
        return new TextEncoder().encode(text);
    }
    clone() {
        return new MockResponse(this._data, {
            status: this.status,
            statusText: this.statusText,
            headers: this.headers,
        });
    }
}
export class NetworkMock extends NetworkInterface {
    constructor() {
        super();
        this.responses = new Map();
        this.requests = [];
        this.defaultDelay = 0;
    }
    /**
     * モック応答を設定
     */
    setMockResponse(url, response) {
        this.responses.set(url, response);
    }
    /**
     * 複数のモック応答を設定
     */
    setMockResponses(responses) {
        Object.entries(responses).forEach(([url, response]) => {
            this.setMockResponse(url, response);
        });
    }
    /**
     * リクエスト履歴を取得
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
     */
    setDefaultDelay(delay) {
        this.defaultDelay = delay;
    }
    async fetch(url, options = {}) {
        // リクエストを記録
        this.requests.push({
            url,
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body,
            options,
            timestamp: Date.now(),
        });
        // 遅延をシミュレート
        if (this.defaultDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.defaultDelay));
        }
        // モック応答を取得
        const mockResponse = this.responses.get(url) || this.responses.get('*');
        if (!mockResponse) {
            return new MockResponse({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
        }
        const status = mockResponse.status || 200;
        const statusText = mockResponse.statusText || 'OK';
        const headers = mockResponse.headers || {};
        // Return the mock data
        let data;
        if (mockResponse.data !== undefined) {
            data = mockResponse.data;
        }
        else if (mockResponse.text) {
            data = mockResponse.text;
        }
        else {
            data = {};
        }
        return new MockResponse(data, {
            status,
            statusText,
            headers,
        });
    }
    async postJSON(url, data) {
        const response = await this.fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json());
    }
    async getJSON(url) {
        const response = await this.fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json());
    }
}
//# sourceMappingURL=network-mock.js.map