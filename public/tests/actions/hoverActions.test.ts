import { describe, it, expect } from 'vitest';
import {
  actionHoverEntity,
  actionHoverEdge,
  actionHoverColumn,
  actionClearHover,
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
            { id: 'col-1', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: '' },
            { id: 'col-2', name: 'name', type: 'varchar', nullable: false, key: '', default: null, extra: '' },
          ],
          ddl: 'CREATE TABLE users...',
        },
        'entity-2': {
          id: 'entity-2',
          name: 'posts',
          x: 300,
          y: 0,
          columns: [
            { id: 'col-3', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: '' },
            { id: 'col-4', name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '' },
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
      selectedRectangleId: null,
      showBuildInfoModal: false,
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
  });
});
