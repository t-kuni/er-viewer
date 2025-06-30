/**
 * Jest グローバルセットアップ
 *
 * 全てのテストファイルで利用可能なグローバル設定
 */
import { setupInfrastructureMatchers } from './infrastructure-matchers';
import { MockCoverageTracker } from './mock-coverage-tracker';
// カスタムマッチャーをグローバルに登録
setupInfrastructureMatchers();
// Mock Coverageトラッキングを初期化
if (process.env.COLLECT_COVERAGE === 'true' || process.env.NODE_ENV === 'test') {
    // 各テスト実行前にテスト情報を設定
    beforeEach(function () {
        const testName = expect.getState().currentTestName || 'Unknown Test';
        const testPath = expect.getState().testPath || 'Unknown Path';
        MockCoverageTracker.getInstance().setCurrentTest(testName, testPath);
    });
}
// その他のグローバル設定をここに追加可能
//# sourceMappingURL=jest-setup.js.map