import React, { useCallback, useState, useEffect, useRef } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { useDispatch } from '../store/hooks';
import {
  actionUpdateTextBounds,
  actionSetTextAutoSizeMode,
  actionUpdateTextContent,
} from '../actions/textActions';
import { actionSelectItem } from '../actions/layerActions';
import type { TextBox } from '../api/client';

interface TextNodeData extends TextBox {}

/**
 * テキストノードコンポーネント
 */
const TextNode: React.FC<NodeProps<TextNodeData>> = ({ id, data, selected }) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(data.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // F2キーで編集モードに入る
  useEffect(() => {
    if (!selected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsEditing(true);
        setDraftContent(data.content);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, data.content]);

  // 編集モードに入ったらtextareaにフォーカス
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleResizeEnd = useCallback(
    (_event: any, params: { x: number; y: number; width: number; height: number }) => {
      dispatch(actionUpdateTextBounds, id, {
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height,
      });
      // リサイズ時はautoSizeModeをmanualに設定
      dispatch(actionSetTextAutoSizeMode, id, 'manual');
    },
    [dispatch, id]
  );

  const confirmEdit = useCallback(() => {
    dispatch(actionUpdateTextContent, id, draftContent);
    setIsEditing(false);

    // autoSizeModeに応じて測定を実行
    if (data.autoSizeMode === 'fitContent' || data.autoSizeMode === 'fitWidth') {
      // DOM測定を実行（次のフレームで）
      setTimeout(() => {
        const measureDiv = document.createElement('div');
        measureDiv.style.position = 'absolute';
        measureDiv.style.visibility = 'hidden';
        measureDiv.style.fontSize = `${data.fontSize}px`;
        measureDiv.style.lineHeight = `${data.lineHeight}px`;
        measureDiv.style.padding = `${data.paddingY}px ${data.paddingX}px`;
        measureDiv.style.border = `${data.strokeWidth}px solid transparent`;
        measureDiv.style.whiteSpace = 'pre-wrap';
        measureDiv.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif';

        if (data.wrap) {
          measureDiv.style.overflowWrap = 'anywhere';
          measureDiv.style.wordBreak = 'break-word';
        }

        if (data.autoSizeMode === 'fitWidth') {
          measureDiv.style.width = `${data.width}px`;
        }

        measureDiv.textContent = draftContent || ' '; // 空の場合は最小高さを測定
        document.body.appendChild(measureDiv);

        const measuredWidth = measureDiv.scrollWidth;
        const measuredHeight = measureDiv.scrollHeight;

        document.body.removeChild(measureDiv);

        // 測定結果を適用
        if (data.autoSizeMode === 'fitContent') {
          dispatch(actionUpdateTextBounds, id, {
            x: data.x,
            y: data.y,
            width: Math.max(40, measuredWidth),
            height: Math.max(20, measuredHeight),
          });
        } else if (data.autoSizeMode === 'fitWidth') {
          dispatch(actionUpdateTextBounds, id, {
            x: data.x,
            y: data.y,
            width: data.width,
            height: Math.max(20, measuredHeight),
          });
        }
      }, 0);
    }
  }, [dispatch, id, draftContent, data]);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
        setDraftContent(data.content);
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        confirmEdit();
      }
    },
    [data.content, confirmEdit]
  );

  const handleTextareaBlur = useCallback(() => {
    confirmEdit();
  }, [confirmEdit]);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraftContent(e.target.value);
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditing) {
        e.stopPropagation();
        dispatch(actionSelectItem, { kind: 'text', id });
      }
    },
    [dispatch, id, isEditing]
  );

  // box-shadowの生成
  const boxShadow = data.shadow.enabled
    ? `${data.shadow.offsetX}px ${data.shadow.offsetY}px ${data.shadow.blur}px ${data.shadow.spread}px ${data.shadow.color}${Math.round(data.shadow.opacity * 255).toString(16).padStart(2, '0')}`
    : 'none';

  return (
    <div
      onClick={handleClick}
      style={{
        width: `${data.width}px`,
        height: `${data.height}px`,
        border: `${data.strokeWidth}px solid ${data.stroke}`,
        color: data.textColor,
        opacity: data.opacity,
        padding: `${data.paddingY}px ${data.paddingX}px`,
        textAlign: data.textAlign,
        whiteSpace: 'pre-wrap',
        overflowWrap: data.wrap ? 'anywhere' : 'normal',
        wordBreak: data.wrap ? 'break-word' : 'normal',
        boxShadow,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
        fontSize: `${data.fontSize}px`,
        lineHeight: `${data.lineHeight}px`,
        overflow: data.overflow === 'scroll' ? 'auto' : 'hidden',
        position: 'relative',
      }}
      aria-label={`Text: ${data.content.slice(0, 20)}`}
    >
      <NodeResizer
        minWidth={40}
        minHeight={20}
        isVisible={selected}
        onResizeEnd={handleResizeEnd}
      />
      {!isEditing && data.content}
      {isEditing && (
        <textarea
          ref={textareaRef}
          value={draftContent}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
          onBlur={handleTextareaBlur}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            padding: `${data.paddingY}px ${data.paddingX}px`,
            border: 'none',
            outline: '2px solid #3b82f6',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
            fontSize: `${data.fontSize}px`,
            lineHeight: `${data.lineHeight}px`,
            color: data.textColor,
            textAlign: data.textAlign,
            resize: 'none',
            overflow: 'auto',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  );
};

export default TextNode;
