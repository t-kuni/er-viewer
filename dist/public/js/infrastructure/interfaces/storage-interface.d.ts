import type { StorageInterface as IStorageInterface } from '../../types/infrastructure.js';
/**
 * ストレージ操作の抽象インタフェース
 * localStorageやsessionStorageへのアクセスを抽象化
 */
export declare abstract class StorageInterface implements IStorageInterface {
    /**
     * 値を保存
     */
    abstract setItem<T = unknown>(key: string, value: T): void;
    /**
     * 値を取得
     */
    abstract getItem<T = unknown>(key: string): T | null;
    /**
     * 値を削除
     */
    abstract removeItem(key: string): void;
    /**
     * 全てのデータをクリア
     */
    abstract clear(): void;
}
//# sourceMappingURL=storage-interface.d.ts.map