module.exports = {
  extends: ['./.eslintrc.js'],
  rules: {
    // テストファイル専用のルール
    'no-restricted-syntax': [
      'error',
      {
        selector: 'IfStatement',
        message: 'Avoid using if statements in tests. Use explicit assertions instead.'
      },
      {
        selector: 'SwitchStatement',
        message: 'Avoid using switch statements in tests. Use explicit test cases instead.'
      },
      {
        selector: 'CallExpression[callee.property.name=/^(forEach|map|filter|find|reduce)$/]',
        message: 'Use for loops instead of array methods in tests for better readability.'
      },
      {
        selector: 'MemberExpression[object.property.name="state"]',
        message: 'Verify Infrastructure Mock calls instead of checking state directly.'
      }
    ],
    
    // beforeEachの使用を制限
    'max-lines-per-function': ['warn', {
      max: 15,
      skipBlankLines: true,
      skipComments: true,
      IIFEs: false
    }],
    
    // テスト内でのコメントを必須に
    'require-comment-before-test': {
      patterns: ['// Arrange', '// Act', '// Assert']
    }
  },
  
  overrides: [
    {
      files: ['**/*.test.js', '**/*.test.ts'],
      rules: {
        // テストファイルでは長い行を許可
        'max-len': ['error', { code: 150 }],
        
        // テストファイルでは即値を推奨
        'no-magic-numbers': 'off',
        
        // テストファイルではconsole.logを許可（デバッグ用）
        'no-console': 'off'
      }
    }
  ]
};