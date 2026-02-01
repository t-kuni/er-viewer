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

  it('エンティティを選択する', () => {
    const vm = createInitialViewModel();
    const next = actionSelectItem(vm, { kind: 'entity', id: 'entity-1' });
    
    expect(next.ui.selectedItem).toEqual({ kind: 'entity', id: 'entity-1' });
    // エンティティ選択時は、そのエンティティ自体がハイライトされる
    expect(next.erDiagram.ui.highlightedNodeIds).toContain('entity-1');
  });

  it('矩形選択中にエンティティを選択すると矩形の選択が解除される', () => {
    const vm = createInitialViewModel();
    const withRectSelected = actionSelectItem(vm, { kind: 'rectangle', id: 'rect-1' });
    const next = actionSelectItem(withRectSelected, { kind: 'entity', id: 'entity-1' });
    
    expect(next.ui.selectedItem).toEqual({ kind: 'entity', id: 'entity-1' });
  });

  it('エンティティ選択時、関連エンティティとエッジもハイライトされる', () => {
    const vm = createInitialViewModel();
    // エンティティとエッジの関連を設定
    vm.erDiagram.nodes = {
      'entity-1': {
        id: 'entity-1',
        name: 'Entity1',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        columns: [],
        ddl: '',
      },
      'entity-2': {
        id: 'entity-2',
        name: 'Entity2',
        x: 300,
        y: 0,
        width: 200,
        height: 100,
        columns: [],
        ddl: '',
      },
    };
    vm.erDiagram.edges = {
      'edge-1': {
        id: 'edge-1',
        sourceEntityId: 'entity-1',
        targetEntityId: 'entity-2',
        sourceColumnId: 'col-1',
        targetColumnId: 'col-2',
        relationType: '1:N',
      },
    };
    vm.erDiagram.index = {
      entityToEdges: {
        'entity-1': ['edge-1'],
        'entity-2': ['edge-1'],
      },
      columnToEntity: {
        'col-1': 'entity-1',
        'col-2': 'entity-2',
      },
      columnToEdges: {
        'col-1': ['edge-1'],
        'col-2': ['edge-1'],
      },
    };

    const next = actionSelectItem(vm, { kind: 'entity', id: 'entity-1' });
    
    // 選択されたエンティティと関連エンティティがハイライトされる
    expect(next.erDiagram.ui.highlightedNodeIds).toContain('entity-1');
    expect(next.erDiagram.ui.highlightedNodeIds).toContain('entity-2');
    // 接続エッジもハイライトされる
    expect(next.erDiagram.ui.highlightedEdgeIds).toContain('edge-1');
    // 関連カラムもハイライトされる
    expect(next.erDiagram.ui.highlightedColumnIds).toContain('col-1');
    expect(next.erDiagram.ui.highlightedColumnIds).toContain('col-2');
  });

  it('選択解除時はハイライトがクリアされる', () => {
    const vm = createInitialViewModel();
    // 初期状態でエンティティを選択
    const withEntitySelected = actionSelectItem(vm, { kind: 'entity', id: 'entity-1' });
    
    // 選択解除
    const next = actionSelectItem(withEntitySelected, null);
    
    expect(next.ui.selectedItem).toBeNull();
    // ハイライトがクリアされる
    expect(next.erDiagram.ui.highlightedNodeIds).toEqual([]);
    expect(next.erDiagram.ui.highlightedEdgeIds).toEqual([]);
    expect(next.erDiagram.ui.highlightedColumnIds).toEqual([]);
  });

  it('矩形選択時はハイライトがクリアされる', () => {
    const vm = createInitialViewModel();
    // 初期状態でエンティティを選択（ハイライト状態あり）
    const withEntitySelected = actionSelectItem(vm, { kind: 'entity', id: 'entity-1' });
    expect(withEntitySelected.erDiagram.ui.highlightedNodeIds).toContain('entity-1');
    
    // 矩形を選択
    const next = actionSelectItem(withEntitySelected, { kind: 'rectangle', id: 'rect-1' });
    
    expect(next.ui.selectedItem).toEqual({ kind: 'rectangle', id: 'rect-1' });
    // ハイライトがクリアされる
    expect(next.erDiagram.ui.highlightedNodeIds).toEqual([]);
    expect(next.erDiagram.ui.highlightedEdgeIds).toEqual([]);
    expect(next.erDiagram.ui.highlightedColumnIds).toEqual([]);
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
