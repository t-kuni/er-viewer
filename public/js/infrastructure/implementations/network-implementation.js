/**
 * ネットワークインタフェースの実装
 * 実際のHTTP通信を行う
 */
import { NetworkInterface } from '../interfaces/network-interface.js';

export class NetworkImplementation extends NetworkInterface {
    async fetch(url, options = {}) {
        const response = await fetch(url, options);
        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            text: () => response.text(),
            json: () => response.json(),
            blob: () => response.blob()
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