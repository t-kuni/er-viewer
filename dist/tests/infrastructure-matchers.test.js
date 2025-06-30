/**
 * Infrastructure Matchers使用例とテスト
 *
 * カスタムマッチャーの使用方法を示すサンプルテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import { setupInfrastructureMatchers } from './infrastructure-matchers';
import { createUserPostERData, createNetworkResponse } from './test-data-factory';
// カスタムマッチャーをセットアップ
setupInfrastructureMatchers();
describe('Infrastructure Matchers 使用例', () => {
    describe('DOM関連マッチャー', () => {
        test('toHaveElement - 要素の存在を検証', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            // Assert
            expect(infrastructure).toHaveElement('er-canvas');
            expect(infrastructure).toHaveElement('dynamic-layer');
            expect(infrastructure).toHaveElement('sidebar');
        });
        test('toHaveAttribute - 属性値を検証', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const app = new ERViewerApplication(infrastructure);
            const canvas = infrastructure.dom.getElementById('er-canvas');
            // Assert
            expect(canvas).toHaveAttribute('width', '800');
            expect(canvas).toHaveAttribute('height', '600');
        });
        test('toHaveClass - クラスの存在を検証', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            // モックDOM要素を直接作成してクラスをテスト
            const element = infrastructure.dom.createElement('div');
            element.setAttribute('class', 'entity draggable');
            // Assert
            expect(element).toHaveClass('entity');
            expect(element).toHaveClass('draggable');
            // 存在しないクラスのテスト
            expect(element).not.toHaveClass('selected');
        });
    });
    describe('Network関連マッチャー', () => {
        test('toHaveMadeRequest - リクエストの実行を検証', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const mockERData = createUserPostERData();
            infrastructure.setupMockData({
                networkResponses: {
                    '/api/er-data': createNetworkResponse({ data: mockERData })
                }
            });
            // Act
            const app = new ERViewerApplication(infrastructure);
            await new Promise((resolve) => setTimeout(resolve, 0));
            // Assert
            expect(infrastructure).toHaveMadeRequest('/api/er-data');
            expect(infrastructure).toHaveMadeRequest('/api/er-data', 'GET');
        });
        test('toHaveRequestedWithBody - リクエストボディを検証', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            infrastructure.setupMockData({
                networkResponses: {
                    '/api/layout': createNetworkResponse({ data: { success: true } })
                }
            });
            const app = new ERViewerApplication(infrastructure);
            // Act
            await app.saveLayout();
            // Assert - layersも含めて検証
            expect(infrastructure).toHaveRequestedWithBody('/api/layout', {
                entities: {},
                rectangles: [],
                texts: [],
                layers: []
            });
        });
    });
    describe('Storage関連マッチャー', () => {
        test('toHaveStoredItem - ストレージ保存を検証', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            // Act - ストレージに直接値を保存
            infrastructure.storage.setItem('helpPanelCollapsed', 'true');
            infrastructure.storage.setItem('userPreference', 'dark-mode');
            // Assert - 保存された値を検証
            expect(infrastructure).toHaveStoredItem('helpPanelCollapsed', 'true');
            expect(infrastructure).toHaveStoredItem('userPreference', 'dark-mode');
            // キーの存在のみをチェック（値を指定しない）
            expect(infrastructure).toHaveStoredItem('helpPanelCollapsed');
            // 存在しないキーのテスト
            expect(infrastructure).not.toHaveStoredItem('nonExistentKey');
        });
    });
    describe('DOM操作検証マッチャー', () => {
        test('toHaveSetAttribute - setAttribute呼び出しを検証', () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
            // DOM要素を作成
            const element = infrastructure.dom.createElement('div');
            element.setAttribute('id', 'test-element');
            // Act - setAttribute を直接呼び出す
            infrastructure.dom.setAttribute(element, 'data-visible', 'true');
            infrastructure.dom.setAttribute(element, 'class', 'active');
            // Assert - setAttribute呼び出しを検証
            expect(infrastructure).toHaveSetAttribute(element, 'data-visible', 'true');
            expect(infrastructure).toHaveSetAttribute('test-element', 'data-visible', 'true');
            expect(infrastructure).toHaveSetAttribute(element, 'class', 'active');
        });
    });
    describe('Error関連マッチャー', () => {
        test('toHaveLoggedError - エラーログを検証', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            infrastructure.setupMockData({
                networkResponses: {
                    '/api/er-data': { status: 500, statusText: 'Internal Server Error' }
                }
            });
            // Act - loadERDataを明示的に呼び出してエラーを発生させる
            const app = new ERViewerApplication(infrastructure);
            // loadERDataでエラーが発生することを確認
            try {
                await app.loadERData();
            }
            catch (error) {
                // エラーをキャッチ（正常な動作）
            }
            // Assert - エラーメッセージを含むログが記録されているか確認
            expect(infrastructure).toHaveLoggedError('Error loading ER data');
        });
    });
    describe('インタラクション回数マッチャー', () => {
        test('toHaveInteractionCount - インタラクション回数を検証', async () => {
            // Arrange
            const infrastructure = new InfrastructureMock();
            const mockERData = createUserPostERData();
            infrastructure.setupMockData({
                networkResponses: {
                    '/api/er-data': createNetworkResponse({ data: mockERData }),
                    '/api/reverse-engineer': createNetworkResponse({ data: mockERData })
                }
            });
            // Act
            const app = new ERViewerApplication(infrastructure);
            await new Promise((resolve) => setTimeout(resolve, 0));
            await app.reverseEngineer();
            // Assert
            expect(infrastructure).toHaveInteractionCount('network', 2);
        });
    });
});
// 既存のテストを書き換える例
describe('カスタムマッチャーを使用したテストの例', () => {
    test('従来の書き方', () => {
        // Arrange
        const infrastructure = new InfrastructureMock();
        const app = new ERViewerApplication(infrastructure);
        // 従来の検証方法
        const canvas = infrastructure.dom.getElementById('er-canvas');
        expect(canvas).toBeDefined();
        expect(canvas.getAttribute('width')).toBe('800');
        expect(canvas.getAttribute('height')).toBe('600');
    });
    test('カスタムマッチャーを使用した書き方', () => {
        // Arrange
        const infrastructure = new InfrastructureMock();
        const app = new ERViewerApplication(infrastructure);
        // カスタムマッチャーを使用した検証
        expect(infrastructure).toHaveElement('er-canvas');
        const canvas = infrastructure.dom.getElementById('er-canvas');
        expect(canvas).toHaveAttribute('width', '800');
        expect(canvas).toHaveAttribute('height', '600');
    });
    test('ネットワークリクエストの検証 - 従来', async () => {
        // Arrange
        const infrastructure = new InfrastructureMock();
        const mockERData = createUserPostERData();
        infrastructure.setupMockData({
            networkResponses: {
                '/api/er-data': createNetworkResponse({ data: mockERData })
            }
        });
        // Act
        const app = new ERViewerApplication(infrastructure);
        await new Promise((resolve) => setTimeout(resolve, 0));
        // 従来の検証方法
        const history = infrastructure.getInteractionHistory();
        const requests = history.networkRequests;
        expect(requests.length).toBeGreaterThan(0);
        expect(requests[0].url).toBe('/api/er-data');
        expect(requests[0].method).toBe('GET');
    });
    test('ネットワークリクエストの検証 - カスタムマッチャー', async () => {
        // Arrange
        const infrastructure = new InfrastructureMock();
        const mockERData = createUserPostERData();
        infrastructure.setupMockData({
            networkResponses: {
                '/api/er-data': createNetworkResponse({ data: mockERData })
            }
        });
        // Act
        const app = new ERViewerApplication(infrastructure);
        await new Promise((resolve) => setTimeout(resolve, 0));
        // カスタムマッチャーを使用した検証
        expect(infrastructure).toHaveMadeRequest('/api/er-data', 'GET');
    });
});
//# sourceMappingURL=infrastructure-matchers.test.js.map