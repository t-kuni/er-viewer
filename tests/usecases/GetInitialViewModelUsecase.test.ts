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

    // erDiagramの検証
    expect(viewModel.erDiagram.nodes).toEqual({});
    expect(viewModel.erDiagram.edges).toEqual({});
    expect(viewModel.erDiagram.rectangles).toEqual({});
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

    expect(viewModel.buildInfo.data).toEqual(mockBuildInfo);
    expect(viewModel.buildInfo.data?.version).toBe('2.0.0');
    expect(viewModel.buildInfo.data?.git.tag).toBe('v2.0.0');
  });
});
