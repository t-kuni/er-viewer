import { BuildInfoState, ViewModel, ReverseEngineeringHistoryEntry } from "../api/client";
import { getInitialGlobalUIState } from "./getInitialViewModelValues";
import { buildERDiagramIndex } from "./buildERDiagramIndex";

/**
 * JSONファイルからViewModelをインポートする
 * 
 * バリデーション:
 * - JSON構文チェック
 * - format フィールドが "er-viewer" であること
 * - version フィールドが >= 1 であること
 * 
 * インポート時に以下のフィールドを初期化/補完:
 * - ui → 初期状態のGlobalUIState（getInitialGlobalUIState()を使用）
 * - buildInfo → 現在のbuildInfoを保持（引数から渡される）
 * - erDiagram.ui.hover → null
 * - erDiagram.ui.highlightedNodeIds → []
 * - erDiagram.ui.highlightedEdgeIds → []
 * - erDiagram.ui.highlightedColumnIds → []
 * - erDiagram.ui.isDraggingEntity → false
 * - erDiagram.loading → false
 * - erDiagram.history → インポート（型チェック付き、不正なエントリは無視）
 * - settings → インポート（そのまま保持）
 * 
 * @param file インポートするJSONファイル
 * @param currentBuildInfo 現在のBuildInfoState（インポート後も保持される）
 * @returns 補完されたViewModel
 * @throws バリデーションエラーまたはファイル読み込みエラー
 */
export function importViewModel(
  file: File,
  currentBuildInfo: BuildInfoState
): Promise<ViewModel> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        if (!jsonString) {
          throw new Error("Failed to read file");
        }

        // JSONとしてパース
        let data: unknown;
        try {
          data = JSON.parse(jsonString);
        } catch {
          throw new Error("Invalid JSON format");
        }

        // 型チェック（まず基本的なオブジェクトかどうか）
        if (typeof data !== "object" || data === null) {
          throw new Error("Invalid JSON format");
        }

        const parsedData = data as Record<string, unknown>;

        // format フィールドのバリデーション
        if (!("format" in parsedData)) {
          throw new Error("Invalid format: expected 'er-viewer'");
        }
        if (parsedData.format !== "er-viewer") {
          throw new Error("Invalid format: expected 'er-viewer'");
        }

        // version フィールドのバリデーション
        if (!("version" in parsedData)) {
          throw new Error("Invalid version: must be >= 1");
        }
        if (typeof parsedData.version !== "number") {
          throw new Error("Invalid version: must be >= 1");
        }
        if (parsedData.version < 1) {
          throw new Error("Invalid version: must be >= 1");
        }

        // ViewModelとして扱う（型アサーション）
        const importedViewModel = parsedData as ViewModel;

        // ノードとエッジを取得
        const nodes = importedViewModel.erDiagram?.nodes || {};
        const edges = importedViewModel.erDiagram?.edges || {};

        // インデックスを再構築
        const index = buildERDiagramIndex(nodes, edges);

        // 履歴配列をインポート（型チェック付き）
        let history: ReverseEngineeringHistoryEntry[] = [];
        const importedHistory = importedViewModel.erDiagram?.history;
        if (Array.isArray(importedHistory)) {
          // 各エントリの型チェック
          history = importedHistory.filter((entry: unknown) => {
            if (typeof entry !== 'object' || entry === null) {
              return false;
            }
            const entryObj = entry as Record<string, unknown>;
            // timestamp と type の存在確認
            return (
              typeof entryObj.timestamp === 'number' &&
              (entryObj.type === 'initial' || entryObj.type === 'incremental')
            );
          }) as ReverseEngineeringHistoryEntry[];
        }

        // 一時UI状態とキャッシュを補完したViewModelを作成
        const viewModel: ViewModel = {
          format: importedViewModel.format,
          version: importedViewModel.version,
          erDiagram: {
            nodes,
            edges,
            rectangles: importedViewModel.erDiagram?.rectangles || {},
            texts: importedViewModel.erDiagram?.texts || {},
            index,
            history,
            ui: {
              hover: null,
              highlightedNodeIds: [],
              highlightedEdgeIds: [],
              highlightedColumnIds: [],
              layerOrder:
                importedViewModel.erDiagram?.ui?.layerOrder || {
                  backgroundItems: [],
                  foregroundItems: [],
                },
              isDraggingEntity: false,
            },
            loading: false,
          },
          ui: getInitialGlobalUIState(),
          buildInfo: currentBuildInfo, // 現在のbuildInfoを保持
          settings: importedViewModel.settings, // 設定を保持
        };

        resolve(viewModel);
      } catch (error) {
        if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error("Unknown error occurred"));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}
