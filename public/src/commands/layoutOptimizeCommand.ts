import type { Store } from '../store/erDiagramStore';
import type { ViewModel } from '../api/client';
import {
  actionStartLayoutOptimization,
  actionUpdateLayoutProgress,
  actionCompleteLayoutOptimization,
  actionCancelLayoutOptimization
} from '../actions/layoutActions';
import { actionUpdateNodePositions } from '../actions/dataActions';
import type { LayoutNode, LayoutEdge, LayoutResult } from '../utils/layoutOptimizer';

// Web Workerインスタンスをモジュールスコープで保持
let worker: Worker | null = null;

/**
 * 配置最適化を実行するCommand
 * @param dispatch Store.dispatch関数
 * @param getState Store.getState関数
 */
export async function commandLayoutOptimize(
  dispatch: Store['dispatch'],
  getState: Store['getState']
): Promise<void> {
  const viewModel = getState() as ViewModel;

  // エンティティノードが存在しない場合は何もしない
  const entityNodes = Object.values(viewModel.erDiagram.nodes);
  if (entityNodes.length === 0) {
    console.warn('No entity nodes to optimize');
    return;
  }

  // すでに実行中の場合は何もしない
  if (viewModel.ui.layoutOptimization.isRunning) {
    console.warn('Layout optimization is already running');
    return;
  }

  // 最適化開始
  dispatch(actionStartLayoutOptimization);

  try {
    // ノードとエッジのデータを準備
    // 注: 現在、EntityNodeViewModelにmeasuredフィールドがないため、
    // デフォルトサイズを使用しています。将来的には実際の計測サイズを使用すべきです。
    const nodes: LayoutNode[] = entityNodes.map(node => {
      // カラム数に応じた概算の高さを計算
      const estimatedHeight = 40 + (node.columns.length * 28); // ヘッダー40px + カラムごとに約28px
      return {
        id: node.id,
        x: node.x,
        y: node.y,
        width: 200, // デフォルト幅
        height: estimatedHeight
      };
    });

    const edges: LayoutEdge[] = Object.values(viewModel.erDiagram.edges).map(edge => ({
      source: edge.sourceEntityId,
      target: edge.targetEntityId
    }));

    // Web Workerを作成
    if (!worker) {
      worker = new Worker(
        new URL('../workers/layoutWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }

    // Workerからのメッセージを処理
    const result = await new Promise<LayoutResult>((resolve, reject) => {
      if (!worker) {
        reject(new Error('Worker is not initialized'));
        return;
      }

      worker.onmessage = (event) => {
        const message = event.data;

        if (message.type === 'progress') {
          // 進捗更新
          dispatch(actionUpdateLayoutProgress, message.progress, message.stage);
        } else if (message.type === 'complete') {
          // 完了
          resolve(message.result);
        } else if (message.type === 'error') {
          // エラー
          reject(new Error(message.error));
        }
      };

      worker.onerror = (error) => {
        reject(error);
      };

      // 最適化開始メッセージを送信
      worker.postMessage({
        type: 'start',
        nodes,
        edges
      });
    });

    // 座標を更新
    const positionUpdates = result.nodes.map(node => ({
      id: node.id,
      x: node.x,
      y: node.y
    }));

    dispatch(actionUpdateNodePositions, positionUpdates);

    // 最適化完了
    dispatch(actionCompleteLayoutOptimization);
  } catch (error) {
    console.error('Failed to optimize layout:', error);
    // エラー時もキャンセル扱いにする
    dispatch(actionCancelLayoutOptimization);
  }
}

/**
 * 配置最適化をキャンセルするCommand
 */
export function commandCancelLayoutOptimize(
  dispatch: Store['dispatch']
): void {
  if (worker) {
    // Workerにキャンセルメッセージを送信
    worker.postMessage({ type: 'cancel' });
  }

  // キャンセル状態に更新
  dispatch(actionCancelLayoutOptimization);
}
