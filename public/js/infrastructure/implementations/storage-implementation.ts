import { StorageInterface } from '../interfaces/storage-interface.js';

/**
 * ストレージインタフェースの実装
 * 実際のlocalStorage操作を行う
 */
export class StorageImplementation extends StorageInterface {
  setItem<T = unknown>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  getItem<T = unknown>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
