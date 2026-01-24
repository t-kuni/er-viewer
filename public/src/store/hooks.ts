import { useSyncExternalStore } from 'react';
import { erDiagramStore, type Store } from './erDiagramStore';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];

/**
 * ViewModelの一部を購読するReact Hook
 * @param selector 状態から必要な部分を取り出す関数
 * @returns 選択された部分の状態
 */
export function useViewModel<T>(
  selector: (viewModel: ViewModel) => T
): T {
  return useSyncExternalStore(
    erDiagramStore.subscribe,
    () => selector(erDiagramStore.getState()),
    () => selector(erDiagramStore.getState()) // サーバーサイドレンダリング用
  );
}

/**
 * dispatch関数を取得するReact Hook
 * @returns Store.dispatch関数
 */
export function useDispatch(): Store['dispatch'] {
  return erDiagramStore.dispatch;
}
