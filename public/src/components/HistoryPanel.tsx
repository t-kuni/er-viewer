import React from 'react';
import { useViewModel } from '../store/hooks';
import type {
  ReverseEngineeringHistoryEntry,
  ReverseEngineeringSummary,
  ReverseEngineeringChanges,
  ColumnModification,
  ColumnSnapshot,
} from '../api/client';

/**
 * サマリーテキストを生成する
 * 例: "+3テーブル, -1テーブル, +5カラム, ~2カラム"
 */
function formatSummary(summary: ReverseEngineeringSummary | undefined): string {
  if (!summary) return '(サマリーなし)';

  const parts: string[] = [];

  if (summary.addedTables > 0) parts.push(`+${summary.addedTables}テーブル`);
  if (summary.removedTables > 0) parts.push(`-${summary.removedTables}テーブル`);
  if (summary.addedColumns > 0) parts.push(`+${summary.addedColumns}カラム`);
  if (summary.removedColumns > 0) parts.push(`-${summary.removedColumns}カラム`);
  if (summary.modifiedColumns > 0) parts.push(`~${summary.modifiedColumns}カラム`);
  if (summary.addedRelationships > 0) parts.push(`+${summary.addedRelationships}リレーション`);
  if (summary.removedRelationships > 0) parts.push(`-${summary.removedRelationships}リレーション`);

  if (parts.length === 0) {
    return '変更なし';
  }

  return parts.join(', ');
}

/**
 * リレーション参照を文字列で表現する
 */
function formatRelationshipRef(rel: {
  constraintName?: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}): string {
  if (rel.constraintName) {
    return `${rel.constraintName} (${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn})`;
  }
  return `${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn}`;
}

/**
 * ColumnSnapshotの差分を表示用の文字列に変換する
 */
function formatColumnSnapshot(snapshot: ColumnSnapshot): string {
  const parts: string[] = [];
  if (snapshot.key) parts.push(`key: ${snapshot.key}`);
  if (snapshot.isForeignKey) parts.push(`FK`);
  return parts.join(', ');
}

/**
 * カラム変更の詳細を表示するコンポーネント
 */
function ColumnModificationItem({ mod }: { mod: ColumnModification }) {
  return (
    <div style={{ marginBottom: '8px', paddingLeft: '16px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        {mod.tableName}.{mod.columnName}
      </div>
      <div style={{ fontSize: '12px', color: '#666', paddingLeft: '8px' }}>
        <div>Before: {formatColumnSnapshot(mod.before)}</div>
        <div>After: {formatColumnSnapshot(mod.after)}</div>
      </div>
    </div>
  );
}

/**
 * 変更詳細を表示するコンポーネント
 */
function ChangesDetail({ changes }: { changes: ReverseEngineeringChanges | undefined }) {
  if (!changes) {
    return (
      <div style={{ padding: '8px', color: '#999', fontSize: '12px' }}>
        (変更詳細なし)
      </div>
    );
  }

  const hasChanges =
    (changes.tables?.added && changes.tables.added.length > 0) ||
    (changes.tables?.removed && changes.tables.removed.length > 0) ||
    (changes.columns?.added && changes.columns.added.length > 0) ||
    (changes.columns?.removed && changes.columns.removed.length > 0) ||
    (changes.columns?.modified && changes.columns.modified.length > 0) ||
    (changes.relationships?.added && changes.relationships.added.length > 0) ||
    (changes.relationships?.removed && changes.relationships.removed.length > 0);

  if (!hasChanges) {
    return (
      <div style={{ padding: '8px', color: '#999', fontSize: '12px' }}>
        変更なし
      </div>
    );
  }

  return (
    <div style={{ padding: '8px', fontSize: '13px' }}>
      {/* テーブルの追加 */}
      {changes.tables?.added && changes.tables.added.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#2e7d32' }}>
            追加されたテーブル ({changes.tables.added.length})
          </div>
          <ul style={{ margin: '0', paddingLeft: '24px' }}>
            {changes.tables.added.map((tableName) => (
              <li key={tableName}>{tableName}</li>
            ))}
          </ul>
        </div>
      )}

      {/* テーブルの削除 */}
      {changes.tables?.removed && changes.tables.removed.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#c62828' }}>
            削除されたテーブル ({changes.tables.removed.length})
          </div>
          <ul style={{ margin: '0', paddingLeft: '24px' }}>
            {changes.tables.removed.map((tableName) => (
              <li key={tableName}>{tableName}</li>
            ))}
          </ul>
        </div>
      )}

      {/* カラムの追加 */}
      {changes.columns?.added && changes.columns.added.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#2e7d32' }}>
            追加されたカラム ({changes.columns.added.length})
          </div>
          <ul style={{ margin: '0', paddingLeft: '24px' }}>
            {changes.columns.added.map((col) => (
              <li key={`${col.tableName}.${col.columnName}`}>
                {col.tableName}.{col.columnName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* カラムの削除 */}
      {changes.columns?.removed && changes.columns.removed.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#c62828' }}>
            削除されたカラム ({changes.columns.removed.length})
          </div>
          <ul style={{ margin: '0', paddingLeft: '24px' }}>
            {changes.columns.removed.map((col) => (
              <li key={`${col.tableName}.${col.columnName}`}>
                {col.tableName}.{col.columnName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* カラムの変更 */}
      {changes.columns?.modified && changes.columns.modified.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#f57c00' }}>
            変更されたカラム ({changes.columns.modified.length})
          </div>
          {changes.columns.modified.map((mod) => (
            <ColumnModificationItem key={`${mod.tableName}.${mod.columnName}`} mod={mod} />
          ))}
        </div>
      )}

      {/* リレーションの追加 */}
      {changes.relationships?.added && changes.relationships.added.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#2e7d32' }}>
            追加されたリレーション ({changes.relationships.added.length})
          </div>
          <ul style={{ margin: '0', paddingLeft: '24px', fontSize: '12px' }}>
            {changes.relationships.added.map((rel, idx) => (
              <li key={idx}>{formatRelationshipRef(rel)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* リレーションの削除 */}
      {changes.relationships?.removed && changes.relationships.removed.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#c62828' }}>
            削除されたリレーション ({changes.relationships.removed.length})
          </div>
          <ul style={{ margin: '0', paddingLeft: '24px', fontSize: '12px' }}>
            {changes.relationships.removed.map((rel, idx) => (
              <li key={idx}>{formatRelationshipRef(rel)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * 履歴エントリを表示するコンポーネント
 */
function HistoryEntryItem({ entry }: { entry: ReverseEngineeringHistoryEntry }) {
  const date = new Date(entry.timestamp);
  const dateString = date.toLocaleString('ja-JP');
  const typeLabel = entry.entryType === 'initial' ? '初回' : '増分';
  const summaryText = formatSummary(entry.summary);

  return (
    <details
      style={{
        marginBottom: '8px',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          fontWeight: 'bold',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'inline-block', width: '100%' }}>
          <div style={{ fontSize: '13px' }}>
            {dateString}
            <span
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '11px',
                backgroundColor: entry.entryType === 'initial' ? '#e3f2fd' : '#fff3e0',
                color: entry.entryType === 'initial' ? '#1976d2' : '#f57c00',
              }}
            >
              {typeLabel}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {summaryText}
          </div>
        </div>
      </summary>
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
        <ChangesDetail changes={entry.changes} />
      </div>
    </details>
  );
}

/**
 * 履歴パネルコンポーネント
 */
export function HistoryPanel() {
  const history = useViewModel((vm) => vm.erDiagram.history);

  // 履歴を新しい順にソート
  const sortedHistory = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history].sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
        リバースエンジニアリング履歴
      </h3>

      {sortedHistory.length === 0 ? (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            color: '#999',
            fontSize: '12px',
            border: '1px dashed #ddd',
            borderRadius: '4px',
          }}
        >
          履歴がありません
        </div>
      ) : (
        <div>
          {sortedHistory.map((entry, index) => (
            <HistoryEntryItem key={`${entry.timestamp}-${index}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
