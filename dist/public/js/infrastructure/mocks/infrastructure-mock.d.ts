/**
 * インフラストラクチャー層のモック実装
 * テスト用に副作用を排除した統合実装
 */
import { Infrastructure, DOMInterface, NetworkInterface, StorageInterface, BrowserAPIInterface, MockData, InteractionHistory } from '../../types/infrastructure';
export declare class InfrastructureMock implements Infrastructure {
    readonly dom: DOMInterface;
    readonly network: NetworkInterface;
    readonly storage: StorageInterface;
    readonly browserAPI: BrowserAPIInterface;
    constructor();
    /**
     * テスト用にモックデータを設定
     */
    setupMockData(mockData: MockData): void;
    /**
     * 全ての履歴をクリア
     */
    clearHistory(): void;
    /**
     * テスト用にインタラクション履歴を取得
     */
    getInteractionHistory(): InteractionHistory;
}
//# sourceMappingURL=infrastructure-mock.d.ts.map