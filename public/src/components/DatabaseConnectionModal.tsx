import React, { useState, useEffect } from 'react'
import type { DatabaseConnectionState, DatabaseType } from '../api/client'

interface DatabaseConnectionModalProps {
  onExecute: (connectionInfo: DatabaseConnectionState, password: string) => void;
  onCancel: () => void;
  initialValues?: DatabaseConnectionState;
  errorMessage?: string;
}

function DatabaseConnectionModal({ onExecute, onCancel, initialValues, errorMessage }: DatabaseConnectionModalProps) {
  // 入力フォームの状態
  const [dbType, setDbType] = useState<DatabaseType>(initialValues?.type || 'mysql' as DatabaseType)
  const [host, setHost] = useState(initialValues?.host || '')
  const [port, setPort] = useState(initialValues?.port?.toString() || '')
  const [user, setUser] = useState(initialValues?.user || '')
  const [password, setPassword] = useState('')
  const [database, setDatabase] = useState(initialValues?.database || '')
  const [schema, setSchema] = useState(initialValues?.schema || 'public')

  // Database Type変更時にportのデフォルト値を自動調整
  useEffect(() => {
    if (!initialValues?.port) {
      // 初期値がない場合のみ自動調整
      if (dbType === 'mysql') {
        setPort('3306')
      } else if (dbType === 'postgresql') {
        setPort('5432')
      }
    }
  }, [dbType, initialValues?.port])

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
    // Database Typeに応じたデフォルト値を設定
    const defaultPort = dbType === 'postgresql' ? 5432 : 3306
    const defaultUser = dbType === 'postgresql' ? 'postgres' : 'root'
    const defaultDatabase = dbType === 'postgresql' ? 'erviewer' : 'test'

    const connectionInfo: DatabaseConnectionState = {
      type: dbType,
      host: host || 'localhost',
      port: port ? parseInt(port, 10) : defaultPort,
      user: user || defaultUser,
      database: database || defaultDatabase,
    }

    // PostgreSQLの場合のみschemaを含める
    if (dbType === 'postgresql') {
      connectionInfo.schema = schema || 'public'
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
          <select
            value={dbType}
            onChange={(e) => setDbType(e.target.value as DatabaseType)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
          </select>
        </div>

        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          color: '#856404',
          fontSize: '0.9rem'
        }}>
          ⚠️ information_schemaを参照するためルートユーザ（または十分な権限を持つユーザ）での実行を推奨します
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
            placeholder={dbType === 'postgresql' ? '5432' : '3306'}
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
            placeholder={dbType === 'postgresql' ? 'postgres' : 'root'}
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Database
          </label>
          <input 
            type="text" 
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            placeholder={dbType === 'postgresql' ? 'erviewer' : 'test'}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        {dbType === 'postgresql' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Schema
            </label>
            <input 
              type="text" 
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              placeholder="public"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
        )}

        {dbType !== 'postgresql' && (
          <div style={{ marginBottom: '1.5rem' }} />
        )}

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
