import type { components } from '../../../lib/generated/api-types';

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];
type EntityNodeViewModel = components['schemas']['EntityNodeViewModel'];
type RelationshipEdgeViewModel = components['schemas']['RelationshipEdgeViewModel'];

/**
 * リバースエンジニア結果を設定するAction
 * @param viewModel 現在の状態
 * @param nodes エンティティノードのRecord
 * @param edges リレーションシップエッジのRecord
 * @returns 新しい状態
 */
export function actionSetData(
  viewModel: ERDiagramViewModel,
  nodes: { [key: string]: EntityNodeViewModel },
  edges: { [key: string]: RelationshipEdgeViewModel }
): ERDiagramViewModel {
  return {
    ...viewModel,
    nodes,
    edges,
  };
}

/**
 * ノード位置を更新するAction
 * @param viewModel 現在の状態
 * @param nodePositions 更新するノード位置の配列
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionUpdateNodePositions(
  viewModel: ERDiagramViewModel,
  nodePositions: Array<{ id: string; x: number; y: number }>
): ERDiagramViewModel {
  let hasChanges = false;
  const newNodes = { ...viewModel.nodes };

  for (const position of nodePositions) {
    const node = newNodes[position.id];
    if (node && (node.x !== position.x || node.y !== position.y)) {
      newNodes[position.id] = {
        ...node,
        x: position.x,
        y: position.y,
      };
      hasChanges = true;
    }
  }

  // 変化がない場合は同一参照を返す
  if (!hasChanges) {
    return viewModel;
  }

  return {
    ...viewModel,
    nodes: newNodes,
  };
}

/**
 * ローディング状態を更新するAction
 * @param viewModel 現在の状態
 * @param loading ローディング中かどうか
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionSetLoading(
  viewModel: ERDiagramViewModel,
  loading: boolean
): ERDiagramViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.loading === loading) {
    return viewModel;
  }

  return {
    ...viewModel,
    loading,
  };
}
