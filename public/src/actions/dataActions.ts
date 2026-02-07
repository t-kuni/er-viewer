import type { 
  ViewModel, 
  EntityNodeViewModel, 
  RelationshipEdgeViewModel, 
  ERDiagramViewModel,
  ERData,
  DatabaseConnectionState,
  Entity,
  Relationship,
  LayerItemRef,
  ReverseEngineeringHistoryEntry,
  ReverseEngineeringSummary,
  ReverseEngineeringChanges,
  TableChanges,
  ColumnChanges,
  RelationshipChanges,
  ColumnRef,
  ColumnModification,
  RelationshipRef,
  ColumnSnapshot,
  Column
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
  
  // 差分情報収集用の変数（履歴記録用）
  const addedTables: string[] = [];
  const removedTables: string[] = [];
  const addedColumns: ColumnRef[] = [];
  const removedColumns: ColumnRef[] = [];
  const modifiedColumns: ColumnModification[] = [];
  const addedRelationships: RelationshipRef[] = [];
  const removedRelationships: RelationshipRef[] = [];
  
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
      
      // カラムの差分を検出（増分モードの場合）
      if (isIncrementalMode) {
        const existingColumnNames = new Set(existingNode.columns.map((col: Column) => col.name));
        const newColumnNames = new Set(entity.columns.map((col: Column) => col.name));
        
        // 追加されたカラム
        for (const col of entity.columns) {
          if (!existingColumnNames.has(col.name)) {
            addedColumns.push({ tableName: entity.name, columnName: col.name });
          }
        }
        
        // 削除されたカラム
        for (const col of existingNode.columns) {
          if (!newColumnNames.has(col.name)) {
            removedColumns.push({ tableName: entity.name, columnName: col.name });
          }
        }
        
        // 変更されたカラム
        for (const newCol of entity.columns) {
          const existingCol = existingNode.columns.find((c: Column) => c.name === newCol.name);
          if (existingCol) {
            // スナップショット比較
            const hasChanges = 
              existingCol.key !== newCol.key ||
              existingCol.isForeignKey !== newCol.isForeignKey;
            
            if (hasChanges) {
              modifiedColumns.push({
                tableName: entity.name,
                columnName: newCol.name,
                before: {
                  key: existingCol.key,
                  isForeignKey: existingCol.isForeignKey,
                },
                after: {
                  key: newCol.key,
                  isForeignKey: newCol.isForeignKey,
                },
              });
            }
          }
        }
      }
    } else {
      // 新規エンティティ
      if (isIncrementalMode) {
        // 増分モードの場合は追加テーブルとして記録
        addedTables.push(entity.name);
        
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
  
  // 削除されたテーブルを記録（増分モードの場合）
  if (isIncrementalMode) {
    for (const deletedId of deletedNodeIds) {
      const deletedNode = existingNodes[deletedId];
      if (deletedNode) {
        removedTables.push(deletedNode.name);
      }
    }
  }
  
  // リレーションの差分を検出（増分モードの場合）
  if (isIncrementalMode) {
    // リレーションキー生成のヘルパー関数
    const makeRelationshipKey = (edge: RelationshipEdgeViewModel): string => {
      if (edge.constraintName) {
        return edge.constraintName;
      }
      const sourceNode = newNodes[edge.sourceEntityId] || existingNodes[edge.sourceEntityId];
      const targetNode = newNodes[edge.targetEntityId] || existingNodes[edge.targetEntityId];
      const sourceColumn = sourceNode?.columns.find((c: Column) => c.id === edge.sourceColumnId);
      const targetColumn = targetNode?.columns.find((c: Column) => c.id === edge.targetColumnId);
      return `${sourceNode?.name}.${sourceColumn?.name}->${targetNode?.name}.${targetColumn?.name}`;
    };
    
    // 既存リレーションのキーセット
    const existingRelKeys = new Set<string>();
    const existingRelByKey = new Map<string, RelationshipEdgeViewModel>();
    Object.values(viewModel.erDiagram.edges).forEach((edge: RelationshipEdgeViewModel) => {
      const key = makeRelationshipKey(edge);
      existingRelKeys.add(key);
      existingRelByKey.set(key, edge);
    });
    
    // 新規リレーションのキーセット
    const newRelKeys = new Set<string>();
    const newRelByKey = new Map<string, RelationshipEdgeViewModel>();
    Object.values(newEdges).forEach((edge: RelationshipEdgeViewModel) => {
      const key = makeRelationshipKey(edge);
      newRelKeys.add(key);
      newRelByKey.set(key, edge);
    });
    
    // 追加されたリレーション
    for (const key of newRelKeys) {
      if (!existingRelKeys.has(key)) {
        const edge = newRelByKey.get(key)!;
        const sourceNode = newNodes[edge.sourceEntityId];
        const targetNode = newNodes[edge.targetEntityId];
        const sourceColumn = sourceNode?.columns.find((c: Column) => c.id === edge.sourceColumnId);
        const targetColumn = targetNode?.columns.find((c: Column) => c.id === edge.targetColumnId);
        
        addedRelationships.push({
          constraintName: edge.constraintName || undefined,
          fromTable: sourceNode?.name || '',
          fromColumn: sourceColumn?.name || '',
          toTable: targetNode?.name || '',
          toColumn: targetColumn?.name || '',
        });
      }
    }
    
    // 削除されたリレーション
    for (const key of existingRelKeys) {
      if (!newRelKeys.has(key)) {
        const edge = existingRelByKey.get(key)!;
        const sourceNode = existingNodes[edge.sourceEntityId];
        const targetNode = existingNodes[edge.targetEntityId];
        const sourceColumn = sourceNode?.columns.find((c: Column) => c.id === edge.sourceColumnId);
        const targetColumn = targetNode?.columns.find((c: Column) => c.id === edge.targetColumnId);
        
        removedRelationships.push({
          constraintName: edge.constraintName || undefined,
          fromTable: sourceNode?.name || '',
          fromColumn: sourceColumn?.name || '',
          toTable: targetNode?.name || '',
          toColumn: targetColumn?.name || '',
        });
      }
    }
  }
  
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
  
  // 履歴エントリを作成
  const timestamp = Date.now();
  const historyEntry: ReverseEngineeringHistoryEntry = {
    timestamp,
    entryType: isIncrementalMode ? 'incremental' : 'initial',
  };
  
  // サマリー情報を作成
  const summary: ReverseEngineeringSummary = {
    addedTables: addedTables.length,
    removedTables: removedTables.length,
    addedColumns: addedColumns.length,
    removedColumns: removedColumns.length,
    modifiedColumns: modifiedColumns.length,
    addedRelationships: addedRelationships.length,
    removedRelationships: removedRelationships.length,
  };
  
  // 初回の場合は総件数も追加
  if (!isIncrementalMode) {
    summary.totalTables = erData.entities.length;
    summary.totalColumns = erData.entities.reduce((sum: number, entity: Entity) => sum + entity.columns.length, 0);
    summary.totalRelationships = erData.relationships.length;
  }
  
  historyEntry.summary = summary;
  
  // 増分の場合は詳細な変更情報も追加
  if (isIncrementalMode) {
    const changes: ReverseEngineeringChanges = {};
    
    // テーブルの変更
    if (addedTables.length > 0 || removedTables.length > 0) {
      const tableChanges: TableChanges = {};
      if (addedTables.length > 0) tableChanges.added = addedTables;
      if (removedTables.length > 0) tableChanges.removed = removedTables;
      changes.tables = tableChanges;
    }
    
    // カラムの変更
    if (addedColumns.length > 0 || removedColumns.length > 0 || modifiedColumns.length > 0) {
      const columnChanges: ColumnChanges = {};
      if (addedColumns.length > 0) columnChanges.added = addedColumns;
      if (removedColumns.length > 0) columnChanges.removed = removedColumns;
      if (modifiedColumns.length > 0) columnChanges.modified = modifiedColumns;
      changes.columns = columnChanges;
    }
    
    // リレーションの変更
    if (addedRelationships.length > 0 || removedRelationships.length > 0) {
      const relationshipChanges: RelationshipChanges = {};
      if (addedRelationships.length > 0) relationshipChanges.added = addedRelationships;
      if (removedRelationships.length > 0) relationshipChanges.removed = removedRelationships;
      changes.relationships = relationshipChanges;
    }
    
    // 変更がある場合のみchangesを設定
    if (Object.keys(changes).length > 0) {
      historyEntry.changes = changes;
    }
  }
  
  // 既存の履歴配列に新しいエントリを追加
  const existingHistory = viewModel.erDiagram.history || [];
  const newHistory = [...existingHistory, historyEntry];
  
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
      history: newHistory,
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
