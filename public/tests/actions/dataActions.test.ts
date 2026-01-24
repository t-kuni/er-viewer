import { describe, it, expect } from 'vitest';
import {
  actionSetData,
  actionUpdateNodePositions,
  actionSetLoading,
} from '../../src/actions/dataActions';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
type EntityNodeViewModel = components['schemas']['EntityNodeViewModel'];
type RelationshipEdgeViewModel = components['schemas']['RelationshipEdgeViewModel'];

describe('dataActions', () => {
  // テスト用のViewModelを作成
  const createMockViewModel = (): ViewModel => ({
    erDiagram: {
      nodes: {
        'entity-1': {
          id: 'entity-1',
          name: 'users',
          x: 100,
          y: 200,
          columns: [],
          ddl: 'CREATE TABLE users...',
        },
      },
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

  describe('actionSetData', () => {
    it('データが正しく設定される', () => {
      const viewModel = createMockViewModel();
      
      const newNodes: { [key: string]: EntityNodeViewModel } = {
        'entity-2': {
          id: 'entity-2',
          name: 'posts',
          x: 300,
          y: 400,
          columns: [],
          ddl: 'CREATE TABLE posts...',
        },
      };
      
      const newEdges: { [key: string]: RelationshipEdgeViewModel } = {
        'edge-1': {
          id: 'edge-1',
          sourceEntityId: 'entity-2',
          sourceColumnId: 'col-1',
          targetEntityId: 'entity-1',
          targetColumnId: 'col-2',
          constraintName: 'fk_posts_user_id',
        },
      };
      
      const result = actionSetData(viewModel, newNodes, newEdges);

      expect(result.erDiagram.nodes).toEqual(newNodes);
      expect(result.erDiagram.edges).toEqual(newEdges);
      // UI状態は保持される
      expect(result.erDiagram.ui).toEqual(viewModel.erDiagram.ui);
      expect(result.erDiagram.loading).toBe(viewModel.erDiagram.loading);
    });
  });

  describe('actionUpdateNodePositions', () => {
    it('ノード位置が正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'entity-1', x: 500, y: 600 },
      ]);

      expect(result.erDiagram.nodes['entity-1'].x).toBe(500);
      expect(result.erDiagram.nodes['entity-1'].y).toBe(600);
      // 他のプロパティは保持される
      expect(result.erDiagram.nodes['entity-1'].name).toBe('users');
    });

    it('複数のノード位置を同時に更新できる', () => {
      const viewModel: ViewModel = {
        erDiagram: {
          nodes: {
            'entity-1': {
              id: 'entity-1',
              name: 'users',
              x: 100,
              y: 200,
              columns: [],
              ddl: '',
            },
            'entity-2': {
              id: 'entity-2',
              name: 'posts',
              x: 300,
              y: 400,
              columns: [],
              ddl: '',
            },
          },
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
      };
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'entity-1', x: 500, y: 600 },
        { id: 'entity-2', x: 700, y: 800 },
      ]);

      expect(result.erDiagram.nodes['entity-1'].x).toBe(500);
      expect(result.erDiagram.nodes['entity-1'].y).toBe(600);
      expect(result.erDiagram.nodes['entity-2'].x).toBe(700);
      expect(result.erDiagram.nodes['entity-2'].y).toBe(800);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'entity-1', x: 100, y: 200 }, // 同じ位置
      ]);

      expect(result).toBe(viewModel);
    });

    it('存在しないノードIDの場合は無視される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateNodePositions(viewModel, [
        { id: 'non-existent', x: 500, y: 600 },
      ]);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionSetLoading', () => {
    it('ローディング状態が正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetLoading(viewModel, true);

      expect(result.erDiagram.loading).toBe(true);
      // 他の状態は保持される
      expect(result.erDiagram.nodes).toEqual(viewModel.erDiagram.nodes);
      expect(result.erDiagram.edges).toEqual(viewModel.erDiagram.edges);
      expect(result.erDiagram.ui).toEqual(viewModel.erDiagram.ui);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetLoading(viewModel, false); // 既にfalse

      expect(result).toBe(viewModel);
    });
  });
});
