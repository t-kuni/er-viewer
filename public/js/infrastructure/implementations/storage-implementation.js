/**
 * ストレージインタフェースの実装
 * 実際のlocalStorage操作を行う
 */
import { StorageInterface } from '../interfaces/storage-interface.js';

export class StorageImplementation extends StorageInterface {
    setItem(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    getItem(key) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) {
                return null;
            }
            return JSON.parse(item);
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return null;
        }
    }

    removeItem(key) {
        localStorage.removeItem(key);
    }

    clear() {
        localStorage.clear();
    }
}