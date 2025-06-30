import { NetworkInterface } from '../interfaces/network-interface';
/**
 * ネットワークインタフェースの実装
 * 実際のHTTP通信を行う
 */
export class NetworkImplementation extends NetworkInterface {
    async fetch(url, options) {
        const response = await fetch(url, options);
        return response;
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
