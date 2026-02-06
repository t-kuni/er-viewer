import type { ViewModel } from '../api/client';

/**
 * Action関数の型定義
 */
export type ActionFn<Args extends any[] = any[]> = (
  viewModel: ViewModel,
  ...args: Args
) => ViewModel;

/**
 * Store インターフェース
 */
export interface Store {
  getState: () => ViewModel;
  subscribe: (listener: () => void) => () => void;
  dispatch: <Args extends any[]>(action: ActionFn<Args>, ...args: Args) => void;
}

/**
 * 初期状態
 */
const initialState: ViewModel = {
  format: 'er-viewer',
  version: 1,
  erDiagram: {
    nodes: {},
    edges: {},
    rectangles: {},
    texts: {},
    index: {
      entityToEdges: {},
      columnToEntity: {},
      columnToEdges: {},
    },
    ui: {
      hover: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      highlightedColumnIds: [],
      layerOrder: { backgroundItems: [], foregroundItems: [] },
      isDraggingEntity: false,
    },
    loading: false,
  },
  ui: {
    selectedItem: null,
    showBuildInfoModal: false,
    showLayerPanel: false,
    showDatabaseConnectionModal: false,
    layoutOptimization: {
      isRunning: false,
      progress: 0,
      currentStage: null,
    },
    clipboard: null,
    lastMousePosition: null,
  },
  buildInfo: {
    data: null,
    loading: false,
    error: null,
  },
};

/**
 * ViewModelのStoreを作成する
 */
export function createERDiagramStore(): Store {
  let state: ViewModel = initialState;
  let listeners: Array<() => void> = [];

  return {
    getState() {
      return state;
    },

    subscribe(listener: () => void) {
      listeners.push(listener);
      
      // unsubscribe関数を返す
      return () => {
        listeners = listeners.filter(l => l !== listener);
      };
    },

    dispatch<Args extends any[]>(action: ActionFn<Args>, ...args: Args) {
      const prevState = state;
      const nextState = action(state, ...args);

      // 参照が変わった場合のみ通知
      if (prevState !== nextState) {
        state = nextState;
        
        // すべてのリスナーに通知
        for (const listener of listeners) {
          listener();
        }
      }
    },
  };
}

/**
 * グローバルStoreインスタンス
 */
export const erDiagramStore = createERDiagramStore();
