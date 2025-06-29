/**
 * インフラストラクチャー層のモック実装
 * テスト用に副作用を排除した統合実装
 */
import { Infrastructure } from '../interfaces/infrastructure.js';
import { DOMMock } from './dom-mock.js';
import { NetworkMock } from './network-mock.js';
import { StorageMock } from './storage-mock.js';
import { BrowserAPIMock } from './browser-api-mock.js';

export class InfrastructureMock extends Infrastructure {
    constructor() {
        super();
        this.dom = new DOMMock();
        this.network = new NetworkMock();
        this.storage = new StorageMock();
        this.browser = new BrowserAPIMock();
    }

    /**
     * テスト用にモックデータを設定
     * @param {Object} mockData - モックデータ
     */
    setupMockData(mockData) {
        if (mockData.networkResponses) {
            this.network.setMockResponses(mockData.networkResponses);
        }
        
        if (mockData.storageData) {
            Object.entries(mockData.storageData).forEach(([key, value]) => {
                this.storage.setItem(key, value);
            });
        }
        
        if (mockData.promptResponses) {
            this.browser.setPromptResponses(mockData.promptResponses);
        }
        
        if (mockData.confirmResponses) {
            this.browser.setConfirmResponses(mockData.confirmResponses);
        }
        
        if (mockData.windowSize) {
            this.browser.setWindowSize(mockData.windowSize.width, mockData.windowSize.height);
        }
    }

    /**
     * 全ての履歴をクリア
     */
    clearHistory() {
        this.network.clearRequestHistory();
        this.browser.clearHistory();
        this.storage.clear();
    }

    /**
     * テスト用にインタラクション履歴を取得
     * @returns {Object} インタラクション履歴
     */
    getInteractionHistory() {
        return {
            networkRequests: this.network.getRequestHistory(),
            logs: this.browser.getLogs(),
            warnings: this.browser.getWarnings(),
            errors: this.browser.getErrors(),
            prompts: this.browser.getPrompts(),
            alerts: this.browser.getAlerts(),
            confirms: this.browser.getConfirms(),
            storageOperations: this.storage.getStorageContents()
        };
    }
}