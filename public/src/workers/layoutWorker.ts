import {
  SimpleForceDirectedLayout,
  RemoveOverlaps,
  SplitConnectedComponents,
  LouvainClustering,
  CoarseLayout,
  FineLayout,
  type LayoutNode,
  type LayoutEdge,
  type LayoutResult,
  type ClusteredNode
} from '../utils/layoutOptimizer';

interface StartMessage {
  type: 'start';
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

interface CancelMessage {
  type: 'cancel';
}

type WorkerMessage = StartMessage | CancelMessage;

interface ProgressMessage {
  type: 'progress';
  progress: number;
  stage: string;
}

interface CompleteMessage {
  type: 'complete';
  result: LayoutResult;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

type ResponseMessage = ProgressMessage | CompleteMessage | ErrorMessage;

let cancelFlag = false;

// メインスレッドからのメッセージを受信
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === 'cancel') {
    cancelFlag = true;
    return;
  }

  if (message.type === 'start') {
    cancelFlag = false;

    try {
      const { nodes, edges } = message;

      // 段階1: 準備（0〜10%）
      postProgress(5, '準備中...');
      if (cancelFlag) return;

      // 段階2: 連結成分分割（10〜15%）
      postProgress(10, '連結成分を分割中...');
      const components = SplitConnectedComponents(nodes, edges);
      if (cancelFlag) return;

      // 段階3: クラスタリング（15〜25%）
      postProgress(15, 'クラスタリング中...');
      const clusteredNodes = LouvainClustering(nodes, edges);
      if (cancelFlag) return;

      // 段階4: 粗レイアウト（25〜50%）
      postProgress(25, '粗レイアウト実行中...');
      const coarseResult = await CoarseLayout(
        clusteredNodes,
        edges,
        (progress, stage) => {
          const mappedProgress = 25 + (progress / 100) * 25;
          postProgress(mappedProgress, stage);
        },
        () => cancelFlag
      );

      if (cancelFlag) return;

      // 粗レイアウトの結果をノードに反映
      const coarseUpdatedNodes: ClusteredNode[] = clusteredNodes.map(node => {
        const resultNode = coarseResult.nodes.find(n => n.id === node.id);
        if (resultNode) {
          return {
            ...node,
            x: resultNode.x,
            y: resultNode.y
          };
        }
        return node;
      });

      // 段階5: 詳細レイアウト（50〜75%）
      postProgress(50, '詳細レイアウト実行中...');
      const fineResult = await FineLayout(
        coarseUpdatedNodes,
        edges,
        (progress, stage) => {
          const mappedProgress = 50 + (progress / 100) * 25;
          postProgress(mappedProgress, stage);
        },
        () => cancelFlag
      );

      if (cancelFlag) return;

      // 詳細レイアウトの結果をノードに反映
      const fineUpdatedNodes = nodes.map(node => {
        const resultNode = fineResult.nodes.find(n => n.id === node.id);
        if (resultNode) {
          return {
            ...node,
            x: resultNode.x,
            y: resultNode.y
          };
        }
        return node;
      });

      // 段階6: 重なり除去（75〜100%）
      postProgress(75, '重なり除去中...');
      const finalResult = await RemoveOverlaps(
        fineUpdatedNodes,
        (progress, stage) => {
          const mappedProgress = 75 + (progress / 100) * 25;
          postProgress(mappedProgress, stage);
        },
        () => cancelFlag
      );

      if (cancelFlag) return;

      // 完了メッセージを送信
      const completeMessage: CompleteMessage = {
        type: 'complete',
        result: finalResult
      };
      self.postMessage(completeMessage);
    } catch (error) {
      const errorMessage: ErrorMessage = {
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
      self.postMessage(errorMessage);
    }
  }
};

function postProgress(progress: number, stage: string) {
  const message: ProgressMessage = {
    type: 'progress',
    progress: Math.min(100, Math.max(0, progress)),
    stage
  };
  self.postMessage(message);
}
