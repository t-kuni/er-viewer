/**
 * インフラストラクチャー層のモック実装
 * テスト用に副作用を排除した統合実装
 */
import {
  Infrastructure,
  DOMInterface,
  NetworkInterface,
  StorageInterface,
  BrowserAPIInterface,
  MockData,
  InteractionHistory,
} from '../../types/infrastructure.js';
import { DOMMock } from './dom-mock.js';
import { NetworkMock } from './network-mock.js';
import { StorageMock } from './storage-mock.js';
import { BrowserAPIMock } from './browser-api-mock.js';

export class InfrastructureMock implements Infrastructure {
  public readonly dom: DOMInterface;
  public readonly network: NetworkInterface;
  public readonly storage: StorageInterface;
  public readonly browserAPI: BrowserAPIInterface;

  constructor() {
    this.dom = new DOMMock();
    this.network = new NetworkMock();
    this.storage = new StorageMock();
    this.browserAPI = new BrowserAPIMock();
  }

  /**
   * テスト用にモックデータを設定
   */
  public setupMockData(mockData: MockData): void {
    if (mockData.networkResponses) {
      (this.network as NetworkMock).setMockResponses(mockData.networkResponses);
    }

    if (mockData.storageData) {
      Object.entries(mockData.storageData).forEach(([key, value]) => {
        this.storage.setItem(key, JSON.stringify(value));
      });
    }

    if (mockData.promptResponses) {
      (this.browserAPI as BrowserAPIMock).setPromptResponses(mockData.promptResponses);
    }

    if (mockData.confirmResponses) {
      (this.browserAPI as BrowserAPIMock).setConfirmResponses(mockData.confirmResponses);
    }

    if (mockData.windowSize) {
      (this.browserAPI as BrowserAPIMock).setWindowSize(mockData.windowSize.width, mockData.windowSize.height);
    }
  }

  /**
   * 全ての履歴をクリア
   */
  public clearHistory(): void {
    (this.network as NetworkMock).clearRequestHistory();
    (this.browserAPI as BrowserAPIMock).clearHistory();
    this.storage.clear();
  }

  /**
   * テスト用にインタラクション履歴を取得
   */
  public getInteractionHistory(): InteractionHistory {
    const browserAPIMock = this.browserAPI as BrowserAPIMock;
    const networkMock = this.network as NetworkMock;
    const storageMock = this.storage as StorageMock;

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
