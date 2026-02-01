import { describe, it, expect } from 'vitest';
import {
  convertToReactFlowNodes,
  convertToReactFlowEdges,
  computeOptimalHandles,
} from '../../src/utils/reactFlowConverter';
import type { EntityNodeViewModel, RelationshipEdgeViewModel } from '../../src/api/client';

describe('reactFlowConverter', () => {
  describe('computeOptimalHandles', () => {
    it('右方向のエッジの場合、s-right → t-left', () => {
      const sourceCenter = { x: 100, y: 100 };
      const targetCenter = { x: 300, y: 100 };
      
      const result = computeOptimalHandles(sourceCenter, targetCenter);
      
      expect(result.sourceHandle).toBe('s-right');
      expect(result.targetHandle).toBe('t-left');
    });
    
    it('左方向のエッジの場合、s-left → t-right', () => {
      const sourceCenter = { x: 300, y: 100 };
      const targetCenter = { x: 100, y: 100 };
      
      const result = computeOptimalHandles(sourceCenter, targetCenter);
      
      expect(result.sourceHandle).toBe('s-left');
      expect(result.targetHandle).toBe('t-right');
    });
    
    it('下方向のエッジの場合、s-bottom → t-top', () => {
      const sourceCenter = { x: 100, y: 100 };
      const targetCenter = { x: 100, y: 300 };
      
      const result = computeOptimalHandles(sourceCenter, targetCenter);
      
      expect(result.sourceHandle).toBe('s-bottom');
      expect(result.targetHandle).toBe('t-top');
    });
    
    it('上方向のエッジの場合、s-top → t-bottom', () => {
      const sourceCenter = { x: 100, y: 300 };
      const targetCenter = { x: 100, y: 100 };
      
      const result = computeOptimalHandles(sourceCenter, targetCenter);
      
      expect(result.sourceHandle).toBe('s-top');
      expect(result.targetHandle).toBe('t-bottom');
    });
  });
  
  describe('convertToReactFlowNodes', () => {
    it('EntityNodeViewModelをReact Flow形式に変換する', () => {
      const nodes: { [key: string]: EntityNodeViewModel } = {
        'entity-1': {
          id: 'entity-1',
          name: 'users',
          x: 100,
          y: 200,
          width: 250,
          height: 300,
          columns: [
            {
              id: 'col-1',
              name: 'id',
              type: 'INT',
              nullable: false,
              key: 'PRI',
              default: null,
              extra: 'auto_increment',
              isForeignKey: false,
            },
          ],
          ddl: 'CREATE TABLE users...',
        },
      };
      
      const result = convertToReactFlowNodes(nodes);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'entity-1',
        type: 'entityNode',
        position: { x: 100, y: 200 },
        zIndex: 0,
        data: {
          id: 'entity-1',
          name: 'users',
          columns: nodes['entity-1'].columns,
          ddl: 'CREATE TABLE users...',
        },
      });
    });
  });
  
  describe('convertToReactFlowEdges', () => {
    const nodes: { [key: string]: EntityNodeViewModel } = {
      'entity-1': {
        id: 'entity-1',
        name: 'users',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        columns: [],
        ddl: '',
      },
      'entity-2': {
        id: 'entity-2',
        name: 'posts',
        x: 400,
        y: 100,
        width: 200,
        height: 100,
        columns: [],
        ddl: '',
      },
    };
    
    describe('通常のリレーション', () => {
      it('異なるエンティティ間のエッジがrelationshipEdgeタイプになる', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-1': {
            id: 'edge-1',
            sourceEntityId: 'entity-2',
            sourceColumnId: 'col-2',
            targetEntityId: 'entity-1',
            targetColumnId: 'col-1',
            constraintName: 'fk_posts_user_id',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, []);
        
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('relationshipEdge');
        expect(result[0].source).toBe('entity-2');
        expect(result[0].target).toBe('entity-1');
      });
      
      it('computeOptimalHandlesが呼ばれて最適なハンドルが設定される', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-1': {
            id: 'edge-1',
            sourceEntityId: 'entity-2',
            sourceColumnId: 'col-2',
            targetEntityId: 'entity-1',
            targetColumnId: 'col-1',
            constraintName: 'fk_posts_user_id',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, []);
        
        // entity-2 (x: 400) → entity-1 (x: 100) なので左方向
        expect(result[0].sourceHandle).toBe('s-left');
        expect(result[0].targetHandle).toBe('t-right');
      });
      
      it('エッジデータが正しく引き継がれる', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-1': {
            id: 'edge-1',
            sourceEntityId: 'entity-2',
            sourceColumnId: 'col-2',
            targetEntityId: 'entity-1',
            targetColumnId: 'col-1',
            constraintName: 'fk_posts_user_id',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, []);
        
        expect(result[0].data).toEqual({
          sourceColumnId: 'col-2',
          targetColumnId: 'col-1',
          constraintName: 'fk_posts_user_id',
        });
      });
    });
    
    describe('自己参照リレーション', () => {
      it('sourceEntityId === targetEntityIdの場合、selfRelationshipEdgeタイプになる', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-self': {
            id: 'edge-self',
            sourceEntityId: 'entity-1',
            sourceColumnId: 'manager_id',
            targetEntityId: 'entity-1',
            targetColumnId: 'id',
            constraintName: 'fk_users_manager_id',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, []);
        
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('selfRelationshipEdge');
      });
      
      it('自己参照リレーションのハンドルがself-out、self-inに設定される', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-self': {
            id: 'edge-self',
            sourceEntityId: 'entity-1',
            sourceColumnId: 'manager_id',
            targetEntityId: 'entity-1',
            targetColumnId: 'id',
            constraintName: 'fk_users_manager_id',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, []);
        
        expect(result[0].sourceHandle).toBe('self-out');
        expect(result[0].targetHandle).toBe('self-in');
      });
      
      it('自己参照リレーションのエッジデータが正しく引き継がれる', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-self': {
            id: 'edge-self',
            sourceEntityId: 'entity-1',
            sourceColumnId: 'manager_id',
            targetEntityId: 'entity-1',
            targetColumnId: 'id',
            constraintName: 'fk_users_manager_id',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, []);
        
        expect(result[0].data).toEqual({
          sourceColumnId: 'manager_id',
          targetColumnId: 'id',
          constraintName: 'fk_users_manager_id',
        });
      });
    });
    
    describe('ハイライト状態', () => {
      it('highlightedEdgeIdsに含まれるエッジのzIndexが100になる', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-1': {
            id: 'edge-1',
            sourceEntityId: 'entity-2',
            sourceColumnId: 'col-2',
            targetEntityId: 'entity-1',
            targetColumnId: 'col-1',
            constraintName: 'fk_posts_user_id',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, ['edge-1']);
        
        expect(result[0].zIndex).toBe(100);
      });
      
      it('highlightedEdgeIdsに含まれないエッジのzIndexが-100になる', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-1': {
            id: 'edge-1',
            sourceEntityId: 'entity-2',
            sourceColumnId: 'col-2',
            targetEntityId: 'entity-1',
            targetColumnId: 'col-1',
            constraintName: 'fk_posts_user_id',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, []);
        
        expect(result[0].zIndex).toBe(-100);
      });
      
      it('自己参照リレーションでもハイライト状態が正しく反映される', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-self': {
            id: 'edge-self',
            sourceEntityId: 'entity-1',
            sourceColumnId: 'manager_id',
            targetEntityId: 'entity-1',
            targetColumnId: 'id',
            constraintName: 'fk_users_manager_id',
          },
        };
        
        const resultHighlighted = convertToReactFlowEdges(edges, nodes, ['edge-self']);
        const resultNormal = convertToReactFlowEdges(edges, nodes, []);
        
        expect(resultHighlighted[0].zIndex).toBe(100);
        expect(resultNormal[0].zIndex).toBe(-100);
      });
    });
    
    describe('存在しないノード', () => {
      it('sourceノードが存在しない場合、エッジが除外される', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-invalid': {
            id: 'edge-invalid',
            sourceEntityId: 'non-existent',
            sourceColumnId: 'col-2',
            targetEntityId: 'entity-1',
            targetColumnId: 'col-1',
            constraintName: 'fk_invalid',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, []);
        
        expect(result).toHaveLength(0);
      });
      
      it('targetノードが存在しない場合、エッジが除外される', () => {
        const edges: { [key: string]: RelationshipEdgeViewModel } = {
          'edge-invalid': {
            id: 'edge-invalid',
            sourceEntityId: 'entity-1',
            sourceColumnId: 'col-1',
            targetEntityId: 'non-existent',
            targetColumnId: 'col-2',
            constraintName: 'fk_invalid',
          },
        };
        
        const result = convertToReactFlowEdges(edges, nodes, []);
        
        expect(result).toHaveLength(0);
      });
    });
  });
});
