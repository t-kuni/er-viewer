/**
 * 入力可能な要素にフォーカスがあるかどうかを判定する
 * 
 * @returns {boolean} 入力欄にフォーカスがある場合は true、それ以外は false
 */
export function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  
  // input, textarea, select要素の場合
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  
  // contenteditable属性がtrueの要素の場合
  if ((activeElement as HTMLElement).contentEditable === 'true') {
    return true;
  }
  
  // jsdom環境では contentEditable プロパティが正しく機能しない場合があるため、属性も確認
  if ((activeElement as HTMLElement).getAttribute?.('contenteditable') === 'true') {
    return true;
  }
  
  return false;
}
