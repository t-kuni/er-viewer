/**
 * テストデータファクトリー
 * テストの可読性を保ちつつ、テストデータ生成を効率化するヘルパー関数群
 */
import type { Entity, Column, ForeignKey, Relationship, LayoutData, ERData } from '../public/js/types/index.js';

/**
 * カラムのテストデータを生成
 */
export function createColumn(options: Partial<Column> = {}): Column {
  return {
    name: 'id',
    type: 'int',
    key: 'PRI',
    nullable: false,
    default: null,
    extra: '',
    ...options
  };
}

/**
 * エンティティのテストデータを生成
 */
export function createEntity(options: {
  name?: string;
  columns?: Array<Partial<Column>>;
  foreignKeys?: ForeignKey[];
  ddl?: string;
} = {}): Entity {
  const name = options.name || 'test_table';
  const columns = (options.columns || [{ name: 'id' }]).map(col => createColumn(col));
  
  return {
    name,
    columns,
    foreignKeys: options.foreignKeys || [],
    ddl: options.ddl || `CREATE TABLE ${name} (${columns.map(c => `${c.name} ${c.type}`).join(', ')});`
  };
}

/**
 * リレーションシップのテストデータを生成
 */
export function createRelationship(options: Partial<Relationship> = {}): Relationship {
  return {
    from: 'child_table',
    fromColumn: 'parent_id',
    to: 'parent_table',
    toColumn: 'id',
    constraintName: 'fk_child_parent',
    ...options
  };
}

/**
 * レイアウトデータのテストデータを生成
 */
export function createLayoutData(options: {
  entities?: Record<string, { position: { x: number; y: number } }>;
  rectangles?: Array<{ x: number; y: number; width: number; height: number; color?: string; id?: string }>;
  texts?: Array<{ x: number; y: number; content: string; fontSize?: number; color?: string; id?: string }>;
  layers?: string[];
} = {}): LayoutData {
  return {
    entities: options.entities || {},
    rectangles: options.rectangles || [],
    texts: options.texts || [],
    layers: options.layers || []
  };
}

/**
 * ERデータのテストデータを生成
 */
export function createERData(options: {
  entities?: Array<Partial<Entity> | string>;
  relationships?: Array<Partial<Relationship>>;
  layout?: Partial<LayoutData>;
} = {}): ERData {
  // エンティティの生成
  const entities = (options.entities || ['users']).map(e => {
    if (typeof e === 'string') {
      return createEntity({ name: e });
    }
    return createEntity(e);
  });

  // リレーションシップの生成
  const relationships = (options.relationships || []).map(r => createRelationship(r));

  // レイアウトの生成（エンティティの位置を自動設定）
  const entityPositions: Record<string, { position: { x: number; y: number } }> = {};
  entities.forEach((entity, index) => {
    entityPositions[entity.name] = {
      position: {
        x: 100 + index * 250,
        y: 100
      }
    };
  });

  const layout = createLayoutData({
    entities: entityPositions,
    ...options.layout
  });

  return {
    entities,
    relationships,
    layout
  };
}

/**
 * ユーザーエンティティのプリセット
 */
export function createUserEntity(): Entity {
  return createEntity({
    name: 'users',
    columns: [
      { name: 'id', type: 'int', key: 'PRI' },
      { name: 'name', type: 'varchar(255)', nullable: false },
      { name: 'email', type: 'varchar(255)', key: 'UNI', nullable: false }
    ]
  });
}

/**
 * 投稿エンティティのプリセット
 */
export function createPostEntity(): Entity {
  return createEntity({
    name: 'posts',
    columns: [
      { name: 'id', type: 'int', key: 'PRI' },
      { name: 'title', type: 'varchar(255)', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'user_id', type: 'int', key: 'MUL', nullable: false }
    ]
  });
}

/**
 * ユーザー・投稿の関連を含むERデータのプリセット
 */
export function createUserPostERData(): ERData {
  return createERData({
    entities: [createUserEntity(), createPostEntity()],
    relationships: [{
      from: 'posts',
      fromColumn: 'user_id',
      to: 'users',
      toColumn: 'id',
      constraintName: 'posts_user_id_fkey'
    }]
  });
}

/**
 * ネットワークレスポンスのテストデータを生成
 */
export function createNetworkResponse<T = any>(options: {
  status?: number;
  statusText?: string;
  data?: T;
} = {}) {
  return {
    status: options.status || 200,
    statusText: options.statusText,
    data: options.data
  };
}

/**
 * DDLレスポンスのテストデータを生成
 */
export function createDDLResponse(tableName: string, ddl?: string) {
  return createNetworkResponse({
    data: {
      ddl: ddl || `CREATE TABLE ${tableName} (id INT PRIMARY KEY);`
    }
  });
}

/**
 * 成功レスポンスのテストデータを生成
 */
export function createSuccessResponse() {
  return createNetworkResponse({
    data: { success: true }
  });
}

/**
 * エラーレスポンスのテストデータを生成
 */
export function createErrorResponse(status: number, message?: string) {
  return createNetworkResponse({
    status,
    statusText: message || 'Error',
    data: { error: message || 'An error occurred' }
  });
}