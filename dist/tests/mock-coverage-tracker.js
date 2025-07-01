/**
 * Infrastructure Mock呼び出しトラッキングユーティリティ
 *
 * テスト実行中のMockメソッド呼び出しを追跡し、
 * カバレッジレポートを生成するための機能を提供します。
 */
export class MockCoverageTracker {
    constructor() {
        this.coverageData = {};
        this.currentTest = null;
        this.allMethods = new Map();
    }
    static getInstance() {
        if (!MockCoverageTracker.instance) {
            MockCoverageTracker.instance = new MockCoverageTracker();
        }
        return MockCoverageTracker.instance;
    }
    /**
     * Mockのメソッド一覧を登録
     */
    registerMockMethods(mockName, methods) {
        this.allMethods.set(mockName, new Set(methods));
    }
    /**
     * 現在実行中のテスト情報を設定
     */
    setCurrentTest(testName, testFile) {
        this.currentTest = { name: testName, file: testFile };
    }
    /**
     * Mockメソッドの呼び出しを記録
     */
    trackCall(mockName, methodName, args) {
        if (!this.currentTest) {
            return;
        }
        if (!this.coverageData[mockName]) {
            this.coverageData[mockName] = {};
        }
        if (!this.coverageData[mockName][methodName]) {
            this.coverageData[mockName][methodName] = {
                callCount: 0,
                calls: [],
                firstCalledIn: this.currentTest.name,
                lastCalledIn: this.currentTest.name,
            };
        }
        const methodData = this.coverageData[mockName][methodName];
        methodData.callCount++;
        methodData.lastCalledIn = this.currentTest.name;
        methodData.calls.push({
            method: methodName,
            args: args,
            timestamp: Date.now(),
            testName: this.currentTest.name,
            testFile: this.currentTest.file,
        });
    }
    /**
     * カバレッジサマリーを生成
     */
    generateSummary() {
        const mockDetails = {};
        const allUncoveredMethods = [];
        let totalMethods = 0;
        let coveredMethods = 0;
        for (const [mockName, methods] of this.allMethods.entries()) {
            const covered = new Set(Object.keys(this.coverageData[mockName] || {}));
            const uncovered = Array.from(methods).filter(m => !covered.has(m));
            mockDetails[mockName] = {
                totalMethods: methods.size,
                coveredMethods: covered.size,
                coverage: methods.size > 0 ? (covered.size / methods.size) * 100 : 0,
                uncoveredMethods: uncovered,
            };
            totalMethods += methods.size;
            coveredMethods += covered.size;
            allUncoveredMethods.push(...uncovered.map(m => `${mockName}.${m}`));
        }
        return {
            totalMocks: this.allMethods.size,
            totalMethods,
            coveredMethods,
            uncoveredMethods: allUncoveredMethods,
            coveragePercentage: totalMethods > 0 ? (coveredMethods / totalMethods) * 100 : 0,
            mockDetails,
        };
    }
    /**
     * 詳細レポートを生成
     */
    generateDetailedReport() {
        const summary = this.generateSummary();
        let report = '# Infrastructure Mock Coverage Report\n\n';
        // サマリーセクション
        report += '## Summary\n\n';
        report += `- Total Mocks: ${summary.totalMocks}\n`;
        report += `- Total Methods: ${summary.totalMethods}\n`;
        report += `- Covered Methods: ${summary.coveredMethods}\n`;
        report += `- Coverage: ${summary.coveragePercentage.toFixed(2)}%\n\n`;
        // Mock別の詳細
        report += '## Mock Details\n\n';
        for (const [mockName, details] of Object.entries(summary.mockDetails)) {
            report += `### ${mockName}\n\n`;
            report += `- Coverage: ${details.coverage.toFixed(2)}% (${details.coveredMethods}/${details.totalMethods})\n`;
            if (details.uncoveredMethods.length > 0) {
                report += `- Uncovered Methods:\n`;
                details.uncoveredMethods.forEach(method => {
                    report += `  - ${method}\n`;
                });
            }
            report += '\n';
        }
        // 呼び出し頻度の高いメソッドTOP10
        report += '## Most Called Methods (Top 10)\n\n';
        const allCalls = [];
        for (const [mockName, methods] of Object.entries(this.coverageData)) {
            for (const [methodName, data] of Object.entries(methods)) {
                allCalls.push({
                    mock: mockName,
                    method: methodName,
                    count: data.callCount,
                });
            }
        }
        allCalls.sort((a, b) => b.count - a.count);
        allCalls.slice(0, 10).forEach((call, index) => {
            report += `${index + 1}. ${call.mock}.${call.method}: ${call.count} calls\n`;
        });
        // 未使用メソッドの一覧
        if (summary.uncoveredMethods.length > 0) {
            report += '\n## Uncovered Methods\n\n';
            summary.uncoveredMethods.forEach(method => {
                report += `- ${method}\n`;
            });
        }
        return report;
    }
    /**
     * JSONレポートを生成
     */
    generateJsonReport() {
        const summary = this.generateSummary();
        return {
            summary,
            details: this.coverageData,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * データをリセット
     */
    reset() {
        this.coverageData = {};
        this.currentTest = null;
        this.allMethods.clear();
    }
    /**
     * シングルトンインスタンスを破棄
     * テスト完了後のクリーンアップで使用
     */
    static clearInstance() {
        if (MockCoverageTracker.instance) {
            MockCoverageTracker.instance.reset();
            MockCoverageTracker.instance = undefined;
        }
    }
}
//# sourceMappingURL=mock-coverage-tracker.js.map