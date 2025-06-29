/**
 * インフラストラクチャー層の統合インタフェース
 * 全ての副作用をこのインタフェースを通して管理
 */
import { DOMInterface } from './dom-interface.js';
import { NetworkInterface } from './network-interface.js';
import { StorageInterface } from './storage-interface.js';
import { BrowserAPIInterface } from './browser-api-interface.js';

export class Infrastructure {
    constructor() {
        this.dom = new DOMInterface();
        this.network = new NetworkInterface();
        this.storage = new StorageInterface();
        this.browser = new BrowserAPIInterface();
    }
}