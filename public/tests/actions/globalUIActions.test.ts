import { describe, it, expect } from 'vitest';
import {
  actionSelectRectangle,
  actionDeselectRectangle,
  actionShowBuildInfoModal,
  actionHideBuildInfoModal,
} from '../../src/actions/globalUIActions';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];

describe('globalUIActions', () => {
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

  describe('actionSelectRectangle', () => {
    it('矩形が選択される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSelectRectangle(viewModel, 'rect-1');

      expect(result.ui.selectedRectangleId).toBe('rect-1');
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          selectedRectangleId: 'rect-1',
          showBuildInfoModal: false,
        },
      };
      
      const result = actionSelectRectangle(viewModel, 'rect-1');

      expect(result).toBe(viewModel);
    });
  });

  describe('actionDeselectRectangle', () => {
    it('矩形の選択が解除される', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          selectedRectangleId: 'rect-1',
          showBuildInfoModal: false,
        },
      };
      
      const result = actionDeselectRectangle(viewModel);

      expect(result.ui.selectedRectangleId).toBeNull();
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionDeselectRectangle(viewModel);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionShowBuildInfoModal', () => {
    it('ビルド情報モーダルが表示される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionShowBuildInfoModal(viewModel);

      expect(result.ui.showBuildInfoModal).toBe(true);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          selectedRectangleId: null,
          showBuildInfoModal: true,
        },
      };
      
      const result = actionShowBuildInfoModal(viewModel);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionHideBuildInfoModal', () => {
    it('ビルド情報モーダルが非表示になる', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          selectedRectangleId: null,
          showBuildInfoModal: true,
        },
      };
      
      const result = actionHideBuildInfoModal(viewModel);

      expect(result.ui.showBuildInfoModal).toBe(false);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionHideBuildInfoModal(viewModel);

      expect(result).toBe(viewModel);
    });
  });
});
