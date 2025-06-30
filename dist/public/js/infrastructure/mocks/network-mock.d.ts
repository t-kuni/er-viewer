/**
 * ネットワーク操作のモック実装
 * テスト用に副作用を排除したネットワーク操作を提供
 */
import { NetworkInterface } from '../interfaces/network-interface';
import type { MockNetworkResponse, MockRequestHistory } from '../../types/infrastructure';
export declare class NetworkMock extends NetworkInterface {
    private responses;
    private requests;
    private defaultDelay;
    constructor();
    /**
     * モック応答を設定
     */
    setMockResponse(url: string, response: MockNetworkResponse): void;
    /**
     * 複数のモック応答を設定
     */
    setMockResponses(responses: Record<string, MockNetworkResponse>): void;
    /**
     * リクエスト履歴を取得
     */
    getRequestHistory(): MockRequestHistory[];
    /**
     * リクエスト履歴をクリア
     */
    clearRequestHistory(): void;
    /**
     * デフォルト遅延を設定
     */
    setDefaultDelay(delay: number): void;
    fetch(url: string, options?: RequestInit): Promise<Response>;
    postJSON<T = unknown>(url: string, data: unknown): Promise<T>;
    getJSON<T = unknown>(url: string): Promise<T>;
}
//# sourceMappingURL=network-mock.d.ts.map