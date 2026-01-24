import { describe, it, expect } from 'vitest';
import {
  actionReorderLayerItems,
  actionMoveLayerItem,
  actionAddLayerItem,
  actionRemoveLayerItem,
  actionSelectItem,
  actionToggleLayerPanel,
} from '../../src/actions/layerActions';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
type LayerItemRef = components['schemas']['LayerItemRef'];

const createInitialViewModel = (): ViewModel => ({
  erDiagram: {
    nodes: {},
    edges: {},
    rectangles: {},
    ui: {
      hover: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      highlightedColumnIds: [],
      layerOrder: {
        backgroundItems: [],
        foregroundItems: [],
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

describe('actionReorderLayerItems', () => {
  it('同一セクション内で正しく並べ替えが行われること', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
      { kind: 'rectangle', id: 'rect2' },
      { kind: 'rectangle', id: 'rect3' },
    ];

    const result = actionReorderLayerItems(vm, 'background', 0, 2);

    expect(result.erDiagram.ui.layerOrder.backgroundItems).toEqual([
      { kind: 'rectangle', id: 'rect2' },
      { kind: 'rectangle', id: 'rect3' },
      { kind: 'rectangle', id: 'rect1' },
    ]);
  });

  it('同じインデックスの場合は同一参照を返すこと', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
      { kind: 'rectangle', id: 'rect2' },
    ];

    const result = actionReorderLayerItems(vm, 'background', 1, 1);

    expect(result).toBe(vm);
  });

  it('範囲外のインデックスの場合は同一参照を返すこと', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
    ];

    const result = actionReorderLayerItems(vm, 'background', 0, 5);

    expect(result).toBe(vm);
  });
});

describe('actionMoveLayerItem', () => {
  it('背面から前面への移動が正しく行われること', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
      { kind: 'rectangle', id: 'rect2' },
    ];
    vm.erDiagram.ui.layerOrder.foregroundItems = [
      { kind: 'rectangle', id: 'rect3' },
    ];

    const result = actionMoveLayerItem(vm, { kind: 'rectangle', id: 'rect2' }, 'foreground', 0);

    expect(result.erDiagram.ui.layerOrder.backgroundItems).toEqual([
      { kind: 'rectangle', id: 'rect1' },
    ]);
    expect(result.erDiagram.ui.layerOrder.foregroundItems).toEqual([
      { kind: 'rectangle', id: 'rect2' },
      { kind: 'rectangle', id: 'rect3' },
    ]);
  });

  it('前面から背面への移動が正しく行われること', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
    ];
    vm.erDiagram.ui.layerOrder.foregroundItems = [
      { kind: 'rectangle', id: 'rect2' },
      { kind: 'rectangle', id: 'rect3' },
    ];

    const result = actionMoveLayerItem(vm, { kind: 'rectangle', id: 'rect2' }, 'background', 1);

    expect(result.erDiagram.ui.layerOrder.backgroundItems).toEqual([
      { kind: 'rectangle', id: 'rect1' },
      { kind: 'rectangle', id: 'rect2' },
    ]);
    expect(result.erDiagram.ui.layerOrder.foregroundItems).toEqual([
      { kind: 'rectangle', id: 'rect3' },
    ]);
  });

  it('存在しないアイテムの場合は同一参照を返すこと', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
    ];

    const result = actionMoveLayerItem(vm, { kind: 'rectangle', id: 'rect999' }, 'foreground', 0);

    expect(result).toBe(vm);
  });
});

describe('actionAddLayerItem', () => {
  it('アイテムが配列末尾に追加されること', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
    ];

    const result = actionAddLayerItem(vm, { kind: 'rectangle', id: 'rect2' }, 'background');

    expect(result.erDiagram.ui.layerOrder.backgroundItems).toEqual([
      { kind: 'rectangle', id: 'rect1' },
      { kind: 'rectangle', id: 'rect2' },
    ]);
  });

  it('既に存在するアイテムの場合は同一参照を返すこと', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
    ];

    const result = actionAddLayerItem(vm, { kind: 'rectangle', id: 'rect1' }, 'background');

    expect(result).toBe(vm);
  });
});

describe('actionRemoveLayerItem', () => {
  it('背面レイヤーからアイテムが削除されること', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
      { kind: 'rectangle', id: 'rect2' },
    ];

    const result = actionRemoveLayerItem(vm, { kind: 'rectangle', id: 'rect1' });

    expect(result.erDiagram.ui.layerOrder.backgroundItems).toEqual([
      { kind: 'rectangle', id: 'rect2' },
    ]);
  });

  it('前面レイヤーからアイテムが削除されること', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.foregroundItems = [
      { kind: 'rectangle', id: 'rect1' },
      { kind: 'rectangle', id: 'rect2' },
    ];

    const result = actionRemoveLayerItem(vm, { kind: 'rectangle', id: 'rect1' });

    expect(result.erDiagram.ui.layerOrder.foregroundItems).toEqual([
      { kind: 'rectangle', id: 'rect2' },
    ]);
  });

  it('存在しないアイテムの場合は同一参照を返すこと', () => {
    const vm = createInitialViewModel();
    vm.erDiagram.ui.layerOrder.backgroundItems = [
      { kind: 'rectangle', id: 'rect1' },
    ];

    const result = actionRemoveLayerItem(vm, { kind: 'rectangle', id: 'rect999' });

    expect(result).toBe(vm);
  });
});

describe('actionSelectItem', () => {
  it('アイテムが正しく選択されること', () => {
    const vm = createInitialViewModel();
    const itemRef: LayerItemRef = { kind: 'rectangle', id: 'rect1' };

    const result = actionSelectItem(vm, itemRef);

    expect(result.ui.selectedItem).toEqual(itemRef);
  });

  it('nullで選択解除できること', () => {
    const vm = createInitialViewModel();
    vm.ui.selectedItem = { kind: 'rectangle', id: 'rect1' };

    const result = actionSelectItem(vm, null);

    expect(result.ui.selectedItem).toBeNull();
  });

  it('同じアイテムの場合は同一参照を返すこと', () => {
    const vm = createInitialViewModel();
    const itemRef: LayerItemRef = { kind: 'rectangle', id: 'rect1' };
    vm.ui.selectedItem = itemRef;

    const result = actionSelectItem(vm, itemRef);

    expect(result).toBe(vm);
  });
});

describe('actionToggleLayerPanel', () => {
  it('パネルが非表示から表示に切り替わること', () => {
    const vm = createInitialViewModel();
    vm.ui.showLayerPanel = false;

    const result = actionToggleLayerPanel(vm);

    expect(result.ui.showLayerPanel).toBe(true);
  });

  it('パネルが表示から非表示に切り替わること', () => {
    const vm = createInitialViewModel();
    vm.ui.showLayerPanel = true;

    const result = actionToggleLayerPanel(vm);

    expect(result.ui.showLayerPanel).toBe(false);
  });
});
