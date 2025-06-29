/**
 * ストレージ操作の抽象インタフェース
 * localStorageやsessionStorageへのアクセスを抽象化
 */
export class StorageInterface {
    /**
     * 値を保存
     * @param {string} key - キー
     * @param {*} value - 値（自動的にJSON変換される）
     */
    setItem(key, value) {
        throw new Error('Not implemented');
    }

    /**
     * 値を取得
     * @param {string} key - キー
     * @returns {*} 値（自動的にJSONパースされる）
     */
    getItem(key) {
        throw new Error('Not implemented');
    }

    /**
     * 値を削除
     * @param {string} key - キー
     */
    removeItem(key) {
        throw new Error('Not implemented');
    }

    /**
     * 全てのデータをクリア
     */
    clear() {
        throw new Error('Not implemented');
    }
}