/**
 * ストレージ操作のモック実装
 * テスト用に副作用を排除したストレージ操作を提供
 */
import { StorageInterface } from '../interfaces/storage-interface.js';
export class StorageMock extends StorageInterface {
    constructor() {
        super();
        this.storage = new Map();
    }
    setItem(key, value) {
        try {
            const serialized = JSON.stringify(value);
            this.storage.set(key, serialized);
        }
        catch (error) {
            throw new Error(`Failed to serialize value for key: ${key}`);
        }
    }
    getItem(key) {
        try {
            const item = this.storage.get(key);
            if (item === undefined) {
                return null;
            }
            return JSON.parse(item);
        }
        catch (error) {
            return null;
        }
    }
    removeItem(key) {
        this.storage.delete(key);
    }
    clear() {
        this.storage.clear();
    }
    /**
     * テスト用にストレージの内容を取得
     */
    getStorageContents() {
        const contents = {};
        this.storage.forEach((value, key) => {
            contents[key] = value;
        });
        return contents;
    }
    /**
     * テスト用にストレージのサイズを取得
     */
    size() {
        return this.storage.size;
    }
}
//# sourceMappingURL=storage-mock.js.map