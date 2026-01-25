import { DefaultService } from '../api/client';
import { actionSetViewModel, actionSetLoading } from '../actions/dataActions';
import type { Store } from '../store/erDiagramStore';
import type { ViewModel } from '../api/client';

/**
 * リバースエンジニアリングを実行するCommand
 * @param dispatch Store.dispatch関数
 * @param getState Store.getState関数
 */
export async function commandReverseEngineer(
  dispatch: Store['dispatch'],
  getState: Store['getState']
): Promise<void> {
  dispatch(actionSetLoading, true);
  
  try {
    // 現在のViewModelを取得
    const currentViewModel = getState() as ViewModel;
    
    // サーバーにViewModelを送信し、更新後のViewModelを取得
    const updatedViewModel = await DefaultService.apiReverseEngineer(currentViewModel);
    
    // エラーレスポンスのチェック
    if ('error' in updatedViewModel) {
      throw new Error(updatedViewModel.error);
    }
    
    // 更新後のViewModelをStoreに設定
    dispatch(actionSetViewModel, updatedViewModel);
  } catch (error) {
    console.error('Failed to reverse engineer:', error);
    // エラーはコンソールに出力するのみ（MVPフェーズ）
    // 将来的にはエラー状態をStoreに保存する
  } finally {
    dispatch(actionSetLoading, false);
  }
}
