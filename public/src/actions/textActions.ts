import type { components } from '../../../lib/generated/api-types';
import { actionAddLayerItem, actionRemoveLayerItem, actionSelectItem } from './layerActions';

type ViewModel = components['schemas']['ViewModel'];
type TextBox = components['schemas']['TextBox'];
type TextAutoSizeMode = components['schemas']['TextAutoSizeMode'];

/**
 * テキストを追加する
 */
export function actionAddText(
  vm: ViewModel,
  textBox: TextBox
): ViewModel {
  // 既に同じIDが存在する場合は同一参照を返す
  if (vm.erDiagram.texts[textBox.id]) {
    return vm;
  }

  // テキストを追加
  let nextVm = {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textBox.id]: textBox,
      },
    },
  };

  // レイヤーに追加（前面）
  nextVm = actionAddLayerItem(nextVm, { kind: 'text', id: textBox.id }, 'foreground');

  return nextVm;
}

/**
 * テキストを削除する
 */
export function actionRemoveText(
  vm: ViewModel,
  textId: string
): ViewModel {
  // テキストが存在しない場合は同一参照を返す
  if (!vm.erDiagram.texts[textId]) {
    return vm;
  }

  const { [textId]: _, ...restTexts } = vm.erDiagram.texts;

  // テキストを削除
  let nextVm = {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: restTexts,
    },
  };

  // レイヤーから削除
  nextVm = actionRemoveLayerItem(nextVm, { kind: 'text', id: textId });

  // 選択中の場合は選択解除
  if (nextVm.ui.selectedItem?.kind === 'text' && nextVm.ui.selectedItem.id === textId) {
    nextVm = actionSelectItem(nextVm, null);
  }

  return nextVm;
}

/**
 * テキストの位置を更新する
 */
export function actionUpdateTextPosition(
  vm: ViewModel,
  textId: string,
  x: number,
  y: number
): ViewModel {
  const textBox = vm.erDiagram.texts[textId];

  // テキストが存在しない場合は同一参照を返す
  if (!textBox) {
    return vm;
  }

  // 位置が変わっていない場合は同一参照を返す
  if (textBox.x === x && textBox.y === y) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textId]: {
          ...textBox,
          x,
          y,
        },
      },
    },
  };
}

/**
 * テキストのサイズを更新する
 */
export function actionUpdateTextSize(
  vm: ViewModel,
  textId: string,
  width: number,
  height: number
): ViewModel {
  const textBox = vm.erDiagram.texts[textId];

  // テキストが存在しない場合は同一参照を返す
  if (!textBox) {
    return vm;
  }

  // サイズが変わっていない場合は同一参照を返す
  if (textBox.width === width && textBox.height === height) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textId]: {
          ...textBox,
          width,
          height,
        },
      },
    },
  };
}

/**
 * テキストの座標とサイズを一括更新する
 */
export function actionUpdateTextBounds(
  vm: ViewModel,
  textId: string,
  bounds: { x: number; y: number; width: number; height: number }
): ViewModel {
  const textBox = vm.erDiagram.texts[textId];

  // テキストが存在しない場合は同一参照を返す
  if (!textBox) {
    return vm;
  }

  // 値が変わっていない場合は同一参照を返す
  if (
    textBox.x === bounds.x &&
    textBox.y === bounds.y &&
    textBox.width === bounds.width &&
    textBox.height === bounds.height
  ) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textId]: {
          ...textBox,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      },
    },
  };
}

/**
 * テキストの内容を更新する
 */
export function actionUpdateTextContent(
  vm: ViewModel,
  textId: string,
  content: string
): ViewModel {
  const textBox = vm.erDiagram.texts[textId];

  // テキストが存在しない場合は同一参照を返す
  if (!textBox) {
    return vm;
  }

  // 内容が変わっていない場合は同一参照を返す
  if (textBox.content === content) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textId]: {
          ...textBox,
          content,
        },
      },
    },
  };
}

/**
 * テキストのスタイルを部分更新する
 */
export function actionUpdateTextStyle(
  vm: ViewModel,
  textId: string,
  stylePatch: {
    fontSize?: number;
    lineHeight?: number;
    textAlign?: components['schemas']['TextAlign'];
    textColor?: string;
    opacity?: number;
    wrap?: boolean;
    overflow?: components['schemas']['TextOverflowMode'];
  }
): ViewModel {
  const textBox = vm.erDiagram.texts[textId];

  // テキストが存在しない場合は同一参照を返す
  if (!textBox) {
    return vm;
  }

  // 変更がない場合は同一参照を返す
  const hasChanges =
    (stylePatch.fontSize !== undefined && stylePatch.fontSize !== textBox.fontSize) ||
    (stylePatch.lineHeight !== undefined && stylePatch.lineHeight !== textBox.lineHeight) ||
    (stylePatch.textAlign !== undefined && stylePatch.textAlign !== textBox.textAlign) ||
    (stylePatch.textColor !== undefined && stylePatch.textColor !== textBox.textColor) ||
    (stylePatch.opacity !== undefined && stylePatch.opacity !== textBox.opacity) ||
    (stylePatch.wrap !== undefined && stylePatch.wrap !== textBox.wrap) ||
    (stylePatch.overflow !== undefined && stylePatch.overflow !== textBox.overflow);

  if (!hasChanges) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textId]: {
          ...textBox,
          ...(stylePatch.fontSize !== undefined && { fontSize: stylePatch.fontSize }),
          ...(stylePatch.lineHeight !== undefined && { lineHeight: stylePatch.lineHeight }),
          ...(stylePatch.textAlign !== undefined && { textAlign: stylePatch.textAlign }),
          ...(stylePatch.textColor !== undefined && { textColor: stylePatch.textColor }),
          ...(stylePatch.opacity !== undefined && { opacity: stylePatch.opacity }),
          ...(stylePatch.wrap !== undefined && { wrap: stylePatch.wrap }),
          ...(stylePatch.overflow !== undefined && { overflow: stylePatch.overflow }),
        },
      },
    },
  };
}

/**
 * autoSizeModeを変更する
 */
export function actionSetTextAutoSizeMode(
  vm: ViewModel,
  textId: string,
  mode: TextAutoSizeMode
): ViewModel {
  const textBox = vm.erDiagram.texts[textId];

  // テキストが存在しない場合は同一参照を返す
  if (!textBox) {
    return vm;
  }

  // モードが変わっていない場合は同一参照を返す
  if (textBox.autoSizeMode === mode) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textId]: {
          ...textBox,
          autoSizeMode: mode,
        },
      },
    },
  };
}

/**
 * 測定結果を受け取ってwidth/heightを更新する
 */
export function actionFitTextBoundsToContent(
  vm: ViewModel,
  textId: string,
  width: number,
  height: number
): ViewModel {
  const textBox = vm.erDiagram.texts[textId];

  // テキストが存在しない場合は同一参照を返す
  if (!textBox) {
    return vm;
  }

  // サイズが変わっていない場合は同一参照を返す
  if (textBox.width === width && textBox.height === height) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textId]: {
          ...textBox,
          width,
          height,
        },
      },
    },
  };
}

/**
 * ドロップシャドウのプロパティを部分更新する
 */
export function actionUpdateTextShadow(
  vm: ViewModel,
  textId: string,
  shadowPatch: {
    enabled?: boolean;
    offsetX?: number;
    offsetY?: number;
    blur?: number;
    spread?: number;
    color?: string;
    opacity?: number;
  }
): ViewModel {
  const textBox = vm.erDiagram.texts[textId];

  // テキストが存在しない場合は同一参照を返す
  if (!textBox) {
    return vm;
  }

  // 変更がない場合は同一参照を返す
  const hasChanges =
    (shadowPatch.enabled !== undefined && shadowPatch.enabled !== textBox.shadow.enabled) ||
    (shadowPatch.offsetX !== undefined && shadowPatch.offsetX !== textBox.shadow.offsetX) ||
    (shadowPatch.offsetY !== undefined && shadowPatch.offsetY !== textBox.shadow.offsetY) ||
    (shadowPatch.blur !== undefined && shadowPatch.blur !== textBox.shadow.blur) ||
    (shadowPatch.spread !== undefined && shadowPatch.spread !== textBox.shadow.spread) ||
    (shadowPatch.color !== undefined && shadowPatch.color !== textBox.shadow.color) ||
    (shadowPatch.opacity !== undefined && shadowPatch.opacity !== textBox.shadow.opacity);

  if (!hasChanges) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textId]: {
          ...textBox,
          shadow: {
            ...textBox.shadow,
            ...(shadowPatch.enabled !== undefined && { enabled: shadowPatch.enabled }),
            ...(shadowPatch.offsetX !== undefined && { offsetX: shadowPatch.offsetX }),
            ...(shadowPatch.offsetY !== undefined && { offsetY: shadowPatch.offsetY }),
            ...(shadowPatch.blur !== undefined && { blur: shadowPatch.blur }),
            ...(shadowPatch.spread !== undefined && { spread: shadowPatch.spread }),
            ...(shadowPatch.color !== undefined && { color: shadowPatch.color }),
            ...(shadowPatch.opacity !== undefined && { opacity: shadowPatch.opacity }),
          },
        },
      },
    },
  };
}

/**
 * パディングを更新する
 */
export function actionUpdateTextPadding(
  vm: ViewModel,
  textId: string,
  paddingX: number,
  paddingY: number
): ViewModel {
  const textBox = vm.erDiagram.texts[textId];

  // テキストが存在しない場合は同一参照を返す
  if (!textBox) {
    return vm;
  }

  // パディングが変わっていない場合は同一参照を返す
  if (textBox.paddingX === paddingX && textBox.paddingY === paddingY) {
    return vm;
  }

  return {
    ...vm,
    erDiagram: {
      ...vm.erDiagram,
      texts: {
        ...vm.erDiagram.texts,
        [textId]: {
          ...textBox,
          paddingX,
          paddingY,
        },
      },
    },
  };
}
