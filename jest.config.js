module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'public/js/**/*.js',
    'lib/**/*.js',
    'server.js',
    '!public/js/**/*.test.js',
    '!public/js/**/*.spec.js',
    '!node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/public/js/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1'
  },
  testTimeout: 10000
};