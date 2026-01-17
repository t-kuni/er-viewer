import { describe, it, expect, vi } from 'vitest';
import { createGetBuildInfoUsecase, GetBuildInfoDeps } from '../../lib/usecases/GetBuildInfoUsecase';

describe('GetBuildInfoUsecase', () => {
  it('build-info.json が存在する場合、その内容を返す', () => {
    // Arrange: モックの準備
    const mockBuildInfo = {
      version: '1.0.0',
      name: 'test-app',
      buildTime: '2026-01-17T12:00:00.000Z',
      buildDate: '2026/01/17 12:00:00',
      git: {
        commit: 'abc123',
        commitShort: 'abc123',
        branch: 'main',
      },
    };
    
    const deps: GetBuildInfoDeps = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue(JSON.stringify(mockBuildInfo)),
      rootDir: '/test/root',
      processVersion: 'v20.0.0',
      processPlatform: 'linux',
      processArch: 'x64',
    };
    
    // Act: Usecaseの実行
    const usecase = createGetBuildInfoUsecase(deps);
    const result = usecase();
    
    // Assert: 結果の検証
    expect(result).toEqual(mockBuildInfo);
    expect(deps.existsSync).toHaveBeenCalledWith('/test/root/build-info.json');
  });

  it('build-info.json が存在しない場合、package.jsonからフォールバック情報を返す', () => {
    // Arrange: モックの準備
    const mockPackageJson = {
      version: '2.0.0',
      name: 'fallback-app',
    };
    
    const deps: GetBuildInfoDeps = {
      existsSync: vi.fn().mockReturnValue(false),
      readFileSync: vi.fn().mockReturnValue(JSON.stringify(mockPackageJson)),
      rootDir: '/test/root',
      processVersion: 'v20.0.0',
      processPlatform: 'linux',
      processArch: 'x64',
    };
    
    // Act: Usecaseの実行
    const usecase = createGetBuildInfoUsecase(deps);
    const result = usecase();
    
    // Assert: 結果の検証
    expect(result.version).toBe('2.0.0');
    expect(result.name).toBe('fallback-app');
    expect(result.buildTime).toBe('unknown');
    expect(result.buildDate).toBe('ビルド情報なし');
    expect(result.git.commit).toBe('unknown');
    expect(result.git.commitShort).toBe('unknown');
    expect(result.git.branch).toBe('unknown');
    expect(result.nodeVersion).toBe('v20.0.0');
    expect(result.platform).toBe('linux');
    expect(result.arch).toBe('x64');
    
    expect(deps.existsSync).toHaveBeenCalledWith('/test/root/build-info.json');
    expect(deps.readFileSync).toHaveBeenCalledWith('/test/root/package.json', 'utf8');
  });
});
