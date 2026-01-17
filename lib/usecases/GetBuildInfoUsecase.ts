import path from 'path';

// BuildInfo型定義（OpenAPIスキーマに合わせる）
export type BuildInfo = {
  version: string;
  name: string;
  buildTime: string;
  buildDate: string;
  git: {
    commit: string;
    commitShort: string;
    branch: string;
  };
  nodeVersion?: string;
  platform?: string;
  arch?: string;
};

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
        buildDate: 'ビルド情報なし',
        git: {
          commit: 'unknown',
          commitShort: 'unknown',
          branch: 'unknown',
        },
        nodeVersion: deps.processVersion,
        platform: deps.processPlatform,
        arch: deps.processArch,
      };
    }
  };
}
