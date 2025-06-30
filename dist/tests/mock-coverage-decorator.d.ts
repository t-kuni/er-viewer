/**
 * Mock Coverage Decorator
 *
 * Infrastructure Mockクラスのメソッドに自動的にカバレッジトラッキングを追加します。
 */
/**
 * Mockクラスにカバレッジトラッキングを追加するデコレータ
 */
export declare function withCoverageTracking<T extends new (...args: any[]) => any>(MockClass: T, mockName: string): T;
/**
 * テスト環境でのみカバレッジトラッキングを有効にする条件付きデコレータ
 */
export declare function conditionalCoverageTracking<T extends new (...args: any[]) => any>(MockClass: T, mockName: string): T;
//# sourceMappingURL=mock-coverage-decorator.d.ts.map