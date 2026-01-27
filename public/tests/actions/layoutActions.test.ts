import { describe, it, expect } from 'vitest';
import {
  actionStartLayoutOptimization,
  actionUpdateLayoutProgress,
  actionCompleteLayoutOptimization,
  actionCancelLayoutOptimization,
} from '../../src/actions/layoutActions';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];

describe('layoutActions', () => {
  // テスト用のViewModelを作成
  const createMockViewModel = (): ViewModel => ({
    format: 'er-viewer',
    version: 1,
    erDiagram: {
      nodes: {},
      edges: {},
      rectangles: {},
      texts: {},
      ui: {
        hover: null,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        highlightedColumnIds: [],
        layerOrder: {
          backgroundItems: [],
          foregroundItems: [],
        },
      },
      loading: false,
    },
    ui: {
      selectedItem: null,
      showBuildInfoModal: false,
      showLayerPanel: false,
      showDatabaseConnectionModal: false,
      layoutOptimization: {
        isRunning: false,
        progress: 0,
        currentStage: null,
      },
    },
    buildInfo: {
      data: null,
      loading: false,
      error: null,
    },
  });

  describe('actionStartLayoutOptimization', () => {
    it('最適化が開始される（isRunning: true、progress: 0、currentStage: null）', () => {
      const viewModel = createMockViewModel();
      
      const result = actionStartLayoutOptimization(viewModel);

      expect(result.ui.layoutOptimization.isRunning).toBe(true);
      expect(result.ui.layoutOptimization.progress).toBe(0);
      expect(result.ui.layoutOptimization.currentStage).toBe(null);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          ...createMockViewModel().ui,
          layoutOptimization: {
            isRunning: true,
            progress: 0,
            currentStage: null,
          },
        },
      };
      
      const result = actionStartLayoutOptimization(viewModel);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateLayoutProgress', () => {
    it('進捗が更新される', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          ...createMockViewModel().ui,
          layoutOptimization: {
            isRunning: true,
            progress: 0,
            currentStage: null,
          },
        },
      };
      
      const result = actionUpdateLayoutProgress(viewModel, 50, '最適化中');

      expect(result.ui.layoutOptimization.progress).toBe(50);
      expect(result.ui.layoutOptimization.currentStage).toBe('最適化中');
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          ...createMockViewModel().ui,
          layoutOptimization: {
            isRunning: true,
            progress: 50,
            currentStage: '最適化中',
          },
        },
      };
      
      const result = actionUpdateLayoutProgress(viewModel, 50, '最適化中');

      expect(result).toBe(viewModel);
    });
  });

  describe('actionCompleteLayoutOptimization', () => {
    it('最適化が完了する（isRunning: false、progress: 100）', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          ...createMockViewModel().ui,
          layoutOptimization: {
            isRunning: true,
            progress: 90,
            currentStage: '最適化中',
          },
        },
      };
      
      const result = actionCompleteLayoutOptimization(viewModel);

      expect(result.ui.layoutOptimization.isRunning).toBe(false);
      expect(result.ui.layoutOptimization.progress).toBe(100);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          ...createMockViewModel().ui,
          layoutOptimization: {
            isRunning: false,
            progress: 100,
            currentStage: '完了',
          },
        },
      };
      
      const result = actionCompleteLayoutOptimization(viewModel);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionCancelLayoutOptimization', () => {
    it('最適化がキャンセルされる（isRunning: false）', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          ...createMockViewModel().ui,
          layoutOptimization: {
            isRunning: true,
            progress: 50,
            currentStage: '最適化中',
          },
        },
      };
      
      const result = actionCancelLayoutOptimization(viewModel);

      expect(result.ui.layoutOptimization.isRunning).toBe(false);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionCancelLayoutOptimization(viewModel);

      expect(result).toBe(viewModel);
    });
  });
});
