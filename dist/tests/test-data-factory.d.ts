/**
 * テストデータファクトリー
 * テストの可読性を保ちつつ、テストデータ生成を効率化するヘルパー関数群
 */
import type { Entity, Column, ForeignKey, Relationship, LayoutData, ERData } from '../public/js/types/index.js';
/**
 * カラムのテストデータを生成
 */
export declare function createColumn(options?: Partial<Column>): Column;
/**
 * エンティティのテストデータを生成
 */
export declare function createEntity(options?: {
    name?: string;
    columns?: Array<Partial<Column>>;
    foreignKeys?: ForeignKey[];
    ddl?: string;
}): Entity;
/**
 * リレーションシップのテストデータを生成
 */
export declare function createRelationship(options?: Partial<Relationship>): Relationship;
/**
 * レイアウトデータのテストデータを生成
 */
export declare function createLayoutData(options?: {
    entities?: Record<string, {
        position: {
            x: number;
            y: number;
        };
    }>;
    rectangles?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        color?: string;
        id?: string;
    }>;
    texts?: Array<{
        x: number;
        y: number;
        content: string;
        fontSize?: number;
        color?: string;
        id?: string;
    }>;
    layers?: string[];
}): LayoutData;
/**
 * ERデータのテストデータを生成
 */
export declare function createERData(options?: {
    entities?: Array<Partial<Entity> | string>;
    relationships?: Array<Partial<Relationship>>;
    layout?: Partial<LayoutData>;
}): ERData;
/**
 * ユーザーエンティティのプリセット
 */
export declare function createUserEntity(): Entity;
/**
 * 投稿エンティティのプリセット
 */
export declare function createPostEntity(): Entity;
/**
 * ユーザー・投稿の関連を含むERデータのプリセット
 */
export declare function createUserPostERData(): ERData;
/**
 * ネットワークレスポンスのテストデータを生成
 */
export declare function createNetworkResponse<T = any>(options?: {
    status?: number;
    statusText?: string;
    data?: T;
}): {
    status: number;
    statusText: string | undefined;
    data: T | undefined;
};
/**
 * DDLレスポンスのテストデータを生成
 */
export declare function createDDLResponse(tableName: string, ddl?: string): {
    status: number;
    statusText: string | undefined;
    data: {
        ddl: string;
    } | undefined;
};
/**
 * 成功レスポンスのテストデータを生成
 */
export declare function createSuccessResponse(): {
    status: number;
    statusText: string | undefined;
    data: {
        success: boolean;
    } | undefined;
};
/**
 * エラーレスポンスのテストデータを生成
 */
export declare function createErrorResponse(status: number, message?: string): {
    status: number;
    statusText: string | undefined;
    data: {
        error: string;
    } | undefined;
};
//# sourceMappingURL=test-data-factory.d.ts.map