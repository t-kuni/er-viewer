import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  actionCopyItem,
  actionPasteItem,
  actionUpdateMousePosition,
} from '../../src/actions/clipboardActions';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
type TextBox = components['schemas']['TextBox'];
type Rectangle = components['schemas']['Rectangle'];

// crypto.randomUUID()をモック
const mockUUID = 'mock-uuid-12345';
beforeEach(() => {
  vi.stubGlobal('crypto', {
    randomUUID: () => mockUUID,
  });
});

describe('clipboardActions', () => {
  // テスト用のViewModelを作成
  const createMockViewModel = (): ViewModel => ({
    format: 'er-viewer',
    version: 1,
    erDiagram: {
      nodes: {},
      edges: {},
      rectangles: {
        'rect-1': {
          id: 'rect-1',
          x: 100,
          y: 200,
          width: 400,
          height: 300,
          fill: '#FF0000',
          fillEnabled: true,
          stroke: '#000000',
          strokeEnabled: true,
          strokeWidth: 2,
          opacity: 0.8,
        },
      },
      texts: {
        'text-1': {
          id: 'text-1',
          x: 500,
          y: 600,
          width: 200,
          height: 100,
          content: 'Sample Text',
          fontSize: 16,
          lineHeight: 24,
          textAlign: 'left',
          textVerticalAlign: 'top',
          textColor: '#000000',
          opacity: 1.0,
          paddingX: 8,
          paddingY: 8,
          wrap: true,
          overflow: 'clip',
          autoSizeMode: 'manual',
          backgroundColor: '#FFFFFF',
          backgroundEnabled: false,
          backgroundOpacity: 1.0,
          textShadow: {
            enabled: false,
            offsetX: 0,
            offsetY: 0,
            blur: 0,
            spread: 0,
            color: '#000000',
            opacity: 0.5,
          },
          backgroundShadow: {
            enabled: false,
            offsetX: 0,
            offsetY: 0,
            blur: 0,
            spread: 0,
            color: '#000000',
            opacity: 0.5,
          },
        },
      },
      index: {
        entityToEdges: {},
        columnToEntity: {},
        columnToEdges: {},
      },
      ui: {
        hover: null,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        highlightedColumnIds: [],
        layerOrder: {
          backgroundItems: [{ kind: 'rectangle', id: 'rect-1' }],
          foregroundItems: [{ kind: 'text', id: 'text-1' }],
        },
        isDraggingEntity: false,
      },
      loading: false,
    },
    ui: {
      selectedItem: null,
      showBuildInfoModal: false,
      showLayerPanel: false,
      showDatabaseConnectionModal: false,
      layoutOptimization: {
        isRunning: false,
        progress: 0,
        currentStage: null,
      },
      clipboard: null,
      lastMousePosition: null,
    },
    buildInfo: {
      data: null,
      loading: false,
      error: null,
    },
  });

  describe('actionCopyItem', () => {
    it('選択なしの場合、何もしない', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.selectedItem = null;

      const result = actionCopyItem(viewModel);

      expect(result).toBe(viewModel);
      expect(result.ui.clipboard).toBeNull();
    });

    it('テキスト選択時、クリップボードにテキストデータが保存される', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.selectedItem = { kind: 'text', id: 'text-1' };

      const result = actionCopyItem(viewModel);

      expect(result.ui.clipboard).not.toBeNull();
      expect(result.ui.clipboard?.kind).toBe('text');
      expect(result.ui.clipboard?.textData).toEqual(viewModel.erDiagram.texts['text-1']);
      expect(result.ui.clipboard?.rectangleData).toBeNull();
    });

    it('矩形選択時、クリップボードに矩形データが保存される', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.selectedItem = { kind: 'rectangle', id: 'rect-1' };

      const result = actionCopyItem(viewModel);

      expect(result.ui.clipboard).not.toBeNull();
      expect(result.ui.clipboard?.kind).toBe('rectangle');
      expect(result.ui.clipboard?.rectangleData).toEqual(viewModel.erDiagram.rectangles['rect-1']);
      expect(result.ui.clipboard?.textData).toBeNull();
    });

    it('エンティティ選択時、何もしない', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.selectedItem = { kind: 'entity', id: 'entity-1' };

      const result = actionCopyItem(viewModel);

      expect(result).toBe(viewModel);
      expect(result.ui.clipboard).toBeNull();
    });

    it('リレーション選択時、何もしない', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.selectedItem = { kind: 'relation', id: 'relation-1' };

      const result = actionCopyItem(viewModel);

      expect(result).toBe(viewModel);
      expect(result.ui.clipboard).toBeNull();
    });

    it('存在しないテキストIDを選択している場合、何もしない', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.selectedItem = { kind: 'text', id: 'non-existent' };

      const result = actionCopyItem(viewModel);

      expect(result).toBe(viewModel);
      expect(result.ui.clipboard).toBeNull();
    });

    it('存在しない矩形IDを選択している場合、何もしない', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.selectedItem = { kind: 'rectangle', id: 'non-existent' };

      const result = actionCopyItem(viewModel);

      expect(result).toBe(viewModel);
      expect(result.ui.clipboard).toBeNull();
    });
  });

  describe('actionPasteItem', () => {
    it('クリップボードが空の場合、何もしない', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.clipboard = null;

      const result = actionPasteItem(viewModel, { x: 1000, y: 2000 });

      expect(result).toBe(viewModel);
    });

    it('テキストをペーストすると新しいテキストが追加され、選択状態になる', () => {
      const viewModel = createMockViewModel();
      const originalText = viewModel.erDiagram.texts['text-1'];
      viewModel.ui.clipboard = {
        kind: 'text',
        textData: originalText,
        rectangleData: null,
      };

      const result = actionPasteItem(viewModel, { x: 1000, y: 2000 });

      // 新しいテキストが追加されている
      expect(result.erDiagram.texts[mockUUID]).toBeDefined();
      expect(result.erDiagram.texts[mockUUID].id).toBe(mockUUID);
      expect(result.erDiagram.texts[mockUUID].x).toBe(1000);
      expect(result.erDiagram.texts[mockUUID].y).toBe(2000);
      expect(result.erDiagram.texts[mockUUID].content).toBe(originalText.content);

      // 元のテキストは保持されている
      expect(result.erDiagram.texts['text-1']).toEqual(originalText);

      // 新しいテキストが選択状態になっている
      expect(result.ui.selectedItem).toEqual({ kind: 'text', id: mockUUID });
    });

    it('矩形をペーストすると新しい矩形が追加され、選択状態になる', () => {
      const viewModel = createMockViewModel();
      const originalRectangle = viewModel.erDiagram.rectangles['rect-1'];
      viewModel.ui.clipboard = {
        kind: 'rectangle',
        textData: null,
        rectangleData: originalRectangle,
      };

      const result = actionPasteItem(viewModel, { x: 1500, y: 2500 });

      // 新しい矩形が追加されている
      expect(result.erDiagram.rectangles[mockUUID]).toBeDefined();
      expect(result.erDiagram.rectangles[mockUUID].id).toBe(mockUUID);
      expect(result.erDiagram.rectangles[mockUUID].x).toBe(1500);
      expect(result.erDiagram.rectangles[mockUUID].y).toBe(2500);
      expect(result.erDiagram.rectangles[mockUUID].fill).toBe(originalRectangle.fill);

      // 元の矩形は保持されている
      expect(result.erDiagram.rectangles['rect-1']).toEqual(originalRectangle);

      // 新しい矩形が選択状態になっている
      expect(result.ui.selectedItem).toEqual({ kind: 'rectangle', id: mockUUID });
    });

    it('IDが新しく生成され、元のオブジェクトとは異なる', () => {
      const viewModel = createMockViewModel();
      const originalText = viewModel.erDiagram.texts['text-1'];
      viewModel.ui.clipboard = {
        kind: 'text',
        textData: originalText,
        rectangleData: null,
      };

      const result = actionPasteItem(viewModel, { x: 1000, y: 2000 });

      expect(result.erDiagram.texts[mockUUID].id).not.toBe(originalText.id);
      expect(result.erDiagram.texts[mockUUID].id).toBe(mockUUID);
    });

    it('指定された位置にペーストされる', () => {
      const viewModel = createMockViewModel();
      const originalText = viewModel.erDiagram.texts['text-1'];
      viewModel.ui.clipboard = {
        kind: 'text',
        textData: originalText,
        rectangleData: null,
      };

      const result = actionPasteItem(viewModel, { x: 3000, y: 4000 });

      expect(result.erDiagram.texts[mockUUID].x).toBe(3000);
      expect(result.erDiagram.texts[mockUUID].y).toBe(4000);
    });
  });

  describe('actionUpdateMousePosition', () => {
    it('マウス位置が更新される', () => {
      const viewModel = createMockViewModel();

      const result = actionUpdateMousePosition(viewModel, { clientX: 100, clientY: 200 });

      expect(result.ui.lastMousePosition).toEqual({ clientX: 100, clientY: 200 });
    });

    it('値が変わっていない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.lastMousePosition = { clientX: 100, clientY: 200 };

      const result = actionUpdateMousePosition(viewModel, { clientX: 100, clientY: 200 });

      expect(result).toBe(viewModel);
    });

    it('nullから値に変わる場合は更新される', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.lastMousePosition = null;

      const result = actionUpdateMousePosition(viewModel, { clientX: 100, clientY: 200 });

      expect(result.ui.lastMousePosition).toEqual({ clientX: 100, clientY: 200 });
      expect(result).not.toBe(viewModel);
    });

    it('clientXだけ変わる場合は更新される', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.lastMousePosition = { clientX: 100, clientY: 200 };

      const result = actionUpdateMousePosition(viewModel, { clientX: 150, clientY: 200 });

      expect(result.ui.lastMousePosition).toEqual({ clientX: 150, clientY: 200 });
      expect(result).not.toBe(viewModel);
    });

    it('clientYだけ変わる場合は更新される', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.lastMousePosition = { clientX: 100, clientY: 200 };

      const result = actionUpdateMousePosition(viewModel, { clientX: 100, clientY: 250 });

      expect(result.ui.lastMousePosition).toEqual({ clientX: 100, clientY: 250 });
      expect(result).not.toBe(viewModel);
    });
  });
});
