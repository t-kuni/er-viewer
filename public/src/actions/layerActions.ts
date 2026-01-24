import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
type LayerItemRef = components['schemas']['LayerItemRef'];
type LayerPosition = components['schemas']['LayerPosition'];

/**
 * 同一セクション内でアイテムを並べ替える
 */
export function actionReorderLayerItems(
  vm: ViewModel,
  position: LayerPosition,
  activeIndex: number,
  overIndex: number
): ViewModel {
  if (activeIndex === overIndex) {
    return vm;
  }

  const items = position === 'foreground'
    ? vm.erDiagram.ui.layerOrder.foregroundItems
    : vm.erDiagram.ui.layerOrder.backgroundItems;

  // インデックスの範囲チェック
  if (activeIndex < 0 || activeIndex >= items.length || overIndex < 0 || overIndex >= items.length) {
    return vm;
  }

  // 並べ替え処理
  const newItems = [...items];
  const [removed] = newItems.splice(activeIndex, 1);
  newItems.splice(overIndex, 0, removed);

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      ui: {
        ...vm.erDiagram.ui,
        layerOrder: {
          ...vm.erDiagram.ui.layerOrder,
          [position === 'foreground' ? 'foregroundItems' : 'backgroundItems']: newItems,
        },
      },
    },
  };
}

/**
 * アイテムを別のセクションへ移動する
 */
export function actionMoveLayerItem(
  vm: ViewModel,
  itemRef: LayerItemRef,
  toPosition: LayerPosition,
  toIndex: number
): ViewModel {
  const { backgroundItems, foregroundItems } = vm.erDiagram.ui.layerOrder;

  // 元のセクションから削除
  let fromItems: LayerItemRef[];
  let fromKey: 'backgroundItems' | 'foregroundItems';
  
  const bgIndex = backgroundItems.findIndex(
    item => item.kind === itemRef.kind && item.id === itemRef.id
  );
  const fgIndex = foregroundItems.findIndex(
    item => item.kind === itemRef.kind && item.id === itemRef.id
  );

  if (bgIndex !== -1) {
    fromItems = [...backgroundItems];
    fromItems.splice(bgIndex, 1);
    fromKey = 'backgroundItems';
  } else if (fgIndex !== -1) {
    fromItems = [...foregroundItems];
    fromItems.splice(fgIndex, 1);
    fromKey = 'foregroundItems';
  } else {
    // アイテムが見つからない場合は変更なし
    return vm;
  }

  // 移動先のセクションに追加
  const toKey = toPosition === 'foreground' ? 'foregroundItems' : 'backgroundItems';
  const toItems = toKey === fromKey ? fromItems : [...(toKey === 'foregroundItems' ? foregroundItems : backgroundItems)];
  toItems.splice(toIndex, 0, itemRef);

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      ui: {
        ...vm.erDiagram.ui,
        layerOrder: {
          backgroundItems: toKey === 'backgroundItems' ? toItems : (fromKey === 'backgroundItems' ? fromItems : backgroundItems),
          foregroundItems: toKey === 'foregroundItems' ? toItems : (fromKey === 'foregroundItems' ? fromItems : foregroundItems),
        },
      },
    },
  };
}

/**
 * 新規アイテムをレイヤーに追加する
 */
export function actionAddLayerItem(
  vm: ViewModel,
  itemRef: LayerItemRef,
  position: LayerPosition
): ViewModel {
  const items = position === 'foreground'
    ? vm.erDiagram.ui.layerOrder.foregroundItems
    : vm.erDiagram.ui.layerOrder.backgroundItems;

  // 既に存在する場合は追加しない
  const exists = items.some(item => item.kind === itemRef.kind && item.id === itemRef.id);
  if (exists) {
    return vm;
  }

  const newItems = [...items, itemRef];

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      ui: {
        ...vm.erDiagram.ui,
        layerOrder: {
          ...vm.erDiagram.ui.layerOrder,
          [position === 'foreground' ? 'foregroundItems' : 'backgroundItems']: newItems,
        },
      },
    },
  };
}

/**
 * アイテムを削除時にレイヤーからも除去する
 */
export function actionRemoveLayerItem(
  vm: ViewModel,
  itemRef: LayerItemRef
): ViewModel {
  const { backgroundItems, foregroundItems } = vm.erDiagram.ui.layerOrder;

  const newBackgroundItems = backgroundItems.filter(
    item => !(item.kind === itemRef.kind && item.id === itemRef.id)
  );
  const newForegroundItems = foregroundItems.filter(
    item => !(item.kind === itemRef.kind && item.id === itemRef.id)
  );

  // 変更がない場合は同一参照を返す
  if (newBackgroundItems.length === backgroundItems.length && newForegroundItems.length === foregroundItems.length) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      ui: {
        ...vm.erDiagram.ui,
        layerOrder: {
          backgroundItems: newBackgroundItems,
          foregroundItems: newForegroundItems,
        },
      },
    },
  };
}

/**
 * アイテムを選択する
 */
export function actionSelectItem(
  vm: ViewModel,
  itemRef: LayerItemRef | null
): ViewModel {
  if (vm.ui.selectedItem === itemRef) {
    return vm;
  }

  return {
    ...vm,
    ui: {
      ...vm.ui,
      selectedItem: itemRef,
    },
  };
}

/**
 * レイヤーパネルの表示/非表示を切り替える
 */
export function actionToggleLayerPanel(vm: ViewModel): ViewModel {
  return {
    ...vm,
    ui: {
      ...vm.ui,
      showLayerPanel: !vm.ui.showLayerPanel,
    },
  };
}
