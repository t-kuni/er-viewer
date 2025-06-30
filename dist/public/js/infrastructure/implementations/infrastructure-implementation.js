import { Infrastructure } from '../interfaces/infrastructure';
import { DOMImplementation } from './dom-implementation';
import { NetworkImplementation } from './network-implementation';
import { StorageImplementation } from './storage-implementation';
import { BrowserAPIImplementation } from './browser-api-implementation';
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
//# sourceMappingURL=infrastructure-implementation.js.map