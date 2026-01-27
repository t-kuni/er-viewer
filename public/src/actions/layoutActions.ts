import type { components } from '../../../lib/generated/api-types';

type ViewModel = components['schemas']['ViewModel'];

/**
 * 配置最適化を開始する
 */
export function actionStartLayoutOptimization(
  viewModel: ViewModel
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (
    viewModel.ui.layoutOptimization.isRunning === true &&
    viewModel.ui.layoutOptimization.progress === 0 &&
    viewModel.ui.layoutOptimization.currentStage === null
  ) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      layoutOptimization: {
        isRunning: true,
        progress: 0,
        currentStage: null,
      },
    },
  };
}

/**
 * 配置最適化の進捗を更新する
 */
export function actionUpdateLayoutProgress(
  viewModel: ViewModel,
  progress: number,
  currentStage: string
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (
    viewModel.ui.layoutOptimization.progress === progress &&
    viewModel.ui.layoutOptimization.currentStage === currentStage
  ) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      layoutOptimization: {
        ...viewModel.ui.layoutOptimization,
        progress,
        currentStage,
      },
    },
  };
}

/**
 * 配置最適化を完了する
 */
export function actionCompleteLayoutOptimization(
  viewModel: ViewModel
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (
    viewModel.ui.layoutOptimization.isRunning === false &&
    viewModel.ui.layoutOptimization.progress === 100
  ) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      layoutOptimization: {
        ...viewModel.ui.layoutOptimization,
        isRunning: false,
        progress: 100,
      },
    },
  };
}

/**
 * 配置最適化をキャンセルする
 */
export function actionCancelLayoutOptimization(
  viewModel: ViewModel
): ViewModel {
  // 変化がない場合は同一参照を返す
  if (viewModel.ui.layoutOptimization.isRunning === false) {
    return viewModel;
  }

  return {
    ...viewModel,
    ui: {
      ...viewModel.ui,
      layoutOptimization: {
        ...viewModel.ui.layoutOptimization,
        isRunning: false,
      },
    },
  };
}
