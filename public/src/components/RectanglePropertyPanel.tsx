import React from 'react';
import { useViewModel, useDispatch } from '../store/hooks';
import { actionUpdateRectangleStyle, actionRemoveRectangle } from '../actions/rectangleActions';
import { ColorPickerWithPresets } from './ColorPickerWithPresets';

interface RectanglePropertyPanelProps {
  rectangleId: string;
}

export const RectanglePropertyPanel: React.FC<RectanglePropertyPanelProps> = ({
  rectangleId,
}) => {
  const dispatch = useDispatch();
  
  const rectangle = useViewModel((vm) => vm.erDiagram.rectangles[rectangleId]);

  if (!rectangle) {
    return null;
  }

  const handleFillChange = (fill: string) => {
    dispatch(actionUpdateRectangleStyle, rectangleId, { fill });
  };

  const handleStrokeChange = (stroke: string) => {
    dispatch(actionUpdateRectangleStyle, rectangleId, { stroke });
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const transparencyValue = parseFloat(e.target.value);
    const opacity = 1 - transparencyValue;
    dispatch(actionUpdateRectangleStyle, rectangleId, { opacity });
  };

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strokeWidth = parseFloat(e.target.value);
    if (!isNaN(strokeWidth) && strokeWidth >= 0) {
      dispatch(actionUpdateRectangleStyle, rectangleId, { strokeWidth });
    }
  };

  const handleFillEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fillEnabled = e.target.checked;
    dispatch(actionUpdateRectangleStyle, rectangleId, { fillEnabled });
  };

  const handleStrokeEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strokeEnabled = e.target.checked;
    dispatch(actionUpdateRectangleStyle, rectangleId, { strokeEnabled });
  };

  const handleRemove = () => {
    dispatch(actionRemoveRectangle, rectangleId);
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
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>矩形プロパティ</h3>

      {/* 背景色 */}
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rectangle.fillEnabled ?? true}
            onChange={handleFillEnabledChange}
          />
          <span>背景色を表示</span>
        </label>
      </div>
      <ColorPickerWithPresets
        label="背景色"
        value={rectangle.fill}
        onChange={handleFillChange}
        disabled={!(rectangle.fillEnabled ?? true)}
      />

      {/* 枠線 */}
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rectangle.strokeEnabled ?? true}
            onChange={handleStrokeEnabledChange}
          />
          <span>枠線を表示</span>
        </label>
      </div>
      <ColorPickerWithPresets
        label="枠線"
        value={rectangle.stroke}
        onChange={handleStrokeChange}
        disabled={!(rectangle.strokeEnabled ?? true)}
      />

      {/* 枠線幅 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          枠線幅: {rectangle.strokeWidth}px
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={rectangle.strokeWidth}
          onChange={handleStrokeWidthChange}
          disabled={!(rectangle.strokeEnabled ?? true)}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* 透明度 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
          透明度: {Math.round((1 - rectangle.opacity) * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={1 - rectangle.opacity}
          onChange={handleOpacityChange}
          style={{ width: '100%' }}
        />
      </div>

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
