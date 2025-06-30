/**
 * カラムのテストデータを生成
 */
export function createColumn(options = {}) {
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
export function createEntity(options = {}) {
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
export function createRelationship(options = {}) {
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
export function createLayoutData(options = {}) {
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
export function createERData(options = {}) {
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
    const entityPositions = {};
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
export function createUserEntity() {
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
export function createPostEntity() {
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
export function createUserPostERData() {
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
export function createNetworkResponse(options = {}) {
    return {
        status: options.status || 200,
        statusText: options.statusText,
        data: options.data
    };
}
/**
 * DDLレスポンスのテストデータを生成
 */
export function createDDLResponse(tableName, ddl) {
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
export function createErrorResponse(status, message) {
    return createNetworkResponse({
        status,
        statusText: message || 'Error',
        data: { error: message || 'An error occurred' }
    });
}
//# sourceMappingURL=test-data-factory.js.map