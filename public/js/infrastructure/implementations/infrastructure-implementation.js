import { Infrastructure } from '../interfaces/infrastructure.js';
import { DOMImplementation } from './dom-implementation.js';
import { NetworkImplementation } from './network-implementation.js';
import { StorageImplementation } from './storage-implementation.js';
import { BrowserAPIImplementation } from './browser-api-implementation.js';
/**
 * インフラストラクチャー層の実装
 * 全ての副作用を持つ実装を統合
 */
export class InfrastructureImplementation extends Infrastructure {
    constructor() {
        super();
        this.dom = new DOMImplementation();
        this.network = new NetworkImplementation();
        this.storage = new StorageImplementation();
        this.browserAPI = new BrowserAPIImplementation();
    }
}
