import { describe, it, expect } from 'vitest';
import {
  actionHoverEntity,
  actionHoverEdge,
  actionHoverColumn,
  actionClearHover,
} from '../../src/actions/hoverActions';
import type { components } from '../../../lib/generated/api-types';

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];

describe('hoverActions', () => {
  // テスト用のViewModelを作成
  const createMockViewModel = (): ERDiagramViewModel => ({
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
    ui: {
      hover: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      highlightedColumnIds: [],
    },
    loading: false,
  });

  describe('actionHoverEntity', () => {
    it('エンティティにホバーした時、そのエンティティと隣接要素がハイライトされる', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverEntity(viewModel, 'entity-1');

      // ホバー状態が設定される
      expect(result.ui.hover).toEqual({ type: 'entity', id: 'entity-1' });

      // entity-1とentity-2（隣接）がハイライトされる
      expect(result.ui.highlightedNodeIds).toContain('entity-1');
      expect(result.ui.highlightedNodeIds).toContain('entity-2');

      // edge-1がハイライトされる
      expect(result.ui.highlightedEdgeIds).toContain('edge-1');

      // エッジに関連するカラムがハイライトされる
      expect(result.ui.highlightedColumnIds).toContain('col-4');
      expect(result.ui.highlightedColumnIds).toContain('col-1');
    });
  });

  describe('actionHoverEdge', () => {
    it('エッジにホバーした時、エッジと両端のノード、両端のカラムがハイライトされる', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverEdge(viewModel, 'edge-1');

      // ホバー状態が設定される
      expect(result.ui.hover).toEqual({ type: 'edge', id: 'edge-1' });

      // 両端のノードがハイライトされる
      expect(result.ui.highlightedNodeIds).toContain('entity-1');
      expect(result.ui.highlightedNodeIds).toContain('entity-2');

      // エッジがハイライトされる
      expect(result.ui.highlightedEdgeIds).toContain('edge-1');

      // 両端のカラムがハイライトされる
      expect(result.ui.highlightedColumnIds).toContain('col-4');
      expect(result.ui.highlightedColumnIds).toContain('col-1');
    });

    it('存在しないエッジIDの場合、元の状態を返す', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverEdge(viewModel, 'non-existent');

      expect(result).toBe(viewModel);
    });
  });

  describe('actionHoverColumn', () => {
    it('カラムにホバーした時、カラムと関連するエッジ・ノード・対応カラムがハイライトされる', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverColumn(viewModel, 'col-4');

      // ホバー状態が設定される
      expect(result.ui.hover).toEqual({ type: 'column', id: 'col-4' });

      // カラムの所有者と接続先のノードがハイライトされる
      expect(result.ui.highlightedNodeIds).toContain('entity-2');
      expect(result.ui.highlightedNodeIds).toContain('entity-1');

      // 関連するエッジがハイライトされる
      expect(result.ui.highlightedEdgeIds).toContain('edge-1');

      // カラム自身と対応するカラムがハイライトされる
      expect(result.ui.highlightedColumnIds).toContain('col-4');
      expect(result.ui.highlightedColumnIds).toContain('col-1');
    });

    it('存在しないカラムIDの場合、元の状態を返す', () => {
      const viewModel = createMockViewModel();
      const result = actionHoverColumn(viewModel, 'non-existent');

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

      expect(result.ui.hover).toBeNull();
      expect(result.ui.highlightedNodeIds).toEqual([]);
      expect(result.ui.highlightedEdgeIds).toEqual([]);
      expect(result.ui.highlightedColumnIds).toEqual([]);
    });

    it('すでにクリアされている場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      const result = actionClearHover(viewModel);

      expect(result).toBe(viewModel);
    });
  });
});
