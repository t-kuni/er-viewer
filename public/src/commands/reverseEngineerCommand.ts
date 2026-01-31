import { DefaultService } from '../api/client';
import { actionMergeERData, actionSetLoading } from '../actions/dataActions';
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
    // ReverseEngineerRequest形式でリクエストを作成
    const request: ReverseEngineerRequest = {
      type: connectionInfo.type,
      host: connectionInfo.host,
      port: connectionInfo.port,
      user: connectionInfo.user,
      password: password || '', // パスワードが空の場合は空文字列を送信
      database: connectionInfo.database,
    };
    
    // サーバーにリクエストを送信し、ERDataとconnectionInfoを取得
    const response = await DefaultService.apiReverseEngineer(request);
    
    // エラーレスポンスのチェック
    if ('error' in response) {
      throw new Error((response as any).error);
    }
    
    // 現在のViewModelを取得
    const currentViewModel = getState() as ViewModel;
    
    // ERDataを既存ViewModelとマージ
    dispatch(actionMergeERData, response.erData, response.connectionInfo);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to reverse engineer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  } finally {
    dispatch(actionSetLoading, false);
  }
}
