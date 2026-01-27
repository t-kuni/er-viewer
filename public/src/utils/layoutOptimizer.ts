import * as d3 from 'd3-force';
import Graph from 'graphology';
import { connectedComponents } from 'graphology-components';
import louvain from 'graphology-communities-louvain';

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

export interface LayoutResult {
  nodes: Array<{ id: string; x: number; y: number }>;
}

export interface ConnectedComponent {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

export interface ClusteredNode extends LayoutNode {
  clusterId: number;
}

export type ProgressCallback = (progress: number, stage: string) => void;

/**
 * Force-directedレイアウトアルゴリズム
 * d3-forceを使用してノードを配置する
 */
export async function SimpleForceDirectedLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  onProgress?: ProgressCallback,
  cancelCheck?: () => boolean
): Promise<LayoutResult> {
  if (nodes.length === 0) {
    return { nodes: [] };
  }

  // ノード数に応じて反復回数を調整（最大500tick、最小200tick）
  const maxTicks = Math.max(200, Math.min(500, nodes.length * 2));
  
  // d3-force用のノードとリンクを準備
  type D3Node = { id: string; x: number; y: number; width: number; height: number };
  type D3Link = { source: string | D3Node; target: string | D3Node };
  
  const d3Nodes: D3Node[] = nodes.map(n => ({ ...n }));
  const d3Links: D3Link[] = edges.map(e => ({
    source: e.source,
    target: e.target
  }));

  // シミュレーションの設定
  const simulation = d3.forceSimulation(d3Nodes)
    .force('link', d3.forceLink(d3Links)
      .id((d: any) => d.id)
      .distance(150) // リンクの理想的な距離
    )
    .force('charge', d3.forceManyBody()
      .strength(-300) // ノード間の反発力
    )
    .force('center', d3.forceCenter(0, 0))
    .force('collision', d3.forceCollide()
      .radius((d: any) => Math.max(d.width, d.height) / 2 + 20) // 衝突半径
    )
    .stop(); // 自動実行を停止

  // 手動でtickを実行
  for (let i = 0; i < maxTicks; i++) {
    if (cancelCheck && cancelCheck()) {
      break;
    }

    simulation.tick();

    // 進捗報告（10回に1回）
    if (onProgress && i % 10 === 0) {
      const progress = (i / maxTicks) * 100;
      onProgress(progress, 'Force-directed Layout');
    }

    // 早期終了条件: エネルギーが閾値以下になったら終了
    if (simulation.alpha() < 0.01) {
      break;
    }
  }

  // 最終的な進捗報告
  if (onProgress) {
    onProgress(100, 'Force-directed Layout');
  }

  // 結果を返す
  return {
    nodes: d3Nodes.map(n => ({
      id: n.id,
      x: n.x,
      y: n.y
    }))
  };
}

/**
 * 連結成分分割
 * グラフを連結成分ごとに分割する
 */
export function SplitConnectedComponents(
  nodes: LayoutNode[],
  edges: LayoutEdge[]
): ConnectedComponent[] {
  if (nodes.length === 0) {
    return [];
  }

  // graphologyグラフを作成
  const graph = new Graph({ type: 'undirected' });
  
  // ノードを追加
  nodes.forEach(node => {
    graph.addNode(node.id, node);
  });

  // エッジを追加
  edges.forEach(edge => {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      try {
        graph.addEdge(edge.source, edge.target);
      } catch (e) {
        // エッジが既に存在する場合は無視
      }
    }
  });

  // 連結成分を取得
  const components = connectedComponents(graph);

  // 各連結成分をConnectedComponent形式に変換
  return components.map(componentNodeIds => {
    const componentNodes = componentNodeIds.map(id => graph.getNodeAttributes(id) as LayoutNode);
    const componentEdges = edges.filter(
      edge => componentNodeIds.includes(edge.source) && componentNodeIds.includes(edge.target)
    );
    return { nodes: componentNodes, edges: componentEdges };
  });
}

/**
 * Louvainクラスタリング
 * ノードをクラスタごとにグループ化する
 */
export function LouvainClustering(
  nodes: LayoutNode[],
  edges: LayoutEdge[]
): ClusteredNode[] {
  if (nodes.length === 0) {
    return [];
  }

  // graphologyグラフを作成
  const graph = new Graph({ type: 'undirected' });
  
  // ノードを追加
  nodes.forEach(node => {
    graph.addNode(node.id, node);
  });

  // エッジを追加
  edges.forEach(edge => {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      try {
        graph.addEdge(edge.source, edge.target);
      } catch (e) {
        // エッジが既に存在する場合は無視
      }
    }
  });

  // Louvainアルゴリズムを実行
  const communities = louvain(graph);

  // クラスタIDをノードに追加
  return nodes.map(node => ({
    ...node,
    clusterId: communities[node.id] || 0
  }));
}

/**
 * 空間ハッシュクラス
 * グリッドベースの空間分割で近傍ノードを高速検索
 */
export class SpatialHash {
  private grid: Map<string, LayoutNode[]>;
  private cellSize: number;

  constructor(cellSize: number = 200) {
    this.grid = new Map();
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  insert(node: LayoutNode): void {
    // ノードが占める全セルに挿入
    const minX = node.x - node.width / 2;
    const maxX = node.x + node.width / 2;
    const minY = node.y - node.height / 2;
    const maxY = node.y + node.height / 2;

    const startCellX = Math.floor(minX / this.cellSize);
    const endCellX = Math.floor(maxX / this.cellSize);
    const startCellY = Math.floor(minY / this.cellSize);
    const endCellY = Math.floor(maxY / this.cellSize);

    for (let x = startCellX; x <= endCellX; x++) {
      for (let y = startCellY; y <= endCellY; y++) {
        const key = `${x},${y}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(node);
      }
    }
  }

  queryNearby(node: LayoutNode): LayoutNode[] {
    const nearby = new Set<LayoutNode>();
    
    // ノード周辺のセルを検索
    const minX = node.x - node.width / 2 - 100; // マージン追加
    const maxX = node.x + node.width / 2 + 100;
    const minY = node.y - node.height / 2 - 100;
    const maxY = node.y + node.height / 2 + 100;

    const startCellX = Math.floor(minX / this.cellSize);
    const endCellX = Math.floor(maxX / this.cellSize);
    const startCellY = Math.floor(minY / this.cellSize);
    const endCellY = Math.floor(maxY / this.cellSize);

    for (let x = startCellX; x <= endCellX; x++) {
      for (let y = startCellY; y <= endCellY; y++) {
        const key = `${x},${y}`;
        const nodes = this.grid.get(key);
        if (nodes) {
          nodes.forEach(n => {
            if (n.id !== node.id) {
              nearby.add(n);
            }
          });
        }
      }
    }

    return Array.from(nearby);
  }

  clear(): void {
    this.grid.clear();
  }
}

/**
 * 粗レイアウト（クラスタ間の配置）
 * クラスタごとの中心座標を計算し、クラスタ間でForce-directedを実行
 */
export async function CoarseLayout(
  clusteredNodes: ClusteredNode[],
  edges: LayoutEdge[],
  onProgress?: ProgressCallback,
  cancelCheck?: () => boolean
): Promise<LayoutResult> {
  if (clusteredNodes.length === 0) {
    return { nodes: [] };
  }

  // クラスタごとにノードをグループ化
  const clusterMap = new Map<number, ClusteredNode[]>();
  clusteredNodes.forEach(node => {
    if (!clusterMap.has(node.clusterId)) {
      clusterMap.set(node.clusterId, []);
    }
    clusterMap.get(node.clusterId)!.push(node);
  });

  // クラスタの中心座標を計算
  const clusterCenters = Array.from(clusterMap.entries()).map(([clusterId, nodes]) => {
    const avgX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
    const avgY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;
    return { id: `cluster_${clusterId}`, x: avgX, y: avgY, clusterId };
  });

  // クラスタ間のエッジを抽出
  const clusterEdges = new Set<string>();
  edges.forEach(edge => {
    const sourceNode = clusteredNodes.find(n => n.id === edge.source);
    const targetNode = clusteredNodes.find(n => n.id === edge.target);
    if (sourceNode && targetNode && sourceNode.clusterId !== targetNode.clusterId) {
      const edgeKey = [sourceNode.clusterId, targetNode.clusterId].sort().join('-');
      clusterEdges.add(edgeKey);
    }
  });

  const clusterLinks = Array.from(clusterEdges).map(key => {
    const [source, target] = key.split('-');
    return {
      source: `cluster_${source}`,
      target: `cluster_${target}`
    };
  });

  // クラスタ間でForce-directedを実行（短時間: 100tick）
  const maxTicks = 100;
  type D3Node = { id: string; x: number; y: number; clusterId: number };
  type D3Link = { source: string | D3Node; target: string | D3Node };

  const d3Nodes: D3Node[] = clusterCenters.map(c => ({ ...c }));
  const d3Links: D3Link[] = clusterLinks;

  const simulation = d3.forceSimulation(d3Nodes)
    .force('link', d3.forceLink(d3Links)
      .id((d: any) => d.id)
      .distance(300) // クラスタ間の距離を大きくする
    )
    .force('charge', d3.forceManyBody()
      .strength(-500) // 反発力を強くする
    )
    .force('center', d3.forceCenter(0, 0))
    .stop();

  for (let i = 0; i < maxTicks; i++) {
    if (cancelCheck && cancelCheck()) {
      break;
    }

    simulation.tick();

    if (onProgress && i % 5 === 0) {
      const progress = (i / maxTicks) * 100;
      onProgress(progress, 'Coarse Layout');
    }

    if (simulation.alpha() < 0.01) {
      break;
    }
  }

  if (onProgress) {
    onProgress(100, 'Coarse Layout');
  }

  // クラスタの新しい中心座標をマップに格納
  const newClusterCenters = new Map<number, { x: number; y: number }>();
  d3Nodes.forEach(node => {
    newClusterCenters.set(node.clusterId, { x: node.x, y: node.y });
  });

  // 各ノードをクラスタの中心に相対的に配置
  const result: Array<{ id: string; x: number; y: number }> = [];
  clusterMap.forEach((nodes, clusterId) => {
    const oldCenter = {
      x: nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length,
      y: nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length
    };
    const newCenter = newClusterCenters.get(clusterId) || oldCenter;
    const offsetX = newCenter.x - oldCenter.x;
    const offsetY = newCenter.y - oldCenter.y;

    nodes.forEach(node => {
      result.push({
        id: node.id,
        x: node.x + offsetX,
        y: node.y + offsetY
      });
    });
  });

  return { nodes: result };
}

/**
 * 詳細レイアウト（クラスタ内の配置）
 * 各クラスタ内でForce-directedを実行
 */
export async function FineLayout(
  clusteredNodes: ClusteredNode[],
  edges: LayoutEdge[],
  onProgress?: ProgressCallback,
  cancelCheck?: () => boolean
): Promise<LayoutResult> {
  if (clusteredNodes.length === 0) {
    return { nodes: [] };
  }

  // クラスタごとにノードをグループ化
  const clusterMap = new Map<number, ClusteredNode[]>();
  clusteredNodes.forEach(node => {
    if (!clusterMap.has(node.clusterId)) {
      clusterMap.set(node.clusterId, []);
    }
    clusterMap.get(node.clusterId)!.push(node);
  });

  const results: Array<{ id: string; x: number; y: number }> = [];
  const clusterCount = clusterMap.size;
  let processedClusters = 0;

  for (const [clusterId, nodes] of clusterMap.entries()) {
    if (cancelCheck && cancelCheck()) {
      break;
    }

    // クラスタの中心座標を計算
    const centerX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
    const centerY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;

    // クラスタ内のエッジを抽出
    const clusterEdges = edges.filter(
      edge => nodes.some(n => n.id === edge.source) && nodes.some(n => n.id === edge.target)
    );

    // クラスタ内でForce-directedを実行（短時間: 200tick）
    const maxTicks = 200;
    type D3Node = { id: string; x: number; y: number; width: number; height: number };
    type D3Link = { source: string | D3Node; target: string | D3Node };

    const d3Nodes: D3Node[] = nodes.map(n => ({ ...n }));
    const d3Links: D3Link[] = clusterEdges.map(e => ({
      source: e.source,
      target: e.target
    }));

    const simulation = d3.forceSimulation(d3Nodes)
      .force('link', d3.forceLink(d3Links)
        .id((d: any) => d.id)
        .distance(150)
      )
      .force('charge', d3.forceManyBody()
        .strength(-200)
      )
      .force('center', d3.forceCenter(centerX, centerY)) // クラスタの中心に固定
      .force('collision', d3.forceCollide()
        .radius((d: any) => Math.max(d.width, d.height) / 2 + 20)
      )
      .stop();

    for (let i = 0; i < maxTicks; i++) {
      if (cancelCheck && cancelCheck()) {
        break;
      }

      simulation.tick();

      if (simulation.alpha() < 0.01) {
        break;
      }
    }

    // 結果を追加
    d3Nodes.forEach(node => {
      results.push({
        id: node.id,
        x: node.x,
        y: node.y
      });
    });

    processedClusters++;
    if (onProgress) {
      const progress = (processedClusters / clusterCount) * 100;
      onProgress(progress, 'Fine Layout');
    }
  }

  return { nodes: results };
}

/**
 * 重なり除去アルゴリズム（押し出し方式、空間ハッシュ最適化版）
 * ノードの矩形が重ならないように調整する
 */
export async function RemoveOverlaps(
  nodes: LayoutNode[],
  onProgress?: ProgressCallback,
  cancelCheck?: () => boolean
): Promise<LayoutResult> {
  if (nodes.length === 0) {
    return { nodes: [] };
  }

  const adjustedNodes = nodes.map(n => ({ ...n }));
  const maxIterations = 10;

  for (let iter = 0; iter < maxIterations; iter++) {
    if (cancelCheck && cancelCheck()) {
      break;
    }

    let hasOverlap = false;

    // 空間ハッシュを構築
    const spatialHash = new SpatialHash(200);
    adjustedNodes.forEach(node => spatialHash.insert(node));

    // 各ノードについて近傍ノードのみをチェック
    for (let i = 0; i < adjustedNodes.length; i++) {
      const nodeA = adjustedNodes[i];
      const nearbyNodes = spatialHash.queryNearby(nodeA);

      for (const nodeB of nearbyNodes) {
        // 矩形の重なり判定
        const overlapX = Math.max(0, 
          Math.min(nodeA.x + nodeA.width / 2, nodeB.x + nodeB.width / 2) -
          Math.max(nodeA.x - nodeA.width / 2, nodeB.x - nodeB.width / 2)
        );
        const overlapY = Math.max(0,
          Math.min(nodeA.y + nodeA.height / 2, nodeB.y + nodeB.height / 2) -
          Math.max(nodeA.y - nodeA.height / 2, nodeB.y - nodeB.height / 2)
        );

        if (overlapX > 0 && overlapY > 0) {
          hasOverlap = true;

          // 押し出し方向を計算
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0) {
            // 重なりが小さい方向に押し出す
            if (overlapX < overlapY) {
              const pushX = (overlapX / 2 + 5) * Math.sign(dx);
              nodeA.x -= pushX;
              nodeB.x += pushX;
            } else {
              const pushY = (overlapY / 2 + 5) * Math.sign(dy);
              nodeA.y -= pushY;
              nodeB.y += pushY;
            }
          } else {
            // 完全に重なっている場合はランダムに押し出す
            nodeA.x -= 10;
            nodeB.x += 10;
          }
        }
      }
    }

    // 進捗報告
    if (onProgress) {
      const progress = ((iter + 1) / maxIterations) * 100;
      onProgress(progress, 'Overlap Removal');
    }

    // 重なりがなくなったら終了
    if (!hasOverlap) {
      break;
    }
  }

  return {
    nodes: adjustedNodes.map(n => ({
      id: n.id,
      x: n.x,
      y: n.y
    }))
  };
}
