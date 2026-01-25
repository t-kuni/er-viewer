import { describe, it, expect } from 'vitest';
import {
  actionAddText,
  actionRemoveText,
  actionUpdateTextPosition,
  actionUpdateTextSize,
  actionUpdateTextBounds,
  actionUpdateTextContent,
  actionUpdateTextStyle,
  actionSetTextAutoSizeMode,
  actionFitTextBoundsToContent,
  actionUpdateTextShadow,
  actionUpdateTextPadding,
} from '../../src/actions/textActions';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
type TextBox = components['schemas']['TextBox'];

describe('textActions', () => {
  // テスト用のViewModelを作成
  const createMockViewModel = (): ViewModel => ({
    erDiagram: {
      nodes: {},
      edges: {},
      rectangles: {},
      texts: {
        'text-1': {
          id: 'text-1',
          x: 100,
          y: 200,
          width: 300,
          height: 80,
          content: 'Hello World',
          fontSize: 16,
          lineHeight: 24,
          textAlign: 'left',
          textColor: '#000000',
          opacity: 1.0,
          paddingX: 8,
          paddingY: 8,
          wrap: true,
          overflow: 'clip',
          autoSizeMode: 'manual',
          shadow: {
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
      ui: {
        hover: null,
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        highlightedColumnIds: [],
        layerOrder: {
          backgroundItems: [],
          foregroundItems: [{ kind: 'text', id: 'text-1' }],
        },
      },
      loading: false,
    },
    ui: {
      selectedItem: null,
      showBuildInfoModal: false,
      showLayerPanel: false,
    },
    buildInfo: {
      data: null,
      loading: false,
      error: null,
    },
  });

  describe('actionAddText', () => {
    it('テキストが正しく追加される', () => {
      const viewModel = createMockViewModel();
      
      const newText: TextBox = {
        id: 'text-2',
        x: 400,
        y: 500,
        width: 200,
        height: 60,
        content: 'New Text',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        textColor: '#FF0000',
        opacity: 0.8,
        paddingX: 4,
        paddingY: 4,
        wrap: false,
        overflow: 'scroll',
        autoSizeMode: 'fitContent',
        shadow: {
          enabled: true,
          offsetX: 2,
          offsetY: 2,
          blur: 4,
          spread: 0,
          color: '#000000',
          opacity: 0.3,
        },
      };
      
      const result = actionAddText(viewModel, newText);

      expect(result.erDiagram.texts['text-2']).toEqual(newText);
      // 既存のテキストは保持される
      expect(result.erDiagram.texts['text-1']).toEqual(viewModel.erDiagram.texts['text-1']);
    });

    it('テキストが前面レイヤーに追加される', () => {
      const viewModel = createMockViewModel();
      
      const newText: TextBox = {
        id: 'text-2',
        x: 400,
        y: 500,
        width: 200,
        height: 60,
        content: 'New Text',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        textColor: '#FF0000',
        opacity: 0.8,
        paddingX: 4,
        paddingY: 4,
        wrap: false,
        overflow: 'scroll',
        autoSizeMode: 'fitContent',
        shadow: {
          enabled: false,
          offsetX: 0,
          offsetY: 0,
          blur: 0,
          spread: 0,
          color: '#000000',
          opacity: 0.5,
        },
      };
      
      const result = actionAddText(viewModel, newText);

      expect(result.erDiagram.ui.layerOrder.foregroundItems).toContainEqual({ kind: 'text', id: 'text-2' });
    });

    it('既に同じIDが存在する場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const duplicateText: TextBox = {
        id: 'text-1', // 既に存在するID
        x: 400,
        y: 500,
        width: 200,
        height: 60,
        content: 'Duplicate',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        textColor: '#FF0000',
        opacity: 0.8,
        paddingX: 4,
        paddingY: 4,
        wrap: false,
        overflow: 'scroll',
        autoSizeMode: 'fitContent',
        shadow: {
          enabled: false,
          offsetX: 0,
          offsetY: 0,
          blur: 0,
          spread: 0,
          color: '#000000',
          opacity: 0.5,
        },
      };
      
      const result = actionAddText(viewModel, duplicateText);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionRemoveText', () => {
    it('テキストが正しく削除される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionRemoveText(viewModel, 'text-1');

      expect(result.erDiagram.texts['text-1']).toBeUndefined();
    });

    it('テキストがレイヤーから削除される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionRemoveText(viewModel, 'text-1');

      expect(result.erDiagram.ui.layerOrder.backgroundItems).not.toContainEqual({ kind: 'text', id: 'text-1' });
      expect(result.erDiagram.ui.layerOrder.foregroundItems).not.toContainEqual({ kind: 'text', id: 'text-1' });
    });

    it('選択中のテキストを削除すると選択が解除される', () => {
      const viewModel = createMockViewModel();
      viewModel.ui.selectedItem = { kind: 'text', id: 'text-1' };
      
      const result = actionRemoveText(viewModel, 'text-1');

      expect(result.ui.selectedItem).toBeNull();
    });

    it('存在しないIDを削除しようとした場合、同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionRemoveText(viewModel, 'non-existent');

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateTextPosition', () => {
    it('位置が正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextPosition(viewModel, 'text-1', 500, 600);

      expect(result.erDiagram.texts['text-1'].x).toBe(500);
      expect(result.erDiagram.texts['text-1'].y).toBe(600);
      // 他のプロパティは保持される
      expect(result.erDiagram.texts['text-1'].width).toBe(300);
      expect(result.erDiagram.texts['text-1'].height).toBe(80);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextPosition(viewModel, 'text-1', 100, 200); // 同じ位置

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextPosition(viewModel, 'non-existent', 500, 600);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateTextSize', () => {
    it('サイズが正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextSize(viewModel, 'text-1', 400, 100);

      expect(result.erDiagram.texts['text-1'].width).toBe(400);
      expect(result.erDiagram.texts['text-1'].height).toBe(100);
      // 他のプロパティは保持される
      expect(result.erDiagram.texts['text-1'].x).toBe(100);
      expect(result.erDiagram.texts['text-1'].y).toBe(200);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextSize(viewModel, 'text-1', 300, 80); // 同じサイズ

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextSize(viewModel, 'non-existent', 400, 100);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateTextBounds', () => {
    it('座標とサイズが一括で更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextBounds(viewModel, 'text-1', {
        x: 500,
        y: 600,
        width: 400,
        height: 100,
      });

      expect(result.erDiagram.texts['text-1'].x).toBe(500);
      expect(result.erDiagram.texts['text-1'].y).toBe(600);
      expect(result.erDiagram.texts['text-1'].width).toBe(400);
      expect(result.erDiagram.texts['text-1'].height).toBe(100);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextBounds(viewModel, 'text-1', {
        x: 100,
        y: 200,
        width: 300,
        height: 80,
      });

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextBounds(viewModel, 'non-existent', {
        x: 500,
        y: 600,
        width: 400,
        height: 100,
      });

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateTextContent', () => {
    it('内容が正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextContent(viewModel, 'text-1', 'Updated Content');

      expect(result.erDiagram.texts['text-1'].content).toBe('Updated Content');
      // 他のプロパティは保持される
      expect(result.erDiagram.texts['text-1'].fontSize).toBe(16);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextContent(viewModel, 'text-1', 'Hello World'); // 同じ内容

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextContent(viewModel, 'non-existent', 'Updated Content');

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateTextStyle', () => {
    it('スタイルが部分更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextStyle(viewModel, 'text-1', {
        fontSize: 20,
        textColor: '#FF0000',
      });

      expect(result.erDiagram.texts['text-1'].fontSize).toBe(20);
      expect(result.erDiagram.texts['text-1'].textColor).toBe('#FF0000');
      // 未指定のプロパティは保持される
      expect(result.erDiagram.texts['text-1'].lineHeight).toBe(24);
      expect(result.erDiagram.texts['text-1'].textAlign).toBe('left');
    });

    it('全てのスタイルプロパティを更新できる', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextStyle(viewModel, 'text-1', {
        fontSize: 18,
        lineHeight: 28,
        textAlign: 'center',
        textColor: '#0000FF',
        opacity: 0.7,
        wrap: false,
        overflow: 'scroll',
      });

      expect(result.erDiagram.texts['text-1'].fontSize).toBe(18);
      expect(result.erDiagram.texts['text-1'].lineHeight).toBe(28);
      expect(result.erDiagram.texts['text-1'].textAlign).toBe('center');
      expect(result.erDiagram.texts['text-1'].textColor).toBe('#0000FF');
      expect(result.erDiagram.texts['text-1'].opacity).toBe(0.7);
      expect(result.erDiagram.texts['text-1'].wrap).toBe(false);
      expect(result.erDiagram.texts['text-1'].overflow).toBe('scroll');
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextStyle(viewModel, 'text-1', {
        fontSize: 16, // 同じ値
      });

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextStyle(viewModel, 'non-existent', {
        fontSize: 20,
      });

      expect(result).toBe(viewModel);
    });
  });

  describe('actionSetTextAutoSizeMode', () => {
    it('autoSizeModeが正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetTextAutoSizeMode(viewModel, 'text-1', 'fitContent');

      expect(result.erDiagram.texts['text-1'].autoSizeMode).toBe('fitContent');
      // 他のプロパティは保持される
      expect(result.erDiagram.texts['text-1'].content).toBe('Hello World');
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetTextAutoSizeMode(viewModel, 'text-1', 'manual'); // 同じモード

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionSetTextAutoSizeMode(viewModel, 'non-existent', 'fitContent');

      expect(result).toBe(viewModel);
    });
  });

  describe('actionFitTextBoundsToContent', () => {
    it('width/heightが正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionFitTextBoundsToContent(viewModel, 'text-1', 350, 90);

      expect(result.erDiagram.texts['text-1'].width).toBe(350);
      expect(result.erDiagram.texts['text-1'].height).toBe(90);
      // 他のプロパティは保持される
      expect(result.erDiagram.texts['text-1'].x).toBe(100);
      expect(result.erDiagram.texts['text-1'].y).toBe(200);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionFitTextBoundsToContent(viewModel, 'text-1', 300, 80); // 同じサイズ

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionFitTextBoundsToContent(viewModel, 'non-existent', 350, 90);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateTextShadow', () => {
    it('shadowが部分更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextShadow(viewModel, 'text-1', {
        enabled: true,
        offsetX: 5,
        blur: 10,
      });

      expect(result.erDiagram.texts['text-1'].shadow.enabled).toBe(true);
      expect(result.erDiagram.texts['text-1'].shadow.offsetX).toBe(5);
      expect(result.erDiagram.texts['text-1'].shadow.blur).toBe(10);
      // 未指定のプロパティは保持される
      expect(result.erDiagram.texts['text-1'].shadow.offsetY).toBe(0);
      expect(result.erDiagram.texts['text-1'].shadow.spread).toBe(0);
    });

    it('全てのshadowプロパティを更新できる', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextShadow(viewModel, 'text-1', {
        enabled: true,
        offsetX: 3,
        offsetY: 3,
        blur: 6,
        spread: 2,
        color: '#FF0000',
        opacity: 0.8,
      });

      expect(result.erDiagram.texts['text-1'].shadow.enabled).toBe(true);
      expect(result.erDiagram.texts['text-1'].shadow.offsetX).toBe(3);
      expect(result.erDiagram.texts['text-1'].shadow.offsetY).toBe(3);
      expect(result.erDiagram.texts['text-1'].shadow.blur).toBe(6);
      expect(result.erDiagram.texts['text-1'].shadow.spread).toBe(2);
      expect(result.erDiagram.texts['text-1'].shadow.color).toBe('#FF0000');
      expect(result.erDiagram.texts['text-1'].shadow.opacity).toBe(0.8);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextShadow(viewModel, 'text-1', {
        enabled: false, // 同じ値
      });

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextShadow(viewModel, 'non-existent', {
        enabled: true,
      });

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateTextPadding', () => {
    it('paddingが正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextPadding(viewModel, 'text-1', 12, 16);

      expect(result.erDiagram.texts['text-1'].paddingX).toBe(12);
      expect(result.erDiagram.texts['text-1'].paddingY).toBe(16);
      // 他のプロパティは保持される
      expect(result.erDiagram.texts['text-1'].content).toBe('Hello World');
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextPadding(viewModel, 'text-1', 8, 8); // 同じパディング

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateTextPadding(viewModel, 'non-existent', 12, 16);

      expect(result).toBe(viewModel);
    });
  });
});
