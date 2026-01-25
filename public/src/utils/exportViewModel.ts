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
 * - erDiagram.loading → false
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
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: viewModel.erDiagram.ui.layerOrder, // 維持する
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
      },
      buildInfo: {
        data: null,
        loading: false,
        error: null,
      },
    };

    // JSON文字列にシリアライズ（インデント: 2スペース）
    const jsonString = JSON.stringify(exportData, null, 2);

    // ファイル名を生成（フォーマット: er-viewer-{YYYY-MM-DD}.json）
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const fileName = `er-viewer-${year}-${month}-${day}.json`;

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
