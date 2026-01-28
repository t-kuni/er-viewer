# タスク一覧: ホバーハイライト機能の仕様変更対応

## 概要

`spec/frontend_er_rendering.md` と `spec/frontend_state_management.md` の仕様変更に対応する実装とテストの更新を行う。

**主な変更内容**:
1. 非ハイライト要素の透明度表示を削除（`opacity: 0.2〜0.3`の削除）
2. イベントハンドラーのメモ化（`useCallback`）を追加してReact.memoの効果を最大化

## 参照仕様書

- `/home/kuni/Documents/er-viewer/spec/frontend_er_rendering.md` - L238-289（ハイライト機能の仕様）、L349-381（実装時の注意事項）
- `/home/kuni/Documents/er-viewer/spec/frontend_state_management.md` - L393-395（イベントハンドラーのメモ化）

## 実装タスク

### EntityNodeコンポーネントの修正

**編集対象**: `/home/kuni/Documents/er-viewer/public/src/components/EntityNode.tsx`

**変更内容**:

1. **非ハイライト要素のopacity削除**
   - 現在: `opacity: isDimmed ? 0.2 : 1` (L47)
   - 修正後: `opacity: 1` を削除（デフォルト値のため指定不要）
   - `isDimmed`変数の定義（L27）と使用箇所を削除
   - `hasHover`の購読（L23）も不要になるため削除

2. **イベントハンドラーのメモ化**
   - `handleColumnMouseEnter`と`handleColumnMouseLeave`を`useCallback`でメモ化
   - 依存配列: `[dispatch]`
   - 目的: EntityColumnコンポーネントのReact.memoを効かせるため（親の再レンダリング時に子への不要なprops変更を防ぐ）

**修正前**:
```typescript
const handleColumnMouseEnter = (e: React.MouseEvent, columnId: string) => {
  e.stopPropagation()
  dispatch(actionHoverColumn, columnId)
}

const handleColumnMouseLeave = (e: React.MouseEvent) => {
  e.stopPropagation()
  dispatch(actionClearHover)
}
```

**修正後**:
```typescript
const handleColumnMouseEnter = useCallback((e: React.MouseEvent, columnId: string) => {
  e.stopPropagation()
  dispatch(actionHoverColumn, columnId)
}, [dispatch])

const handleColumnMouseLeave = useCallback((e: React.MouseEvent) => {
  e.stopPropagation()
  dispatch(actionClearHover)
}, [dispatch])
```

**必要なimport追加**:
```typescript
import React, { useCallback } from 'react'
```

### RelationshipEdgeコンポーネントの修正

**編集対象**: `/home/kuni/Documents/er-viewer/public/src/components/RelationshipEdge.tsx`

**変更内容**:

1. **非ハイライト要素のopacity削除**
   - 現在: `opacity: isDimmed ? 0.2 : 1` (L53)
   - 修正後: opacity指定を削除（デフォルト値1を使用）
   - `isDimmed`変数の定義（L35）と使用箇所を削除
   - `hasHover`の購読（L23）も不要になるため削除

**修正箇所**:
- L23の`hasHover`購読行を削除
- L35の`isDimmed`変数定義を削除
- L53の`opacity: isDimmed ? 0.2 : 1`を削除

### ERCanvasコンポーネントの確認

**確認対象**: `/home/kuni/Documents/er-viewer/public/src/components/ERCanvas.tsx`

**確認結果**:

以下のイベントハンドラーは既にuseCallbackでメモ化されているため、**修正不要**:
- `handleRectangleMouseDown` (L294-310) - useCallback適用済み
- `handleTextMouseDown` (L390-406) - useCallback適用済み
- `handleResize` (L385-387) - useCallback適用済み
- `handleTextResize` (L409-412) - useCallback適用済み

**変更内容**: なし（確認のみ）

## テストタスク

### hoverActions.test.tsの確認

**確認対象**: `/home/kuni/Documents/er-viewer/public/tests/actions/hoverActions.test.ts`

**確認内容**:
- 既存のテストが仕様変更（非ハイライト要素の透明度削除）に影響を受けないことを確認
- hoverActionsはViewModel内のUI状態を変更するだけで、透明度の計算はコンポーネント側で行うため、テストコードの修正は不要のはず
- 念のため全テストを実行して、パスすることを確認

### コンポーネントテストの検討

**検討内容**:
- EntityNodeとRelationshipEdgeのReact.memoとuseCallbackの効果を検証するテストが必要か検討
- 現状、コンポーネント単体テストは存在しないため、新規作成は今回の対応範囲外とする
- パフォーマンス検証はReact DevTools Profilerを使った手動確認に委ねる

## ビルド・動作確認タスク

### コード生成の実行

**実行コマンド**: `npm run generate`

**確認内容**:
- TypeSpecから生成される型定義が正しく生成されることを確認

### フロントエンドのビルド確認

**実行コマンド**: `cd public && npm run build`

**確認内容**:
- TypeScriptのコンパイルエラーがないことを確認
- ビルドが正常に完了することを確認

### テストの実行

**実行コマンド**: `npm run test`

**確認内容**:
- 全てのテストがパスすることを確認（131テスト全てパス想定）
- 特にhoverActions.test.tsのテストに注目

## 指示者宛ての懸念事項（作業対象外）

### CSS transitionについて

**確認結果**: ホバーハイライト機能（EntityNode、RelationshipEdge、EntityColumn）にはCSS transitionは使用されていません。これらのコンポーネントはinline styleで直接スタイルを指定しているため、仕様書通り「CSS transitionを使用しない」が既に実現されています。

※ 他のコンポーネント（App.tsx、LayerPanel.tsx）やstyle.cssにはtransitionが存在しますが、ホバーハイライト機能とは無関係です。

### 非ハイライト要素の透明度削除によるUX影響

非ハイライト要素の透明度表示を削除することで、視覚的な変化があります。これがUXに悪影響を与えないか、実際のアプリケーションで確認が必要です。

**確認方法**:
1. 大量のエンティティ（50件以上）を含むER図を読み込む
2. ホバー時の視認性を確認（ハイライトされた要素が目立つか）
3. 必要に応じて、ハイライト表示のスタイル（枠線の太さ、影の強さなど）を調整

**代替案**:
- 非ハイライト要素の透明度を0.2ではなく、0.5〜0.7程度に調整する
- ハイライト要素の強調表示をより強くする（枠線をさらに太く、影をより強く）
