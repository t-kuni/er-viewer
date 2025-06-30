/**
 * Mock Coverage Decorator
 *
 * Infrastructure Mockクラスのメソッドに自動的にカバレッジトラッキングを追加します。
 */
import { MockCoverageTracker } from './mock-coverage-tracker.js';
/**
 * Mockクラスにカバレッジトラッキングを追加するデコレータ
 */
export function withCoverageTracking(MockClass, mockName) {
    const tracker = MockCoverageTracker.getInstance();
    return class extends MockClass {
        constructor(...args) {
            super(...args);
            // このMockのすべてのメソッドを登録
            const methods = this.getAllMethods();
            tracker.registerMockMethods(mockName, methods);
            // 各メソッドをラップしてトラッキングを追加
            methods.forEach(methodName => {
                const originalMethod = this[methodName];
                if (typeof originalMethod === 'function') {
                    this[methodName] = (...methodArgs) => {
                        // カバレッジトラッキング
                        tracker.trackCall(mockName, methodName, methodArgs);
                        // 元のメソッドを実行
                        return originalMethod.apply(this, methodArgs);
                    };
                }
            });
        }
        /**
         * Mockクラスのすべてのパブリックメソッドを取得
         */
        getAllMethods() {
            const methods = [];
            const obj = this;
            // プロトタイプチェーンを辿ってメソッドを収集
            let currentObj = obj;
            do {
                const props = Object.getOwnPropertyNames(currentObj);
                props.forEach(prop => {
                    const descriptor = Object.getOwnPropertyDescriptor(currentObj, prop);
                    if (prop !== 'constructor' &&
                        !prop.startsWith('_') &&
                        !prop.startsWith('get') &&
                        descriptor &&
                        typeof descriptor.value === 'function') {
                        methods.push(prop);
                    }
                });
                currentObj = Object.getPrototypeOf(currentObj);
            } while (currentObj && currentObj !== Object.prototype);
            // 重複を除去
            return Array.from(new Set(methods));
        }
    };
}
/**
 * テスト環境でのみカバレッジトラッキングを有効にする条件付きデコレータ
 */
export function conditionalCoverageTracking(MockClass, mockName) {
    // JEST環境でカバレッジ収集が有効な場合のみトラッキングを追加
    if (process.env.NODE_ENV === 'test' && process.env.COLLECT_COVERAGE === 'true') {
        return withCoverageTracking(MockClass, mockName);
    }
    return MockClass;
}
//# sourceMappingURL=mock-coverage-decorator.js.map