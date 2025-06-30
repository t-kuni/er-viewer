#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// 違反を記録する配列
const violations = [];

// テストファイルのパターン
const testFilePattern = 'tests/**/*.test.{js,ts}';

// テストコーディングルールのチェック関数
function checkTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.relative(process.cwd(), filePath);
  
  console.log(`Checking ${fileName}...`);
  
  // 1. AAAパターンのチェック
  checkAAAPattern(lines, fileName);
  
  // 2. 制御構造のチェック
  checkControlStructures(lines, fileName);
  
  // 3. Infrastructure Mock検証のチェック
  checkMockVerification(lines, fileName);
  
  // 4. DRY原則違反のチェック（共通化の過度な使用）
  checkExcessiveDRY(lines, fileName);
}

// AAAパターンのチェック
function checkAAAPattern(lines, fileName) {
  let inTestBlock = false;
  let testStartLine = 0;
  let hasArrange = false;
  let hasAct = false;
  let hasAssert = false;
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // test() または it() ブロックの開始を検出
    if (line.match(/^\s*(test|it)\s*\(/)) {
      inTestBlock = true;
      testStartLine = lineNum;
      hasArrange = false;
      hasAct = false;
      hasAssert = false;
    }
    
    // テストブロック内でAAAコメントをチェック
    if (inTestBlock) {
      if (line.includes('// Arrange')) hasArrange = true;
      if (line.includes('// Act')) hasAct = true;
      if (line.includes('// Assert')) hasAssert = true;
      
      // テストブロックの終了を検出（簡易的な判定）
      if (line.match(/^\s*}\);?\s*$/) && testStartLine > 0) {
        if (!hasArrange || !hasAct || !hasAssert) {
          violations.push({
            file: fileName,
            line: testStartLine,
            rule: 'AAA Pattern',
            message: 'Test case must have Arrange, Act, and Assert comments'
          });
        }
        inTestBlock = false;
        testStartLine = 0;
      }
    }
  });
}

// 制御構造のチェック
function checkControlStructures(lines, fileName) {
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // if文の検出（型定義やコメント内は除外）
    if (line.match(/^\s*if\s*\(/) && !line.includes('//') && !line.includes('interface')) {
      violations.push({
        file: fileName,
        line: lineNum,
        rule: 'No Control Structures',
        message: 'Avoid using if statements in tests'
      });
    }
    
    // for文の検出（forループは許可されているが、forEach等は禁止）
    if (line.match(/\.(forEach|map|filter|find|reduce)\s*\(/)) {
      violations.push({
        file: fileName,
        line: lineNum,
        rule: 'No Array Methods',
        message: 'Use for loops instead of array methods'
      });
    }
    
    // switch文の検出
    if (line.match(/^\s*switch\s*\(/)) {
      violations.push({
        file: fileName,
        line: lineNum,
        rule: 'No Control Structures',
        message: 'Avoid using switch statements in tests'
      });
    }
  });
}

// Mock検証のチェック
function checkMockVerification(lines, fileName) {
  const content = lines.join('\n');
  
  // state検証を探す（app.state.xxx のパターン）
  const stateVerificationPattern = /expect\s*\(\s*app\.state\./g;
  let match;
  
  while ((match = stateVerificationPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    violations.push({
      file: fileName,
      line: lineNum,
      rule: 'Mock Verification',
      message: 'Use Infrastructure Mock verification instead of state verification'
    });
  }
}

// 過度なDRY原則の使用をチェック
function checkExcessiveDRY(lines, fileName) {
  const content = lines.join('\n');
  
  // beforeEachで大量の共通セットアップを探す
  const beforeEachMatch = content.match(/beforeEach\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{([^}]+)\}/);
  if (beforeEachMatch) {
    const beforeEachContent = beforeEachMatch[1];
    const setupLines = beforeEachContent.split('\n').filter(line => line.trim()).length;
    
    if (setupLines > 10) {
      const lineNum = content.substring(0, beforeEachMatch.index).split('\n').length;
      violations.push({
        file: fileName,
        line: lineNum,
        rule: 'Excessive DRY',
        message: 'beforeEach contains too much shared setup. Consider moving setup to individual tests for better readability'
      });
    }
  }
}

// メイン処理
async function main() {
  console.log('Checking test coding rules compliance...\n');
  
  try {
    // テストファイルを検索
    const testFiles = await glob(testFilePattern);
    
    if (testFiles.length === 0) {
      console.log('No test files found.');
      return;
    }
    
    // 各テストファイルをチェック
    testFiles.forEach(file => {
      checkTestFile(file);
    });
    
    // 結果の表示
    console.log('\n=== Test Coding Rules Check Results ===\n');
    
    if (violations.length === 0) {
      console.log('✅ All test files comply with coding rules!');
      process.exit(0);
    } else {
      console.log(`❌ Found ${violations.length} violations:\n`);
      
      violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.file}:${violation.line}`);
        console.log(`   Rule: ${violation.rule}`);
        console.log(`   Message: ${violation.message}\n`);
      });
      
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking test files:', error);
    process.exit(1);
  }
}

// globパッケージが無い場合の代替実装
if (!fs.existsSync(path.join(process.cwd(), 'node_modules/glob'))) {
  // 簡易的なファイル検索実装
  async function findTestFiles(dir, pattern) {
    const files = [];
    
    function walkDir(currentPath) {
      const entries = fs.readdirSync(currentPath);
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && entry !== 'node_modules' && entry !== '.git') {
          walkDir(fullPath);
        } else if (stat.isFile() && entry.match(/\.test\.(js|ts)$/)) {
          files.push(fullPath);
        }
      }
    }
    
    if (fs.existsSync(dir)) {
      walkDir(dir);
    }
    
    return files;
  }
  
  // globの代わりに使用
  global.glob = async (pattern) => {
    return findTestFiles(path.join(process.cwd(), 'tests'), pattern);
  };
}

// スクリプトの実行
main();