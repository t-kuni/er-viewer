#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function generateBuildInfo() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

  let gitCommit = 'unknown';
  let gitBranch = 'unknown';
  let gitTag = 'unknown';

  try {
    gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.warn('Warning: Could not get git commit hash');
  }

  try {
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.warn('Warning: Could not get git branch');
  }

  try {
    gitTag = execSync('git describe --tags --exact-match HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    // Not on a tagged commit, which is normal
    gitTag = null;
  }

  const buildInfo = {
    version: packageJson.version,
    name: packageJson.name,
    buildTime: new Date().toISOString(),
    buildTimestamp: Date.now(),
    buildDate: new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    git: {
      commit: gitCommit,
      commitShort: gitCommit.substring(0, 8),
      branch: gitBranch,
      tag: gitTag,
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };

  const outputPath = path.join(__dirname, '../build-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

  console.log('✅ Build info generated:');
  console.log(`   Version: ${buildInfo.version}`);
  console.log(`   Build Time: ${buildInfo.buildDate}`);
  console.log(`   Git Commit: ${buildInfo.git.commitShort}`);
  console.log(`   Git Branch: ${buildInfo.git.branch}`);
  if (buildInfo.git.tag) {
    console.log(`   Git Tag: ${buildInfo.git.tag}`);
  }
  console.log(`   Output: ${outputPath}`);

  return buildInfo;
}

if (require.main === module) {
  generateBuildInfo();
}

module.exports = generateBuildInfo;
