import { describe, it, expect } from 'vitest';
import {
  actionSetBuildInfoLoading,
  actionSetBuildInfo,
  actionSetBuildInfoError,
} from '../../src/actions/buildInfoActions';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
type BuildInfo = components['schemas']['BuildInfo'];

describe('buildInfoActions', () => {
  // テスト用のViewModelを作成
  const createMockViewModel = (): ViewModel => ({
    erDiagram: {
      nodes: {},
      edges: {},
      rectangles: {},
      ui: {
        hover: null,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        highlightedColumnIds: [],
      },
      loading: false,
    },
    ui: {
      selectedRectangleId: null,
      showBuildInfoModal: false,
    },
    buildInfo: {
      data: null,
      loading: false,
      error: null,
    },
  });

  const createMockBuildInfo = (): BuildInfo => ({
    name: 'er-viewer',
    version: '1.0.0',
    buildTime: '2026-01-24T12:00:00Z',
    git: {
      commitShort: 'abc1234',
      branch: 'main',
    },
    nodeVersion: 'v18.0.0',
    platform: 'linux',
    arch: 'x64',
  });

  describe('actionSetBuildInfoLoading', () => {
    it('ローディング状態が設定される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetBuildInfoLoading(viewModel, true);

      expect(result.buildInfo.loading).toBe(true);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetBuildInfoLoading(viewModel, false); // 既にfalse

      expect(result).toBe(viewModel);
    });
  });

  describe('actionSetBuildInfo', () => {
    it('ビルド情報が設定される', () => {
      const viewModel = createMockViewModel();
      const buildInfo = createMockBuildInfo();
      
      const result = actionSetBuildInfo(viewModel, buildInfo);

      expect(result.buildInfo.data).toEqual(buildInfo);
    });

    it('ビルド情報が設定されるとエラーがnullになる', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        buildInfo: {
          data: null,
          loading: false,
          error: 'Some error',
        },
      };
      const buildInfo = createMockBuildInfo();
      
      const result = actionSetBuildInfo(viewModel, buildInfo);

      expect(result.buildInfo.data).toEqual(buildInfo);
      expect(result.buildInfo.error).toBeNull();
    });
  });

  describe('actionSetBuildInfoError', () => {
    it('エラーが設定される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetBuildInfoError(viewModel, 'Failed to fetch');

      expect(result.buildInfo.error).toBe('Failed to fetch');
    });
  });
});
