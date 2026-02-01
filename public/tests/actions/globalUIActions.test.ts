import { describe, it, expect } from 'vitest';
import {
  actionShowBuildInfoModal,
  actionHideBuildInfoModal,
  actionShowDatabaseConnectionModal,
  actionHideDatabaseConnectionModal,
  actionToggleHistoryPanel,
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
      texts: {},
      index: {
        entityToEdges: {},
        columnToEntity: {},
        columnToEdges: {},
      },
      ui: {
        hover: null,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        highlightedColumnIds: [],
        layerOrder: {
          backgroundItems: [],
          foregroundItems: [],
        },
        isDraggingEntity: false,
      },
      loading: false,
      history: [],
    },
    ui: {
      selectedItem: null,
      showBuildInfoModal: false,
      showLayerPanel: false,
      showDatabaseConnectionModal: false,
      showHistoryPanel: false,
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
          ...createMockViewModel().ui,
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
          ...createMockViewModel().ui,
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

  describe('actionShowDatabaseConnectionModal', () => {
    it('データベース接続モーダルが表示される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionShowDatabaseConnectionModal(viewModel);

      expect(result.ui.showDatabaseConnectionModal).toBe(true);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          ...createMockViewModel().ui,
          showDatabaseConnectionModal: true,
        },
      };
      
      const result = actionShowDatabaseConnectionModal(viewModel);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionHideDatabaseConnectionModal', () => {
    it('データベース接続モーダルが非表示になる', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          ...createMockViewModel().ui,
          showDatabaseConnectionModal: true,
        },
      };
      
      const result = actionHideDatabaseConnectionModal(viewModel);

      expect(result.ui.showDatabaseConnectionModal).toBe(false);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionHideDatabaseConnectionModal(viewModel);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionToggleHistoryPanel', () => {
    it('履歴パネルの表示がfalseからtrueに切り替わる', () => {
      const viewModel = createMockViewModel();
      
      const result = actionToggleHistoryPanel(viewModel);

      expect(result.ui.showHistoryPanel).toBe(true);
    });

    it('履歴パネルの表示がtrueからfalseに切り替わる', () => {
      const viewModel: ViewModel = {
        ...createMockViewModel(),
        ui: {
          ...createMockViewModel().ui,
          showHistoryPanel: true,
        },
      };
      
      const result = actionToggleHistoryPanel(viewModel);

      expect(result.ui.showHistoryPanel).toBe(false);
    });
  });
});
