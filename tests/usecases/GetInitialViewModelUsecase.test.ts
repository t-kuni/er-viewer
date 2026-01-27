import { describe, it, expect } from 'vitest';
import { createGetInitialViewModelUsecase } from '../../lib/usecases/GetInitialViewModelUsecase';
import type { BuildInfo } from '../../lib/usecases/GetInitialViewModelUsecase';

describe('GetInitialViewModelUsecase', () => {
  it('初期ViewModelを正しく生成する', () => {
    // モックのビルド情報
    const mockBuildInfo: BuildInfo = {
      version: '1.0.0',
      name: 'er-viewer',
      buildTime: '2026-01-25T12:00:00Z',
      buildTimestamp: 1737806400000,
      buildDate: '2026-01-25',
      git: {
        commit: 'abc123',
        commitShort: 'abc',
        branch: 'main',
        tag: null,
      },
      nodeVersion: 'v18.0.0',
      platform: 'linux',
      arch: 'x64',
    };

    // Usecaseを作成
    const usecase = createGetInitialViewModelUsecase({
      getBuildInfo: () => mockBuildInfo,
    });

    // Usecaseを実行
    const viewModel = usecase();

    // formatとversionの検証
    expect(viewModel.format).toBe("er-viewer");
    expect(viewModel.version).toBe(1);

    // erDiagramの検証
    expect(viewModel.erDiagram.nodes).toEqual({});
    expect(viewModel.erDiagram.edges).toEqual({});
    expect(viewModel.erDiagram.rectangles).toEqual({});
    expect(viewModel.erDiagram.texts).toEqual({});
    expect(viewModel.erDiagram.index).toEqual({
      entityToEdges: {},
      columnToEntity: {},
      columnToEdges: {},
    });
    expect(viewModel.erDiagram.loading).toBe(false);
    expect(viewModel.erDiagram.ui.hover).toBeNull();
    expect(viewModel.erDiagram.ui.highlightedNodeIds).toEqual([]);
    expect(viewModel.erDiagram.ui.highlightedEdgeIds).toEqual([]);
    expect(viewModel.erDiagram.ui.highlightedColumnIds).toEqual([]);
    expect(viewModel.erDiagram.ui.layerOrder.backgroundItems).toEqual([]);
    expect(viewModel.erDiagram.ui.layerOrder.foregroundItems).toEqual([]);

    // uiの検証
    expect(viewModel.ui.selectedItem).toBeNull();
    expect(viewModel.ui.showBuildInfoModal).toBe(false);
    expect(viewModel.ui.showLayerPanel).toBe(false);
    expect(viewModel.ui.showDatabaseConnectionModal).toBe(false);

    // buildInfoの検証
    expect(viewModel.buildInfo.data).toEqual(mockBuildInfo);
    expect(viewModel.buildInfo.loading).toBe(false);
    expect(viewModel.buildInfo.error).toBeNull();
  });

  it('ビルド情報が正しく含まれることを確認', () => {
    const mockBuildInfo: BuildInfo = {
      version: '2.0.0',
      name: 'test-app',
      buildTime: '2026-01-26T12:00:00Z',
      buildTimestamp: 1737892800000,
      buildDate: '2026-01-26',
      git: {
        commit: 'def456',
        commitShort: 'def',
        branch: 'develop',
        tag: 'v2.0.0',
      },
      nodeVersion: 'v20.0.0',
      platform: 'darwin',
      arch: 'arm64',
    };

    const usecase = createGetInitialViewModelUsecase({
      getBuildInfo: () => mockBuildInfo,
    });

    const viewModel = usecase();

    expect(viewModel.format).toBe("er-viewer");
    expect(viewModel.version).toBe(1);
    expect(viewModel.buildInfo.data).toEqual(mockBuildInfo);
    expect(viewModel.buildInfo.data?.version).toBe('2.0.0');
    expect(viewModel.buildInfo.data?.git.tag).toBe('v2.0.0');
  });

  it('環境変数が設定されている場合、settingsに初期接続情報が含まれる', () => {
    // 環境変数を設定
    const originalEnv = { ...process.env };
    process.env.DB_HOST = 'test-host';
    process.env.DB_PORT = '5432';
    process.env.DB_USER = 'test-user';
    process.env.DB_NAME = 'test-db';

    const mockBuildInfo: BuildInfo = {
      version: '1.0.0',
      name: 'er-viewer',
      buildTime: '2026-01-25T12:00:00Z',
      buildTimestamp: 1737806400000,
      buildDate: '2026-01-25',
      git: {
        commit: 'abc123',
        commitShort: 'abc',
        branch: 'main',
        tag: null,
      },
      nodeVersion: 'v18.0.0',
      platform: 'linux',
      arch: 'x64',
    };

    const usecase = createGetInitialViewModelUsecase({
      getBuildInfo: () => mockBuildInfo,
    });

    const viewModel = usecase();

    // settingsが含まれていることを確認
    expect(viewModel.settings).toBeDefined();
    expect(viewModel.settings?.lastDatabaseConnection).toBeDefined();
    expect(viewModel.settings?.lastDatabaseConnection?.type).toBe('mysql');
    expect(viewModel.settings?.lastDatabaseConnection?.host).toBe('test-host');
    expect(viewModel.settings?.lastDatabaseConnection?.port).toBe(5432);
    expect(viewModel.settings?.lastDatabaseConnection?.user).toBe('test-user');
    expect(viewModel.settings?.lastDatabaseConnection?.database).toBe('test-db');

    // 環境変数を元に戻す
    process.env = originalEnv;
  });

  it('環境変数が設定されていない場合、settingsは含まれない', () => {
    // 環境変数をクリア
    const originalEnv = { ...process.env };
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_NAME;

    const mockBuildInfo: BuildInfo = {
      version: '1.0.0',
      name: 'er-viewer',
      buildTime: '2026-01-25T12:00:00Z',
      buildTimestamp: 1737806400000,
      buildDate: '2026-01-25',
      git: {
        commit: 'abc123',
        commitShort: 'abc',
        branch: 'main',
        tag: null,
      },
      nodeVersion: 'v18.0.0',
      platform: 'linux',
      arch: 'x64',
    };

    const usecase = createGetInitialViewModelUsecase({
      getBuildInfo: () => mockBuildInfo,
    });

    const viewModel = usecase();

    // settingsが含まれていないことを確認
    expect(viewModel.settings).toBeUndefined();

    // 環境変数を元に戻す
    process.env = originalEnv;
  });
});
