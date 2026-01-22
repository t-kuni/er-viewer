import type { components } from '../../../lib/generated/api-types';

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];
type HoverTarget = components['schemas']['HoverTarget'];

/**
 * Action関数の型定義
 */
export type ActionFn<Args extends any[] = any[]> = (
  viewModel: ERDiagramViewModel,
  ...args: Args
) => ERDiagramViewModel;

/**
 * エンティティにホバーした時のAction
 * @param viewModel 現在の状態
 * @param entityId ホバーしたエンティティのID
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionHoverEntity(
  viewModel: ERDiagramViewModel,
  entityId: string
): ERDiagramViewModel {
  // ハイライト対象の収集
  const highlightedNodeIds = new Set<string>([entityId]);
  const highlightedEdgeIds = new Set<string>();
  const highlightedColumnIds = new Set<string>();

  // エンティティに接続されているエッジを検索
  for (const [edgeId, edge] of Object.entries(viewModel.edges)) {
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

  // 新しいUI状態を作成
  const newUi = {
    hover: { type: 'entity' as const, id: entityId },
    highlightedNodeIds: Array.from(highlightedNodeIds),
    highlightedEdgeIds: Array.from(highlightedEdgeIds),
    highlightedColumnIds: Array.from(highlightedColumnIds),
  };

  return {
    ...viewModel,
    ui: newUi,
  };
}

/**
 * エッジにホバーした時のAction
 * @param viewModel 現在の状態
 * @param edgeId ホバーしたエッジのID
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionHoverEdge(
  viewModel: ERDiagramViewModel,
  edgeId: string
): ERDiagramViewModel {
  const edge = viewModel.edges[edgeId];
  
  if (!edge) {
    console.warn(`Edge not found: ${edgeId}`);
    return viewModel;
  }

  // エッジと両端のノード、両端のカラムをハイライト
  const highlightedNodeIds = [edge.sourceEntityId, edge.targetEntityId];
  const highlightedEdgeIds = [edgeId];
  const highlightedColumnIds = [edge.sourceColumnId, edge.targetColumnId];

  const newUi = {
    hover: { type: 'edge' as const, id: edgeId },
    highlightedNodeIds,
    highlightedEdgeIds,
    highlightedColumnIds,
  };

  return {
    ...viewModel,
    ui: newUi,
  };
}

/**
 * カラムにホバーした時のAction
 * @param viewModel 現在の状態
 * @param columnId ホバーしたカラムのID
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionHoverColumn(
  viewModel: ERDiagramViewModel,
  columnId: string
): ERDiagramViewModel {
  const highlightedNodeIds = new Set<string>();
  const highlightedEdgeIds = new Set<string>();
  const highlightedColumnIds = new Set<string>([columnId]);

  // カラムを持つエンティティを検索
  let ownerEntityId: string | null = null;
  for (const [nodeId, node] of Object.entries(viewModel.nodes)) {
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
  for (const [edgeId, edge] of Object.entries(viewModel.edges)) {
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
    hover: { type: 'column' as const, id: columnId },
    highlightedNodeIds: Array.from(highlightedNodeIds),
    highlightedEdgeIds: Array.from(highlightedEdgeIds),
    highlightedColumnIds: Array.from(highlightedColumnIds),
  };

  return {
    ...viewModel,
    ui: newUi,
  };
}

/**
 * ホバーを解除した時のAction
 * @param viewModel 現在の状態
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionClearHover(
  viewModel: ERDiagramViewModel
): ERDiagramViewModel {
  // すでにクリアされている場合は同一参照を返す
  if (
    viewModel.ui.hover === null &&
    viewModel.ui.highlightedNodeIds.length === 0 &&
    viewModel.ui.highlightedEdgeIds.length === 0 &&
    viewModel.ui.highlightedColumnIds.length === 0
  ) {
    return viewModel;
  }

  const newUi = {
    hover: null,
    highlightedNodeIds: [],
    highlightedEdgeIds: [],
    highlightedColumnIds: [],
  };

  return {
    ...viewModel,
    ui: newUi,
  };
}
