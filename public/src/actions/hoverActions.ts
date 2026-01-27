import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
type HoverTarget = components['schemas']['HoverTarget'];

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

  // ハイライト対象の収集
  const highlightedNodeIds = new Set<string>([entityId]);
  const highlightedEdgeIds = new Set<string>();
  const highlightedColumnIds = new Set<string>();

  // エンティティに接続されているエッジを検索
  for (const [edgeId, edge] of Object.entries(viewModel.erDiagram.edges)) {
    if (edge.sourceEntityId === entityId || edge.targetEntityId === entityId) {
      highlightedEdgeIds.add(edgeId);
      // 接続先のノードもハイライト
      highlightedNodeIds.add(edge.sourceEntityId);
      highlightedNodeIds.add(edge.targetEntityId);
      // エッジに関連するカラムもハイライト
      highlightedColumnIds.add(edge.sourceColumnId);
      highlightedColumnIds.add(edge.targetColumnId);
    }
  }

  // 新しいUI状態を作成（既存のlayerOrderを保持）
  const newUi = {
    ...viewModel.erDiagram.ui,
    hover: { type: 'entity' as const, id: entityId },
    highlightedNodeIds: Array.from(highlightedNodeIds),
    highlightedEdgeIds: Array.from(highlightedEdgeIds),
    highlightedColumnIds: Array.from(highlightedColumnIds),
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

  const edge = viewModel.erDiagram.edges[edgeId];
  
  if (!edge) {
    console.warn(`Edge not found: ${edgeId}`);
    return viewModel;
  }

  // エッジと両端のノード、両端のカラムをハイライト
  const highlightedNodeIds = [edge.sourceEntityId, edge.targetEntityId];
  const highlightedEdgeIds = [edgeId];
  const highlightedColumnIds = [edge.sourceColumnId, edge.targetColumnId];

  const newUi = {
    ...viewModel.erDiagram.ui,
    hover: { type: 'edge' as const, id: edgeId },
    highlightedNodeIds,
    highlightedEdgeIds,
    highlightedColumnIds,
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

  const highlightedNodeIds = new Set<string>();
  const highlightedEdgeIds = new Set<string>();
  const highlightedColumnIds = new Set<string>([columnId]);

  // カラムを持つエンティティを検索
  let ownerEntityId: string | null = null;
  for (const [nodeId, node] of Object.entries(viewModel.erDiagram.nodes)) {
    if (node.columns.some(col => col.id === columnId)) {
      ownerEntityId = nodeId;
      highlightedNodeIds.add(nodeId);
      break;
    }
  }

  if (!ownerEntityId) {
    console.warn(`Column owner not found: ${columnId}`);
    return viewModel;
  }

  // カラムに関連するエッジを検索
  for (const [edgeId, edge] of Object.entries(viewModel.erDiagram.edges)) {
    if (edge.sourceColumnId === columnId || edge.targetColumnId === columnId) {
      highlightedEdgeIds.add(edgeId);
      // エッジの両端のノードもハイライト
      highlightedNodeIds.add(edge.sourceEntityId);
      highlightedNodeIds.add(edge.targetEntityId);
      // エッジに関連するもう一方のカラムもハイライト
      highlightedColumnIds.add(edge.sourceColumnId);
      highlightedColumnIds.add(edge.targetColumnId);
    }
  }

  const newUi = {
    ...viewModel.erDiagram.ui,
    hover: { type: 'column' as const, id: columnId },
    highlightedNodeIds: Array.from(highlightedNodeIds),
    highlightedEdgeIds: Array.from(highlightedEdgeIds),
    highlightedColumnIds: Array.from(highlightedColumnIds),
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
