import {
  SimpleForceDirectedLayout,
  SplitConnectedComponents,
  packConnectedComponents,
  calculateSimilarityEdges,
  type LayoutNode,
  type LayoutEdge,
  type LayoutResult,
  type ConnectedComponent
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
      let { nodes, edges } = message;
      
      // サイズが0の場合はフォールバック値を使用
      nodes = nodes.map(node => {
        if (node.width > 0 && node.height > 0) {
          return node;
        }
        // フォールバック値を計算
        const columnCount = 0; // 簡易実装：ノード情報にカラム数がないため0とする
        const fallbackWidth = 200;
        const fallbackHeight = 40 + columnCount * 28;
        
        return {
          ...node,
          width: node.width > 0 ? node.width : fallbackWidth,
          height: node.height > 0 ? node.height : fallbackHeight,
        };
      });

      // 段階1: 準備・連結成分分割（0〜10%）
      postProgress(5, '連結成分分割');
      const components = SplitConnectedComponents(nodes, edges);
      if (cancelFlag) return;
      postProgress(10, '連結成分分割');

      // 段階2: 名前類似度計算（10〜20%）
      postProgress(15, '名前類似度計算');
      // 全成分のノードをマージして類似エッジを計算（内部でcalculateSimilarityEdgesが使用される）
      if (cancelFlag) return;
      postProgress(20, '名前類似度計算');

      // 段階3: 成分内配置最適化（20〜80%）
      const optimizedComponents: ConnectedComponent[] = [];
      const componentProgressStep = components.length > 0 ? 60 / components.length : 60;
      
      for (let i = 0; i < components.length; i++) {
        if (cancelFlag) return;
        
        const component = components[i];
        const baseProgress = 20 + (i * componentProgressStep);
        
        postProgress(baseProgress, `成分${i + 1}配置最適化`);
        
        // SimpleForceDirectedLayoutを実行（名前類似エッジは内部で計算される）
        const layoutResult = await SimpleForceDirectedLayout(
          component.nodes,
          component.edges,
          (progress, stage) => {
            const mappedProgress = baseProgress + (progress / 100) * componentProgressStep;
            postProgress(mappedProgress, stage);
          },
          () => cancelFlag
        );
        
        if (cancelFlag) return;
        
        // 結果をノードに反映
        const updatedNodes = component.nodes.map(node => {
          const resultNode = layoutResult.nodes.find(n => n.id === node.id);
          if (resultNode) {
            return {
              ...node,
              x: resultNode.x,
              y: resultNode.y
            };
          }
          return node;
        });
        
        optimizedComponents.push({
          nodes: updatedNodes,
          edges: component.edges
        });
      }

      if (cancelFlag) return;

      // 段階4: 連結成分パッキング（80〜100%）
      postProgress(80, 'パッキング');
      const finalResult = await packConnectedComponents(optimizedComponents, 50);
      
      if (cancelFlag) return;
      postProgress(100, 'パッキング');

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
