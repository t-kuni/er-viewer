import type { LayerOrder, LayerItemRef } from '../api/client';

/**
 * レイヤー順序から特定アイテムのz-indexを計算
 */
export function calculateZIndex(layerOrder: LayerOrder, itemRef: LayerItemRef): number {
  // 背面レイヤーを探索
  const bgIndex = layerOrder.backgroundItems.findIndex(
    item => item.kind === itemRef.kind && item.id === itemRef.id
  );
  if (bgIndex !== -1) {
    return -10000 + bgIndex;
  }
  
  // 前面レイヤーを探索
  const fgIndex = layerOrder.foregroundItems.findIndex(
    item => item.kind === itemRef.kind && item.id === itemRef.id
  );
  if (fgIndex !== -1) {
    return 10000 + fgIndex;
  }
  
  // 見つからない場合はデフォルト（0）
  return 0;
}

/**
 * すべての背面・前面アイテムのz-indexをMapで返す
 */
export function calculateAllZIndices(layerOrder: LayerOrder): Map<string, number> {
  const zIndices = new Map<string, number>();
  
  layerOrder.backgroundItems.forEach((item, index) => {
    zIndices.set(`${item.kind}-${item.id}`, -10000 + index);
  });
  
  layerOrder.foregroundItems.forEach((item, index) => {
    zIndices.set(`${item.kind}-${item.id}`, 10000 + index);
  });
  
  return zIndices;
}
