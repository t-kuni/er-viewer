import React, { useEffect } from 'react'
import { useViewModel, useDispatch } from '../store/hooks'
import { commandFetchBuildInfo } from '../commands/buildInfoCommand'

interface BuildInfoModalProps {
  onClose: () => void
}

function BuildInfoModal({ onClose }: BuildInfoModalProps) {
  const dispatch = useDispatch()
  
  // Storeから状態を取得
  const buildInfo = useViewModel((vm) => vm.buildInfo.data)
  const loading = useViewModel((vm) => vm.buildInfo.loading)
  const error = useViewModel((vm) => vm.buildInfo.error)

  // マウント時にビルド情報がない場合のみ取得
  useEffect(() => {
    if (buildInfo === null) {
      commandFetchBuildInfo(dispatch)
    }
  }, [])

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
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: 0 }}>ビルド情報</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px'
            }}
          >
            &times;
          </button>
        </div>
        
        {loading && <p>読み込み中...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {buildInfo && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>名前</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{buildInfo.name}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>バージョン</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{buildInfo.version}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>ビルド日時</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{buildInfo.buildTime}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Git コミット</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{buildInfo.git.commitShort}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Git ブランチ</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{buildInfo.git.branch}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Node バージョン</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{buildInfo.nodeVersion}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>プラットフォーム</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{buildInfo.platform}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>アーキテクチャ</td>
                  <td style={{ padding: '0.5rem' }}>{buildInfo.arch}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default BuildInfoModal
