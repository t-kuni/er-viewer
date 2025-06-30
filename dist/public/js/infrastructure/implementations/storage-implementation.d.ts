import { StorageInterface } from '@infrastructure/interfaces/storage-interface';
/**
 * ストレージインタフェースの実装
 * 実際のlocalStorage操作を行う
 */
export declare class StorageImplementation extends StorageInterface {
    setItem<T = unknown>(key: string, value: T): void;
    getItem<T = unknown>(key: string): T | null;
    removeItem(key: string): void;
    clear(): void;
}
//# sourceMappingURL=storage-implementation.d.ts.map