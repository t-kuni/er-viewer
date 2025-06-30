/**
 * ストレージ操作のモック実装
 * テスト用に副作用を排除したストレージ操作を提供
 */
import { StorageInterface } from '../interfaces/storage-interface';
export declare class StorageMock extends StorageInterface {
    private storage;
    constructor();
    setItem<T = unknown>(key: string, value: T): void;
    getItem<T = unknown>(key: string): T | null;
    removeItem(key: string): void;
    clear(): void;
    /**
     * テスト用にストレージの内容を取得
     */
    getStorageContents(): Record<string, string>;
    /**
     * テスト用にストレージのサイズを取得
     */
    size(): number;
}
//# sourceMappingURL=storage-mock.d.ts.map