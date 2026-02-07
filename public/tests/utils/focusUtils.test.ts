/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isInputFocused } from '../../src/utils/focusUtils';

describe('isInputFocused', () => {
  let testElement: HTMLElement | null = null;

  afterEach(() => {
    // テスト後にフォーカスを外して要素を削除
    if (testElement && testElement.parentNode) {
      testElement.blur();
      testElement.parentNode.removeChild(testElement);
      testElement = null;
    }
  });

  it('should return true when input element is focused', () => {
    // input要素を作成してフォーカス
    testElement = document.createElement('input');
    document.body.appendChild(testElement);
    testElement.focus();

    expect(isInputFocused()).toBe(true);
  });

  it('should return true when textarea element is focused', () => {
    // textarea要素を作成してフォーカス
    testElement = document.createElement('textarea');
    document.body.appendChild(testElement);
    testElement.focus();

    expect(isInputFocused()).toBe(true);
  });

  it('should return true when select element is focused', () => {
    // select要素を作成してフォーカス
    testElement = document.createElement('select');
    document.body.appendChild(testElement);
    testElement.focus();

    expect(isInputFocused()).toBe(true);
  });

  it('should return true when contenteditable element is focused', () => {
    // contenteditable="true"のdiv要素を作成してフォーカス
    testElement = document.createElement('div');
    testElement.setAttribute('contenteditable', 'true');
    testElement.tabIndex = 0; // フォーカス可能にする
    document.body.appendChild(testElement);
    testElement.focus();

    expect(isInputFocused()).toBe(true);
  });

  it('should return false when normal element is focused', () => {
    // 通常のdiv要素を作成してフォーカス
    testElement = document.createElement('div');
    testElement.tabIndex = 0; // フォーカス可能にする
    document.body.appendChild(testElement);
    testElement.focus();

    expect(isInputFocused()).toBe(false);
  });

  it('should return false when document.activeElement is body (no focus)', () => {
    // どの要素にもフォーカスしていない状態（bodyがactiveElement）
    document.body.focus();

    expect(isInputFocused()).toBe(false);
  });
});
