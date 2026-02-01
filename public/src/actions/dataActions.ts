import type { 
  ViewModel, 
  EntityNodeViewModel, 
  RelationshipEdgeViewModel, 
  ERDiagramViewModel,
  ERData,
  DatabaseConnectionState,
  Entity,
  Relationship,
  LayerItemRef
} from '../api/client';
import { buildERDiagramIndex } from '../utils/buildERDiagramIndex';

/**
 * ViewModel全体を更新するAction
 * @param viewModel 現在の状態（未使用だが、インタフェースの一貫性のため引数として受け取る）
 * @param newViewModel 新しいViewModel
 * @returns 新しいViewModel
 */
export function actionSetViewModel(
  viewModel: ViewModel,
  newViewModel: ViewModel
): ViewModel {
  return newViewModel;
}

/**
 * リバースエンジニア結果を設定するAction
 * @param viewModel 現在の状態
 * @param erDiagram ERDiagramViewModel全体
 * @returns 新しい状態
 */
export function actionSetData(
  viewModel: ViewModel,
  erDiagram: ERDiagramViewModel
): ViewModel {
  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      ...erDiagram,
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

/**
 * ノードサイズを更新するAction
 * @param viewModel 現在の状態
 * @param updates 更新するノードサイズの配列
 * @returns 新しい状態（変化がない場合は同一参照）
 */
export function actionUpdateNodeSizes(
  viewModel: ViewModel,
  updates: Array<{ id: string; width: number; height: number }>
): ViewModel {
  let hasChanges = false;
  const newNodes = { ...viewModel.erDiagram.nodes };

  for (const update of updates) {
    const node = newNodes[update.id];
    if (node && (node.width !== update.width || node.height !== update.height)) {
      newNodes[update.id] = {
        ...node,
        width: update.width,
        height: update.height,
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
 * ERDataを既存ViewModelとマージするAction
 * 増分リバースエンジニアリング機能の実装
 * 
 * @param viewModel 現在のViewModel
 * @param erData データベースから取得したERData
 * @param connectionInfo データベース接続情報
 * @returns 新しいViewModel
 */
export function actionMergeERData(
  viewModel: ViewModel,
  erData: ERData,
  connectionInfo: DatabaseConnectionState
): ViewModel {
  const existingNodes = viewModel.erDiagram.nodes;
  const isIncrementalMode = Object.keys(existingNodes).length > 0;
  
  // デフォルトレイアウト定数
  const HORIZONTAL_SPACING = 300;
  const VERTICAL_SPACING = 200;
  const START_X = 50;
  const START_Y = 50;
  
  // テーブル名をキーにした既存ノードのマップを作成（増分モードのみ）
  const existingNodesByName = new Map<string, EntityNodeViewModel>();
  if (isIncrementalMode) {
    Object.values(existingNodes).forEach((node: EntityNodeViewModel) => {
      existingNodesByName.set(node.name, node);
    });
  }
  
  // 新規エンティティ数をカウント
  let newEntityCount = 0;
  if (isIncrementalMode) {
    erData.entities.forEach((entity: Entity) => {
      const existingNode = existingNodesByName.get(entity.name);
      if (!existingNode) {
        newEntityCount++;
      }
    });
  }
  
  // 列数を動的に計算
  let entitiesPerRow: number;
  if (isIncrementalMode) {
    // 増分モード: 新規エンティティ数から計算（0の場合は1）
    entitiesPerRow = newEntityCount > 0 ? Math.ceil(Math.sqrt(newEntityCount)) : 1;
  } else {
    // 通常モード: 全エンティティ数から計算
    entitiesPerRow = Math.ceil(Math.sqrt(erData.entities.length));
  }
  
  // 新しいノード・エッジを構築
  const newNodes: Record<string, EntityNodeViewModel> = {};
  const newEdges: Record<string, RelationshipEdgeViewModel> = {};
  
  // 既存エンティティの最大座標を計算（増分モード用）
  let maxX = START_X;
  let maxY = START_Y;
  if (isIncrementalMode) {
    Object.values(existingNodes).forEach((node: EntityNodeViewModel) => {
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    });
  }
  
  // 新規エンティティ配置用の変数
  let newEntityIndex = 0;
  let currentX = maxX + HORIZONTAL_SPACING;
  let currentY = maxY;
  
  // エンティティ処理
  erData.entities.forEach((entity: Entity, index: number) => {
    const existingNode = existingNodesByName.get(entity.name);
    
    let x: number;
    let y: number;
    
    if (existingNode) {
      // 既存エンティティ: 座標とIDを維持
      x = existingNode.x;
      y = existingNode.y;
    } else if (isIncrementalMode) {
      // 増分モード: 新規エンティティは既存の右側・下側に配置
      if (newEntityIndex > 0 && newEntityIndex % entitiesPerRow === 0) {
        // 次の行へ
        currentX = maxX + HORIZONTAL_SPACING;
        currentY += VERTICAL_SPACING;
      }
      
      x = currentX;
      y = currentY;
      
      currentX += HORIZONTAL_SPACING;
      newEntityIndex++;
    } else {
      // 通常モード: グリッドレイアウト
      const col = index % entitiesPerRow;
      const row = Math.floor(index / entitiesPerRow);
      x = START_X + (col * HORIZONTAL_SPACING);
      y = START_Y + (row * VERTICAL_SPACING);
    }
    
    // エンティティノードを作成
    const node: EntityNodeViewModel = {
      id: existingNode?.id || entity.id,
      name: entity.name,
      columns: entity.columns,
      ddl: entity.ddl,
      x,
      y,
      width: existingNode?.width || 0,   // 既存ノードのサイズを保持、新規ノードは0
      height: existingNode?.height || 0, // 既存ノードのサイズを保持、新規ノードは0
    };
    
    newNodes[node.id] = node;
  });
  
  // リレーションシップ処理
  // ERDataのエンティティIDから新しいノードIDへのマッピングを作成
  const entityIdToNodeId = new Map<string, string>();
  erData.entities.forEach((entity: Entity) => {
    const node = Object.values(newNodes).find(n => n.name === entity.name);
    if (node) {
      entityIdToNodeId.set(entity.id, node.id);
    }
  });
  
  erData.relationships.forEach((relationship: Relationship) => {
    const sourceNodeId = entityIdToNodeId.get(relationship.fromEntityId);
    const targetNodeId = entityIdToNodeId.get(relationship.toEntityId);
    
    if (!sourceNodeId || !targetNodeId) {
      // 削除されたエンティティへの参照は無視
      return;
    }
    
    const edge: RelationshipEdgeViewModel = {
      id: relationship.id,
      sourceEntityId: sourceNodeId,
      targetEntityId: targetNodeId,
      sourceColumnId: relationship.fromColumnId,
      targetColumnId: relationship.toColumnId,
      constraintName: relationship.constraintName,
    };
    
    newEdges[edge.id] = edge;
  });
  
  // 削除されたエンティティのIDセットを作成
  const newNodeIds = new Set(Object.keys(newNodes));
  const deletedNodeIds = new Set(
    Object.keys(existingNodes).filter(id => !newNodeIds.has(id))
  );
  
  // レイヤー順序から削除されたエンティティを除外
  const newLayerOrder = {
    backgroundItems: viewModel.erDiagram.ui.layerOrder.backgroundItems.filter((item: LayerItemRef) => {
      if (item.kind === 'entity') {
        return !deletedNodeIds.has(item.id);
      }
      return true;
    }),
    foregroundItems: viewModel.erDiagram.ui.layerOrder.foregroundItems.filter((item: LayerItemRef) => {
      if (item.kind === 'entity') {
        return !deletedNodeIds.has(item.id);
      }
      return true;
    }),
  };
  
  // 逆引きインデックスを再計算
  const newIndex = buildERDiagramIndex(newNodes, newEdges);
  
  // 新しいViewModelを構築
  return {
    ...viewModel,
    erDiagram: {
      ...viewModel.erDiagram,
      nodes: newNodes,
      edges: newEdges,
      // 矩形とテキストは維持
      rectangles: viewModel.erDiagram.rectangles,
      texts: viewModel.erDiagram.texts,
      index: newIndex,
      ui: {
        ...viewModel.erDiagram.ui,
        // UI状態をクリア
        highlightedNodeIds: [],
        highlightedEdgeIds: [],
        highlightedColumnIds: [],
        layerOrder: newLayerOrder,
      },
    },
    settings: {
      ...viewModel.settings,
      lastDatabaseConnection: connectionInfo,
    },
  };
}
