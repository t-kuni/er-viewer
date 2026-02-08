import React, { useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { useViewModel, useDispatch } from '../store/hooks';
import { ColorPickerWithPresets } from './ColorPickerWithPresets';
import {
  actionUpdateTextContent,
  actionUpdateTextStyle,
  actionSetTextAutoSizeMode,
  actionUpdateTextShadow,
  actionUpdateBackgroundShadow,
  actionUpdateTextPadding,
  actionUpdateTextBackground,
  actionRemoveText,
  actionUpdateTextBounds,
} from '../actions/textActions';
import { TextBox } from '../api/client';

interface TextPropertyPanelProps {
  textId: string;
}

export const TextPropertyPanel: React.FC<TextPropertyPanelProps> = ({ textId }) => {
  const dispatch = useDispatch();
  const text = useViewModel((vm) => vm.erDiagram.texts[textId]);

  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showTextShadowColorPicker, setShowTextShadowColorPicker] = useState(false);
  const [showBackgroundShadowColorPicker, setShowBackgroundShadowColorPicker] = useState(false);

  if (!text) {
    return null;
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(actionUpdateTextContent, textId, e.target.value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fontSize = parseFloat(e.target.value);
    if (!isNaN(fontSize) && fontSize > 0) {
      dispatch(actionUpdateTextStyle, textId, { fontSize });
    }
  };

  const handleLineHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const lineHeight = parseFloat(e.target.value);
    if (!isNaN(lineHeight) && lineHeight > 0) {
      dispatch(actionUpdateTextStyle, textId, { lineHeight });
    }
  };

  const handleTextAlignChange = (textAlign: TextBox.textAlign) => {
    dispatch(actionUpdateTextStyle, textId, { textAlign });
  };

  const handleTextVerticalAlignChange = (textVerticalAlign: TextBox.textVerticalAlign) => {
    dispatch(actionUpdateTextStyle, textId, { textVerticalAlign });
  };

  const handleTextColorChange = (textColor: string) => {
    dispatch(actionUpdateTextStyle, textId, { textColor });
  };

  const handleBackgroundEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(actionUpdateTextBackground, textId, { backgroundEnabled: e.target.checked });
  };

  const handleBackgroundColorChange = (backgroundColor: string) => {
    dispatch(actionUpdateTextBackground, textId, { backgroundColor });
  };

  const handleBackgroundOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const transparencyValue = parseFloat(e.target.value);
    const backgroundOpacity = 1 - transparencyValue;
    dispatch(actionUpdateTextBackground, textId, { backgroundOpacity });
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const transparencyValue = parseFloat(e.target.value);
    const opacity = 1 - transparencyValue;
    dispatch(actionUpdateTextStyle, textId, { opacity });
  };

  // 文字のシャドウ用ハンドラ
  const handleShadowEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(actionUpdateTextShadow, textId, { enabled: e.target.checked });
  };

  const handleShadowOffsetXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offsetX = parseFloat(e.target.value);
    if (!isNaN(offsetX)) {
      dispatch(actionUpdateTextShadow, textId, { offsetX });
    }
  };

  const handleShadowOffsetYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offsetY = parseFloat(e.target.value);
    if (!isNaN(offsetY)) {
      dispatch(actionUpdateTextShadow, textId, { offsetY });
    }
  };

  const handleShadowBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const blur = parseFloat(e.target.value);
    if (!isNaN(blur) && blur >= 0) {
      dispatch(actionUpdateTextShadow, textId, { blur });
    }
  };

  const handleShadowColorChange = (color: string) => {
    dispatch(actionUpdateTextShadow, textId, { color });
  };

  const handleShadowOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value);
    dispatch(actionUpdateTextShadow, textId, { opacity });
  };

  // 背景のシャドウ用ハンドラ
  const handleBackgroundShadowEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(actionUpdateBackgroundShadow, textId, { enabled: e.target.checked });
  };

  const handleBackgroundShadowOffsetXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offsetX = parseFloat(e.target.value);
    if (!isNaN(offsetX)) {
      dispatch(actionUpdateBackgroundShadow, textId, { offsetX });
    }
  };

  const handleBackgroundShadowOffsetYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offsetY = parseFloat(e.target.value);
    if (!isNaN(offsetY)) {
      dispatch(actionUpdateBackgroundShadow, textId, { offsetY });
    }
  };

  const handleBackgroundShadowBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const blur = parseFloat(e.target.value);
    if (!isNaN(blur) && blur >= 0) {
      dispatch(actionUpdateBackgroundShadow, textId, { blur });
    }
  };

  const handleBackgroundShadowSpreadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const spread = parseFloat(e.target.value);
    if (!isNaN(spread)) {
      dispatch(actionUpdateBackgroundShadow, textId, { spread });
    }
  };

  const handleBackgroundShadowColorChange = (color: string) => {
    dispatch(actionUpdateBackgroundShadow, textId, { color });
  };

  const handleBackgroundShadowOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value);
    dispatch(actionUpdateBackgroundShadow, textId, { opacity });
  };

  const handlePaddingXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const paddingX = parseFloat(e.target.value);
    if (!isNaN(paddingX) && paddingX >= 0) {
      dispatch(actionUpdateTextPadding, textId, paddingX, text.paddingY);
    }
  };

  const handlePaddingYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const paddingY = parseFloat(e.target.value);
    if (!isNaN(paddingY) && paddingY >= 0) {
      dispatch(actionUpdateTextPadding, textId, text.paddingX, paddingY);
    }
  };

  const handleAutoSizeModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(actionSetTextAutoSizeMode, textId, e.target.value as TextBox.autoSizeMode);
  };

  const handleWrapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(actionUpdateTextStyle, textId, { wrap: e.target.checked });
  };

  const handleOverflowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(actionUpdateTextStyle, textId, { overflow: e.target.value as TextBox.overflow });
  };

  const handleFitToContent = () => {
    // DOM測定を実行
    const measureDiv = document.createElement('div');
    measureDiv.style.position = 'absolute';
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.fontSize = `${text.fontSize}px`;
    measureDiv.style.lineHeight = `${text.lineHeight}px`;
    measureDiv.style.padding = `${text.paddingY}px ${text.paddingX}px`;
    measureDiv.style.whiteSpace = 'pre-wrap';
    measureDiv.style.fontFamily =
      'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif';

    if (text.wrap) {
      measureDiv.style.overflowWrap = 'anywhere';
      measureDiv.style.wordBreak = 'break-word';
      measureDiv.style.width = `${text.width}px`;
    }

    measureDiv.textContent = text.content || ' ';
    document.body.appendChild(measureDiv);

    const measuredWidth = measureDiv.scrollWidth;
    const measuredHeight = measureDiv.scrollHeight;

    document.body.removeChild(measureDiv);

    dispatch(actionUpdateTextBounds, textId, {
      x: text.x,
      y: text.y,
      width: Math.max(40, measuredWidth),
      height: Math.max(20, measuredHeight),
    });
  };

  const handleRemove = () => {
    dispatch(actionRemoveText, textId);
  };

  return (
    <div
      style={{ padding: '1rem' }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onChange={(e) => e.stopPropagation()}
      onCopy={(e) => e.stopPropagation()}
      onCut={(e) => e.stopPropagation()}
      onPaste={(e) => e.stopPropagation()}
    >
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>テキストプロパティ</h3>

      {/* 内容 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          内容
        </label>
        <textarea
          rows={5}
          value={text.content}
          onChange={handleContentChange}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>

      {/* フォントサイズ */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          フォントサイズ: {text.fontSize}px
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={text.fontSize}
          onChange={handleFontSizeChange}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* 行の高さ */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          行の高さ: {text.lineHeight}px
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={text.lineHeight}
          onChange={handleLineHeightChange}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* 水平配置 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          水平配置
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {([TextBox.textAlign.LEFT, TextBox.textAlign.CENTER, TextBox.textAlign.RIGHT]).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => handleTextAlignChange(align)}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: text.textAlign === align ? '#3b82f6' : '#f3f4f6',
                color: text.textAlign === align ? '#ffffff' : '#000000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {align === TextBox.textAlign.LEFT ? '左' : align === TextBox.textAlign.CENTER ? '中央' : '右'}
            </button>
          ))}
        </div>
      </div>

      {/* 垂直配置 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          垂直配置
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {([TextBox.textVerticalAlign.TOP, TextBox.textVerticalAlign.MIDDLE, TextBox.textVerticalAlign.BOTTOM]).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => handleTextVerticalAlignChange(align)}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: text.textVerticalAlign === align ? '#3b82f6' : '#f3f4f6',
                color: text.textVerticalAlign === align ? '#ffffff' : '#000000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {align === TextBox.textVerticalAlign.TOP ? '上' : align === TextBox.textVerticalAlign.MIDDLE ? '中央' : '下'}
            </button>
          ))}
        </div>
      </div>

      {/* 文字色 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          文字色
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
          }}
        >
          <div
            onClick={() => setShowTextColorPicker(!showTextColorPicker)}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: text.textColor,
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          />
          <HexColorInput
            color={text.textColor}
            onChange={handleTextColorChange}
            style={{
              flex: 1,
              padding: '0.5rem',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
        {showTextColorPicker && (
          <HexColorPicker color={text.textColor} onChange={handleTextColorChange} />
        )}
      </div>

      {/* 文字の透明度 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          文字の透明度: {Math.round((1 - text.opacity) * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={1 - text.opacity}
          onChange={handleOpacityChange}
          style={{ width: '100%' }}
        />
      </div>

      {/* 背景色 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="checkbox"
            checked={text.backgroundEnabled}
            onChange={handleBackgroundEnabledChange}
          />
          <span style={{ fontWeight: 'bold' }}>背景色</span>
        </label>

        {text.backgroundEnabled && (
          <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            <ColorPickerWithPresets
              label="色"
              value={text.backgroundColor}
              onChange={handleBackgroundColorChange}
            />
            
            {/* 背景の透明度 */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                背景の透明度: {Math.round((1 - text.backgroundOpacity) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={1 - text.backgroundOpacity}
                onChange={handleBackgroundOpacityChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* パディング */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          パディング (X / Y)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            min="0"
            step="1"
            value={text.paddingX}
            onChange={handlePaddingXChange}
            style={{
              width: '50%',
              padding: '0.5rem',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <input
            type="number"
            min="0"
            step="1"
            value={text.paddingY}
            onChange={handlePaddingYChange}
            style={{
              width: '50%',
              padding: '0.5rem',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      {/* 自動サイズ調整モード */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          自動サイズ調整
        </label>
        <select
          value={text.autoSizeMode}
          onChange={handleAutoSizeModeChange}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          <option value={TextBox.autoSizeMode.MANUAL}>手動</option>
          <option value={TextBox.autoSizeMode.FIT_CONTENT}>内容に合わせる</option>
          <option value={TextBox.autoSizeMode.FIT_WIDTH}>幅に合わせる</option>
        </select>
      </div>

      {/* 折り返し */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={text.wrap} onChange={handleWrapChange} />
          <span style={{ fontWeight: 'bold' }}>折り返し</span>
        </label>
      </div>

      {/* オーバーフロー */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          オーバーフロー
        </label>
        <select
          value={text.overflow}
          onChange={handleOverflowChange}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          <option value={TextBox.overflow.CLIP}>切り取り</option>
          <option value={TextBox.overflow.SCROLL}>スクロール</option>
        </select>
      </div>

      {/* 文字のドロップシャドウ */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="checkbox"
            checked={text.textShadow.enabled}
            onChange={handleShadowEnabledChange}
          />
          <span style={{ fontWeight: 'bold' }}>文字のドロップシャドウ</span>
        </label>

        {text.textShadow.enabled && (
          <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            {/* オフセットX */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                オフセットX: {text.textShadow.offsetX}px
              </label>
              <input
                type="number"
                step="1"
                value={text.textShadow.offsetX}
                onChange={handleShadowOffsetXChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* オフセットY */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                オフセットY: {text.textShadow.offsetY}px
              </label>
              <input
                type="number"
                step="1"
                value={text.textShadow.offsetY}
                onChange={handleShadowOffsetYChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* ぼかし */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                ぼかし: {text.textShadow.blur}px
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={text.textShadow.blur}
                onChange={handleShadowBlurChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* 色 */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                色
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <div
                  onClick={() => setShowTextShadowColorPicker(!showTextShadowColorPicker)}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: text.textShadow.color,
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
                <HexColorInput
                  color={text.textShadow.color}
                  onChange={handleShadowColorChange}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </div>
              {showTextShadowColorPicker && (
                <HexColorPicker
                  color={text.textShadow.color}
                  onChange={handleShadowColorChange}
                />
              )}
            </div>

            {/* 透明度 */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                透明度: {Math.round(text.textShadow.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={text.textShadow.opacity}
                onChange={handleShadowOpacityChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 背景のドロップシャドウ */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="checkbox"
            checked={text.backgroundShadow.enabled}
            onChange={handleBackgroundShadowEnabledChange}
          />
          <span style={{ fontWeight: 'bold' }}>背景のドロップシャドウ</span>
        </label>

        {text.backgroundShadow.enabled && (
          <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
            {/* オフセットX */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                オフセットX: {text.backgroundShadow.offsetX}px
              </label>
              <input
                type="number"
                step="1"
                value={text.backgroundShadow.offsetX}
                onChange={handleBackgroundShadowOffsetXChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* オフセットY */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                オフセットY: {text.backgroundShadow.offsetY}px
              </label>
              <input
                type="number"
                step="1"
                value={text.backgroundShadow.offsetY}
                onChange={handleBackgroundShadowOffsetYChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* ぼかし */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                ぼかし: {text.backgroundShadow.blur}px
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={text.backgroundShadow.blur}
                onChange={handleBackgroundShadowBlurChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* 広がり */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                広がり: {text.backgroundShadow.spread}px
              </label>
              <input
                type="number"
                step="1"
                value={text.backgroundShadow.spread}
                onChange={handleBackgroundShadowSpreadChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* 色 */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                色
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <div
                  onClick={() => setShowBackgroundShadowColorPicker(!showBackgroundShadowColorPicker)}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: text.backgroundShadow.color,
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
                <HexColorInput
                  color={text.backgroundShadow.color}
                  onChange={handleBackgroundShadowColorChange}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </div>
              {showBackgroundShadowColorPicker && (
                <HexColorPicker
                  color={text.backgroundShadow.color}
                  onChange={handleBackgroundShadowColorChange}
                />
              )}
            </div>

            {/* 透明度 */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '0.25rem' }}>
                透明度: {Math.round(text.backgroundShadow.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={text.backgroundShadow.opacity}
                onChange={handleBackgroundShadowOpacityChange}
                style={{ width: '100%' }}
              />
            </div>

            {/* 警告メッセージ */}
            {!text.backgroundEnabled && (
              <div style={{ 
                fontSize: '12px', 
                color: '#f59e0b', 
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#fffbeb',
                borderRadius: '4px',
                border: '1px solid #fcd34d'
              }}>
                ⚠️ 背景色が無効のため、影は表示されません
              </div>
            )}
          </div>
        )}
      </div>

      {/* 内容に合わせるボタン */}
      <button
        type="button"
        onClick={handleFitToContent}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginBottom: '0.5rem',
        }}
      >
        内容に合わせる
      </button>

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={handleRemove}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#dc3545',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        削除
      </button>
    </div>
  );
};
