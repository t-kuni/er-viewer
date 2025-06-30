/**
 * インフラストラクチャー層の統合インタフェース
 * 全ての副作用をこのインタフェースを通して管理
 */
import { DOMInterface } from './dom-interface.js';
import { NetworkInterface } from './network-interface.js';
import { StorageInterface } from './storage-interface.js';
import { BrowserAPIInterface } from './browser-api-interface.js';
import type { Infrastructure as IInfrastructure } from '../../types/infrastructure.js';
export declare abstract class Infrastructure implements IInfrastructure {
    abstract readonly dom: DOMInterface;
    abstract readonly network: NetworkInterface;
    abstract readonly storage: StorageInterface;
    abstract readonly browserAPI: BrowserAPIInterface;
}
//# sourceMappingURL=infrastructure.d.ts.map