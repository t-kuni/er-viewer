import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];
type BuildInfo = components['schemas']['BuildInfo'];

/**
 * ビルド情報のローディング状態を設定する
 */
export function actionSetBuildInfoLoading(
  viewModel: ViewModel,
  loading: boolean
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.buildInfo.loading === loading) {
    return viewModel;
  }

  return {
    ...viewModel,
    buildInfo: {
      ...viewModel.buildInfo,
      loading,
    },
  };
}

/**
 * ビルド情報を設定する
 */
export function actionSetBuildInfo(
  viewModel: ViewModel,
  buildInfo: BuildInfo
): ViewModel {
  return {
    ...viewModel,
    buildInfo: {
      ...viewModel.buildInfo,
      data: buildInfo,
      error: null,
    },
  };
}

/**
 * ビルド情報のエラーを設定する
 */
export function actionSetBuildInfoError(
  viewModel: ViewModel,
  error: string
): ViewModel {
  return {
    ...viewModel,
    buildInfo: {
      ...viewModel.buildInfo,
      error,
    },
  };
}
