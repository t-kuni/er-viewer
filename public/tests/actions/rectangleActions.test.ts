import { describe, it, expect } from 'vitest';
import {
  actionAddRectangle,
  actionRemoveRectangle,
  actionUpdateRectanglePosition,
  actionUpdateRectangleSize,
  actionUpdateRectangleBounds,
  actionUpdateRectangleStyle,
} from '../../src/actions/rectangleActions';
import type { components } from '../../../lib/generated/api-types';

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];
type Rectangle = components['schemas']['Rectangle'];

describe('rectangleActions', () => {
  // テスト用のViewModelを作成
  const createMockViewModel = (): ERDiagramViewModel => ({
    nodes: {},
    edges: {},
    rectangles: {
      'rect-1': {
        id: 'rect-1',
        x: 100,
        y: 200,
        width: 300,
        height: 250,
        fill: '#E3F2FD',
        stroke: '#90CAF9',
        strokeWidth: 2,
        opacity: 0.5,
      },
    },
    ui: {
      hover: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      highlightedColumnIds: [],
    },
    loading: false,
  });

  describe('actionAddRectangle', () => {
    it('矩形が正しく追加される', () => {
      const viewModel = createMockViewModel();
      
      const newRectangle: Rectangle = {
        id: 'rect-2',
        x: 400,
        y: 500,
        width: 200,
        height: 150,
        fill: '#FFF3E0',
        stroke: '#FFB74D',
        strokeWidth: 3,
        opacity: 0.7,
      };
      
      const result = actionAddRectangle(viewModel, newRectangle);

      expect(result.rectangles['rect-2']).toEqual(newRectangle);
      // 既存の矩形は保持される
      expect(result.rectangles['rect-1']).toEqual(viewModel.rectangles['rect-1']);
    });

    it('既に同じIDが存在する場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const duplicateRectangle: Rectangle = {
        id: 'rect-1', // 既に存在するID
        x: 400,
        y: 500,
        width: 200,
        height: 150,
        fill: '#FFF3E0',
        stroke: '#FFB74D',
        strokeWidth: 3,
        opacity: 0.7,
      };
      
      const result = actionAddRectangle(viewModel, duplicateRectangle);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionRemoveRectangle', () => {
    it('矩形が正しく削除される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionRemoveRectangle(viewModel, 'rect-1');

      expect(result.rectangles['rect-1']).toBeUndefined();
    });

    it('存在しないIDを削除しようとした場合、同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionRemoveRectangle(viewModel, 'non-existent');

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateRectanglePosition', () => {
    it('位置が正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectanglePosition(viewModel, 'rect-1', 500, 600);

      expect(result.rectangles['rect-1'].x).toBe(500);
      expect(result.rectangles['rect-1'].y).toBe(600);
      // 他のプロパティは保持される
      expect(result.rectangles['rect-1'].width).toBe(300);
      expect(result.rectangles['rect-1'].height).toBe(250);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectanglePosition(viewModel, 'rect-1', 100, 200); // 同じ位置

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectanglePosition(viewModel, 'non-existent', 500, 600);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateRectangleSize', () => {
    it('サイズが正しく更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleSize(viewModel, 'rect-1', 400, 350);

      expect(result.rectangles['rect-1'].width).toBe(400);
      expect(result.rectangles['rect-1'].height).toBe(350);
      // 他のプロパティは保持される
      expect(result.rectangles['rect-1'].x).toBe(100);
      expect(result.rectangles['rect-1'].y).toBe(200);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleSize(viewModel, 'rect-1', 300, 250); // 同じサイズ

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleSize(viewModel, 'non-existent', 400, 350);

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateRectangleBounds', () => {
    it('座標とサイズが一括で更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleBounds(viewModel, 'rect-1', {
        x: 500,
        y: 600,
        width: 400,
        height: 350,
      });

      expect(result.rectangles['rect-1'].x).toBe(500);
      expect(result.rectangles['rect-1'].y).toBe(600);
      expect(result.rectangles['rect-1'].width).toBe(400);
      expect(result.rectangles['rect-1'].height).toBe(350);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleBounds(viewModel, 'rect-1', {
        x: 100,
        y: 200,
        width: 300,
        height: 250,
      });

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleBounds(viewModel, 'non-existent', {
        x: 500,
        y: 600,
        width: 400,
        height: 350,
      });

      expect(result).toBe(viewModel);
    });
  });

  describe('actionUpdateRectangleStyle', () => {
    it('スタイルが部分更新される', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleStyle(viewModel, 'rect-1', {
        fill: '#FFF3E0',
        opacity: 0.8,
      });

      expect(result.rectangles['rect-1'].fill).toBe('#FFF3E0');
      expect(result.rectangles['rect-1'].opacity).toBe(0.8);
      // 未指定のプロパティは保持される
      expect(result.rectangles['rect-1'].stroke).toBe('#90CAF9');
      expect(result.rectangles['rect-1'].strokeWidth).toBe(2);
    });

    it('全てのスタイルプロパティを更新できる', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleStyle(viewModel, 'rect-1', {
        fill: '#FCE4EC',
        stroke: '#F06292',
        strokeWidth: 5,
        opacity: 1.0,
      });

      expect(result.rectangles['rect-1'].fill).toBe('#FCE4EC');
      expect(result.rectangles['rect-1'].stroke).toBe('#F06292');
      expect(result.rectangles['rect-1'].strokeWidth).toBe(5);
      expect(result.rectangles['rect-1'].opacity).toBe(1.0);
    });

    it('変化がない場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleStyle(viewModel, 'rect-1', {
        fill: '#E3F2FD', // 同じ値
      });

      expect(result).toBe(viewModel);
    });

    it('存在しないIDの場合は同一参照を返す', () => {
      const viewModel = createMockViewModel();
      
      const result = actionUpdateRectangleStyle(viewModel, 'non-existent', {
        fill: '#FFF3E0',
      });

      expect(result).toBe(viewModel);
    });
  });
});
