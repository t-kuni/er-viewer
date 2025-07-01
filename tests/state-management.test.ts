/**
 * 状態管理のテスト
 */
import { ERViewerApplication } from '../public/js/er-viewer-application';
import { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';

describe('状態管理', () => {
  afterEach(() => {
    // タイマーのクリア
    jest.clearAllTimers();
    
    // 全モックのクリア
    jest.clearAllMocks();
  });

  describe('状態の変更通知', () => {
    test('状態の変更が正しく通知される', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      let app: any = new ERViewerApplication(infrastructure);
      const subscriber = jest.fn();
      app.subscribe(subscriber);
      const newViewport = { panX: 10, panY: 20, scale: 1.5 };

      // Act
      app.setState({ viewport: newViewport });

      // Assert
      expect(subscriber).toHaveBeenCalled();
      expect(app.state.viewport).toEqual(newViewport);
    });
  });

  describe('プロパティ監視', () => {
    test('プロパティ変更の監視が正常に動作する', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      let app: any = new ERViewerApplication(infrastructure);
      const propertySubscriber = jest.fn();
      app.subscribeToProperty('viewport', propertySubscriber);
      const oldViewport = app.state.viewport;
      const newViewport = { panX: 100, panY: 100, scale: 2 };

      // Act
      app.setState({ viewport: newViewport });

      // Assert
      expect(propertySubscriber).toHaveBeenCalledWith(oldViewport, newViewport);
    });
  });

  describe('ヒストリー管理', () => {
    test('ヒストリー機能が正常に動作する', () => {
      // Arrange
      const infrastructure = new InfrastructureMock();
      let app: any = new ERViewerApplication(infrastructure);
      const initialHistoryLength = app.state.history.length;
      const newLayoutData = { entities: {}, rectangles: [], texts: [], layers: [] };

      // Act
      app.setState({ layoutData: newLayoutData });

      // Assert
      expect(app.state.history.length).toBeGreaterThan(initialHistoryLength);
    });
  });
});