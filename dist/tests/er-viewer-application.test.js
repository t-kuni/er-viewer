/**
 * ER Viewer Application E2E Style Tests
 * モックされたインフラストラクチャーを使用してアプリケーション全体をテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
// テスト用タイプ
describe('ERViewerApplication E2E Tests', () => {
    let app; // Using any to access private methods for testing
    let infrastructure;
    beforeEach(() => {
        // モックインフラストラクチャーを作成
        infrastructure = new InfrastructureMock();
        // サンプルERデータを設定
        const mockERData = {
            entities: [
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
                        { name: 'name', type: 'varchar(255)', key: '', nullable: false, default: null, extra: '' },
                        { name: 'email', type: 'varchar(255)', key: 'UNI', nullable: false, default: null, extra: '' },
                    ],
                    foreignKeys: [],
                    ddl: '',
                },
                {
                    name: 'posts',
                    columns: [
                        { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
                        { name: 'title', type: 'varchar(255)', key: '', nullable: false, default: null, extra: '' },
                        { name: 'content', type: 'text', key: '', nullable: false, default: null, extra: '' },
                        { name: 'user_id', type: 'int', key: 'MUL', nullable: false, default: null, extra: '' },
                    ],
                    foreignKeys: [],
                    ddl: '',
                },
            ],
            relationships: [
                {
                    from: 'posts',
                    fromColumn: 'user_id',
                    to: 'users',
                    toColumn: 'id',
                    constraintName: 'posts_user_id_fkey',
                },
            ],
            layout: {
                entities: {
                    users: { position: { x: 100, y: 100 } },
                    posts: { position: { x: 350, y: 100 } },
                },
                rectangles: [],
                texts: [],
                layers: [],
            },
        };
        // モックネットワーク応答を設定
        const mockData = {
            networkResponses: {
                '/api/er-data': {
                    status: 200,
                    data: mockERData,
                },
                '/api/table/users/ddl': {
                    status: 200,
                    data: { ddl: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE);' },
                },
                '/api/reverse-engineer': {
                    status: 200,
                    data: mockERData,
                },
                '/api/layout': {
                    status: 200,
                    data: { success: true },
                },
            },
            promptResponses: ['テストテキスト'],
            confirmResponses: [true],
        };
        infrastructure.setupMockData(mockData);
        // アプリケーションを初期化
        app = new ERViewerApplication(infrastructure);
    });
    afterEach(() => {
        infrastructure.clearHistory();
    });
    describe('初期化', () => {
        test('アプリケーションが正常に初期化される', () => {
            expect(app).toBeDefined();
            expect(app.state).toBeDefined();
            expect(app.state.canvas).toBeDefined();
            expect(app.state.sidebar).toBeDefined();
        });
        test('初期データがロードされる', async () => {
            // アプリケーションの初期化を待つ
            await new Promise((resolve) => setTimeout(resolve, 0));
            const history = infrastructure.getInteractionHistory();
            const requests = history.networkRequests;
            expect(requests.some((req) => req.url === '/api/er-data')).toBe(true);
            expect(app.state.erData).toBeDefined();
            expect(app.state.erData?.entities).toHaveLength(2);
        });
        test('キャンバスが正しく初期化される', () => {
            const canvas = infrastructure.dom.getElementById('er-canvas');
            expect(canvas).toBeDefined();
            expect(canvas.getAttribute('width')).toBe('800');
            expect(canvas.getAttribute('height')).toBe('600');
        });
    });
    describe('エンティティの表示', () => {
        beforeEach(async () => {
            // 初期化を待つ
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        test('エンティティが正しく描画される', () => {
            app.render();
            // エンティティがキャンバスに描画されることを確認
            const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer');
            expect(dynamicLayer).toBeDefined();
            // エンティティ要素が作成されることを確認
            const entityElements = dynamicLayer.children.filter((child) => child.getAttribute && child.getAttribute('class') === 'entity draggable');
            expect(entityElements.length).toBeGreaterThan(0);
        });
        test('エンティティクリックでテーブル詳細が表示される', async () => {
            app.render();
            // usersエンティティをクリック
            app.showTableDetails('users');
            // ネットワークリクエストが送信されることを確認
            await new Promise((resolve) => setTimeout(resolve, 0));
            const history = infrastructure.getInteractionHistory();
            const requests = history.networkRequests;
            expect(requests.some((req) => req.url === '/api/table/users/ddl')).toBe(true);
            expect(app.state.sidebarVisible).toBe(true);
            expect(app.state.currentTable).toBe('users');
        });
        test('リレーションシップが正しく描画される - dynamicLayer.children.filter エラー修正', () => {
            app.render();
            // エンティティがレンダリングされていることを確認
            const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer');
            expect(dynamicLayer).toBeDefined();
            // dynamicLayer.children.filter is not a function エラーが発生しないことを確認
            expect(() => {
                app.renderRelationships();
            }).not.toThrow();
            // リレーションシップグループが存在することを確認
            // dynamicLayer.children が HTMLCollection または NodeList の場合、
            // Array.from() を使用して配列に変換する必要がある
            const childrenArray = Array.from(dynamicLayer.children);
            const relationshipGroups = childrenArray.filter((child) => child.getAttribute && child.getAttribute('class') === 'relationships');
            expect(relationshipGroups.length).toBeGreaterThan(0);
            // 具体的なリレーションシップパスが存在することを確認
            const relationshipGroup = relationshipGroups[0];
            const pathElements = relationshipGroup
                ? Array.from(relationshipGroup.children).filter((child) => child.tagName === 'path' && child.getAttribute('class') === 'relationship')
                : [];
            expect(pathElements.length).toBeGreaterThan(0);
            // パスにデータ属性が設定されていることを確認
            const firstPath = pathElements[0];
            expect(firstPath.getAttribute('data-from-table')).toBe('posts');
            expect(firstPath.getAttribute('data-to-table')).toBe('users');
        });
        test('エンティティバウンドが正しく設定される', () => {
            app.render();
            // エンティティバウンドが設定されていることを確認
            expect(app.state.entityBounds.has('users')).toBe(true);
            expect(app.state.entityBounds.has('posts')).toBe(true);
            const usersBounds = app.state.entityBounds.get('users');
            expect(usersBounds).toBeDefined();
            expect(usersBounds?.x).toBeDefined();
            expect(usersBounds?.y).toBeDefined();
            expect(usersBounds?.width).toBeDefined();
            expect(usersBounds?.height).toBeDefined();
        });
        test('リレーションシップレンダリングの詳細検証', () => {
            // ERデータにリレーションシップが含まれていることを確認
            expect(app.state.erData?.relationships).toBeDefined();
            expect(app.state.erData?.relationships?.length).toBe(1);
            const relationship = app.state.erData?.relationships?.[0];
            expect(relationship?.from).toBe('posts');
            expect(relationship?.to).toBe('users');
            app.render();
            // dynamic-layerの内容を詳細確認
            const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer');
            console.log('Dynamic layer children count:', dynamicLayer.children.length);
            // 各子要素をチェック
            dynamicLayer.children.forEach((child, index) => {
                console.log(`Child ${index}:`, {
                    tagName: child.tagName,
                    className: child.getAttribute('class'),
                    id: child.getAttribute('id'),
                });
            });
            // relationshipsグループが正しく挿入されているか確認
            const relationshipGroups = dynamicLayer.children.filter((child) => child.getAttribute && child.getAttribute('class') === 'relationships');
            if (relationshipGroups.length === 0) {
                console.log('No relationship groups found');
                console.log('Available children classes:', dynamicLayer.children.map((child) => child.getAttribute('class')));
            }
            expect(relationshipGroups.length).toBeGreaterThan(0);
        });
        test('リレーションシップパスの座標が正しく計算される', () => {
            app.render();
            // エンティティバウンドを確認
            const usersBounds = app.state.entityBounds.get('users');
            const postsBounds = app.state.entityBounds.get('posts');
            console.log('Users bounds:', usersBounds);
            console.log('Posts bounds:', postsBounds);
            // リレーションシップパスのd属性を確認
            const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer');
            const relationshipGroups = dynamicLayer.children.filter((child) => child.getAttribute && child.getAttribute('class') === 'relationships');
            expect(relationshipGroups.length).toBe(1);
            const relationshipGroup = relationshipGroups[0];
            const pathElements = relationshipGroup
                ? relationshipGroup.children.filter((child) => child.tagName === 'path' && child.getAttribute('class') === 'relationship')
                : [];
            expect(pathElements.length).toBe(1);
            const path = pathElements[0];
            const dAttribute = path.getAttribute('d');
            expect(dAttribute).toBeDefined();
            // パスが有効な座標を持っているか確認
            expect(dAttribute).toMatch(/^M [\d.]+\s+[\d.]+\s+L\s+[\d.]+\s+[\d.]+$/);
            expect(path.getAttribute('stroke')).toBe('#666');
            expect(path.getAttribute('stroke-width')).toBe('2');
        });
    });
    describe('エンティティのドラッグ操作', () => {
        beforeEach(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
            app.render();
        });
        test('エンティティをドラッグできる', () => {
            // usersエンティティの要素を取得
            const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer');
            const userEntity = dynamicLayer.children.find((child) => child.getAttribute && child.getAttribute('data-table-name') === 'users');
            expect(userEntity).toBeDefined();
            // ドラッグ開始
            app.startEntityDrag(userEntity, { x: 150, y: 150 });
            expect(app.state.interactionMode).toBe('dragging');
            expect(app.state.dragState).toBeDefined();
            expect(app.state.dragState?.type).toBe('entity');
            expect(app.state.dragState?.tableName).toBe('users');
        });
        test('エンティティドラッグでレイアウトが更新される', () => {
            const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer');
            const userEntity = dynamicLayer.children.find((child) => child.getAttribute && child.getAttribute('data-table-name') === 'users');
            // ドラッグ操作
            app.startEntityDrag(userEntity, { x: 100, y: 100 });
            // マウス移動をシミュレート
            const mockEvent = {
                clientX: 250,
                clientY: 250,
            };
            app.updateDrag(mockEvent);
            app.endInteraction();
            // レイアウトデータが更新されることを確認
            expect(app.state.layoutData.entities.users).toBeDefined();
        });
    });
    describe('注釈機能', () => {
        beforeEach(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        test('矩形注釈を追加できる', () => {
            const initialRectCount = app.state.layoutData.rectangles.length;
            app.addRectangleAtPosition(200, 200);
            expect(app.state.layoutData.rectangles.length).toBe(initialRectCount + 1);
            const newRect = app.state.layoutData.rectangles[app.state.layoutData.rectangles.length - 1];
            expect(newRect.x).toBe(200);
            expect(newRect.y).toBe(200);
            expect(newRect.width).toBe(100);
            expect(newRect.height).toBe(60);
        });
        test('テキスト注釈を追加できる', () => {
            const initialTextCount = app.state.layoutData.texts.length;
            app.addTextAtPosition(300, 300);
            expect(app.state.layoutData.texts.length).toBe(initialTextCount + 1);
            const newText = app.state.layoutData.texts[app.state.layoutData.texts.length - 1];
            expect(newText.x).toBe(300);
            expect(newText.y).toBe(300);
            expect(newText.content).toBe('テストテキスト');
        });
    });
    describe('ビューポート操作', () => {
        beforeEach(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        test('パン操作でビューポートが更新される', () => {
            const initialPanX = app.state.viewport.panX;
            const initialPanY = app.state.viewport.panY;
            app.startPan(100, 100);
            // マウス移動をシミュレート
            const mockEvent = {
                clientX: 150,
                clientY: 150,
            };
            app.updatePan(mockEvent);
            expect(app.state.viewport.panX).toBe(initialPanX + 50);
            expect(app.state.viewport.panY).toBe(initialPanY + 50);
        });
        test('ズーム操作でスケールが更新される', () => {
            const mockWheelEvent = {
                preventDefault: jest.fn(),
                clientX: 400,
                clientY: 300,
                deltaY: -100,
            };
            const initialScale = app.state.viewport.scale;
            app.handleCanvasWheel(mockWheelEvent);
            expect(app.state.viewport.scale).toBeGreaterThan(initialScale);
            expect(mockWheelEvent.preventDefault).toHaveBeenCalled();
        });
    });
    describe('データ永続化', () => {
        beforeEach(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        test('レイアウト保存が正常に動作する', async () => {
            await app.saveLayout();
            const history = infrastructure.getInteractionHistory();
            const requests = history.networkRequests;
            expect(requests.some((req) => req.url === '/api/layout')).toBe(true);
        });
        test('リバースエンジニアリングが正常に動作する', async () => {
            await app.reverseEngineer();
            const history = infrastructure.getInteractionHistory();
            const requests = history.networkRequests;
            expect(requests.some((req) => req.url === '/api/reverse-engineer')).toBe(true);
        });
    });
    describe('UI操作', () => {
        beforeEach(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        test('サイドバーの開閉が正常に動作する', async () => {
            // サイドバーを開く
            await app.showTableDetails('users');
            expect(app.state.sidebarVisible).toBe(true);
            // サイドバーを閉じる
            app.closeSidebar();
            expect(app.state.sidebarVisible).toBe(false);
        });
        test('コンテキストメニューが表示される', () => {
            app.showContextMenu(200, 200, { x: 100, y: 100 }, null);
            expect(app.state.contextMenu).toBeDefined();
            app.hideContextMenu();
            expect(app.state.contextMenu).toBeNull();
        });
        test('ローディング表示が正常に動作する', () => {
            app.showLoading('テスト中...');
            const loadingElement = infrastructure.dom.getElementById('loading-overlay');
            expect(loadingElement).toBeDefined();
            expect(loadingElement?.textContent).toBe('テスト中...');
            app.hideLoading();
            const removedElement = infrastructure.dom.getElementById('loading-overlay');
            expect(removedElement).toBeNull();
        });
    });
    describe('状態管理', () => {
        test('状態の変更が正しく通知される', () => {
            const subscriber = jest.fn();
            app.subscribe(subscriber);
            const newViewport = { panX: 10, panY: 20, scale: 1.5 };
            app.setState({ viewport: newViewport });
            expect(subscriber).toHaveBeenCalled();
            expect(app.state.viewport).toEqual(newViewport);
        });
        test('プロパティ変更の監視が正常に動作する', () => {
            const propertySubscriber = jest.fn();
            app.subscribeToProperty('viewport', propertySubscriber);
            const oldViewport = app.state.viewport;
            const newViewport = { panX: 100, panY: 100, scale: 2 };
            app.setState({ viewport: newViewport });
            expect(propertySubscriber).toHaveBeenCalledWith(oldViewport, newViewport);
        });
        test('ヒストリー機能が正常に動作する', () => {
            const initialHistoryLength = app.state.history.length;
            // レイアウトデータを変更（ヒストリーに保存される）
            app.setState({ layoutData: { entities: {}, rectangles: [], texts: [], layers: [] } });
            expect(app.state.history.length).toBeGreaterThan(initialHistoryLength);
        });
    });
    describe('エラーハンドリング', () => {
        test('ネットワークエラーが適切に処理される', async () => {
            // エラーレスポンスを設定
            infrastructure.network.setMockResponse('/api/er-data', {
                status: 500,
                statusText: 'Internal Server Error',
            });
            await app.loadERData();
            expect(app.state.error).toBeDefined();
            expect(app.state.loading).toBe(false);
        });
        test('無効なテーブル名でのDDL取得エラーが処理される', async () => {
            infrastructure.setupMockData({
                networkResponses: {
                    '/api/table/invalid/ddl': {
                        status: 404,
                        statusText: 'Not Found',
                    },
                },
            });
            await app.showTableDetails('invalid');
            const history = infrastructure.getInteractionHistory();
            expect(history.errors.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=er-viewer-application.test.js.map