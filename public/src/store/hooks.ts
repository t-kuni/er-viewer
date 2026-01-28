import { useSyncExternalStore, useRef } from 'react';
import { erDiagramStore, type Store } from './erDiagramStore';
import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];

/**
 * ViewModelの一部を購読するReact Hook
 * @param selector 状態から必要な部分を取り出す関数
 * @param equalityFn 前回の値と今回の値を比較する関数（省略時は参照比較）
 * @returns 選択された部分の状態
 */
export function useViewModel<T>(
  selector: (viewModel: ViewModel) => T,
  equalityFn?: (a: T, b: T) => boolean
): T {
  // 前回の値を保持するためのref
  const previousValueRef = useRef<T | undefined>(undefined);
  
  // equalityFnが指定されている場合は、値ベースの比較を行う
  if (equalityFn) {
    const getSnapshot = () => {
      const currentValue = selector(erDiagramStore.getState());
      
      // 初回または値が変わった場合のみ新しい参照を返す
      if (previousValueRef.current === undefined || !equalityFn(previousValueRef.current, currentValue)) {
        previousValueRef.current = currentValue;
      }
      
      return previousValueRef.current;
    };
    
    return useSyncExternalStore(
      erDiagramStore.subscribe,
      getSnapshot,
      getSnapshot // サーバーサイドレンダリング用
    );
  }
  
  // equalityFnが指定されていない場合は従来通り参照比較
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
