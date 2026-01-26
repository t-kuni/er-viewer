import type { components } from '../generated/api-types.js';

// TypeSpecから生成された型を使用
export type ViewModel = components['schemas']['ViewModel'];
export type BuildInfo = components['schemas']['BuildInfo'];
export type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];
export type GlobalUIState = components['schemas']['GlobalUIState'];
export type BuildInfoState = components['schemas']['BuildInfoState'];
export type LayerOrder = components['schemas']['LayerOrder'];
export type ERDiagramUIState = components['schemas']['ERDiagramUIState'];
export type AppSettings = components['schemas']['AppSettings'];
export type DatabaseConnectionState = components['schemas']['DatabaseConnectionState'];

// 依存性の型定義
export type GetInitialViewModelDeps = {
  getBuildInfo: () => BuildInfo;
};

// Usecase実装
export function createGetInitialViewModelUsecase(deps: GetInitialViewModelDeps) {
  return (): ViewModel => {
    // ビルド情報を取得
    const buildInfo = deps.getBuildInfo();

    // 空のLayerOrderを生成
    const layerOrder: LayerOrder = {
      backgroundItems: [],
      foregroundItems: [],
    };

    // 初期のERDiagramUIStateを生成
    const erDiagramUIState: ERDiagramUIState = {
      hover: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      highlightedColumnIds: [],
      layerOrder,
    };

    // 空のERDiagramViewModelを生成
    const erDiagram: ERDiagramViewModel = {
      nodes: {},
      edges: {},
      rectangles: {},
      texts: {},
      ui: erDiagramUIState,
      loading: false,
    };

    // 初期のGlobalUIStateを生成
    const ui: GlobalUIState = {
      selectedItem: null,
      showBuildInfoModal: false,
      showLayerPanel: false,
      showDatabaseConnectionModal: false,
      layoutOptimization: {
        isRunning: false,
        progress: 0,
        currentStage: null,
      },
    };

    // BuildInfoStateを構築
    const buildInfoState: BuildInfoState = {
      data: buildInfo,
      loading: false,
      error: null,
    };

    // 環境変数から初期の接続情報を構築（存在する場合のみ）
    let settings: AppSettings | undefined = undefined;
    if (process.env.DB_HOST || process.env.DB_PORT || process.env.DB_USER || process.env.DB_NAME) {
      const lastDatabaseConnection: DatabaseConnectionState = {
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'test',
      };
      settings = {
        lastDatabaseConnection,
      };
    }

    // ViewModelを組み立てて返却
    const viewModel: ViewModel = {
      format: "er-viewer",
      version: 1,
      erDiagram,
      ui,
      buildInfo: buildInfoState,
      ...(settings && { settings }),
    };

    return viewModel;
  };
}
