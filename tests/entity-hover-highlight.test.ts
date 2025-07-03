/**
 * Entity hover highlight functionality tests
 */

import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import { ERData } from '../public/js/types';

describe('Entity Hover Highlight', () => {
  let app: ERViewerApplication;
  let infra: InfrastructureMock;

  beforeEach(() => {
    infra = new InfrastructureMock();
    app = new ERViewerApplication(infra);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('エンティティにホバーすると関連エンティティとリレーションがハイライトされる', () => {
    // Arrange
    const addClassSpy = jest.spyOn(infra.dom, 'addClass');
    
    const erData: ERData = {
      entities: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: '' },
            { name: 'name', type: 'varchar(255)', nullable: true, key: '', default: null, extra: '' }
          ],
          position: { x: 100, y: 100 },
          foreignKeys: [],
          ddl: 'CREATE TABLE users (id int, name varchar(255))'
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: '' },
            { name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '' },
            { name: 'title', type: 'varchar(255)', nullable: false, key: '', default: null, extra: '' }
          ],
          position: { x: 300, y: 100 },
          foreignKeys: [{ column: 'user_id', referencedTable: 'users', referencedColumn: 'id', constraintName: 'fk_posts_users' }],
          ddl: 'CREATE TABLE posts (id int, user_id int, title varchar(255))'
        },
        {
          name: 'comments',
          columns: [
            { name: 'id', type: 'int', nullable: false, key: 'PRI', default: null, extra: '' },
            { name: 'user_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '' },
            { name: 'post_id', type: 'int', nullable: false, key: 'MUL', default: null, extra: '' },
            { name: 'content', type: 'text', nullable: false, key: '', default: null, extra: '' }
          ],
          position: { x: 500, y: 100 },
          foreignKeys: [
            { column: 'user_id', referencedTable: 'users', referencedColumn: 'id', constraintName: 'fk_comments_users' },
            { column: 'post_id', referencedTable: 'posts', referencedColumn: 'id', constraintName: 'fk_comments_posts' }
          ],
          ddl: 'CREATE TABLE comments (id int, user_id int, post_id int, content text)'
        }
      ],
      relationships: [
        { from: 'posts', to: 'users', fromColumn: 'user_id', toColumn: 'id', constraintName: 'fk_posts_users' },
        { from: 'comments', to: 'users', fromColumn: 'user_id', toColumn: 'id', constraintName: 'fk_comments_users' },
        { from: 'comments', to: 'posts', fromColumn: 'post_id', toColumn: 'id', constraintName: 'fk_comments_posts' }
      ],
      layout: {
        entities: {},
        rectangles: [],
        texts: [],
        layers: [],
        leftSidebar: {
          visible: true,
          width: 250
        }
      }
    };

    // Canvas要素の設定
    const canvas = infra.dom.createElement('svg');
    infra.dom.setAttribute(canvas, 'id', 'er-canvas');
    infra.dom.getElementById = jest.fn((id: string) => {
      if (id === 'er-canvas') return canvas;
      if (id === 'dynamic-layer') return infra.dom.createElement('g');
      if (id === 'relationship-layer') return infra.dom.createElement('g');
      if (id === 'highlight-layer') return infra.dom.createElement('g');
      return null;
    });

    // エンティティ要素の作成
    const usersEntity = infra.dom.createElement('g');
    infra.dom.setAttribute(usersEntity, 'class', 'entity');
    infra.dom.setAttribute(usersEntity, 'data-table-name', 'users');
    
    const postsEntity = infra.dom.createElement('g');
    infra.dom.setAttribute(postsEntity, 'class', 'entity');
    infra.dom.setAttribute(postsEntity, 'data-table-name', 'posts');
    
    const commentsEntity = infra.dom.createElement('g');
    infra.dom.setAttribute(commentsEntity, 'class', 'entity');
    infra.dom.setAttribute(commentsEntity, 'data-table-name', 'comments');

    // リレーション要素の作成
    const postsUsersRelation = infra.dom.createElement('path');
    infra.dom.setAttribute(postsUsersRelation, 'class', 'relationship');
    infra.dom.setAttribute(postsUsersRelation, 'data-from-table', 'posts');
    infra.dom.setAttribute(postsUsersRelation, 'data-to-table', 'users');
    infra.dom.setAttribute(postsUsersRelation, 'data-from-column', 'user_id');
    infra.dom.setAttribute(postsUsersRelation, 'data-to-column', 'id');

    const commentsUsersRelation = infra.dom.createElement('path');
    infra.dom.setAttribute(commentsUsersRelation, 'class', 'relationship');
    infra.dom.setAttribute(commentsUsersRelation, 'data-from-table', 'comments');
    infra.dom.setAttribute(commentsUsersRelation, 'data-to-table', 'users');
    infra.dom.setAttribute(commentsUsersRelation, 'data-from-column', 'user_id');
    infra.dom.setAttribute(commentsUsersRelation, 'data-to-column', 'id');

    // querySelector用のモック設定
    infra.dom.querySelector = jest.fn((selector: string) => {
      if (selector === '.entity[data-table-name="users"]') return usersEntity;
      if (selector === '.entity[data-table-name="posts"]') return postsEntity;
      if (selector === '.entity[data-table-name="comments"]') return commentsEntity;
      if (selector === '.relationship[data-from-table="posts"][data-to-table="users"]') return postsUsersRelation;
      if (selector === '.relationship[data-from-table="comments"][data-to-table="users"]') return commentsUsersRelation;
      return null;
    });

    infra.dom.querySelectorAll = jest.fn((selector: string) => {
      if (selector === '.highlighted') return [];
      return [];
    });

    infra.dom.closest = jest.fn((element: Element, selector: string) => {
      if (selector === '.entity' && element === usersEntity) return usersEntity;
      return null;
    });

    (app as any).initialize();
    (app as any).setState({ erData });
    
    // Act - usersエンティティにホバー
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
      bubbles: true
    });
    Object.defineProperty(mouseEvent, 'target', { value: usersEntity, writable: false });
    
    // handleCanvasMouseMove を直接呼び出す
    (app as any).handleCanvasMouseMove(mouseEvent);

    // Assert
    // usersエンティティがハイライトされる
    expect(addClassSpy).toHaveBeenCalledWith(usersEntity, 'highlighted');
    
    // 関連するpostsとcommentsエンティティがハイライトされる
    expect(addClassSpy).toHaveBeenCalledWith(postsEntity, 'highlighted');
    expect(addClassSpy).toHaveBeenCalledWith(commentsEntity, 'highlighted');
    
    // リレーションがハイライトされる
    expect(addClassSpy).toHaveBeenCalledWith(postsUsersRelation, 'highlighted');
    expect(addClassSpy).toHaveBeenCalledWith(commentsUsersRelation, 'highlighted');
  });

  test('エンティティからマウスが離れるとハイライトがクリアされる', () => {
    // Arrange
    const removeClassSpy = jest.spyOn(infra.dom, 'removeClass');
    const setInnerHTMLSpy = jest.spyOn(infra.dom, 'setInnerHTML');
    
    const canvas = infra.dom.createElement('svg');
    infra.dom.setAttribute(canvas, 'id', 'er-canvas');
    infra.dom.getElementById = jest.fn((id: string) => {
      if (id === 'er-canvas') return canvas;
      if (id === 'highlight-layer') return infra.dom.createElement('g');
      return null;
    });

    const highlightedEntity = infra.dom.createElement('g');
    infra.dom.addClass(highlightedEntity, 'highlighted');
    
    infra.dom.querySelectorAll = jest.fn((selector: string) => {
      if (selector === '.highlighted') return [highlightedEntity];
      return [];
    });

    infra.dom.closest = jest.fn(() => null);

    (app as any).initialize();
    
    // Act - 空白エリアにマウス移動
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: 50,
      clientY: 50,
      bubbles: true
    });
    Object.defineProperty(mouseEvent, 'target', { value: canvas, writable: false });
    
    (app as any).handleCanvasMouseMove(mouseEvent);

    // Assert
    // ハイライトがクリアされる
    expect(removeClassSpy).toHaveBeenCalledWith(highlightedEntity, 'highlighted');
    expect(setInnerHTMLSpy).toHaveBeenCalled();
  });
});