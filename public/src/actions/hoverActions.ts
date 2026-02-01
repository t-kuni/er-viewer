import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
type HoverTarget = components['schemas']['HoverTarget'];

/**
 * 配列の内容が同じかどうかを判定する（順序は考慮しない）
 */
function arraysHaveSameElements(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((val, i) => val === sorted2[i]);
}

/**
 * 配列の内容が既存と同じ場合は既存の参照を返す（再レンダリング最適化）
 */
function optimizeArray(newArray: string[], existingArray: string[]): string[] {
  return arraysHaveSameElements(newArray, existingArray) ? existingArray : newArray;
}

/**
 * エンティティのハイライト対象を計算する
 * @param viewModel 現在の状態
 * @param entityId 対象のエンティティID
 * @returns ハイライト対象のID配列
 */
export function calculateEntityHighlights(
  viewModel: ViewModel,
  entityId: string
): {
  highlightedNodeIds: string[];
  highlightedEdgeIds: string[];
  highlightedColumnIds: string[];
} {
  // ハイライト対象の収集
  const highlightedNodeIds = new Set<string>([entityId]);
  const highlightedEdgeIds = new Set<string>();
  const highlightedColumnIds = new Set<string>();

  // インデックスを使って接続エッジを高速検索（O(1)）
  const connectedEdgeIds = viewModel.erDiagram.index.entityToEdges[entityId] || [];
  
  for (const edgeId of connectedEdgeIds) {
    const edge = viewModel.erDiagram.edges[edgeId];
    if (!edge) continue;
    
    highlightedEdgeIds.add(edgeId);
    // 接続先のノードもハイライト
    highlightedNodeIds.add(edge.sourceEntityId);
    highlightedNodeIds.add(edge.targetEntityId);
    // エッジに関連するカラムもハイライト
    highlightedColumnIds.add(edge.sourceColumnId);
    highlightedColumnIds.add(edge.targetColumnId);
  }

  // 配列に変換
  return {
    highlightedNodeIds: Array.from(highlightedNodeIds),
    highlightedEdgeIds: Array.from(highlightedEdgeIds),
    highlightedColumnIds: Array.from(highlightedColumnIds),
  };
}

/**
 * エンティティにホバーした時のAction
 * @param viewModel 現在の状態
 * @param entityId ホバーしたエンティティのID
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionHoverEntity(
  viewModel: ViewModel,
  entityId: string
): ViewModel {
  // ドラッグ中はホバーイベントを無視
  if (viewModel.erDiagram.ui.isDraggingEntity) {
    return viewModel;
  }

  // エンティティ選択中はホバーイベントを無視
  if (viewModel.ui.selectedItem?.kind === 'entity') {
    return viewModel;
  }

  // ハイライト対象を計算（共通ロジック）
  const highlights = calculateEntityHighlights(viewModel, entityId);

  // 既存の配列と内容が同じ場合は既存の参照を再利用（再レンダリング最適化）
  const optimizedNodeIds = optimizeArray(highlights.highlightedNodeIds, viewModel.erDiagram.ui.highlightedNodeIds);
  const optimizedEdgeIds = optimizeArray(highlights.highlightedEdgeIds, viewModel.erDiagram.ui.highlightedEdgeIds);
  const optimizedColumnIds = optimizeArray(highlights.highlightedColumnIds, viewModel.erDiagram.ui.highlightedColumnIds);

  // すべての配列が既存と同じ参照で、hoverも同じ場合は全体として同一参照を返す
  const currentHover = viewModel.erDiagram.ui.hover;
  const isSameHover = currentHover?.type === 'entity' && currentHover.id === entityId;
  if (isSameHover &&
      optimizedNodeIds === viewModel.erDiagram.ui.highlightedNodeIds &&
      optimizedEdgeIds === viewModel.erDiagram.ui.highlightedEdgeIds &&
      optimizedColumnIds === viewModel.erDiagram.ui.highlightedColumnIds) {
    return viewModel;
  }

  // 新しいUI状態を作成（既存のlayerOrderを保持）
  const newUi = {
    ...viewModel.erDiagram.ui,
    hover: { type: 'entity' as const, id: entityId },
    highlightedNodeIds: optimizedNodeIds,
    highlightedEdgeIds: optimizedEdgeIds,
    highlightedColumnIds: optimizedColumnIds,
  };

  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      ui: newUi,
    },
  };
}

/**
 * エッジにホバーした時のAction
 * @param viewModel 現在の状態
 * @param edgeId ホバーしたエッジのID
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionHoverEdge(
  viewModel: ViewModel,
  edgeId: string
): ViewModel {
  // ドラッグ中はホバーイベントを無視
  if (viewModel.erDiagram.ui.isDraggingEntity) {
    return viewModel;
  }

  // エンティティ選択中はホバーイベントを無視
  if (viewModel.ui.selectedItem?.kind === 'entity') {
    return viewModel;
  }

  const edge = viewModel.erDiagram.edges[edgeId];
  
  if (!edge) {
    console.warn(`Edge not found: ${edgeId}`);
    return viewModel;
  }

  // エッジと両端のノード、両端のカラムをハイライト
  const newHighlightedNodeIds = [edge.sourceEntityId, edge.targetEntityId];
  const newHighlightedEdgeIds = [edgeId];
  const newHighlightedColumnIds = [edge.sourceColumnId, edge.targetColumnId];

  // 既存の配列と内容が同じ場合は既存の参照を再利用（再レンダリング最適化）
  const optimizedNodeIds = optimizeArray(newHighlightedNodeIds, viewModel.erDiagram.ui.highlightedNodeIds);
  const optimizedEdgeIds = optimizeArray(newHighlightedEdgeIds, viewModel.erDiagram.ui.highlightedEdgeIds);
  const optimizedColumnIds = optimizeArray(newHighlightedColumnIds, viewModel.erDiagram.ui.highlightedColumnIds);

  // すべての配列が既存と同じ参照で、hoverも同じ場合は全体として同一参照を返す
  const currentHover = viewModel.erDiagram.ui.hover;
  const isSameHover = currentHover?.type === 'edge' && currentHover.id === edgeId;
  if (isSameHover &&
      optimizedNodeIds === viewModel.erDiagram.ui.highlightedNodeIds &&
      optimizedEdgeIds === viewModel.erDiagram.ui.highlightedEdgeIds &&
      optimizedColumnIds === viewModel.erDiagram.ui.highlightedColumnIds) {
    return viewModel;
  }

  const newUi = {
    ...viewModel.erDiagram.ui,
    hover: { type: 'edge' as const, id: edgeId },
    highlightedNodeIds: optimizedNodeIds,
    highlightedEdgeIds: optimizedEdgeIds,
    highlightedColumnIds: optimizedColumnIds,
  };

  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      ui: newUi,
    },
  };
}

/**
 * カラムにホバーした時のAction
 * @param viewModel 現在の状態
 * @param columnId ホバーしたカラムのID
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionHoverColumn(
  viewModel: ViewModel,
  columnId: string
): ViewModel {
  // ドラッグ中はホバーイベントを無視
  if (viewModel.erDiagram.ui.isDraggingEntity) {
    return viewModel;
  }

  // エンティティ選択中はホバーイベントを無視
  if (viewModel.ui.selectedItem?.kind === 'entity') {
    return viewModel;
  }

  const highlightedNodeIds = new Set<string>();
  const highlightedEdgeIds = new Set<string>();
  const highlightedColumnIds = new Set<string>([columnId]);

  // インデックスを使ってカラムの所属エンティティを高速検索（O(1)）
  const ownerEntityId = viewModel.erDiagram.index.columnToEntity[columnId];

  if (!ownerEntityId) {
    console.warn(`Column owner not found: ${columnId}`);
    return viewModel;
  }

  highlightedNodeIds.add(ownerEntityId);

  // インデックスを使ってカラムに接続されているエッジを高速検索（O(1)）
  const connectedEdgeIds = viewModel.erDiagram.index.columnToEdges[columnId] || [];
  
  for (const edgeId of connectedEdgeIds) {
    const edge = viewModel.erDiagram.edges[edgeId];
    if (!edge) continue;
    
    highlightedEdgeIds.add(edgeId);
    // エッジの両端のノードもハイライト
    highlightedNodeIds.add(edge.sourceEntityId);
    highlightedNodeIds.add(edge.targetEntityId);
    // エッジに関連するもう一方のカラムもハイライト
    highlightedColumnIds.add(edge.sourceColumnId);
    highlightedColumnIds.add(edge.targetColumnId);
  }

  // 配列に変換
  const newHighlightedNodeIds = Array.from(highlightedNodeIds);
  const newHighlightedEdgeIds = Array.from(highlightedEdgeIds);
  const newHighlightedColumnIds = Array.from(highlightedColumnIds);

  // 既存の配列と内容が同じ場合は既存の参照を再利用（再レンダリング最適化）
  const optimizedNodeIds = optimizeArray(newHighlightedNodeIds, viewModel.erDiagram.ui.highlightedNodeIds);
  const optimizedEdgeIds = optimizeArray(newHighlightedEdgeIds, viewModel.erDiagram.ui.highlightedEdgeIds);
  const optimizedColumnIds = optimizeArray(newHighlightedColumnIds, viewModel.erDiagram.ui.highlightedColumnIds);

  // すべての配列が既存と同じ参照で、hoverも同じ場合は全体として同一参照を返す
  const currentHover = viewModel.erDiagram.ui.hover;
  const isSameHover = currentHover?.type === 'column' && currentHover.id === columnId;
  if (isSameHover &&
      optimizedNodeIds === viewModel.erDiagram.ui.highlightedNodeIds &&
      optimizedEdgeIds === viewModel.erDiagram.ui.highlightedEdgeIds &&
      optimizedColumnIds === viewModel.erDiagram.ui.highlightedColumnIds) {
    return viewModel;
  }

  const newUi = {
    ...viewModel.erDiagram.ui,
    hover: { type: 'column' as const, id: columnId },
    highlightedNodeIds: optimizedNodeIds,
    highlightedEdgeIds: optimizedEdgeIds,
    highlightedColumnIds: optimizedColumnIds,
  };

  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      ui: newUi,
    },
  };
}

/**
 * ホバーを解除した時のAction
 * @param viewModel 現在の状態
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionClearHover(
  viewModel: ViewModel
): ViewModel {
  // エンティティ選択中は、ハイライト状態を維持してhoverのみをクリア
  if (viewModel.ui.selectedItem?.kind === 'entity') {
    // hoverが既にnullなら同一参照を返す
    if (viewModel.erDiagram.ui.hover === null) {
      return viewModel;
    }

    const newUi = {
      ...viewModel.erDiagram.ui,
      hover: null,
      // highlightedNodeIds, highlightedEdgeIds, highlightedColumnIds は維持
    };

    return {
      ...viewModel,
      erDiagram: {
        ...viewModel.erDiagram,
        ui: newUi,
      },
    };
  }

  // エンティティ未選択時は、ハイライト状態もクリア
  // すでにクリアされている場合は同一参照を返す
  if (
    viewModel.erDiagram.ui.hover === null &&
    viewModel.erDiagram.ui.highlightedNodeIds.length === 0 &&
    viewModel.erDiagram.ui.highlightedEdgeIds.length === 0 &&
    viewModel.erDiagram.ui.highlightedColumnIds.length === 0
  ) {
    return viewModel;
  }

  const newUi = {
    ...viewModel.erDiagram.ui,
    hover: null,
    highlightedNodeIds: [],
    highlightedEdgeIds: [],
    highlightedColumnIds: [],
  };

  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      ui: newUi,
    },
  };
}

/**
 * エンティティドラッグ開始のAction
 * @param viewModel 現在の状態
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionStartEntityDrag(
  viewModel: ViewModel
): ViewModel {
  // すでにドラッグ中の場合は同一参照を返す
  if (viewModel.erDiagram.ui.isDraggingEntity) {
    return viewModel;
  }

  const newUi = {
    ...viewModel.erDiagram.ui,
    isDraggingEntity: true,
    hover: null,
    highlightedNodeIds: [],
    highlightedEdgeIds: [],
    highlightedColumnIds: [],
  };

  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      ui: newUi,
    },
  };
}

/**
 * エンティティドラッグ終了のAction
 * @param viewModel 現在の状態
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionStopEntityDrag(
  viewModel: ViewModel
): ViewModel {
  // すでにドラッグ停止状態の場合は同一参照を返す
  if (!viewModel.erDiagram.ui.isDraggingEntity) {
    return viewModel;
  }

  const newUi = {
    ...viewModel.erDiagram.ui,
    isDraggingEntity: false,
  };

  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      ui: newUi,
    },
  };
}
