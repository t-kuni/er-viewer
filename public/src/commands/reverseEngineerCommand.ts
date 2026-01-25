import { DefaultService } from '../api/client';
import { actionSetViewModel, actionSetLoading } from '../actions/dataActions';
import type { Store } from '../store/erDiagramStore';
import type { ViewModel, DatabaseConnectionState, ReverseEngineerRequest } from '../api/client';

/**
 * リバースエンジニアリングを実行するCommand
 * @param dispatch Store.dispatch関数
 * @param getState Store.getState関数
 * @param connectionInfo データベース接続情報
 * @param password データベースパスワード
 * @returns 成功時は { success: true }、失敗時は { success: false, error: エラーメッセージ }
 */
export async function commandReverseEngineer(
  dispatch: Store['dispatch'],
  getState: Store['getState'],
  connectionInfo: DatabaseConnectionState,
  password: string
): Promise<{ success: boolean; error?: string }> {
  dispatch(actionSetLoading, true);
  
  try {
    // 現在のViewModelを取得
    const currentViewModel = getState() as ViewModel;
    
    // ViewModelをコピーし、settings.lastDatabaseConnectionを更新
    const updatedViewModel: ViewModel = {
      ...currentViewModel,
      settings: {
        ...currentViewModel.settings,
        lastDatabaseConnection: connectionInfo,
      },
    };
    
    // ReverseEngineerRequest形式でリクエストを作成
    const request: ReverseEngineerRequest = {
      viewModel: updatedViewModel,
      password: password,
    };
    
    // サーバーにリクエストを送信し、更新後のViewModelを取得
    const resultViewModel = await DefaultService.apiReverseEngineer(request);
    
    // エラーレスポンスのチェック
    if ('error' in resultViewModel) {
      throw new Error((resultViewModel as any).error);
    }
    
    // 更新後のViewModelをStoreに設定
    dispatch(actionSetViewModel, resultViewModel);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to reverse engineer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  } finally {
    dispatch(actionSetLoading, false);
  }
}
