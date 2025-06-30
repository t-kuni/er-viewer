/**
 * Jest Mock Coverage Reporter
 *
 * Infrastructure Mockの呼び出しカバレッジをレポートするカスタムレポーター
 */
import { Reporter, Test, TestResult, AggregatedResult, Context } from '@jest/reporters';
export default class MockCoverageReporter implements Reporter {
    private globalConfig;
    private options;
    constructor(globalConfig: any, options: any);
    /**
     * テスト実行開始時
     */
    onRunStart(): void;
    /**
     * 各テスト実行前
     */
    onTestStart(test: Test): void;
    /**
     * 各テスト実行後
     */
    onTestResult(test: Test, testResult: TestResult): void;
    /**
     * すべてのテスト実行完了時
     */
    onRunComplete(contexts: Set<Context>, results: AggregatedResult): void;
    /**
     * HTMLレポートを生成
     */
    private generateHtmlReport;
    private getAllMethodsForMock;
    private getTopMethods;
}
//# sourceMappingURL=jest-mock-coverage-reporter.d.ts.map