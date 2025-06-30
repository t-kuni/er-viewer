/**
 * ネットワーク操作のモック実装
 * テスト用に副作用を排除したネットワーク操作を提供
 */
import { NetworkInterface } from '../interfaces/network-interface.js';
import type { MockNetworkResponse, MockRequestHistory } from '../../types/infrastructure.js';

/**
 * Mock Response class for testing
 */
class MockResponse implements Response {
  readonly body: ReadableStream<Uint8Array> | null = null;
  readonly bodyUsed: boolean = false;
  readonly headers: Headers;
  readonly ok: boolean;
  readonly redirected: boolean = false;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType = 'default';
  readonly url: string;
  private _data: any;

  constructor(data: any, init?: ResponseInit) {
    this._data = data;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Headers(init?.headers);
    this.url = '';
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    throw new Error('Not implemented');
  }

  async blob(): Promise<Blob> {
    throw new Error('Not implemented');
  }

  async formData(): Promise<FormData> {
    throw new Error('Not implemented');
  }

  async json(): Promise<any> {
    return this._data;
  }

  async text(): Promise<string> {
    if (typeof this._data === 'string') {
      return this._data;
    }
    return JSON.stringify(this._data);
  }

  async bytes(): Promise<Uint8Array> {
    const text = await this.text();
    return new TextEncoder().encode(text);
  }

  clone(): Response {
    return new MockResponse(this._data, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    });
  }
}

export class NetworkMock extends NetworkInterface {
  private responses: Map<string, MockNetworkResponse>;
  private requests: MockRequestHistory[];
  private defaultDelay: number;

  constructor() {
    super();
    this.responses = new Map();
    this.requests = [];
    this.defaultDelay = 0;
  }

  /**
   * モック応答を設定
   */
  setMockResponse(url: string, response: MockNetworkResponse): void {
    this.responses.set(url, response);
  }

  /**
   * 複数のモック応答を設定
   */
  setMockResponses(responses: Record<string, MockNetworkResponse>): void {
    Object.entries(responses).forEach(([url, response]) => {
      this.setMockResponse(url, response);
    });
  }

  /**
   * リクエスト履歴を取得
   */
  getRequestHistory(): MockRequestHistory[] {
    return [...this.requests];
  }

  /**
   * リクエスト履歴をクリア
   */
  clearRequestHistory(): void {
    this.requests = [];
  }

  /**
   * デフォルト遅延を設定
   */
  setDefaultDelay(delay: number): void {
    this.defaultDelay = delay;
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    // リクエストを記録
    this.requests.push({
      url,
      method: options.method || 'GET',
      headers: (options.headers as Record<string, string>) || {},
      body: options.body,
      options,
      timestamp: Date.now(),
    });

    // 遅延をシミュレート
    if (this.defaultDelay > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.defaultDelay));
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
    let data: any;
    if (mockResponse.data !== undefined) {
      data = mockResponse.data;
    } else if (mockResponse.text) {
      data = mockResponse.text;
    } else {
      data = {};
    }

    return new MockResponse(data, {
      status,
      statusText,
      headers,
    });
  }

  async postJSON<T = unknown>(url: string, data: unknown): Promise<T> {
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

    return (await response.json()) as T;
  }

  async getJSON<T = unknown>(url: string): Promise<T> {
    const response = await this.fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return (await response.json()) as T;
  }
}
