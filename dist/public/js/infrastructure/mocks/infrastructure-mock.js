import { DOMMock } from './dom-mock';
import { NetworkMock } from './network-mock';
import { StorageMock } from './storage-mock';
import { BrowserAPIMock } from './browser-api-mock';
export class InfrastructureMock {
    constructor() {
        this.dom = new DOMMock();
        this.network = new NetworkMock();
        this.storage = new StorageMock();
        this.browserAPI = new BrowserAPIMock();
    }
    /**
     * テスト用にモックデータを設定
     */
    setupMockData(mockData) {
        if (mockData.networkResponses) {
            this.network.setMockResponses(mockData.networkResponses);
        }
        if (mockData.storageData) {
            Object.entries(mockData.storageData).forEach(([key, value]) => {
                this.storage.setItem(key, JSON.stringify(value));
            });
        }
        if (mockData.promptResponses) {
            this.browserAPI.setPromptResponses(mockData.promptResponses);
        }
        if (mockData.confirmResponses) {
            this.browserAPI.setConfirmResponses(mockData.confirmResponses);
        }
        if (mockData.windowSize) {
            this.browserAPI.setWindowSize(mockData.windowSize.width, mockData.windowSize.height);
        }
    }
    /**
     * 全ての履歴をクリア
     */
    clearHistory() {
        this.network.clearRequestHistory();
        this.browserAPI.clearHistory();
        this.storage.clear();
    }
    /**
     * テスト用にインタラクション履歴を取得
     */
    getInteractionHistory() {
        const browserAPIMock = this.browserAPI;
        const networkMock = this.network;
        const storageMock = this.storage;
        return {
            networkRequests: networkMock.getRequestHistory(),
            logs: browserAPIMock.getLogs(),
            warnings: browserAPIMock.getWarnings(),
            errors: browserAPIMock.getErrors(),
            prompts: browserAPIMock.getPrompts(),
            alerts: browserAPIMock.getAlerts(),
            confirms: browserAPIMock.getConfirms(),
            storageOperations: storageMock.getStorageContents(),
        };
    }
}
//# sourceMappingURL=infrastructure-mock.js.map