import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
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
  viewModel: ViewModel,
  nodes: { [key: string]: EntityNodeViewModel },
  edges: { [key: string]: RelationshipEdgeViewModel }
): ViewModel {
  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      nodes,
      edges,
    },
  };
}

/**
 * ノード位置を更新するAction
 * @param viewModel 現在の状態
 * @param nodePositions 更新するノード位置の配列
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionUpdateNodePositions(
  viewModel: ViewModel,
  nodePositions: Array<{ id: string; x: number; y: number }>
): ViewModel {
  let hasChanges = false;
  const newNodes = { ...viewModel.erDiagram.nodes };

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
    erDiagram: {
      ...viewModel.erDiagram,
      nodes: newNodes,
    },
  };
}

/**
 * ローディング状態を更新するAction
 * @param viewModel 現在の状態
 * @param loading ローディング中かどうか
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionSetLoading(
  viewModel: ViewModel,
  loading: boolean
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.erDiagram.loading === loading) {
    return viewModel;
  }

  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      loading,
    },
  };
}
