import { describe, it, expect } from 'vitest';
import {
  actionHoverEntity,
  actionHoverEdge,
  actionHoverColumn,
  actionClearHover,
  actionStartEntityDrag,
  actionStopEntityDrag,
} from '../../src/actions/hoverActions';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];

describe('hoverActions', () => {
  // テスト用のViewModelを作成
  const createMockViewModel = (): ViewModel => ({
    erDiagram: {
      nodes: {
        'entity-1': {
          id: 'entity-1',
          name: 'users',
          x: 0,
          y: 0,
          columns: [
            { id: 'col-1', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: '', isForeignKey: false },
            { id: 'col-2', name: 'name', type: 'varchar', nullable: false, key: '', default: null, extra: '', isForeignKey: false },
          ],
          ddl: 'CREATE TABLE users...',
        },
        'entity-2': {
          id: 'entity-2',
          name: 'posts',
          x: 300,
          y: 0,
          columns: [
            { id: 'col-3', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: '', isForeignKey: false },
            { id: 'col-4', name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '', isForeignKey: true },
          ],
          ddl: 'CREATE TABLE posts...',
        },
      },
      edges: {
        'edge-1': {
          id: 'edge-1',
          sourceEntityId: 'entity-2',
          sourceColumnId: 'col-4',
          targetEntityId: 'entity-1',
          targetColumnId: 'col-1',
          constraintName: 'fk_posts_user_id',
        },
      },
      rectangles: {},
      texts: {},
      index: {
        entityToEdges: {
          'entity-1': ['edge-1'],
          'entity-2': ['edge-1'],
        },
        columnToEntity: {
          'col-1': 'entity-1',
          'col-2': 'entity-1',
          'col-3': 'entity-2',
          'col-4': 'entity-2',
        },
        columnToEdges: {
          'col-1': ['edge-1'],
          'col-4': ['edge-1'],
        },
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

  describe('actionHoverEntity', () => {
    it('エンティティにホバーした時、そのエンティティと隣接要素がハイライトされる', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverEntity(viewModel, 'entity-1');

      // ホバー状態が設定される
      expect(result.erDiagram.ui.hover).toEqual({ type: 'entity', id: 'entity-1' });

      // entity-1とentity-2（隣接）がハイライトされる
      expect(result.erDiagram.ui.highlightedNodeIds).toContain('entity-1');
      expect(result.erDiagram.ui.highlightedNodeIds).toContain('entity-2');

      // edge-1がハイライトされる
      expect(result.erDiagram.ui.highlightedEdgeIds).toContain('edge-1');

      // エッジに関連するカラムがハイライトされる
      expect(result.erDiagram.ui.highlightedColumnIds).toContain('col-4');
      expect(result.erDiagram.ui.highlightedColumnIds).toContain('col-1');
    });

    it('layerOrderが保持される', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverEntity(viewModel, 'entity-1');

      // layerOrderが保持されていることを確認
      expect(result.erDiagram.ui.layerOrder).toEqual({
        backgroundItems: [],
        foregroundItems: [],
      });
    });

    it('ドラッグ中はホバーイベントを無視する（同一参照を返す）', () => {
      const viewModel = createMockViewModel();
      viewModel.erDiagram.ui.isDraggingEntity = true;
      
      const result = actionHoverEntity(viewModel, 'entity-1');

      // 同一参照が返される（変更なし）
      expect(result).toBe(viewModel);
    });
  });

  describe('actionHoverEdge', () => {
    it('エッジにホバーした時、エッジと両端のノード、両端のカラムがハイライトされる', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverEdge(viewModel, 'edge-1');

      // ホバー状態が設定される
      expect(result.erDiagram.ui.hover).toEqual({ type: 'edge', id: 'edge-1' });

      // 両端のノードがハイライトされる
      expect(result.erDiagram.ui.highlightedNodeIds).toContain('entity-1');
      expect(result.erDiagram.ui.highlightedNodeIds).toContain('entity-2');

      // エッジがハイライトされる
      expect(result.erDiagram.ui.highlightedEdgeIds).toContain('edge-1');

      // 両端のカラムがハイライトされる
      expect(result.erDiagram.ui.highlightedColumnIds).toContain('col-4');
      expect(result.erDiagram.ui.highlightedColumnIds).toContain('col-1');
    });

    it('存在しないエッジIDの場合、元の状態を返す', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverEdge(viewModel, 'non-existent');

      expect(result).toBe(viewModel);
    });

    it('layerOrderが保持される', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverEdge(viewModel, 'edge-1');

      // layerOrderが保持されていることを確認
      expect(result.erDiagram.ui.layerOrder).toEqual({
        backgroundItems: [],
        foregroundItems: [],
      });
    });

    it('ドラッグ中はホバーイベントを無視する（同一参照を返す）', () => {
      const viewModel = createMockViewModel();
      viewModel.erDiagram.ui.isDraggingEntity = true;
      
      const result = actionHoverEdge(viewModel, 'edge-1');

      // 同一参照が返される（変更なし）
      expect(result).toBe(viewModel);
    });
  });

  describe('actionHoverColumn', () => {
    it('カラムにホバーした時、カラムと関連するエッジ・ノード・対応カラムがハイライトされる', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverColumn(viewModel, 'col-4');

      // ホバー状態が設定される
      expect(result.erDiagram.ui.hover).toEqual({ type: 'column', id: 'col-4' });

      // カラムの所有者と接続先のノードがハイライトされる
      expect(result.erDiagram.ui.highlightedNodeIds).toContain('entity-2');
      expect(result.erDiagram.ui.highlightedNodeIds).toContain('entity-1');

      // 関連するエッジがハイライトされる
      expect(result.erDiagram.ui.highlightedEdgeIds).toContain('edge-1');

      // カラム自身と対応するカラムがハイライトされる
      expect(result.erDiagram.ui.highlightedColumnIds).toContain('col-4');
      expect(result.erDiagram.ui.highlightedColumnIds).toContain('col-1');
    });

    it('存在しないカラムIDの場合、元の状態を返す', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverColumn(viewModel, 'non-existent');

      expect(result).toBe(viewModel);
    });

    it('layerOrderが保持される', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverColumn(viewModel, 'col-4');

      // layerOrderが保持されていることを確認
      expect(result.erDiagram.ui.layerOrder).toEqual({
        backgroundItems: [],
        foregroundItems: [],
      });
    });

    it('ドラッグ中はホバーイベントを無視する（同一参照を返す）', () => {
      const viewModel = createMockViewModel();
      viewModel.erDiagram.ui.isDraggingEntity = true;
      
      const result = actionHoverColumn(viewModel, 'col-4');

      // 同一参照が返される（変更なし）
      expect(result).toBe(viewModel);
    });
  });

  describe('actionClearHover', () => {
    it('すべてのハイライトがクリアされる', () => {
      const viewModel = createMockViewModel();
      // まずホバー状態を作る
      const hoveredViewModel = actionHoverEntity(viewModel, 'entity-1');

      // クリアする
      const result = actionClearHover(hoveredViewModel);

      expect(result.erDiagram.ui.hover).toBeNull();
      expect(result.erDiagram.ui.highlightedNodeIds).toEqual([]);
      expect(result.erDiagram.ui.highlightedEdgeIds).toEqual([]);
      expect(result.erDiagram.ui.highlightedColumnIds).toEqual([]);
    });

    it('すでにクリアされている場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      const result = actionClearHover(viewModel);

      expect(result).toBe(viewModel);
    });

    it('layerOrderが保持される', () => {
      const viewModel = createMockViewModel();
      // まずホバー状態を作る
      const hoveredViewModel = actionHoverEntity(viewModel, 'entity-1');

      // クリアする
      const result = actionClearHover(hoveredViewModel);

      // layerOrderが保持されていることを確認
      expect(result.erDiagram.ui.layerOrder).toEqual({
        backgroundItems: [],
        foregroundItems: [],
      });
    });

    it('エンティティ選択中はハイライト状態を維持してhoverのみクリア', () => {
      const viewModel = createMockViewModel();
      
      // エンティティを選択（ハイライトが設定される）
      const withEntitySelected = {
        ...viewModel,
        ui: {
          ...viewModel.ui,
          selectedItem: { kind: 'entity' as const, id: 'entity-1' },
        },
        erDiagram: {
          ...viewModel.erDiagram,
          ui: {
            ...viewModel.erDiagram.ui,
            hover: { type: 'entity' as const, id: 'entity-1' },
            highlightedNodeIds: ['entity-1', 'entity-2'],
            highlightedEdgeIds: ['edge-1'],
            highlightedColumnIds: ['col-1', 'col-4'],
          },
        },
      };

      // ホバーをクリア
      const result = actionClearHover(withEntitySelected);

      // hoverはクリアされる
      expect(result.erDiagram.ui.hover).toBeNull();
      
      // ハイライト状態は維持される
      expect(result.erDiagram.ui.highlightedNodeIds).toEqual(['entity-1', 'entity-2']);
      expect(result.erDiagram.ui.highlightedEdgeIds).toEqual(['edge-1']);
      expect(result.erDiagram.ui.highlightedColumnIds).toEqual(['col-1', 'col-4']);
    });

    it('エンティティ選択中でhoverが既にnullの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const withEntitySelected = {
        ...viewModel,
        ui: {
          ...viewModel.ui,
          selectedItem: { kind: 'entity' as const, id: 'entity-1' },
        },
        erDiagram: {
          ...viewModel.erDiagram,
          ui: {
            ...viewModel.erDiagram.ui,
            hover: null, // 既にnull
            highlightedNodeIds: ['entity-1', 'entity-2'],
            highlightedEdgeIds: ['edge-1'],
            highlightedColumnIds: ['col-1', 'col-4'],
          },
        },
      };

      const result = actionClearHover(withEntitySelected);

      // 同一参照を返す（最適化）
      expect(result).toBe(withEntitySelected);
    });
  });

  describe('actionStartEntityDrag', () => {
    it('isDraggingEntityがtrueに設定される', () => {
      const viewModel = createMockViewModel();
      const result = actionStartEntityDrag(viewModel);

      expect(result.erDiagram.ui.isDraggingEntity).toBe(true);
    });

    it('hoverがnullに設定される', () => {
      const viewModel = createMockViewModel();
      // まずホバー状態を作る
      const hoveredViewModel = actionHoverEntity(viewModel, 'entity-1');
      
      const result = actionStartEntityDrag(hoveredViewModel);

      expect(result.erDiagram.ui.hover).toBeNull();
    });

    it('すべてのハイライト配列が空になる', () => {
      const viewModel = createMockViewModel();
      // まずホバー状態を作る
      const hoveredViewModel = actionHoverEntity(viewModel, 'entity-1');
      
      const result = actionStartEntityDrag(hoveredViewModel);

      expect(result.erDiagram.ui.highlightedNodeIds).toEqual([]);
      expect(result.erDiagram.ui.highlightedEdgeIds).toEqual([]);
      expect(result.erDiagram.ui.highlightedColumnIds).toEqual([]);
    });

    it('すでにドラッグ中の場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      viewModel.erDiagram.ui.isDraggingEntity = true;
      
      const result = actionStartEntityDrag(viewModel);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionStopEntityDrag', () => {
    it('isDraggingEntityがfalseに設定される', () => {
      const viewModel = createMockViewModel();
      viewModel.erDiagram.ui.isDraggingEntity = true;
      
      const result = actionStopEntityDrag(viewModel);

      expect(result.erDiagram.ui.isDraggingEntity).toBe(false);
    });

    it('すでにドラッグ停止状態の場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      // isDraggingEntityはデフォルトでfalse
      
      const result = actionStopEntityDrag(viewModel);

      expect(result).toBe(viewModel);
    });
  });

  describe('エンティティ選択中のホバー無効化', () => {
    it('エンティティ選択中は他のエンティティにホバーしてもハイライトされない', () => {
      const vm = createMockViewModel();
      const withEntitySelected = {
        ...vm,
        ui: {
          ...vm.ui,
          selectedItem: { kind: 'entity' as const, id: 'entity-1' },
        },
      };
      const next = actionHoverEntity(withEntitySelected, 'entity-2');
      
      expect(next).toBe(withEntitySelected); // 同一参照を返す
    });

    it('エンティティ選択中はエッジにホバーしてもハイライトされない', () => {
      const vm = createMockViewModel();
      const withEntitySelected = {
        ...vm,
        ui: {
          ...vm.ui,
          selectedItem: { kind: 'entity' as const, id: 'entity-1' },
        },
      };
      const next = actionHoverEdge(withEntitySelected, 'edge-1');
      
      expect(next).toBe(withEntitySelected); // 同一参照を返す
    });

    it('エンティティ選択中はカラムにホバーしてもハイライトされない', () => {
      const vm = createMockViewModel();
      const withEntitySelected = {
        ...vm,
        ui: {
          ...vm.ui,
          selectedItem: { kind: 'entity' as const, id: 'entity-1' },
        },
      };
      const next = actionHoverColumn(withEntitySelected, 'col-4');
      
      expect(next).toBe(withEntitySelected); // 同一参照を返す
    });
  });
});
