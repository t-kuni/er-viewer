import { Infrastructure } from '../interfaces/infrastructure.js';
import type { DOMInterface, NetworkInterface, StorageInterface, BrowserAPIInterface } from '../../types/infrastructure.js';
/**
 * インフラストラクチャー層の実装
 * 全ての副作用を持つ実装を統合
 */
export declare class InfrastructureImplementation extends Infrastructure {
    readonly dom: DOMInterface;
    readonly network: NetworkInterface;
    readonly storage: StorageInterface;
    readonly browserAPI: BrowserAPIInterface;
    constructor();
}
//# sourceMappingURL=infrastructure-implementation.d.ts.map