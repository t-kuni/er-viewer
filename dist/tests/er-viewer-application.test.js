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
            // 配列操作を使わずに最初のリクエストを確認
            expect(requests.length).toBeGreaterThan(0);
            // Network操作の詳細検証
            const firstRequest = requests[0];
            expect(firstRequest.url).toBe('/api/er-data');
            expect(firstRequest.method).toBe('GET');
            expect(firstRequest.headers).toBeDefined();
            expect(firstRequest.timestamp).toBeDefined();
            // レスポンスの検証
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
    describe('エンティティレンダリング', () => {
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
            // 配列操作を使わずにentity draggableクラスを持つ要素を検索
            expect(dynamicLayer.children.length).toBeGreaterThan(1);
            // 2番目の要素がusersエンティティであることを期待（最初はrelationshipsグループ）
            const secondChild = dynamicLayer.children[1];
            expect(secondChild.getAttribute('class')).toBe('entity draggable');
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
    });
    describe('エンティティインタラクション', () => {
        beforeEach(async () => {
            // 初期化を待つ
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        test('エンティティクリックでテーブル詳細が表示される', async () => {
            // DOM操作をスパイ
            const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
            const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
            app.render();
            // usersエンティティをクリック
            app.showTableDetails('users');
            // ネットワークリクエストが送信されることを確認
            await new Promise((resolve) => setTimeout(resolve, 0));
            const history = infrastructure.getInteractionHistory();
            const requests = history.networkRequests;
            // 配列操作を使わずに最後のリクエストを確認
            expect(requests.length).toBeGreaterThan(0);
            // Network操作の詳細検証
            const ddlRequest = requests[requests.length - 1];
            expect(ddlRequest.url).toBe('/api/table/users/ddl');
            expect(ddlRequest.method).toBe('GET');
            expect(ddlRequest.headers).toBeDefined();
            expect(ddlRequest.body).toBeUndefined(); // GETリクエストなのでbodyは無い
            // DOM操作のMock検証
            expect(removeClassSpy).toHaveBeenCalledWith(expect.anything(), 'hidden');
            expect(setInnerHTMLSpy).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('<h2>users</h2>'));
        });
    });
    describe('リレーションシップレンダリング', () => {
        beforeEach(async () => {
            // 初期化を待つ
            await new Promise((resolve) => setTimeout(resolve, 0));
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
            // dynamicLayerの最初の子要素がrelationshipsグループであることを期待
            expect(dynamicLayer.children.length).toBeGreaterThan(0);
            const relationshipGroup = dynamicLayer.children[0];
            expect(relationshipGroup.getAttribute('class')).toBe('relationships');
            // 具体的なリレーションシップパスが存在することを確認
            expect(relationshipGroup.children.length).toBeGreaterThan(0);
            const firstPath = relationshipGroup.children[0];
            expect(firstPath.tagName).toBe('path');
            expect(firstPath.getAttribute('class')).toBe('relationship');
            expect(firstPath.getAttribute('data-from-table')).toBe('posts');
            expect(firstPath.getAttribute('data-to-table')).toBe('users');
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
            expect(dynamicLayer.children.length).toBeGreaterThan(0);
            // relationshipsグループが最初の子要素であることを期待
            const firstChild = dynamicLayer.children[0];
            expect(firstChild.getAttribute('class')).toBe('relationships');
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
            // relationshipsグループが最初の子要素であることを期待
            expect(dynamicLayer.children.length).toBeGreaterThan(0);
            const relationshipGroup = dynamicLayer.children[0];
            expect(relationshipGroup.getAttribute('class')).toBe('relationships');
            // path要素が最初の子要素であることを期待
            expect(relationshipGroup.children.length).toBeGreaterThan(0);
            const path = relationshipGroup.children[0];
            expect(path.tagName).toBe('path');
            expect(path.getAttribute('class')).toBe('relationship');
            const dAttribute = path.getAttribute('d');
            expect(dAttribute).toBeDefined();
            // パスが有効な座標を持っているか確認
            expect(dAttribute).toMatch(/^M [\d.]+\s+[\d.]+\s+L\s+[\d.]+\s+[\d.]+$/);
            expect(path.getAttribute('stroke')).toBe('#666');
            expect(path.getAttribute('stroke-width')).toBe('2');
        });
    });
    describe('エンティティのドラッグ操作', () => {
        test('エンティティをドラッグできる', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
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
                ],
                relationships: [],
                layout: {
                    entities: {
                        users: { position: { x: 100, y: 100 } },
                    },
                    rectangles: [],
                    texts: [],
                    layers: [],
                },
            };
            infrastructure.setupMockData({
                networkResponses: {
                    '/api/er-data': {
                        status: 200,
                        data: mockERData,
                    },
                },
            });
            const app = new ERViewerApplication(infrastructure);
            await new Promise((resolve) => setTimeout(resolve, 0));
            app.render();
            // DOM操作をスパイ
            const getAttributeSpy = jest.spyOn(infrastructure.dom, 'getAttribute');
            // Act
            const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer');
            // usersエンティティは2番目の子要素であることを期待（最初はrelationshipsグループ）
            expect(dynamicLayer.children.length).toBeGreaterThan(1);
            const userEntity = dynamicLayer.children[1];
            expect(userEntity.getAttribute('data-table-name')).toBe('users');
            app.startEntityDrag(userEntity, { x: 150, y: 150 });
            // Assert - ドラッグ開始時のDOM属性読み取りを検証
            expect(getAttributeSpy).toHaveBeenCalledWith(userEntity, 'data-table-name');
            expect(getAttributeSpy).toHaveBeenCalledWith(userEntity, 'transform');
        });
        test('エンティティドラッグでレイアウトが更新される', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
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
                ],
                relationships: [],
                layout: {
                    entities: {
                        users: { position: { x: 100, y: 100 } },
                    },
                    rectangles: [],
                    texts: [],
                    layers: [],
                },
            };
            infrastructure.setupMockData({
                networkResponses: {
                    '/api/er-data': {
                        status: 200,
                        data: mockERData,
                    },
                },
            });
            const app = new ERViewerApplication(infrastructure);
            await new Promise((resolve) => setTimeout(resolve, 0));
            app.render();
            // DOM操作をスパイ
            const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
            const mockEvent = {
                clientX: 250,
                clientY: 250,
            };
            // Act
            const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer');
            // usersエンティティは2番目の子要素であることを期待（最初はrelationshipsグループ）
            expect(dynamicLayer.children.length).toBeGreaterThan(1);
            const userEntity = dynamicLayer.children[1];
            expect(userEntity.getAttribute('data-table-name')).toBe('users');
            app.startEntityDrag(userEntity, { x: 100, y: 100 });
            app.updateDrag(mockEvent);
            app.endInteraction();
            // Assert - transform属性の更新を検証
            expect(setAttributeSpy).toHaveBeenCalledWith(userEntity, 'transform', expect.stringMatching(/translate\(\d+(?:\.\d+)?,\s*\d+(?:\.\d+)?\)/));
        });
    });
    describe('注釈機能', () => {
        test('矩形注釈を追加できる', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            const initialRectCount = app.state.layoutData.rectangles.length;
            // Act
            app.addRectangleAtPosition(200, 200);
            // Assert
            expect(app.state.layoutData.rectangles.length).toBe(initialRectCount + 1);
            const newRect = app.state.layoutData.rectangles[app.state.layoutData.rectangles.length - 1];
            expect(newRect.x).toBe(200);
            expect(newRect.y).toBe(200);
            expect(newRect.width).toBe(100);
            expect(newRect.height).toBe(60);
        });
        test('テキスト注釈を追加できる', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const mockData = {
                promptResponses: ['テストテキスト'], // prompt応答をセットアップ
            };
            infrastructure.setupMockData(mockData);
            const app = new ERViewerApplication(infrastructure);
            const initialTextCount = app.state.layoutData.texts.length;
            // BrowserAPI操作をスパイ
            const promptSpy = jest.spyOn(infrastructure.browserAPI, 'prompt');
            // Act
            app.addTextAtPosition(300, 300);
            // Assert - BrowserAPI Mock検証
            expect(promptSpy).toHaveBeenCalledWith('テキストを入力してください:');
            expect(promptSpy).toHaveBeenCalledTimes(1);
            // BrowserAPI呼び出し履歴の詳細検証
            const prompts = infrastructure.browserAPI.getPrompts();
            expect(prompts.length).toBe(1);
            expect(prompts[0].message).toBe('テキストを入力してください:');
            expect(prompts[0].response).toBe('テストテキスト');
            expect(prompts[0].timestamp).toBeDefined();
            // レイアウトデータの検証
            expect(app.state.layoutData.texts.length).toBe(initialTextCount + 1);
            const newText = app.state.layoutData.texts[app.state.layoutData.texts.length - 1];
            expect(newText.x).toBe(300);
            expect(newText.y).toBe(300);
            expect(newText.content).toBe('テストテキスト');
        });
        test('テキスト注釈追加をキャンセルできる', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const mockData = {
                promptResponses: [null], // promptがキャンセルされた場合
            };
            infrastructure.setupMockData(mockData);
            const app = new ERViewerApplication(infrastructure);
            const initialTextCount = app.state.layoutData.texts.length;
            // BrowserAPI操作をスパイ
            const promptSpy = jest.spyOn(infrastructure.browserAPI, 'prompt');
            // Act
            app.addTextAtPosition(400, 400);
            // Assert - BrowserAPI Mock検証
            expect(promptSpy).toHaveBeenCalledWith('テキストを入力してください:');
            expect(promptSpy).toHaveBeenCalledTimes(1);
            // BrowserAPI呼び出し履歴の詳細検証
            const prompts = infrastructure.browserAPI.getPrompts();
            expect(prompts.length).toBe(1);
            expect(prompts[0].message).toBe('テキストを入力してください:');
            expect(prompts[0].response).toBeNull(); // nullが正しく処理される
            expect(prompts[0].timestamp).toBeDefined();
            // レイアウトデータは変更されていないことを検証
            expect(app.state.layoutData.texts.length).toBe(initialTextCount);
        });
    });
    describe('ビューポート操作', () => {
        test('パン操作でビューポートが更新される', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            // DOM操作をスパイ
            const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
            const mockEvent = {
                clientX: 150,
                clientY: 150,
            };
            // Act
            app.startPan(100, 100);
            app.updatePan(mockEvent);
            app.render(); // パン操作後の再描画
            // Assert - transform属性の更新を検証
            expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'transform', expect.stringContaining('translate'));
        });
        test('ズーム操作でスケールが更新される', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            // DOM操作をスパイ
            const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
            const mockWheelEvent = {
                preventDefault: jest.fn(),
                clientX: 400,
                clientY: 300,
                deltaY: -100,
            };
            // Act
            app.handleCanvasWheel(mockWheelEvent);
            app.render(); // ズーム操作後の再描画
            // Assert
            expect(mockWheelEvent.preventDefault).toHaveBeenCalled();
            // transform属性の更新を検証（scaleが含まれることを確認）
            expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'transform', expect.stringContaining('scale'));
        });
    });
    describe('データ永続化', () => {
        test('レイアウト保存が正常に動作する', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const mockData = {
                networkResponses: {
                    '/api/layout': {
                        status: 200,
                        data: { success: true },
                    },
                },
            };
            infrastructure.setupMockData(mockData);
            const app = new ERViewerApplication(infrastructure);
            // Act
            await app.saveLayout();
            // Assert
            const history = infrastructure.getInteractionHistory();
            const requests = history.networkRequests;
            // 配列操作を使わずにリクエストを確認
            expect(requests.length).toBeGreaterThan(0);
            // Network操作の詳細検証
            const saveRequest = requests[requests.length - 1];
            expect(saveRequest.url).toBe('/api/layout');
            expect(saveRequest.method).toBe('POST');
            expect(saveRequest.headers).toBeDefined();
            expect(saveRequest.body).toBeDefined(); // POSTリクエストなのでbodyがある
            // bodyは文字列としてエンコードされている場合があるので、パースする
            const requestBody = typeof saveRequest.body === 'string'
                ? JSON.parse(saveRequest.body)
                : saveRequest.body;
            expect(requestBody).toHaveProperty('entities');
            expect(requestBody).toHaveProperty('rectangles');
            expect(requestBody).toHaveProperty('texts');
        });
        test('リバースエンジニアリングが正常に動作する', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const mockERData = {
                entities: [
                    {
                        name: 'users',
                        columns: [
                            { name: 'id', type: 'int', key: 'PRI', nullable: false, default: null, extra: '' },
                        ],
                        foreignKeys: [],
                        ddl: '',
                    },
                ],
                relationships: [],
                layout: {
                    entities: {},
                    rectangles: [],
                    texts: [],
                    layers: [],
                },
            };
            const mockData = {
                networkResponses: {
                    '/api/reverse-engineer': {
                        status: 200,
                        data: mockERData,
                    },
                },
            };
            infrastructure.setupMockData(mockData);
            const app = new ERViewerApplication(infrastructure);
            // Act
            await app.reverseEngineer();
            // Assert
            const history = infrastructure.getInteractionHistory();
            const requests = history.networkRequests;
            // 配列操作を使わずにリクエストを確認
            expect(requests.length).toBeGreaterThan(0);
            // Network操作の詳細検証
            const reverseRequest = requests[requests.length - 1];
            expect(reverseRequest.url).toBe('/api/reverse-engineer');
            expect(reverseRequest.method).toBe('POST');
            expect(reverseRequest.headers).toBeDefined();
            expect(reverseRequest.timestamp).toBeDefined();
        });
    });
    describe('UI操作', () => {
        test('ヘルプパネルの初期化時にStorageから折りたたみ状態を読み込む', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            // Storage操作をスパイ（アプリケーション作成前に設定）
            const getItemSpy = jest.spyOn(infrastructure.storage, 'getItem');
            // Act - アプリケーションを初期化（コンストラクタ内でsetupHelpPanelEventsが呼ばれる）
            const app = new ERViewerApplication(infrastructure);
            // Assert - Storageから折りたたみ状態を読み込む
            expect(getItemSpy).toHaveBeenCalledWith('helpPanelCollapsed');
            expect(getItemSpy).toHaveBeenCalledTimes(1);
        });
        test('ヘルプパネルを展開時にStorageに状態が保存される', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            // Storage操作をスパイ
            const setItemSpy = jest.spyOn(infrastructure.storage, 'setItem');
            // helpToggleとhelpContentを取得
            const helpToggle = infrastructure.dom.getElementById('help-toggle');
            const helpContent = infrastructure.dom.getElementById('help-content');
            // ヘルプパネルを折りたたみ状態に設定
            infrastructure.dom.addClass(helpContent, 'collapsed');
            infrastructure.dom.addClass(helpToggle, 'collapsed');
            // Act - トグルボタンをクリック（展開する）
            const clickEvent = new Event('click');
            helpToggle.dispatchEvent(clickEvent);
            // Assert - Storageに展開状態（false）が保存される
            expect(setItemSpy).toHaveBeenCalledWith('helpPanelCollapsed', false);
            // Storage内容の検証
            const storageContents = infrastructure.storage.getStorageContents();
            expect(storageContents.helpPanelCollapsed).toBe('false');
        });
        test('ヘルプパネルを折りたたみ時にStorageに状態が保存される', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            // Storage操作をスパイ
            const setItemSpy = jest.spyOn(infrastructure.storage, 'setItem');
            // helpToggleとhelpContentを取得
            const helpToggle = infrastructure.dom.getElementById('help-toggle');
            const helpContent = infrastructure.dom.getElementById('help-content');
            // ヘルプパネルを展開状態に設定（collapsedクラスなし）
            infrastructure.dom.removeClass(helpContent, 'collapsed');
            infrastructure.dom.removeClass(helpToggle, 'collapsed');
            // Act - トグルボタンをクリック（折りたたむ）
            const clickEvent = new Event('click');
            helpToggle.dispatchEvent(clickEvent);
            // Assert - Storageに折りたたみ状態（true）が保存される
            expect(setItemSpy).toHaveBeenCalledWith('helpPanelCollapsed', true);
            // Storage内容の検証
            const storageContents = infrastructure.storage.getStorageContents();
            expect(storageContents.helpPanelCollapsed).toBe('true');
        });
        test('サイドバーの開閉が正常に動作する', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const mockData = {
                networkResponses: {
                    '/api/table/users/ddl': {
                        status: 200,
                        data: { ddl: 'CREATE TABLE users (id INT PRIMARY KEY);' },
                    },
                },
            };
            infrastructure.setupMockData(mockData);
            const app = new ERViewerApplication(infrastructure);
            // DOM操作をスパイ
            const removeClassSpy = jest.spyOn(infrastructure.dom, 'removeClass');
            const addClassSpy = jest.spyOn(infrastructure.dom, 'addClass');
            const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
            // Act - サイドバーを開く
            await app.showTableDetails('users');
            // Assert - サイドバー表示のDOM操作を検証
            expect(removeClassSpy).toHaveBeenCalledWith(expect.anything(), 'hidden');
            expect(setInnerHTMLSpy).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('<h2>users</h2>'));
            // Act - サイドバーを閉じる
            app.closeSidebar();
            // Assert - サイドバー非表示のDOM操作を検証
            expect(addClassSpy).toHaveBeenCalledWith(expect.anything(), 'hidden');
        });
        test('コンテキストメニューが表示される', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            // DOM操作をスパイ
            const createElementSpy = jest.spyOn(infrastructure.dom, 'createElement');
            const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
            const removeElementSpy = jest.spyOn(infrastructure.dom, 'removeElement');
            const setStylesSpy = jest.spyOn(infrastructure.dom, 'setStyles');
            // Act - コンテキストメニューを表示
            app.showContextMenu(200, 200, { x: 100, y: 100 }, null);
            // Assert - コンテキストメニュー作成のDOM操作を検証
            expect(createElementSpy).toHaveBeenCalledWith('div');
            expect(appendChildSpy).toHaveBeenCalled();
            expect(setStylesSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                position: 'fixed',
                left: '200px',
                top: '200px'
            }));
            // Act - コンテキストメニューを非表示
            app.hideContextMenu();
            // Assert - コンテキストメニュー削除のDOM操作を検証
            expect(removeElementSpy).toHaveBeenCalled();
        });
        test('ローディング表示が正常に動作する', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            // DOM操作をスパイ
            const createElementSpy = jest.spyOn(infrastructure.dom, 'createElement');
            const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
            const appendChildSpy = jest.spyOn(infrastructure.dom, 'appendChild');
            const removeElementSpy = jest.spyOn(infrastructure.dom, 'removeElement');
            const setInnerHTMLSpy = jest.spyOn(infrastructure.dom, 'setInnerHTML');
            // Act - ローディングを表示
            app.showLoading('テスト中...');
            // Assert - ローディング要素作成のDOM操作を検証
            expect(createElementSpy).toHaveBeenCalledWith('div');
            expect(setAttributeSpy).toHaveBeenCalledWith(expect.anything(), 'id', 'loading-overlay');
            expect(setInnerHTMLSpy).toHaveBeenCalledWith(expect.anything(), 'テスト中...');
            expect(appendChildSpy).toHaveBeenCalledWith(expect.anything(), expect.anything());
            // Act - ローディングを非表示
            app.hideLoading();
            // Assert - ローディング要素削除のDOM操作を検証
            expect(removeElementSpy).toHaveBeenCalled();
        });
    });
    describe('状態管理', () => {
        test('状態の変更が正しく通知される', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            const subscriber = jest.fn();
            app.subscribe(subscriber);
            const newViewport = { panX: 10, panY: 20, scale: 1.5 };
            // Act
            app.setState({ viewport: newViewport });
            // Assert
            expect(subscriber).toHaveBeenCalled();
            expect(app.state.viewport).toEqual(newViewport);
        });
        test('プロパティ変更の監視が正常に動作する', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            const propertySubscriber = jest.fn();
            app.subscribeToProperty('viewport', propertySubscriber);
            const oldViewport = app.state.viewport;
            const newViewport = { panX: 100, panY: 100, scale: 2 };
            // Act
            app.setState({ viewport: newViewport });
            // Assert
            expect(propertySubscriber).toHaveBeenCalledWith(oldViewport, newViewport);
        });
        test('ヒストリー機能が正常に動作する', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            const initialHistoryLength = app.state.history.length;
            const newLayoutData = { entities: {}, rectangles: [], texts: [], layers: [] };
            // Act
            app.setState({ layoutData: newLayoutData });
            // Assert
            expect(app.state.history.length).toBeGreaterThan(initialHistoryLength);
        });
    });
    describe('エラーハンドリング', () => {
        test('ネットワークエラーが適切に処理される', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const mockData = {
                networkResponses: {
                    '/api/er-data': {
                        status: 500,
                        statusText: 'Internal Server Error',
                    },
                },
            };
            infrastructure.setupMockData(mockData);
            const app = new ERViewerApplication(infrastructure);
            // Act
            await app.loadERData();
            // Assert - Network操作の詳細検証
            const history = infrastructure.getInteractionHistory();
            const requests = history.networkRequests;
            expect(requests.length).toBeGreaterThan(0);
            const errorRequest = requests[requests.length - 1];
            expect(errorRequest.url).toBe('/api/er-data');
            expect(errorRequest.method).toBe('GET');
            // エラー状態の検証
            expect(app.state.error).toBeDefined();
            expect(app.state.loading).toBe(false);
        });
        test('無効なテーブル名でのDDL取得エラーが処理される', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const mockData = {
                networkResponses: {
                    '/api/table/invalid/ddl': {
                        status: 404,
                        statusText: 'Not Found',
                    },
                },
            };
            infrastructure.setupMockData(mockData);
            const app = new ERViewerApplication(infrastructure);
            // Act
            await app.showTableDetails('invalid');
            // Assert
            const history = infrastructure.getInteractionHistory();
            // Network操作の詳細検証
            const requests = history.networkRequests;
            expect(requests.length).toBeGreaterThan(0);
            const notFoundRequest = requests[requests.length - 1];
            expect(notFoundRequest.url).toBe('/api/table/invalid/ddl');
            expect(notFoundRequest.method).toBe('GET');
            // エラーログの検証
            expect(history.errors.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=er-viewer-application.test.js.map