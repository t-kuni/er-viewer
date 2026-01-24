import { DefaultService } from '../api';
import type { Store } from '../store/erDiagramStore';
import {
  actionSetBuildInfoLoading,
  actionSetBuildInfo,
  actionSetBuildInfoError,
} from '../actions/buildInfoActions';

/**
 * ビルド情報を取得するCommand
 */
export async function commandFetchBuildInfo(dispatch: Store['dispatch']): Promise<void> {
  dispatch(actionSetBuildInfoLoading, true);
  try {
    const buildInfo = await DefaultService.apiGetBuildInfo();
    if ('error' in buildInfo) {
      throw new Error(buildInfo.error);
    }
    dispatch(actionSetBuildInfo, buildInfo);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'ビルド情報の取得に失敗しました';
    dispatch(actionSetBuildInfoError, errorMessage);
  } finally {
    dispatch(actionSetBuildInfoLoading, false);
  }
}
