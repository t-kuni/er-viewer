/**
 * ストレージ操作のモック実装
 * テスト用に副作用を排除したストレージ操作を提供
 */
import { StorageInterface } from '../interfaces/storage-interface.js';

export class StorageMock extends StorageInterface {
  private storage: Map<string, string>;

  constructor() {
    super();
    this.storage = new Map();
  }

  setItem<T = unknown>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.storage.set(key, serialized);
    } catch (error) {
      throw new Error(`Failed to serialize value for key: ${key}`);
    }
  }

  getItem<T = unknown>(key: string): T | null {
    try {
      const item = this.storage.get(key);
      if (item === undefined) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      return null;
    }
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  /**
   * テスト用にストレージの内容を取得
   */
  getStorageContents(): Record<string, string> {
    const contents: Record<string, string> = {};
    this.storage.forEach((value, key) => {
      contents[key] = value;
    });
    return contents;
  }

  /**
   * テスト用にストレージのサイズを取得
   */
  size(): number {
    return this.storage.size;
  }
}
