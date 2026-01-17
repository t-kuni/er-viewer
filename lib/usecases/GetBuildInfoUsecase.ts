import path from 'path';
import type { components } from '../generated/api-types.js';

// TypeSpecから生成された型を使用
export type BuildInfo = components['schemas']['BuildInfo'];

// 依存性の型定義
export type GetBuildInfoDeps = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: BufferEncoding) => string;
  rootDir: string;
  processVersion: string;
  processPlatform: string;
  processArch: string;
};

// Usecase実装
export function createGetBuildInfoUsecase(deps: GetBuildInfoDeps) {
  return (): BuildInfo => {
    const buildInfoPath = path.join(deps.rootDir, 'build-info.json');

    if (deps.existsSync(buildInfoPath)) {
      // build-info.jsonが存在する場合、その内容を返す
      const buildInfo = JSON.parse(deps.readFileSync(buildInfoPath, 'utf8'));
      return buildInfo;
    } else {
      // build-info.jsonが存在しない場合、package.jsonからフォールバック情報を返す
      const packageJsonPath = path.join(deps.rootDir, 'package.json');
      const packageJson = JSON.parse(deps.readFileSync(packageJsonPath, 'utf8'));
      
      return {
        version: packageJson.version,
        name: packageJson.name,
        buildTime: 'unknown',
        buildTimestamp: 0,
        buildDate: 'ビルド情報なし',
        git: {
          commit: 'unknown',
          commitShort: 'unknown',
          branch: 'unknown',
          tag: null,
        },
        nodeVersion: deps.processVersion,
        platform: deps.processPlatform,
        arch: deps.processArch,
      };
    }
  };
}
