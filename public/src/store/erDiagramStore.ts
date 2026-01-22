import type { components } from '../../../lib/generated/api-types';

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];

/**
 * Action関数の型定義
 */
export type ActionFn<Args extends any[] = any[]> = (
  viewModel: ERDiagramViewModel,
  ...args: Args
) => ERDiagramViewModel;

/**
 * Store インターフェース
 */
export interface Store {
  getState: () => ERDiagramViewModel;
  subscribe: (listener: () => void) => () => void;
  dispatch: <Args extends any[]>(action: ActionFn<Args>, ...args: Args) => void;
}

/**
 * 初期状態
 */
const initialState: ERDiagramViewModel = {
  nodes: {},
  edges: {},
  ui: {
    hover: null,
    highlightedNodeIds: [],
    highlightedEdgeIds: [],
    highlightedColumnIds: [],
  },
  loading: false,
};

/**
 * ERDiagramViewModelのStoreを作成する
 */
export function createERDiagramStore(): Store {
  let state: ERDiagramViewModel = initialState;
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
