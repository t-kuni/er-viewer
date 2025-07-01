module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts', '<rootDir>/tests/jest-setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts',
  ],
  collectCoverageFrom: [
    'public/js/**/*.js',
    'public/js/**/*.ts',
    'lib/**/*.js',
    'lib/**/*.ts',
    'server.js',
    'server.ts',
    '!public/js/**/*.test.js',
    '!public/js/**/*.spec.js',
    '!public/js/**/*.test.ts',
    '!public/js/**/*.spec.ts',
    '!node_modules/**',
    '!dist/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/public/js/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@types/(.*)$': '<rootDir>/public/js/types/$1',
    '^@infrastructure/(.*)$': '<rootDir>/public/js/infrastructure/$1',
    '^@utils/(.*)$': '<rootDir>/public/js/utils/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^(.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowJs: true,
        },
      },
    ],
    '^.+\\.jsx?$': 'babel-jest',
  },
  testTimeout: 5000,
  
  // === メモリリーク対策とテスト間の干渉防止 ===
  resetMocks: true,
  restoreMocks: true,
  clearMocks: true,
  
  // === 並列実行の設定 ===
  // 現在はテストファイルが1つのため、並列実行の恩恵は限定的
  // 将来的にテストファイルが増えた場合に効果を発揮する
  
  // ワーカープロセスの数を制御
  // - 'number': 固定数のワーカーを使用
  // - '50%': CPUコア数の50%を使用
  // - デフォルト: CPUコア数 - 1
  maxWorkers: '50%',
  
  // 各ワーカー内で同時に実行するテストの最大数
  maxConcurrency: 5,
  
  // === その他の性能最適化オプション ===
  
  // ファイルの変更検出を高速化（watchモード時）
  watchman: true,
  
  // テスト実行をより高速にするためのキャッシュ有効化
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // カバレッジ収集を無効化することで高速化（必要時のみ有効化）
  // collectCoverage: false,
  
  // === トラブルシューティング用オプション ===
  
  // 並列実行を無効にして問題を切り分ける場合
  // runInBand: true,
  
  // メモリ不足エラーが発生する場合
  workerIdleMemoryLimit: '512MB',
  
  // === Infrastructure Mock Coverage ===
  
  // カスタムレポーターを追加
  reporters: [
    'default',
    // [
    //   '<rootDir>/tests/jest-mock-coverage-reporter.ts',
    //   {
    //     threshold: 80,
    //     failOnLowCoverage: false,
    //   },
    // ],
  ],
  
  // カバレッジ閾値の設定
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Infrastructure Mockの個別閾値
    './public/js/infrastructure/mocks/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
