import { DefaultService } from '../api/client';
import { buildERDiagramViewModel } from '../utils/viewModelConverter';
import { actionSetData, actionSetLoading } from '../actions/dataActions';
import type { Store } from '../store/erDiagramStore';

/**
 * リバースエンジニアリングを実行するCommand
 * @param dispatch Store.dispatch関数
 */
export async function commandReverseEngineer(
  dispatch: Store['dispatch']
): Promise<void> {
  dispatch(actionSetLoading, true);
  
  try {
    const response = await DefaultService.apiReverseEngineer();
    
    // エラーレスポンスのチェック
    if ('error' in response) {
      throw new Error(response.error);
    }
    
    // ReverseEngineerResponseからERDiagramViewModelを構築
    const viewModel = buildERDiagramViewModel(
      response.erData,
      response.layoutData
    );
    
    // データをStoreに設定
    dispatch(actionSetData, viewModel.nodes, viewModel.edges);
  } catch (error) {
    console.error('Failed to reverse engineer:', error);
    // エラーはコンソールに出力するのみ（MVPフェーズ）
    // 将来的にはエラー状態をStoreに保存する
  } finally {
    dispatch(actionSetLoading, false);
  }
}
