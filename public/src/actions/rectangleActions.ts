import type { components } from '../../../lib/generated/api-types';

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];
type Rectangle = components['schemas']['Rectangle'];

/**
 * 矩形を追加する
 */
export function actionAddRectangle(
  vm: ERDiagramViewModel,
  rectangle: Rectangle
): ERDiagramViewModel {
  // 既に同じIDが存在する場合は同一参照を返す
  if (vm.rectangles[rectangle.id]) {
    return vm;
  }

  return {
    ...vm,
    rectangles: {
      ...vm.rectangles,
      [rectangle.id]: rectangle,
    },
  };
}

/**
 * 矩形を削除する
 */
export function actionRemoveRectangle(
  vm: ERDiagramViewModel,
  rectangleId: string
): ERDiagramViewModel {
  // 矩形が存在しない場合は同一参照を返す
  if (!vm.rectangles[rectangleId]) {
    return vm;
  }

  const { [rectangleId]: _, ...restRectangles } = vm.rectangles;

  return {
    ...vm,
    rectangles: restRectangles,
  };
}

/**
 * 矩形の位置を更新する
 */
export function actionUpdateRectanglePosition(
  vm: ERDiagramViewModel,
  rectangleId: string,
  x: number,
  y: number
): ERDiagramViewModel {
  const rectangle = vm.rectangles[rectangleId];

  // 矩形が存在しない場合は同一参照を返す
  if (!rectangle) {
    return vm;
  }

  // 位置が変わっていない場合は同一参照を返す
  if (rectangle.x === x && rectangle.y === y) {
    return vm;
  }

  return {
    ...vm,
    rectangles: {
      ...vm.rectangles,
      [rectangleId]: {
        ...rectangle,
        x,
        y,
      },
    },
  };
}

/**
 * 矩形のサイズを更新する
 */
export function actionUpdateRectangleSize(
  vm: ERDiagramViewModel,
  rectangleId: string,
  width: number,
  height: number
): ERDiagramViewModel {
  const rectangle = vm.rectangles[rectangleId];

  // 矩形が存在しない場合は同一参照を返す
  if (!rectangle) {
    return vm;
  }

  // サイズが変わっていない場合は同一参照を返す
  if (rectangle.width === width && rectangle.height === height) {
    return vm;
  }

  return {
    ...vm,
    rectangles: {
      ...vm.rectangles,
      [rectangleId]: {
        ...rectangle,
        width,
        height,
      },
    },
  };
}

/**
 * 矩形の座標とサイズを一括更新する
 */
export function actionUpdateRectangleBounds(
  vm: ERDiagramViewModel,
  rectangleId: string,
  bounds: { x: number; y: number; width: number; height: number }
): ERDiagramViewModel {
  const rectangle = vm.rectangles[rectangleId];

  // 矩形が存在しない場合は同一参照を返す
  if (!rectangle) {
    return vm;
  }

  // 値が変わっていない場合は同一参照を返す
  if (
    rectangle.x === bounds.x &&
    rectangle.y === bounds.y &&
    rectangle.width === bounds.width &&
    rectangle.height === bounds.height
  ) {
    return vm;
  }

  return {
    ...vm,
    rectangles: {
      ...vm.rectangles,
      [rectangleId]: {
        ...rectangle,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
    },
  };
}

/**
 * 矩形のスタイルを部分更新する
 */
export function actionUpdateRectangleStyle(
  vm: ERDiagramViewModel,
  rectangleId: string,
  stylePatch: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  }
): ERDiagramViewModel {
  const rectangle = vm.rectangles[rectangleId];

  // 矩形が存在しない場合は同一参照を返す
  if (!rectangle) {
    return vm;
  }

  // 変更がない場合は同一参照を返す
  const hasChanges =
    (stylePatch.fill !== undefined && stylePatch.fill !== rectangle.fill) ||
    (stylePatch.stroke !== undefined && stylePatch.stroke !== rectangle.stroke) ||
    (stylePatch.strokeWidth !== undefined && stylePatch.strokeWidth !== rectangle.strokeWidth) ||
    (stylePatch.opacity !== undefined && stylePatch.opacity !== rectangle.opacity);

  if (!hasChanges) {
    return vm;
  }

  return {
    ...vm,
    rectangles: {
      ...vm.rectangles,
      [rectangleId]: {
        ...rectangle,
        ...(stylePatch.fill !== undefined && { fill: stylePatch.fill }),
        ...(stylePatch.stroke !== undefined && { stroke: stylePatch.stroke }),
        ...(stylePatch.strokeWidth !== undefined && { strokeWidth: stylePatch.strokeWidth }),
        ...(stylePatch.opacity !== undefined && { opacity: stylePatch.opacity }),
      },
    },
  };
}
