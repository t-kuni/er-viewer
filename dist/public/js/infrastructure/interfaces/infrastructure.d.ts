/**
 * インフラストラクチャー層の統合インタフェース
 * 全ての副作用をこのインタフェースを通して管理
 */
import { DOMInterface } from './dom-interface';
import { NetworkInterface } from './network-interface';
import { StorageInterface } from './storage-interface';
import { BrowserAPIInterface } from './browser-api-interface';
import type { Infrastructure as IInfrastructure } from '../../types/infrastructure';
export declare abstract class Infrastructure implements IInfrastructure {
    abstract readonly dom: DOMInterface;
    abstract readonly network: NetworkInterface;
    abstract readonly storage: StorageInterface;
    abstract readonly browserAPI: BrowserAPIInterface;
}
//# sourceMappingURL=infrastructure.d.ts.map