import { describe, it, expect } from 'vitest';
import {
  actionShowBuildInfoModal,
  actionHideBuildInfoModal,
  actionShowDatabaseConnectionModal,
  actionHideDatabaseConnectionModal,
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
          selectedItem: null,
          showBuildInfoModal: true,
          showLayerPanel: false,
          showDatabaseConnectionModal: false,
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
          selectedItem: null,
          showBuildInfoModal: true,
          showLayerPanel: false,
          showDatabaseConnectionModal: false,
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
          selectedItem: null,
          showBuildInfoModal: false,
          showLayerPanel: false,
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
          selectedItem: null,
          showBuildInfoModal: false,
          showLayerPanel: false,
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
});
