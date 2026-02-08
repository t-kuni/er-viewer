import { ViewModel } from "../api/client";

/**
 * ViewModelをJSONファイルとしてエクスポート（ダウンロード）する
 * 
 * エクスポート時に一時UI状態とキャッシュを初期化する：
 * - ui → 初期状態のGlobalUIState
 * - buildInfo → 初期状態のBuildInfoState
 * - erDiagram.ui.hover → null
 * - erDiagram.ui.highlightedNodeIds → []
 * - erDiagram.ui.highlightedEdgeIds → []
 * - erDiagram.ui.highlightedColumnIds → []
 * - erDiagram.ui.layerOrder → 維持する（エクスポート対象）
 * - erDiagram.ui.isDraggingEntity → false
 * - erDiagram.loading → false
 * - erDiagram.history → 維持する（エクスポート対象）
 * - settings → 維持する（エクスポート対象）
 * 
 * @param viewModel エクスポートするViewModel
 */
export function exportViewModel(viewModel: ViewModel): void {
  try {
    // 一時UI状態とキャッシュを初期化したViewModelを作成
    const exportData: ViewModel = {
      format: viewModel.format,
      version: viewModel.version,
      erDiagram: {
        nodes: viewModel.erDiagram.nodes,
        edges: viewModel.erDiagram.edges,
        rectangles: viewModel.erDiagram.rectangles,
        texts: viewModel.erDiagram.texts,
        index: viewModel.erDiagram.index,
        history: viewModel.erDiagram.history, // 履歴を維持する
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: viewModel.erDiagram.ui.layerOrder, // 維持する
          isDraggingEntity: false,
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
        showDatabaseConnectionModal: false,
        showHistoryPanel: false,
        layoutOptimization: {
          isRunning: false,
          progress: 0,
          currentStage: null,
        },
      },
      buildInfo: {
        data: null,
        loading: false,
        error: null,
      },
      settings: viewModel.settings, // 設定を維持する
    };

    // JSON文字列にシリアライズ（インデント: 2スペース）
    const jsonString = JSON.stringify(exportData, null, 2);

    // ファイル名を生成（フォーマット: relavue-er-{YYYY-MM-DD}.json）
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const fileName = `relavue-er-${year}-${month}-${day}.json`;

    // Blobを作成してダウンロード
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // ダウンロード用のリンク要素を作成してクリック
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // オブジェクトURLを解放してメモリリークを防ぐ
    URL.revokeObjectURL(url);
  } catch (error) {
    // エラー時はコンソールにログ出力（ユーザーには通知しない）
    console.error("Failed to export ViewModel:", error);
  }
}
