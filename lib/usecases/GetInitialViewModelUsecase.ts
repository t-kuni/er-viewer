import type { components } from '../generated/api-types.js';

// TypeSpecから生成された型を使用
export type ViewModel = components['schemas']['ViewModel'];
export type BuildInfo = components['schemas']['BuildInfo'];
export type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];
export type GlobalUIState = components['schemas']['GlobalUIState'];
export type BuildInfoState = components['schemas']['BuildInfoState'];
export type LayerOrder = components['schemas']['LayerOrder'];
export type ERDiagramUIState = components['schemas']['ERDiagramUIState'];

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
    };

    // BuildInfoStateを構築
    const buildInfoState: BuildInfoState = {
      data: buildInfo,
      loading: false,
      error: null,
    };

    // ViewModelを組み立てて返却
    const viewModel: ViewModel = {
      format: "er-viewer",
      version: 1,
      erDiagram,
      ui,
      buildInfo: buildInfoState,
    };

    return viewModel;
  };
}
