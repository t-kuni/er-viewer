/**
 * インフラストラクチャー層の統合インタフェース
 * 全ての副作用をこのインタフェースを通して管理
 */
import { DOMInterface } from './dom-interface';
import { NetworkInterface } from './network-interface';
import { StorageInterface } from './storage-interface';
import { BrowserAPIInterface } from './browser-api-interface';
import type { Infrastructure as IInfrastructure } from '../../types/infrastructure';

export abstract class Infrastructure implements IInfrastructure {
  public abstract readonly dom: DOMInterface;
  public abstract readonly network: NetworkInterface;
  public abstract readonly storage: StorageInterface;
  public abstract readonly browserAPI: BrowserAPIInterface;
}
