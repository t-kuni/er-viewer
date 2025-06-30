import { Infrastructure } from '../interfaces/infrastructure';
import { DOMImplementation } from './dom-implementation';
import { NetworkImplementation } from './network-implementation';
import { StorageImplementation } from './storage-implementation';
import { BrowserAPIImplementation } from './browser-api-implementation';
import type { DOMInterface, NetworkInterface, StorageInterface, BrowserAPIInterface } from '../../types/infrastructure';

/**
 * インフラストラクチャー層の実装
 * 全ての副作用を持つ実装を統合
 */
export class InfrastructureImplementation extends Infrastructure {
  public readonly dom: DOMInterface;
  public readonly network: NetworkInterface;
  public readonly storage: StorageInterface;
  public readonly browserAPI: BrowserAPIInterface;

  constructor() {
    super();
    this.dom = new DOMImplementation();
    this.network = new NetworkImplementation();
    this.storage = new StorageImplementation();
    this.browserAPI = new BrowserAPIImplementation();
  }
}
