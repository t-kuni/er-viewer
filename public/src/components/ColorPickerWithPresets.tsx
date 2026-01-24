import React from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';

interface ColorPickerWithPresetsProps {
  value: string; // HEX形式の色
  onChange: (color: string) => void;
  label: string;
}

const PRESET_COLORS = [
  '#E3F2FD', // 青
  '#E0F7FA', // シアン
  '#E0F2F1', // ティール
  '#E8F5E9', // 緑
  '#FFFDE7', // 黄
  '#FFF3E0', // オレンジ
  '#FCE4EC', // ピンク
  '#F5F5F5', // グレー
];

export const ColorPickerWithPresets: React.FC<ColorPickerWithPresetsProps> = ({
  value,
  onChange,
  label,
}) => {
  return (
    <div 
      style={{ marginBottom: '1rem' }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
        {label}
      </label>
      
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <HexColorPicker color={value} onChange={onChange} style={{ marginBottom: '0.5rem' }} />
      </div>
      
      <HexColorInput
        color={value}
        onChange={onChange}
        prefixed
        style={{
          width: '100%',
          padding: '0.25rem',
          fontSize: '14px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          marginBottom: '0.5rem',
        }}
      />
      
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
        }}
      >
        {PRESET_COLORS.map((presetColor) => (
          <button
            key={presetColor}
            type="button"
            onClick={() => onChange(presetColor)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: presetColor,
              border: '1px solid #ccc',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
            title={presetColor}
          />
        ))}
      </div>
    </div>
  );
};
