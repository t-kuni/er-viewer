import { NetworkInterface } from '../interfaces/network-interface';
import type { RequestOptions } from '../../types/infrastructure';

/**
 * ネットワークインタフェースの実装
 * 実際のHTTP通信を行う
 */
export class NetworkImplementation extends NetworkInterface {
  async fetch(url: string, options?: RequestOptions): Promise<Response> {
    const response = await fetch(url, options);
    return response;
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
