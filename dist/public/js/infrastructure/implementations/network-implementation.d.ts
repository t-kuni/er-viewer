import { NetworkInterface } from '../interfaces/network-interface';
import type { RequestOptions } from '../../types/infrastructure';
/**
 * ネットワークインタフェースの実装
 * 実際のHTTP通信を行う
 */
export declare class NetworkImplementation extends NetworkInterface {
    fetch(url: string, options?: RequestOptions): Promise<Response>;
    postJSON<T = unknown>(url: string, data: unknown): Promise<T>;
    getJSON<T = unknown>(url: string): Promise<T>;
}
//# sourceMappingURL=network-implementation.d.ts.map