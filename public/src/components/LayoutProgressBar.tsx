import React from 'react';
import { useViewModel, useDispatch } from '../store/hooks';
import { actionCancelLayoutOptimization } from '../actions/layoutActions';

/**
 * 配置最適化の進捗バーコンポーネント
 */
function LayoutProgressBar() {
  const dispatch = useDispatch();
  
  // 配置最適化の状態を購読
  const layoutOptimization = useViewModel((vm) => vm.ui.layoutOptimization);

  // 実行中でない場合は何も表示しない
  if (!layoutOptimization.isRunning) {
    return null;
  }

  const handleCancel = () => {
    dispatch(actionCancelLayoutOptimization);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      minWidth: '400px',
      maxWidth: '500px',
      zIndex: 1000
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <span style={{ fontWeight: 'bold' }}>配置最適化中...</span>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            {Math.round(layoutOptimization.progress)}%
          </span>
        </div>
        
        {layoutOptimization.currentStage && (
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#666',
            marginBottom: '0.5rem'
          }}>
            {layoutOptimization.currentStage}
          </div>
        )}
        
        {/* 進捗バー */}
        <div style={{
          width: '100%',
          height: '8px',
          background: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${layoutOptimization.progress}%`,
            height: '100%',
            background: '#007bff',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* キャンセルボタン */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleCancel}
          style={{
            padding: '0.5rem 1rem',
            background: '#999',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default LayoutProgressBar;
