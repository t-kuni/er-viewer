/**
 * Jest Mock Coverage Reporter
 *
 * Infrastructure Mockの呼び出しカバレッジをレポートするカスタムレポーター
 */
import { MockCoverageTracker } from './mock-coverage-tracker.js';
import * as fs from 'fs';
import * as path from 'path';
export default class MockCoverageReporter {
    constructor(globalConfig, options) {
        this.globalConfig = globalConfig;
        this.options = options || {};
    }
    /**
     * テスト実行開始時
     */
    onRunStart() {
        MockCoverageTracker.getInstance().reset();
    }
    /**
     * 各テスト実行前
     */
    onTestStart(test) {
        const testPath = test.path;
        const testName = path.basename(testPath);
        MockCoverageTracker.getInstance().setCurrentTest(testName, testPath);
    }
    /**
     * 各テスト実行後
     */
    onTestResult(test, testResult) {
        // テストごとの結果を必要に応じて処理
    }
    /**
     * すべてのテスト実行完了時
     */
    onRunComplete(contexts, results) {
        const tracker = MockCoverageTracker.getInstance();
        // カバレッジディレクトリを作成
        const coverageDir = path.join(process.cwd(), 'coverage', 'mock-coverage');
        if (!fs.existsSync(coverageDir)) {
            fs.mkdirSync(coverageDir, { recursive: true });
        }
        // テキストレポートを生成
        const textReport = tracker.generateDetailedReport();
        fs.writeFileSync(path.join(coverageDir, 'mock-coverage.md'), textReport);
        // JSONレポートを生成
        const jsonReport = tracker.generateJsonReport();
        fs.writeFileSync(path.join(coverageDir, 'mock-coverage.json'), JSON.stringify(jsonReport, null, 2));
        // HTMLレポートを生成
        const htmlReport = this.generateHtmlReport(tracker);
        fs.writeFileSync(path.join(coverageDir, 'index.html'), htmlReport);
        // コンソールにサマリーを出力
        const summary = tracker.generateSummary();
        console.log('\n=====================================');
        console.log('Infrastructure Mock Coverage Summary');
        console.log('=====================================');
        console.log(`Total Coverage: ${summary.coveragePercentage.toFixed(2)}%`);
        console.log(`Covered Methods: ${summary.coveredMethods}/${summary.totalMethods}`);
        if (summary.uncoveredMethods.length > 0) {
            console.log('\nUncovered Methods:');
            summary.uncoveredMethods.slice(0, 10).forEach(method => {
                console.log(`  - ${method}`);
            });
            if (summary.uncoveredMethods.length > 10) {
                console.log(`  ... and ${summary.uncoveredMethods.length - 10} more`);
            }
        }
        console.log('\nDetailed report: coverage/mock-coverage/index.html');
        console.log('=====================================\n');
        // カバレッジ閾値のチェック
        const threshold = this.options.threshold || 80;
        if (summary.coveragePercentage < threshold) {
            console.error(`Mock coverage (${summary.coveragePercentage.toFixed(2)}%) is below threshold (${threshold}%)`);
            if (this.options.failOnLowCoverage) {
                process.exit(1);
            }
        }
    }
    /**
     * HTMLレポートを生成
     */
    generateHtmlReport(tracker) {
        const summary = tracker.generateSummary();
        const coverageData = tracker.coverageData; // プライベートプロパティへのアクセス
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Infrastructure Mock Coverage Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1, h2, h3 {
      color: #333;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .summary-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .coverage-bar {
      width: 100%;
      height: 20px;
      background-color: #e9ecef;
      border-radius: 10px;
      overflow: hidden;
      margin: 20px 0;
    }
    .coverage-fill {
      height: 100%;
      background-color: ${summary.coveragePercentage >= 80 ? '#28a745' : summary.coveragePercentage >= 60 ? '#ffc107' : '#dc3545'};
      transition: width 0.3s ease;
    }
    .mock-details {
      margin: 30px 0;
    }
    .mock-card {
      border: 1px solid #dee2e6;
      border-radius: 8px;
      margin: 20px 0;
      overflow: hidden;
    }
    .mock-header {
      background-color: #f8f9fa;
      padding: 15px 20px;
      border-bottom: 1px solid #dee2e6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mock-body {
      padding: 20px;
    }
    .method-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 10px;
    }
    .method {
      padding: 8px 12px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    .method.covered {
      background-color: #d4edda;
      color: #155724;
    }
    .method.uncovered {
      background-color: #f8d7da;
      color: #721c24;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .badge.success {
      background-color: #28a745;
      color: white;
    }
    .badge.warning {
      background-color: #ffc107;
      color: #333;
    }
    .badge.danger {
      background-color: #dc3545;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Infrastructure Mock Coverage Report</h1>
    <p>Generated on: ${new Date().toLocaleString()}</p>

    <div class="summary">
      <div class="summary-card">
        <h3>Total Coverage</h3>
        <div class="value">${summary.coveragePercentage.toFixed(1)}%</div>
      </div>
      <div class="summary-card">
        <h3>Covered Methods</h3>
        <div class="value">${summary.coveredMethods}</div>
      </div>
      <div class="summary-card">
        <h3>Total Methods</h3>
        <div class="value">${summary.totalMethods}</div>
      </div>
      <div class="summary-card">
        <h3>Total Mocks</h3>
        <div class="value">${summary.totalMocks}</div>
      </div>
    </div>

    <div class="coverage-bar">
      <div class="coverage-fill" style="width: ${summary.coveragePercentage}%"></div>
    </div>

    <h2>Mock Details</h2>
    <div class="mock-details">
      ${Object.entries(summary.mockDetails).map(([mockName, details]) => `
        <div class="mock-card">
          <div class="mock-header">
            <h3>${mockName}</h3>
            <span class="badge ${details.coverage >= 80 ? 'success' : details.coverage >= 60 ? 'warning' : 'danger'}">
              ${details.coverage.toFixed(1)}% (${details.coveredMethods}/${details.totalMethods})
            </span>
          </div>
          <div class="mock-body">
            <h4>Methods:</h4>
            <div class="method-list">
              ${this.getAllMethodsForMock(mockName, details, coverageData).map(method => `
                <div class="method ${method.covered ? 'covered' : 'uncovered'}">
                  ${method.name}${method.covered ? ` (${method.callCount} calls)` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <h2>Most Called Methods</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Mock</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Method</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Call Count</th>
        </tr>
      </thead>
      <tbody>
        ${this.getTopMethods(coverageData, 10).map(item => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${item.mock}</td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6; font-family: monospace;">${item.method}</td>
            <td style="padding: 8px; border-bottom: 1px solid #dee2e6; text-align: right;">${item.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
    `;
    }
    getAllMethodsForMock(mockName, details, coverageData) {
        const covered = coverageData[mockName] || {};
        const methods = [];
        // カバーされたメソッド
        Object.entries(covered).forEach(([methodName, data]) => {
            methods.push({
                name: methodName,
                covered: true,
                callCount: data.callCount,
            });
        });
        // カバーされていないメソッド
        details.uncoveredMethods.forEach((methodName) => {
            methods.push({
                name: methodName,
                covered: false,
                callCount: 0,
            });
        });
        return methods.sort((a, b) => a.name.localeCompare(b.name));
    }
    getTopMethods(coverageData, limit) {
        const allCalls = [];
        Object.entries(coverageData).forEach(([mockName, methods]) => {
            Object.entries(methods).forEach(([methodName, data]) => {
                allCalls.push({
                    mock: mockName,
                    method: methodName,
                    count: data.callCount,
                });
            });
        });
        return allCalls
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
}
//# sourceMappingURL=jest-mock-coverage-reporter.js.map