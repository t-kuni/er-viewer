# タスク一覧: ホバーインタラクションのパフォーマンス最適化

## 概要

`frontend_state_management.md` と `frontend_er_rendering.md` の仕様変更に基づき、ホバー時の再レンダリングを最小化するための最適化を実装する。

大量のエンティティ・リレーションがある場合、現在の実装ではホバーするたびに全てのEntityNodeとRelationshipEdgeが再レンダリングされ、パフォーマンスが劣化する。各コンポーネントがハイライト配列全体ではなく「自分がハイライトされているか」という真偽値だけを購読することで、ハイライト状態が変化したコンポーネントのみが再レンダリングされるようにする。

## 参照仕様書

- `/home/kuni/Documents/er-viewer/spec/frontend_state_management.md`
  - 「React統合」セクション（234-250行目）
  - 「ホバーインタラクションの最適化」セクション（387-391行目）
- `/home/kuni/Documents/er-viewer/spec/frontend_er_rendering.md`
  - 「実装時の注意事項」セクション（373-386行目）

## 実装タスク

### □ useViewModelフックの拡張

**編集対象**: `/home/kuni/Documents/er-viewer/public/src/store/hooks.ts`

**変更内容**:
- `useViewModel`関数のシグネチャに`equalityFn`パラメータを追加する
  ```typescript
  function useViewModel<T>(
    selector: (vm: ViewModel) => T,
    equalityFn?: (a: T, b: T) => boolean
  ): T
  ```
- `useSyncExternalStore`の実装を修正し、等価性チェック関数を適用する
  - 前回のselector結果を保持し、`equalityFn`で比較する
  - `equalityFn`が指定されていない場合は従来通り参照比較を行う（`Object.is`）
  - 値が変わらない場合は前回の参照を返すことで、`useSyncExternalStore`による不要な再レンダリングを防ぐ

**実装のポイント**:
- `useSyncExternalStore`は参照比較を行うため、selectorが毎回新しい値（例: boolean）を返すと、値が同じでも参照が異なるため再レンダリングが発生する
- `equalityFn`を使って値ベースの比較を行い、値が変わらない場合は前回の参照を返すことで、この問題を解決する
- クロージャを使って前回の値を保持する実装が必要

### □ EntityNodeコンポーネントの最適化

**編集対象**: `/home/kuni/Documents/er-viewer/public/src/components/EntityNode.tsx`

**変更内容**:
1. **React.memoでラップ**: コンポーネント全体を`React.memo`でラップし、propsが変わらない限り再レンダリングを防ぐ
   ```typescript
   export default React.memo(EntityNode)
   ```

2. **selector最適化**: ハイライト配列全体ではなく「自分がハイライトされているか」という真偽値だけを購読する
   - 現在の実装:
     ```typescript
     const highlightedNodeIds = useViewModel((vm) => vm.erDiagram.ui.highlightedNodeIds)
     const isHighlighted = highlightedNodeIds.includes(data.id)
     ```
   - 最適化後:
     ```typescript
     const isHighlighted = useViewModel(
       (vm) => vm.erDiagram.ui.highlightedNodeIds.includes(data.id),
       (a, b) => a === b
     )
     ```
   
**注意事項**:
- `hasHover`は引き続き購読する（dimmed状態の計算に必要）
- `isDraggingEntity`も引き続き購読する（ドラッグ中のホバー無効化に必要）
- カラムのレンダリングはEntityColumnコンポーネントに委譲する

### □ EntityColumnコンポーネントの作成

**新規作成**: `/home/kuni/Documents/er-viewer/public/src/components/EntityColumn.tsx`

**変更内容**:
カラムを別コンポーネントに切り出し、各カラムが自分のハイライト状態だけを購読するようにする。

**コンポーネントのインターフェース**:
```typescript
interface EntityColumnProps {
  column: Column
  onMouseEnter: (e: React.MouseEvent, columnId: string) => void
  onMouseLeave: (e: React.MouseEvent) => void
}
```

**実装内容**:
1. **React.memoでラップ**: コンポーネント全体を`React.memo`でラップ
2. **selector最適化**: 各カラムが「自分がハイライトされているか」という真偽値だけを購読
   ```typescript
   const isHighlighted = useViewModel(
     (vm) => vm.erDiagram.ui.highlightedColumnIds.includes(column.id),
     (a, b) => a === b
   )
   ```
3. **カラムの表示**: 既存のEntityNodeからカラム表示ロジックを移植
   - PKアイコン（🔑）、FKアイコン（🔗）の表示
   - ハイライト時の背景色変更
   - ホバーイベントハンドラーの設定

**EntityNodeからの移植箇所**:
- EntityNode.tsxの78-99行目のカラムレンダリングロジック

### □ EntityNodeコンポーネントのリファクタリング

**編集対象**: `/home/kuni/Documents/er-viewer/public/src/components/EntityNode.tsx`（追加修正）

**変更内容**:
1. EntityColumnコンポーネントをimport
2. カラムのmap内でEntityColumnコンポーネントを使用するように変更
3. `highlightedColumnIds`の購読を削除（EntityColumnが個別に購読するため不要）

**修正前**:
```typescript
{data.columns.map((col, index) => {
  const isColumnHighlighted = highlightedColumnIds.includes(col.id)
  
  return (
    <div 
      key={index} 
      style={{ 
        padding: '4px',
        borderBottom: '1px solid #eee',
        fontSize: '12px',
        backgroundColor: isColumnHighlighted ? '#e3f2fd' : 'transparent',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => handleColumnMouseEnter(e, col.id)}
      onMouseLeave={handleColumnMouseLeave}
    >
      {col.key === 'PRI' && '🔑 '}
      {col.key === 'MUL' && '🔗 '}
      {col.name}
    </div>
  )
})}
```

**修正後**:
```typescript
{data.columns.map((col, index) => (
  <EntityColumn
    key={index}
    column={col}
    onMouseEnter={handleColumnMouseEnter}
    onMouseLeave={handleColumnMouseLeave}
  />
))}
```

### □ RelationshipEdgeコンポーネントの最適化

**編集対象**: `/home/kuni/Documents/er-viewer/public/src/components/RelationshipEdge.tsx`

**変更内容**:
1. **React.memoでラップ**: コンポーネント全体を`React.memo`でラップし、propsが変わらない限り再レンダリングを防ぐ
   ```typescript
   export default React.memo(RelationshipEdge)
   ```

2. **selector最適化**: ハイライト配列全体ではなく「自分がハイライトされているか」という真偽値だけを購読する
   - 現在の実装:
     ```typescript
     const highlightedEdgeIds = useViewModel((vm) => vm.erDiagram.ui.highlightedEdgeIds)
     const isHighlighted = highlightedEdgeIds.includes(id)
     ```
   - 最適化後:
     ```typescript
     const isHighlighted = useViewModel(
       (vm) => vm.erDiagram.ui.highlightedEdgeIds.includes(id),
       (a, b) => a === b
     )
     ```

**注意事項**:
- `hasHover`は引き続き購読する（dimmed状態の計算に必要）

## テストタスク

### □ 既存テストの実行確認

**実行対象**: 全てのテスト

**確認内容**:
- 既存のテスト（action系テスト）が引き続きパスすることを確認
- 特に`hoverActions.test.ts`が影響を受けていないか確認

## ビルド・動作確認タスク

### □ コード生成の実行

**実行コマンド**: `npm run generate`

**確認内容**:
- TypeSpecから生成される型定義が正しく生成されることを確認

### □ フロントエンドのビルド確認

**実行コマンド**: `cd public && npm run build`

**確認内容**:
- TypeScriptのコンパイルエラーがないことを確認
- ビルドが正常に完了することを確認

### □ テストの実行

**実行コマンド**: `npm run test`

**確認内容**:
- 全てのテストがパスすることを確認
- テストカバレッジが適切であることを確認

## 指示者宛ての懸念事項（作業対象外）

### パフォーマンス測定について

実装後、実際にパフォーマンスが改善されたかを定量的に測定する仕組みがないため、効果の検証が難しい可能性があります。以下の方法で測定を検討してください：

1. **React DevTools Profiler**を使用して再レンダリング回数と時間を測定
2. 大量のエンティティ（例: 100件以上）をインポートしてホバー時のフレームレートを測定
3. Chrome DevToolsのPerformanceタブでホバー操作のフレームグラフを記録

### 他のコンポーネントへの展開

RectangleNodeやTextNodeなど、他の描画要素も同様の最適化が必要になる可能性があります。本タスク完了後、同じパターンを他のコンポーネントにも適用することを検討してください。
