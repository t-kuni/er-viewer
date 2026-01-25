import { DefaultService } from '../api/client';
import { actionSetViewModel } from '../actions/dataActions';
import type { Store } from '../store/erDiagramStore';

/**
 * アプリケーション初期化Command
 * 初期ViewModelを取得してStoreに設定する
 * @param dispatch Store.dispatch関数
 */
export async function commandInitialize(
  dispatch: Store['dispatch']
): Promise<void> {
  try {
    const viewModel = await DefaultService.apiInitialize();
    
    // エラーレスポンスのチェック
    if ('error' in viewModel) {
      throw new Error(viewModel.error);
    }
    
    // ViewModelをStoreに設定
    dispatch(actionSetViewModel, viewModel);
  } catch (error) {
    console.error('Failed to initialize:', error);
    // エラーはコンソールに出力するのみ（MVPフェーズ）
  }
}
