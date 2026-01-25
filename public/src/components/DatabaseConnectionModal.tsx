import React, { useState, useEffect } from 'react'
import type { DatabaseConnectionState } from '../api/client'

interface DatabaseConnectionModalProps {
  onExecute: (connectionInfo: DatabaseConnectionState, password: string) => void;
  onCancel: () => void;
  initialValues?: DatabaseConnectionState;
  errorMessage?: string;
}

function DatabaseConnectionModal({ onExecute, onCancel, initialValues, errorMessage }: DatabaseConnectionModalProps) {
  // 入力フォームの状態
  const [host, setHost] = useState(initialValues?.host || '')
  const [port, setPort] = useState(initialValues?.port?.toString() || '')
  const [user, setUser] = useState(initialValues?.user || '')
  const [password, setPassword] = useState('')
  const [database, setDatabase] = useState(initialValues?.database || '')

  // ESCキーで閉じる処理
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  // 実行ボタンのハンドラ
  const handleExecute = () => {
    const connectionInfo: DatabaseConnectionState = {
      type: 'mysql', // 固定
      host: host || 'localhost',
      port: port ? parseInt(port, 10) : 3306,
      user: user || 'root',
      database: database || 'test',
    }
    onExecute(connectionInfo, password)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div 
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>データベース接続設定</h3>
        
        {errorMessage && (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33'
          }}>
            {errorMessage}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Database Type
          </label>
          <input 
            type="text" 
            value="MySQL" 
            disabled 
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: '#f5f5f5',
              color: '#666'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Host
          </label>
          <input 
            type="text" 
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="localhost"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Port
          </label>
          <input 
            type="number" 
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="3306"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            User
          </label>
          <input 
            type="text" 
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="root"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Password
          </label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Database
          </label>
          <input 
            type="text" 
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            placeholder="test"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button 
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              background: '#999',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            キャンセル
          </button>
          <button 
            onClick={handleExecute}
            style={{
              padding: '0.5rem 1rem',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            実行
          </button>
        </div>
      </div>
    </div>
  )
}

export default DatabaseConnectionModal
