/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportViewModel } from '../../src/utils/exportViewModel';
import type { ViewModel } from '../../src/api/client';

describe('exportViewModel', () => {
  // DOM APIのモック
  let createElementSpy: any;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;
  let appendChildSpy: any;
  let removeChildSpy: any;
  let clickSpy: any;
  let capturedBlobContent: string = '';
  let OriginalBlob: typeof Blob;
  
  beforeEach(() => {
    // Blobコンストラクタのモック
    OriginalBlob = global.Blob;
    
    // Blobコンストラクタを関数としてモック
    global.Blob = class MockBlob extends OriginalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        // parts配列の内容を取得
        if (parts && parts.length > 0) {
          capturedBlobContent = parts[0] as string;
        }
      }
    } as any;
    
    // document.createElement のモック
    clickSpy = vi.fn();
    const mockLink = {
      href: '',
      download: '',
      click: clickSpy,
    };
    
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    
    // URL.createObjectURL のモック
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    
    // URL.revokeObjectURL のモック
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    
    // document.body.appendChild のモック
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    
    // document.body.removeChild のモック
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });
  
  afterEach(() => {
    global.Blob = OriginalBlob;
    vi.restoreAllMocks();
    capturedBlobContent = '';
  });
  
  it('should export ViewModel with correct structure', () => {
    const mockViewModel: ViewModel = {
      format: 'er-diagram-viewer',
      version: '1.0.0',
      erDiagram: {
        nodes: {
          'node1': { id: 'node1', name: 'users', x: 100, y: 200, width: 150, height: 100, columns: {} }
        },
        edges: {},
        rectangles: {},
        texts: {},
        index: { entities: {}, columns: {} },
        history: { past: [], future: [] },
        ui: {
          hover: { kind: 'node', id: 'node1' },
          highlightedNodeIds: ['node1'],
          highlightedEdgeIds: ['edge1'],
          highlightedColumnIds: ['col1'],
          layerOrder: ['node1'],
          isDraggingEntity: true,
        },
        loading: true,
      },
      ui: {
        selectedItem: { kind: 'rectangle', id: 'rect1' },
        showBuildInfoModal: true,
        showLayerPanel: true,
        showDatabaseConnectionModal: true,
        showHistoryPanel: true,
        layoutOptimization: {
          isRunning: true,
          progress: 50,
          currentStage: 'processing',
        },
      },
      buildInfo: {
        data: { version: '1.0.0', buildDate: '2024-01-01' },
        loading: true,
        error: 'some error',
      },
      settings: {
        lastDatabaseConnection: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          ssl: false,
        }
      },
    };
    
    exportViewModel(mockViewModel);
    
    // createObjectURL が呼ばれたことを確認
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    
    // 渡された Blob の内容を確認
    const blobArg = createObjectURLSpy.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');
  });
  
  it('should initialize temporary UI state', () => {
    const mockViewModel: ViewModel = {
      format: 'er-diagram-viewer',
      version: '1.0.0',
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        texts: {},
        index: { entities: {}, columns: {} },
        history: { past: [], future: [] },
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: [],
          isDraggingEntity: false,
        },
        loading: false,
      },
      ui: {
        selectedItem: { kind: 'rectangle', id: 'rect1' },
        showBuildInfoModal: true,
        showLayerPanel: true,
        showDatabaseConnectionModal: true,
        showHistoryPanel: true,
        layoutOptimization: {
          isRunning: true,
          progress: 50,
          currentStage: 'processing',
        },
      },
      buildInfo: {
        data: null,
        loading: false,
        error: null,
      },
      settings: null,
    };
    
    exportViewModel(mockViewModel);
    
    // キャプチャしたBlob内容を検証
    const exportedData = JSON.parse(capturedBlobContent);
    
    // UI状態が初期化されていることを確認
    expect(exportedData.ui.selectedItem).toBeNull();
    expect(exportedData.ui.showBuildInfoModal).toBe(false);
    expect(exportedData.ui.showLayerPanel).toBe(false);
    expect(exportedData.ui.showDatabaseConnectionModal).toBe(false);
    expect(exportedData.ui.showHistoryPanel).toBe(false);
    expect(exportedData.ui.layoutOptimization.isRunning).toBe(false);
    expect(exportedData.ui.layoutOptimization.progress).toBe(0);
    expect(exportedData.ui.layoutOptimization.currentStage).toBeNull();
  });
  
  it('should initialize cache state', () => {
    const mockViewModel: ViewModel = {
      format: 'er-diagram-viewer',
      version: '1.0.0',
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        texts: {},
        index: { entities: {}, columns: {} },
        history: { past: [], future: [] },
        ui: {
          hover: { kind: 'node', id: 'node1' },
          highlightedNodeIds: ['node1'],
          highlightedEdgeIds: ['edge1'],
          highlightedColumnIds: ['col1'],
          layerOrder: [],
          isDraggingEntity: true,
        },
        loading: true,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
        showHistoryPanel: false,
        layoutOptimization: {
          isRunning: false,
          progress: 0,
          currentStage: null,
        },
      },
      buildInfo: {
        data: null,
        loading: false,
        error: null,
      },
      settings: null,
    };
    
    exportViewModel(mockViewModel);
    
    // キャプチャしたBlob内容を検証
    const exportedData = JSON.parse(capturedBlobContent);
    
    // キャッシュ状態が初期化されていることを確認
    expect(exportedData.erDiagram.ui.hover).toBeNull();
    expect(exportedData.erDiagram.ui.highlightedNodeIds).toEqual([]);
    expect(exportedData.erDiagram.ui.highlightedEdgeIds).toEqual([]);
    expect(exportedData.erDiagram.ui.highlightedColumnIds).toEqual([]);
    expect(exportedData.erDiagram.ui.isDraggingEntity).toBe(false);
    expect(exportedData.erDiagram.loading).toBe(false);
  });
  
  it('should maintain data that should be preserved', () => {
    const mockViewModel: ViewModel = {
      format: 'er-diagram-viewer',
      version: '1.0.0',
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        texts: {},
        index: { entities: {}, columns: {} },
        history: { 
          past: [{ action: 'add', data: 'test' }], 
          future: [{ action: 'remove', data: 'test2' }] 
        },
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: ['node1', 'node2', 'node3'],
          isDraggingEntity: false,
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
        showHistoryPanel: false,
        layoutOptimization: {
          isRunning: false,
          progress: 0,
          currentStage: null,
        },
      },
      buildInfo: {
        data: null,
        loading: false,
        error: null,
      },
      settings: {
        lastDatabaseConnection: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'user',
          ssl: false,
        }
      },
    };
    
    exportViewModel(mockViewModel);
    
    // キャプチャしたBlob内容を検証
    const exportedData = JSON.parse(capturedBlobContent);
    
    // 維持すべきデータが維持されていることを確認
    expect(exportedData.erDiagram.ui.layerOrder).toEqual(['node1', 'node2', 'node3']);
    expect(exportedData.erDiagram.history).toEqual({
      past: [{ action: 'add', data: 'test' }],
      future: [{ action: 'remove', data: 'test2' }]
    });
    expect(exportedData.settings).toEqual({
      lastDatabaseConnection: {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        ssl: false,
      }
    });
  });
  
  it('should generate JSON string', () => {
    const mockViewModel: ViewModel = {
      format: 'er-diagram-viewer',
      version: '1.0.0',
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        texts: {},
        index: { entities: {}, columns: {} },
        history: { past: [], future: [] },
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: [],
          isDraggingEntity: false,
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
        showHistoryPanel: false,
        layoutOptimization: {
          isRunning: false,
          progress: 0,
          currentStage: null,
        },
      },
      buildInfo: {
        data: null,
        loading: false,
        error: null,
      },
      settings: null,
    };
    
    exportViewModel(mockViewModel);
    
    // Blob が作成されたことを確認
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');
    
    // DOM操作が正しく行われたことを確認
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
  
  it('should generate correct file name format', () => {
    const mockViewModel: ViewModel = {
      format: 'er-diagram-viewer',
      version: '1.0.0',
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        texts: {},
        index: { entities: {}, columns: {} },
        history: { past: [], future: [] },
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: [],
          isDraggingEntity: false,
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
        showHistoryPanel: false,
        layoutOptimization: {
          isRunning: false,
          progress: 0,
          currentStage: null,
        },
      },
      buildInfo: {
        data: null,
        loading: false,
        error: null,
      },
      settings: null,
    };
    
    exportViewModel(mockViewModel);
    
    // リンク要素の download 属性を確認
    const mockLink = createElementSpy.mock.results[0].value;
    expect(mockLink.download).toMatch(/^relavue-er-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
