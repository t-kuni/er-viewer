import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import { ERViewerApplication } from '../public/js/er-viewer-application';

describe('リレーションホバー時のハイライト機能', () => {
  test('リレーションにホバーするとリレーションと両端のカラムがハイライトされる', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
    const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
    const erData = {
      entities: [
        {
          name: 'users',
          schema: 'public',
          type: 'table',
          columns: [
            {
              name: 'id',
              type: 'INT',
              nullable: false,
              key: 'PRI',
              extra: 'auto_increment',
              comment: '',
              default: null
            },
            {
              name: 'name',
              type: 'VARCHAR(255)',
              nullable: true,
              key: '',
              extra: '',
              comment: '',
              default: null
            }
          ],
          indexes: [],
          comment: '',
          foreignKeys: [],
          ddl: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255))'
        },
        {
          name: 'posts',
          schema: 'public',
          type: 'table',
          columns: [
            {
              name: 'id',
              type: 'INT',
              nullable: false,
              key: 'PRI',
              extra: 'auto_increment',
              comment: '',
              default: null
            },
            {
              name: 'user_id',
              type: 'INT',
              nullable: true,
              key: 'MUL',
              extra: '',
              comment: '',
              default: null
            },
            {
              name: 'title',
              type: 'VARCHAR(255)',
              nullable: true,
              key: '',
              extra: '',
              comment: '',
              default: null
            }
          ],
          indexes: [],
          comment: '',
          foreignKeys: [],
          ddl: 'CREATE TABLE posts (id INT PRIMARY KEY, user_id INT, title VARCHAR(255))'
        }
      ],
      relationships: [
        {
          from: 'posts',
          to: 'users',
          fromColumn: 'user_id',
          toColumn: 'id',
          constraintName: 'fk_posts_users',
        },
      ],
      layout: {
        entities: {
          users: { position: { x: 100, y: 100 } },
          posts: { position: { x: 300, y: 100 } },
        },
      },
    };

    infrastructure.setupMockData({
      networkResponses: {
        '/api/er-data': {
          data: erData,
          status: 200,
          statusText: 'OK',
          headers: {}
        },
      },
    });

    // アプリケーションを初期化してデータをロード
    const app = new ERViewerApplication(infrastructure);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // リレーション要素を作成してホバーイベントを発生させる
    const relationshipElement = infrastructure.dom.createElement('path');
    infrastructure.dom.setAttribute(relationshipElement, 'class', 'relationship');
    infrastructure.dom.setAttribute(relationshipElement, 'data-from-table', 'posts');
    infrastructure.dom.setAttribute(relationshipElement, 'data-to-table', 'users');
    infrastructure.dom.setAttribute(relationshipElement, 'data-from-column', 'user_id');
    infrastructure.dom.setAttribute(relationshipElement, 'data-to-column', 'id');

    // querySelector のモックを設定
    const fromEntity = infrastructure.dom.createElement('g');
    const toEntity = infrastructure.dom.createElement('g');
    const fromColumnElement = infrastructure.dom.createElement('text');
    const toColumnElement = infrastructure.dom.createElement('text');
    const highlightLayer = infrastructure.dom.createElement('g');

    infrastructure.dom.querySelector = jest.fn((selector: string) => {
      if (selector === '.entity[data-table-name="posts"]') return fromEntity;
      if (selector === '.entity[data-table-name="users"]') return toEntity;
      if (selector === '.entity[data-table-name="posts"] .column[data-column-name="user_id"]')
        return fromColumnElement;
      if (selector === '.entity[data-table-name="users"] .column[data-column-name="id"]') return toColumnElement;
      return null;
    });

    infrastructure.dom.getElementById = jest.fn((id: string) => {
      if (id === 'highlight-layer') return highlightLayer;
      if (id === 'er-canvas') return infrastructure.dom.getElementById('er-canvas');
      return null;
    });

    infrastructure.dom.querySelectorAll = jest.fn((selector: string) => {
      if (selector === '.highlighted') return [];
      return [];
    });

    // closest がリレーション要素を返さないようにモック
    infrastructure.dom.closest = jest.fn(() => null);

    // hasClass がtrueを返すようにモック
    infrastructure.dom.hasClass = jest.fn(
      (element, className) => element === relationshipElement && className === 'relationship',
    );

    // Act - mousemoveイベントをシミュレート
    const mouseEvent = new MouseEvent('mousemove', { clientX: 400, clientY: 400 });
    Object.defineProperty(mouseEvent, 'target', { value: relationshipElement, writable: false });
    
    // handleCanvasMouseMove を直接呼び出す
    (app as any).handleCanvasMouseMove(mouseEvent);

    // Assert - リレーションと両端のエンティティ、カラムがハイライトされる
    expect(addClassSpy).toHaveBeenCalledWith(relationshipElement, 'highlighted');
    expect(addClassSpy).toHaveBeenCalledWith(fromEntity, 'highlighted');
    expect(addClassSpy).toHaveBeenCalledWith(toEntity, 'highlighted');
    expect(addClassSpy).toHaveBeenCalledWith(fromColumnElement, 'highlighted');
    expect(addClassSpy).toHaveBeenCalledWith(toColumnElement, 'highlighted');

    // highlight-layerがクリアされる
    expect(setInnerHTMLSpy).toHaveBeenCalledWith(highlightLayer, '');
  });

  test('リレーションからマウスが離れるとハイライトがクリアされる', async () => {
    // Arrange
    const infrastructure = new InfrastructureMock();
    const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
    const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
    const erData = {
      entities: [
        {
          name: 'users',
          schema: 'public',
          type: 'table',
          columns: [
            {
              name: 'id',
              type: 'INT',
              nullable: false,
              key: 'PRI',
              extra: 'auto_increment',
              comment: '',
              default: null
            },
            {
              name: 'name',
              type: 'VARCHAR(255)',
              nullable: true,
              key: '',
              extra: '',
              comment: '',
              default: null
            }
          ],
          indexes: [],
          comment: '',
          foreignKeys: [],
          ddl: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255))'
        },
        {
          name: 'posts',
          schema: 'public',
          type: 'table',
          columns: [
            {
              name: 'id',
              type: 'INT',
              nullable: false,
              key: 'PRI',
              extra: 'auto_increment',
              comment: '',
              default: null
            },
            {
              name: 'user_id',
              type: 'INT',
              nullable: true,
              key: 'MUL',
              extra: '',
              comment: '',
              default: null
            },
            {
              name: 'title',
              type: 'VARCHAR(255)',
              nullable: true,
              key: '',
              extra: '',
              comment: '',
              default: null
            }
          ],
          indexes: [],
          comment: '',
          foreignKeys: [],
          ddl: 'CREATE TABLE posts (id INT PRIMARY KEY, user_id INT, title VARCHAR(255))'
        }
      ],
      relationships: [
        {
          from: 'posts',
          to: 'users',
          fromColumn: 'user_id',
          toColumn: 'id',
          constraintName: 'fk_posts_users',
        },
      ],
      layout: {
        entities: {
          users: { position: { x: 100, y: 100 } },
          posts: { position: { x: 300, y: 100 } },
        },
      },
    };

    infrastructure.setupMockData({
      networkResponses: {
        '/api/er-data': {
          data: erData,
          status: 200,
          statusText: 'OK',
          headers: {}
        },
      },
    });

    // アプリケーションを初期化してデータをロード
    const app = new ERViewerApplication(infrastructure);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const highlightedElements = [
      infrastructure.dom.createElement('path'),
      infrastructure.dom.createElement('g'),
      infrastructure.dom.createElement('g'),
      infrastructure.dom.createElement('text'),
      infrastructure.dom.createElement('text'),
    ];

    infrastructure.dom.querySelectorAll = jest.fn((selector: string) => {
      if (selector === '.highlighted') return highlightedElements;
      return [];
    });

    const highlightLayer = infrastructure.dom.createElement('g');
    infrastructure.dom.getElementById = jest.fn((id: string) => {
      if (id === 'highlight-layer') return highlightLayer;
      if (id === 'er-canvas') return infrastructure.dom.getElementById('er-canvas');
      return null;
    });

    // closest が null を返すようにモック（エンティティでもない）
    infrastructure.dom.closest = jest.fn(() => null);

    // hasClass が false を返すようにモック（リレーションでもない）
    infrastructure.dom.hasClass = jest.fn(() => false);

    // Act - mousemoveイベントをシミュレート
    const mouseEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
    Object.defineProperty(mouseEvent, 'target', { value: infrastructure.dom.createElement('svg'), writable: false });
    
    // handleCanvasMouseMove を直接呼び出す
    (app as any).handleCanvasMouseMove(mouseEvent);

    // Assert - すべてのハイライトがクリアされる
    highlightedElements.forEach((element) => {
      expect(removeClassSpy).toHaveBeenCalledWith(element, 'highlighted');
    });

    // highlight-layerがクリアされる
    expect(setInnerHTMLSpy).toHaveBeenCalledWith(highlightLayer, '');
  });
});