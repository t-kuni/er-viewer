/**
 * Infrastructure Mock呼び出しトラッキングユーティリティ
 *
 * テスト実行中のMockメソッド呼び出しを追跡し、
 * カバレッジレポートを生成するための機能を提供します。
 */
export declare class MockCoverageTracker {
    private static instance;
    private coverageData;
    private currentTest;
    private allMethods;
    private constructor();
    static getInstance(): MockCoverageTracker;
    /**
     * Mockのメソッド一覧を登録
     */
    registerMockMethods(mockName: string, methods: string[]): void;
    /**
     * 現在実行中のテスト情報を設定
     */
    setCurrentTest(testName: string, testFile: string): void;
    /**
     * Mockメソッドの呼び出しを記録
     */
    trackCall(mockName: string, methodName: string, args: any[]): void;
    /**
     * カバレッジサマリーを生成
     */
    generateSummary(): {
        totalMocks: number;
        totalMethods: number;
        coveredMethods: number;
        uncoveredMethods: string[];
        coveragePercentage: number;
        mockDetails: {
            [mockName: string]: {
                totalMethods: number;
                coveredMethods: number;
                coverage: number;
                uncoveredMethods: string[];
            };
        };
    };
    /**
     * 詳細レポートを生成
     */
    generateDetailedReport(): string;
    /**
     * JSONレポートを生成
     */
    generateJsonReport(): object;
    /**
     * データをリセット
     */
    reset(): void;
}
//# sourceMappingURL=mock-coverage-tracker.d.ts.map