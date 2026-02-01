# タスク一覧

仕様書 `spec/frontend_er_rendering.md` の更新に基づき、ハイライト機能のパフォーマンス改善を実装します。

## 背景

リサーチ [research/20260131_2143_highlighted_edge_visibility.md](research/20260131_2143_highlighted_edge_visibility.md) に基づき、以下2つの問題を解決します：

1. **ハイライトされたエッジがノードに隠れる問題**: React Flowの`edge.zIndex`プロパティを使用してハイライト時に前面表示
2. **ホバー時の全要素再レンダリング問題**: CSSクラスによる一括制御でパフォーマンス向上

## 実装タスク

### □ `public/src/utils/reactFlowConverter.ts`の修正 - エッジzIndexの動的制御

**目的**: エッジのzIndexをハイライト状態に応じて動的に設定する

**変更内容**:
- `convertToReactFlowEdges`関数のシグネチャを変更
  - 第3引数として`highlightedEdgeIds: string[]`を追加
- エッジ生成時にハイライト状態を判定し、zIndexを動的に設定
  - ハイライトされたエッジ: `zIndex: 100`
  - 通常のエッジ: `zIndex: -100`（既存の値）

**インタフェース**:
```typescript
export function convertToReactFlowEdges(
  edges: { [key: string]: RelationshipEdgeViewModel },
  nodes: { [key: string]: EntityNodeViewModel },
  highlightedEdgeIds: string[]  // 追加
): Edge[]
```

**参照仕様**: [spec/frontend_er_rendering.md](spec/frontend_er_rendering.md) の「z-index制御」セクション

---

### □ `public/src/components/ERCanvas.tsx`の修正 - React Flow設定とエッジ再構築

**目的**: React FlowのzIndexMode設定と、ハイライト状態に応じたエッジ配列の再構築

**変更内容**:

1. **highlightedEdgeIdsの購読追加**:
   - `useViewModel`で`vm.erDiagram.ui.highlightedEdgeIds`を購読

2. **useEffectの分離**:
   - ノード更新のuseEffect: `viewModelNodes`の変化時のみ実行
   - エッジ更新のuseEffect: `viewModelEdges`, `viewModelNodes`, `highlightedEdgeIds`の変化時に実行
   - highlightedEdgeIds変更時にノードが再構築されないようにする（ちらつき防止）

3. **convertToReactFlowEdges呼び出しの修正**:
   - 第3引数として`highlightedEdgeIds`を渡す

4. **ReactFlowコンポーネントにzIndexMode設定追加**:
   - `zIndexMode="manual"`を追加（自動z-index調整を無効化）

**参照仕様**: [spec/frontend_er_rendering.md](spec/frontend_er_rendering.md) の「z-index制御」「エッジzIndexの更新」セクション

---

### □ `public/src/components/RelationshipEdge.tsx`の修正 - SVG内zIndex削除とクラス追加

**目的**: SVG内の無効なzIndex指定を削除し、CSS制御用のクラスを追加

**変更内容**:

1. **SVG内のstyle.zIndex削除**:
   - `<g>`要素の`style={{ cursor: 'pointer', zIndex: ... }}`から`zIndex`を削除
   - `cursor: 'pointer'`のみ残す

2. **CSSクラスの追加**:
   - `<g>`要素に`className`を追加
   - ハイライト時: `rel-edge is-highlighted`
   - 非ハイライト時: `rel-edge`

**実装例**:
```typescript
<g
  onMouseEnter={() => dispatch(actionHoverEdge, id)}
  onMouseLeave={() => dispatch(actionClearHover)}
  className={isHighlighted ? 'rel-edge is-highlighted' : 'rel-edge'}
  style={{ cursor: 'pointer' }}
>
```

**参照仕様**: [spec/frontend_er_rendering.md](spec/frontend_er_rendering.md) の「z-index制御」「実装上の注意点」セクション

---

### □ `public/src/components/EntityNode.tsx`の修正 - CSSクラス追加

**目的**: CSS一括制御用のクラスを追加

**変更内容**:
- ルートの`<div>`要素に`className`を追加
- ハイライト時: `entity-node is-highlighted`
- 非ハイライト時: `entity-node`

**実装例**:
```typescript
<div 
  className={isHighlighted ? 'entity-node is-highlighted' : 'entity-node'}
  style={{ 
    border: isHighlighted ? '3px solid #007bff' : '1px solid #333', 
    // ... 既存のスタイル
  }}
  onMouseEnter={() => dispatch(actionHoverEntity, data.id)}
  onMouseLeave={() => dispatch(actionClearHover)}
>
```

**参照仕様**: [spec/frontend_er_rendering.md](spec/frontend_er_rendering.md) の「非ハイライト要素の半透明化（Option C - CSS一括制御）」セクション

---

### □ `public/src/components/ERCanvas.tsx`の修正 - ルート要素のhas-hoverクラス制御

**目的**: ホバー状態をルート要素のクラスで表現し、CSSで一括制御

**変更内容**:

1. **ホバー状態の購読追加**:
   - `ERCanvas`コンポーネントで`useViewModel`により`vm.erDiagram.ui.hover !== null`を購読
   - `equalityFn: (a, b) => a === b`を指定して真偽値ベースで比較

2. **ルート要素のクラス制御**:
   - `<div style={{ width: '100%', height: '100%', position: 'relative' }}>`に`className`を追加
   - ホバー中: `er-canvas has-hover`
   - 非ホバー中: `er-canvas`

**実装例**:
```typescript
function ERCanvas({ onSelectionChange, onNodesInitialized }: ERCanvasProps = {}) {
  const dispatch = useDispatch()
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  
  // ホバー状態を購読（真偽値のみ）
  const hasHover = useViewModel(
    (vm) => vm.erDiagram.ui.hover !== null,
    (a, b) => a === b
  )
  
  // ... 既存の処理 ...
  
  return (
    <div className={hasHover ? 'er-canvas has-hover' : 'er-canvas'} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* ... 既存の内容 ... */}
    </div>
  )
}
```

**パフォーマンスのポイント**:
- ホバー開始・終了時に再レンダリングされるのは`ERCanvas`のルート要素（1個）とハイライト対象（少数）のみ
- 非ハイライト要素（大多数）は再レンダリングされない（CSSのみで視覚効果が適用される）

**参照仕様**: [spec/frontend_er_rendering.md](spec/frontend_er_rendering.md) の「非ハイライト要素の半透明化（Option C - CSS一括制御）」セクション

---

### □ `public/style.css`の修正 - 半透明化CSSルール追加

**目的**: ホバー時に非ハイライト要素を半透明化するCSSルールを追加

**変更内容**:
- ファイル末尾に以下のCSSルールを追加

```css
/* ER図ハイライト機能のCSS一括制御 */
/* ホバー中の非ハイライト要素を半透明化 */
.er-canvas.has-hover .entity-node:not(.is-highlighted) {
  opacity: 0.2;
}

.er-canvas.has-hover .rel-edge:not(.is-highlighted) path {
  opacity: 0.2;
}

/* 非ホバー時は通常の透明度 */
.er-canvas:not(.has-hover) .entity-node {
  opacity: 1.0;
}

.er-canvas:not(.has-hover) .rel-edge path {
  opacity: 1.0;
}
```

**参照仕様**: [spec/frontend_er_rendering.md](spec/frontend_er_rendering.md) の「非ハイライト要素の半透明化（Option C - CSS一括制御）」セクション

---

### □ ビルドの確認

**目的**: 実装後の型エラーやビルドエラーがないことを確認

**手順**:
```bash
cd /home/kuni/Documents/er-viewer
npm run generate  # 型生成
cd public
npm run build     # フロントエンドビルド
```

---

### □ テストの実行

**目的**: 既存のテストが通ることを確認

**手順**:
```bash
cd /home/kuni/Documents/er-viewer
npm run test      # バックエンドテスト実行（あれば）
cd public
npm run test      # フロントエンドテスト実行（あれば）
```

## 実装の流れ

1. `reactFlowConverter.ts`を修正（エッジzIndexの動的制御）
2. `RelationshipEdge.tsx`を修正（SVG内zIndex削除、クラス追加）
3. `EntityNode.tsx`を修正（クラス追加）
4. `ERCanvas.tsx`を修正（zIndexMode設定、エッジ再構築、ルート要素クラス制御）
5. `style.css`を修正（半透明化CSSルール追加）
6. ビルドの確認
7. テストの実行

## 期待される効果

**z-index制御**:
- ハイライトされたエッジがノードより前面に表示される
- React Flowの`edge.zIndex`プロパティにより、確実にレイヤー順序が制御される

**パフォーマンス改善**:
- ホバー開始・終了時に再レンダリングされるコンポーネント数が激減
  - 従来: 全ノード + 全エッジ（数百個）
  - 改善後: ルート要素（1個）+ ハイライト対象（数個）
- 非ハイライト要素はCSSのみで半透明化されるため、再レンダリング不要

## 参照ドキュメント

- 仕様書: [spec/frontend_er_rendering.md](spec/frontend_er_rendering.md)
- リサーチ: [research/20260131_2143_highlighted_edge_visibility.md](research/20260131_2143_highlighted_edge_visibility.md)
