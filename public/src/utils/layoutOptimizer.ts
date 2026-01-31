import * as d3 from 'd3-force';
import Graph from 'graphology';
import { connectedComponents } from 'graphology-components';
import louvain from 'graphology-communities-louvain';

export interface LayoutNode {
  id: string;
  name: string;
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

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface NameSimilarity {
  sourceId: string;
  targetId: string;
  score: number;
}

export type ProgressCallback = (progress: number, stage: string) => void;

/**
 * テーブル名を正規化する
 * @param name テーブル名
 * @returns 正規化された名前
 */
export function normalizeName(name: string): string {
  let normalized = name.toLowerCase();
  // 連続する_を1つに整理
  normalized = normalized.replace(/_+/g, '_');
  // 既知のprefixを除去（オプション）
  normalized = normalized.replace(/^(tbl_|table_|t_)/, '');
  // 語尾のsを除去
  normalized = normalized.replace(/s$/, '');
  return normalized;
}

/**
 * トークンベースのJaccard係数を計算
 * @param name1 名前1
 * @param name2 名前2
 * @returns Jaccard係数 (0.0〜1.0)
 */
export function calculateTokenJaccard(name1: string, name2: string): number {
  const tokens1 = new Set(name1.split('_').filter(t => t.length > 0));
  const tokens2 = new Set(name2.split('_').filter(t => t.length > 0));
  
  if (tokens1.size === 0 && tokens2.size === 0) {
    return 0;
  }
  
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  
  if (union.size === 0) {
    return 0;
  }
  
  return intersection.size / union.size;
}

/**
 * バイグラムベースのJaccard係数を計算
 * @param name1 名前1
 * @param name2 名前2
 * @returns Jaccard係数 (0.0〜1.0)
 */
export function calculateBigramJaccard(name1: string, name2: string): number {
  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const bigrams1 = getBigrams(name1);
  const bigrams2 = getBigrams(name2);
  
  if (bigrams1.size === 0 && bigrams2.size === 0) {
    return 0;
  }
  
  const intersection = new Set([...bigrams1].filter(b => bigrams2.has(b)));
  const union = new Set([...bigrams1, ...bigrams2]);
  
  if (union.size === 0) {
    return 0;
  }
  
  return intersection.size / union.size;
}

/**
 * 名前類似度を計算
 * @param name1 名前1
 * @param name2 名前2
 * @returns 類似度スコア (0.0〜1.0)
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);
  
  const tokenJaccard = calculateTokenJaccard(normalized1, normalized2);
  const bigramJaccard = calculateBigramJaccard(normalized1, normalized2);
  
  return 0.6 * tokenJaccard + 0.4 * bigramJaccard;
}

/**
 * 名前類似度に基づくエッジを計算
 * @param nodes ノードの配列
 * @param k 各ノードから抽出する上位k件
 * @param threshold 類似度の閾値
 * @returns 類似エッジの配列
 */
export function calculateSimilarityEdges(
  nodes: LayoutNode[],
  k: number = 3,
  threshold: number = 0.35
): LayoutEdge[] {
  const similarities: NameSimilarity[] = [];
  
  // 全ノードペアの類似度を計算
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const score = calculateNameSimilarity(nodes[i].name, nodes[j].name);
      if (score >= threshold) {
        similarities.push({
          sourceId: nodes[i].id,
          targetId: nodes[j].id,
          score
        });
      }
    }
  }
  
  // 類似度の降順でソート
  similarities.sort((a, b) => b.score - a.score);
  
  // 各ノードにつき上位k件を抽出
  const nodeEdgeCount = new Map<string, number>();
  const edges: LayoutEdge[] = [];
  
  for (const sim of similarities) {
    const sourceCount = nodeEdgeCount.get(sim.sourceId) || 0;
    const targetCount = nodeEdgeCount.get(sim.targetId) || 0;
    
    if (sourceCount < k || targetCount < k) {
      edges.push({
        source: sim.sourceId,
        target: sim.targetId
      });
      nodeEdgeCount.set(sim.sourceId, sourceCount + 1);
      nodeEdgeCount.set(sim.targetId, targetCount + 1);
    }
  }
  
  return edges;
}

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

  // 最大tick数
  const maxTicks = 400;
  
  // d3-force用のノードとリンクを準備
  type D3Node = { id: string; x: number; y: number; width: number; height: number; radius: number };
  type D3Link = { source: string | D3Node; target: string | D3Node };
  
  // 衝突半径を事前計算
  const d3Nodes: D3Node[] = nodes.map(n => {
    const radius = 0.5 * Math.sqrt(n.width ** 2 + n.height ** 2) + 15;
    return { id: n.id, x: n.x, y: n.y, width: n.width, height: n.height, radius };
  });
  
  // ノードIDから半径を取得するマップ
  const nodeRadiusMap = new Map<string, number>();
  d3Nodes.forEach(n => nodeRadiusMap.set(n.id, n.radius));
  
  // 名前類似エッジを計算
  const similarityEdges = calculateSimilarityEdges(nodes, 3, 0.35);
  
  // 実リレーションのエッジ
  const relationshipLinks: D3Link[] = edges.map(e => ({
    source: e.source,
    target: e.target
  }));
  
  // 類似エッジ
  const similarityLinks: D3Link[] = similarityEdges.map(e => ({
    source: e.source,
    target: e.target
  }));
  
  // リンク距離の計算関数
  const calculateLinkDistance = (link: any): number => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    const r1 = nodeRadiusMap.get(sourceId) || 0;
    const r2 = nodeRadiusMap.get(targetId) || 0;
    return r1 + r2 + 30; // gap: 30px
  };
  
  // 実リレーションのリンク距離の平均を計算
  const linkDistances = relationshipLinks.map(link => calculateLinkDistance(link));
  const meanLinkDistance = linkDistances.length > 0
    ? linkDistances.reduce((sum, d) => sum + d, 0) / linkDistances.length
    : 200; // デフォルト値
  
  // シミュレーションの設定
  const simulation = d3.forceSimulation(d3Nodes)
    .alphaMin(0.02)
    .force('relationship-link', d3.forceLink(relationshipLinks)
      .id((d: any) => d.id)
      .distance(calculateLinkDistance)
      .strength(0.7)
      .iterations(2)
    )
    .force('similarity-link', d3.forceLink(similarityLinks)
      .id((d: any) => d.id)
      .distance((link: any) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        const r1 = nodeRadiusMap.get(sourceId) || 0;
        const r2 = nodeRadiusMap.get(targetId) || 0;
        // 類似度を取得（簡略化のため固定値0.5を使用）
        const similarity = 0.5;
        return r1 + r2 + (80 - 60 * similarity);
      })
      .strength(0.15)
      .iterations(2)
    )
    .force('charge', d3.forceManyBody()
      .strength(-(meanLinkDistance * 1.5))
    )
    .force('collision', d3.forceCollide()
      .radius((d: any) => d.radius)
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
    if (simulation.alpha() < simulation.alphaMin()) {
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

/**
 * ノードのバウンディングボックスを計算
 * @param nodes ノードの配列
 * @returns バウンディングボックス
 */
export function calculateBoundingBox(nodes: LayoutNode[]): BoundingBox {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const node of nodes) {
    const nodeMinX = node.x - node.width / 2;
    const nodeMinY = node.y - node.height / 2;
    const nodeMaxX = node.x + node.width / 2;
    const nodeMaxY = node.y + node.height / 2;
    
    minX = Math.min(minX, nodeMinX);
    minY = Math.min(minY, nodeMinY);
    maxX = Math.max(maxX, nodeMaxX);
    maxY = Math.max(maxY, nodeMaxY);
  }
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * 連結成分をパッキング
 * Shelf-packingアルゴリズムで連結成分を配置
 * @param components 連結成分の配列
 * @param margin 成分間のマージン
 * @returns レイアウト結果
 */
export async function packConnectedComponents(
  components: ConnectedComponent[],
  margin: number = 50
): Promise<LayoutResult> {
  if (components.length === 0) {
    return { nodes: [] };
  }
  
  // 各成分のバウンディングボックスを計算
  interface ComponentInfo {
    component: ConnectedComponent;
    bbox: BoundingBox;
    area: number;
  }
  
  const componentInfos: ComponentInfo[] = components.map(component => {
    const bbox = calculateBoundingBox(component.nodes);
    return {
      component,
      bbox,
      area: bbox.width * bbox.height
    };
  });
  
  // 面積の降順でソート
  componentInfos.sort((a, b) => b.area - a.area);
  
  // Shelf-packingで配置
  const shelfWidth = 2000;
  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;
  
  const result: Array<{ id: string; x: number; y: number }> = [];
  
  for (const info of componentInfos) {
    const { component, bbox } = info;
    
    // 現在の行に収まらない場合は改行
    if (currentX > 0 && currentX + bbox.width > shelfWidth) {
      currentX = 0;
      currentY += rowHeight + margin;
      rowHeight = 0;
    }
    
    // 配置先の左上座標
    const targetX = currentX;
    const targetY = currentY;
    
    // 成分内のノード座標をオフセット
    const offsetX = targetX - bbox.minX;
    const offsetY = targetY - bbox.minY;
    
    for (const node of component.nodes) {
      result.push({
        id: node.id,
        x: node.x + offsetX,
        y: node.y + offsetY
      });
    }
    
    // 次の配置位置を更新
    currentX += bbox.width + margin;
    rowHeight = Math.max(rowHeight, bbox.height);
  }
  
  return { nodes: result };
}
