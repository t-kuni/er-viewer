import type { components } from '../../../lib/generated/api-types';
import { actionAddText } from './textActions';
import { actionAddRectangle } from './rectangleActions';
import { actionSelectItem } from './layerActions';

type ViewModel = components['schemas']['ViewModel'];
type ClipboardData = components['schemas']['ClipboardData'];
type TextBox = components['schemas']['TextBox'];
type Rectangle = components['schemas']['Rectangle'];

/**
 * 選択中のアイテムをクリップボードにコピー
 */
export function actionCopyItem(vm: ViewModel): ViewModel {
  // 選択がない場合は何もしない
  if (vm.ui.selectedItem === null) {
    return vm;
  }

  const { selectedItem } = vm.ui;

  // エンティティまたはリレーションの場合は何もしない
  if (selectedItem.kind === 'entity' || selectedItem.kind === 'relation') {
    return vm;
  }

  let clipboardData: ClipboardData | null = null;

  // テキストの場合
  if (selectedItem.kind === 'text') {
    const textBox = vm.erDiagram.texts[selectedItem.id];
    if (textBox) {
      clipboardData = {
        kind: 'text',
        textData: textBox,
        // rectangleData は省略（undefinedになる）
      };
    }
  }

  // 矩形の場合
  if (selectedItem.kind === 'rectangle') {
    const rectangle = vm.erDiagram.rectangles[selectedItem.id];
    if (rectangle) {
      clipboardData = {
        kind: 'rectangle',
        // textData は省略（undefinedになる）
        rectangleData: rectangle,
      };
    }
  }

  // データが取得できなかった場合は何もしない
  if (clipboardData === null) {
    return vm;
  }

  return {
    ...vm,
    ui: {
      ...vm.ui,
      clipboard: clipboardData,
    },
  };
}

/**
 * クリップボードのアイテムをペースト
 */
export function actionPasteItem(
  vm: ViewModel,
  position: { x: number; y: number }
): ViewModel {
  // クリップボードが空の場合は何もしない
  if (vm.ui.clipboard === null) {
    return vm;
  }

  const { clipboard } = vm.ui;
  const newId = crypto.randomUUID();

  let nextVm = vm;

  // テキストをペースト
  if (clipboard.kind === 'text' && clipboard.textData !== undefined) {
    const newTextBox: TextBox = {
      ...clipboard.textData,
      id: newId,
      x: position.x,
      y: position.y,
    };
    nextVm = actionAddText(nextVm, newTextBox);
  }

  // 矩形をペースト
  if (clipboard.kind === 'rectangle' && clipboard.rectangleData !== undefined) {
    const newRectangle: Rectangle = {
      ...clipboard.rectangleData,
      id: newId,
      x: position.x,
      y: position.y,
    };
    nextVm = actionAddRectangle(nextVm, newRectangle);
  }

  // 新しいアイテムを選択
  nextVm = actionSelectItem(nextVm, { kind: clipboard.kind as 'text' | 'rectangle', id: newId });

  return nextVm;
}

/**
 * マウス位置を更新する
 */
export function actionUpdateMousePosition(
  vm: ViewModel,
  position: { clientX: number; clientY: number }
): ViewModel {
  // 値が変わっていない場合は同一参照を返す
  if (
    vm.ui.lastMousePosition != null &&
    vm.ui.lastMousePosition.clientX === position.clientX &&
    vm.ui.lastMousePosition.clientY === position.clientY
  ) {
    return vm;
  }

  return {
    ...vm,
    ui: {
      ...vm.ui,
      lastMousePosition: {
        clientX: position.clientX,
        clientY: position.clientY,
      },
    },
  };
}
