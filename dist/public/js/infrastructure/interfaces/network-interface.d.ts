import type { NetworkInterface as INetworkInterface, RequestOptions } from '../../types/infrastructure.js';
/**
 * ネットワーク通信の抽象インタフェース
 * API通信などの副作用を含む処理を抽象化
 */
export declare abstract class NetworkInterface implements INetworkInterface {
    /**
     * HTTPリクエストを送信
     */
    abstract fetch(url: string, options?: RequestOptions): Promise<Response>;
    /**
     * JSONデータをPOST
     */
    abstract postJSON<T = unknown>(url: string, data: unknown): Promise<T>;
    /**
     * JSONデータを取得
     */
    abstract getJSON<T = unknown>(url: string): Promise<T>;
}
//# sourceMappingURL=network-interface.d.ts.map