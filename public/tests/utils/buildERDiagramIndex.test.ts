import { describe, it, expect } from 'vitest';
import { buildERDiagramIndex } from '../../src/utils/buildERDiagramIndex';
import type { EntityNodeViewModel, RelationshipEdgeViewModel } from '../../src/api/client';

describe('buildERDiagramIndex', () => {
  it('空のnodes/edgesで空のインデックスを返すこと', () => {
    const nodes: Record<string, EntityNodeViewModel> = {};
    const edges: Record<string, RelationshipEdgeViewModel> = {};
    
    const index = buildERDiagramIndex(nodes, edges);
    
    expect(index).toEqual({
      entityToEdges: {},
      columnToEntity: {},
      columnToEdges: {},
    });
  });
  
  it('1つのエンティティと1つのエッジで正しくインデックスを構築すること', () => {
    const nodes: Record<string, EntityNodeViewModel> = {
      'entity-1': {
        id: 'entity-1',
        name: 'users',
        x: 100,
        y: 100,
        columns: [
          { id: 'col-1', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: 'auto_increment', isForeignKey: false },
          { id: 'col-2', name: 'name', type: 'varchar(255)', nullable: false, key: '', default: null, extra: '', isForeignKey: false },
        ],
        ddl: 'CREATE TABLE users...',
      },
      'entity-2': {
        id: 'entity-2',
        name: 'posts',
        x: 400,
        y: 100,
        columns: [
          { id: 'col-3', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: 'auto_increment', isForeignKey: false },
          { id: 'col-4', name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '', isForeignKey: true },
        ],
        ddl: 'CREATE TABLE posts...',
      },
    };
    
    const edges: Record<string, RelationshipEdgeViewModel> = {
      'edge-1': {
        id: 'edge-1',
        sourceEntityId: 'entity-2',
        sourceColumnId: 'col-4',
        targetEntityId: 'entity-1',
        targetColumnId: 'col-1',
        constraintName: 'fk_posts_user_id',
      },
    };
    
    const index = buildERDiagramIndex(nodes, edges);
    
    expect(index.entityToEdges['entity-1']).toEqual(['edge-1']);
    expect(index.entityToEdges['entity-2']).toEqual(['edge-1']);
    expect(index.columnToEntity['col-1']).toBe('entity-1');
    expect(index.columnToEntity['col-2']).toBe('entity-1');
    expect(index.columnToEntity['col-3']).toBe('entity-2');
    expect(index.columnToEntity['col-4']).toBe('entity-2');
    expect(index.columnToEdges['col-1']).toEqual(['edge-1']);
    expect(index.columnToEdges['col-4']).toEqual(['edge-1']);
    expect(index.columnToEdges['col-2']).toBeUndefined();
    expect(index.columnToEdges['col-3']).toBeUndefined();
  });
  
  it('複数のエンティティと複数のエッジで正しくインデックスを構築すること', () => {
    const nodes: Record<string, EntityNodeViewModel> = {
      'entity-1': {
        id: 'entity-1',
        name: 'users',
        x: 100,
        y: 100,
        columns: [
          { id: 'col-1', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: 'auto_increment', isForeignKey: false },
        ],
        ddl: 'CREATE TABLE users...',
      },
      'entity-2': {
        id: 'entity-2',
        name: 'posts',
        x: 400,
        y: 100,
        columns: [
          { id: 'col-2', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: 'auto_increment', isForeignKey: false },
          { id: 'col-3', name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '', isForeignKey: true },
        ],
        ddl: 'CREATE TABLE posts...',
      },
      'entity-3': {
        id: 'entity-3',
        name: 'comments',
        x: 700,
        y: 100,
        columns: [
          { id: 'col-4', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: 'auto_increment', isForeignKey: false },
          { id: 'col-5', name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '', isForeignKey: true },
          { id: 'col-6', name: 'post_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '', isForeignKey: true },
        ],
        ddl: 'CREATE TABLE comments...',
      },
    };
    
    const edges: Record<string, RelationshipEdgeViewModel> = {
      'edge-1': {
        id: 'edge-1',
        sourceEntityId: 'entity-2',
        sourceColumnId: 'col-3',
        targetEntityId: 'entity-1',
        targetColumnId: 'col-1',
        constraintName: 'fk_posts_user_id',
      },
      'edge-2': {
        id: 'edge-2',
        sourceEntityId: 'entity-3',
        sourceColumnId: 'col-5',
        targetEntityId: 'entity-1',
        targetColumnId: 'col-1',
        constraintName: 'fk_comments_user_id',
      },
      'edge-3': {
        id: 'edge-3',
        sourceEntityId: 'entity-3',
        sourceColumnId: 'col-6',
        targetEntityId: 'entity-2',
        targetColumnId: 'col-2',
        constraintName: 'fk_comments_post_id',
      },
    };
    
    const index = buildERDiagramIndex(nodes, edges);
    
    // entity-1は2つのエッジに接続されている
    expect(index.entityToEdges['entity-1']).toEqual(['edge-1', 'edge-2']);
    // entity-2は2つのエッジに接続されている
    expect(index.entityToEdges['entity-2']).toEqual(['edge-1', 'edge-3']);
    // entity-3は2つのエッジに接続されている
    expect(index.entityToEdges['entity-3']).toEqual(['edge-2', 'edge-3']);
    
    // columnToEntityの確認
    expect(index.columnToEntity['col-1']).toBe('entity-1');
    expect(index.columnToEntity['col-2']).toBe('entity-2');
    expect(index.columnToEntity['col-3']).toBe('entity-2');
    expect(index.columnToEntity['col-4']).toBe('entity-3');
    expect(index.columnToEntity['col-5']).toBe('entity-3');
    expect(index.columnToEntity['col-6']).toBe('entity-3');
    
    // col-1は2つのエッジに接続されている
    expect(index.columnToEdges['col-1']).toEqual(['edge-1', 'edge-2']);
    // col-2は1つのエッジに接続されている
    expect(index.columnToEdges['col-2']).toEqual(['edge-3']);
    // col-3は1つのエッジに接続されている
    expect(index.columnToEdges['col-3']).toEqual(['edge-1']);
    // col-4はエッジに接続されていない
    expect(index.columnToEdges['col-4']).toBeUndefined();
    // col-5は1つのエッジに接続されている
    expect(index.columnToEdges['col-5']).toEqual(['edge-2']);
    // col-6は1つのエッジに接続されている
    expect(index.columnToEdges['col-6']).toEqual(['edge-3']);
  });
  
  it('カラムが複数のエッジに接続されている場合、columnToEdgesに複数のエッジIDが含まれること', () => {
    const nodes: Record<string, EntityNodeViewModel> = {
      'entity-1': {
        id: 'entity-1',
        name: 'users',
        x: 100,
        y: 100,
        columns: [
          { id: 'col-1', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: 'auto_increment', isForeignKey: false },
        ],
        ddl: 'CREATE TABLE users...',
      },
      'entity-2': {
        id: 'entity-2',
        name: 'posts',
        x: 400,
        y: 100,
        columns: [
          { id: 'col-2', name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '', isForeignKey: true },
        ],
        ddl: 'CREATE TABLE posts...',
      },
      'entity-3': {
        id: 'entity-3',
        name: 'comments',
        x: 700,
        y: 100,
        columns: [
          { id: 'col-3', name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '', isForeignKey: true },
        ],
        ddl: 'CREATE TABLE comments...',
      },
    };
    
    const edges: Record<string, RelationshipEdgeViewModel> = {
      'edge-1': {
        id: 'edge-1',
        sourceEntityId: 'entity-2',
        sourceColumnId: 'col-2',
        targetEntityId: 'entity-1',
        targetColumnId: 'col-1',
        constraintName: 'fk_posts_user_id',
      },
      'edge-2': {
        id: 'edge-2',
        sourceEntityId: 'entity-3',
        sourceColumnId: 'col-3',
        targetEntityId: 'entity-1',
        targetColumnId: 'col-1',
        constraintName: 'fk_comments_user_id',
      },
    };
    
    const index = buildERDiagramIndex(nodes, edges);
    
    // col-1は2つのエッジに接続されている
    expect(index.columnToEdges['col-1']).toHaveLength(2);
    expect(index.columnToEdges['col-1']).toContain('edge-1');
    expect(index.columnToEdges['col-1']).toContain('edge-2');
  });
  
  it('エンティティが複数のエッジに接続されている場合、entityToEdgesに複数のエッジIDが含まれること', () => {
    const nodes: Record<string, EntityNodeViewModel> = {
      'entity-1': {
        id: 'entity-1',
        name: 'users',
        x: 100,
        y: 100,
        columns: [
          { id: 'col-1', name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: 'auto_increment', isForeignKey: false },
        ],
        ddl: 'CREATE TABLE users...',
      },
      'entity-2': {
        id: 'entity-2',
        name: 'posts',
        x: 400,
        y: 100,
        columns: [
          { id: 'col-2', name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '', isForeignKey: true },
        ],
        ddl: 'CREATE TABLE posts...',
      },
      'entity-3': {
        id: 'entity-3',
        name: 'comments',
        x: 700,
        y: 100,
        columns: [
          { id: 'col-3', name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '', isForeignKey: true },
        ],
        ddl: 'CREATE TABLE comments...',
      },
    };
    
    const edges: Record<string, RelationshipEdgeViewModel> = {
      'edge-1': {
        id: 'edge-1',
        sourceEntityId: 'entity-2',
        sourceColumnId: 'col-2',
        targetEntityId: 'entity-1',
        targetColumnId: 'col-1',
        constraintName: 'fk_posts_user_id',
      },
      'edge-2': {
        id: 'edge-2',
        sourceEntityId: 'entity-3',
        sourceColumnId: 'col-3',
        targetEntityId: 'entity-1',
        targetColumnId: 'col-1',
        constraintName: 'fk_comments_user_id',
      },
    };
    
    const index = buildERDiagramIndex(nodes, edges);
    
    // entity-1は2つのエッジに接続されている
    expect(index.entityToEdges['entity-1']).toHaveLength(2);
    expect(index.entityToEdges['entity-1']).toContain('edge-1');
    expect(index.entityToEdges['entity-1']).toContain('edge-2');
  });
});
