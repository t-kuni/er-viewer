import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];

/**
 * 矩形を選択する
 */
export function actionSelectRectangle(
  viewModel: ViewModel,
  rectangleId: string
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.ui.selectedRectangleId === rectangleId) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      selectedRectangleId: rectangleId,
    },
  };
}

/**
 * 矩形の選択を解除する
 */
export function actionDeselectRectangle(
  viewModel: ViewModel
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.ui.selectedRectangleId === null) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      selectedRectangleId: null,
    },
  };
}

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
