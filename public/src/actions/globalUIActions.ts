import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];

/**
 * ビルド情報モーダルを表示する
 */
export function actionShowBuildInfoModal(
  viewModel: ViewModel
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.ui.showBuildInfoModal === true) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      showBuildInfoModal: true,
    },
  };
}

/**
 * ビルド情報モーダルを非表示にする
 */
export function actionHideBuildInfoModal(
  viewModel: ViewModel
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.ui.showBuildInfoModal === false) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      showBuildInfoModal: false,
    },
  };
}

/**
 * データベース接続モーダルを表示する
 */
export function actionShowDatabaseConnectionModal(
  viewModel: ViewModel
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.ui.showDatabaseConnectionModal === true) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      showDatabaseConnectionModal: true,
    },
  };
}

/**
 * データベース接続モーダルを非表示にする
 */
export function actionHideDatabaseConnectionModal(
  viewModel: ViewModel
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.ui.showDatabaseConnectionModal === false) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      showDatabaseConnectionModal: false,
    },
  };
}
