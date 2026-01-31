# ハイライト中のリレーション線がエンティティで隠れる問題の解決策検討

## リサーチ要件

ER図上でリレーション（エッジ）をホバーしてハイライトした際に、そのリレーション線がエンティティ（ノード）に隠れて見えなくなる問題を解決したい。

過去に「ハイライト対象外のエンティティを透明にする」実装（`opacity: 0.2`に設定）が存在したが、パフォーマンスの問題で削除された（コミット: `cd6367b6bc05ab5cda905cc15e6ad912da8148f8`）。もしパフォーマンスを落とさずに透明にする方法があればそれでも良い。

**求める回答**: 以下のいずれか、または複数の組み合わせによる解決策を提案してほしい：

1. **透明化のパフォーマンス改善**: ハイライト対象外のエンティティを透明にする実装で、過去の実装よりもパフォーマンスを向上させる方法
2. **z-indexの制御強化**: React FlowのSVGエッジとHTMLノードのレイヤー構造を考慮した、より効果的なz-index制御方法
3. **その他の視覚的な解決策**: 透明化やz-index以外の方法で、ハイライト中のリレーション線を見やすくする方法

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite + React + React Flow
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec

### 現状のフェーズ

- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- AIが作業するため学習コストは考慮不要

## 問題の詳細

### 現象

1. ユーザーがリレーションエッジにマウスホバーすると、そのエッジと関連するエンティティがハイライトされる
2. ハイライトされたエッジは太く青色になる（`strokeWidth: 4`、`stroke: #007bff`）
3. しかし、エッジの経路上にエンティティが存在する場合、エッジがエンティティの下に隠れて見えなくなってしまう

### 原因

React Flowの構造上、以下のレイヤー順序が存在する：

1. **SVG Layer (下層)**: エッジ（リレーション線）が描画される
2. **HTML Layer (上層)**: ノード（エンティティ）が描画される

このため、CSS `z-index`を使ってもエッジをノードより上に表示することができない。SVGとHTMLは別のレイヤーとして扱われるため。

### 現在の実装状況

#### ホバーインタラクション機能

- エンティティ、エッジ、カラムのホバー時に関連要素をハイライトする機能が実装されている
- 仕様書: `spec/frontend_er_rendering.md`（ホバーインタラクション仕様セクション）
- 実装ファイル:
  - `public/src/components/RelationshipEdge.tsx`: リレーションエッジコンポーネント
  - `public/src/components/EntityNode.tsx`: エンティティノードコンポーネント
  - `public/src/actions/hoverActions.ts`: ホバー時のアクション（ハイライト対象の計算）

#### 現在のハイライト実装

**RelationshipEdge.tsx**:

```typescript
const isHighlighted = useViewModel(
  (vm) => vm.erDiagram.ui.highlightedEdgeIds.includes(id),
  (a, b) => a === b
)

return (
  <g
    onMouseEnter={() => dispatch(actionHoverEdge, id)}
    onMouseLeave={() => dispatch(actionClearHover)}
    style={{ 
      cursor: 'pointer',
      zIndex: isHighlighted ? 999 : 0,  // ← z-indexを設定しているが効果なし
    }}
  >
    <path
      id={id}
      d={edgePath}
      style={{
        stroke: isHighlighted ? '#007bff' : '#333',
        strokeWidth: isHighlighted ? 4 : 2,
        fill: 'none',
      }}
    />
  </g>
)
```

**EntityNode.tsx**:

```typescript
const isHighlighted = useViewModel(
  (vm) => vm.erDiagram.ui.highlightedNodeIds.includes(data.id),
  (a, b) => a === b
)

return (
  <div 
    style={{ 
      border: isHighlighted ? '3px solid #007bff' : '1px solid #333', 
      borderRadius: '4px', 
      background: 'white',
      minWidth: '200px',
      boxShadow: isHighlighted ? '0 4px 12px rgba(0, 123, 255, 0.4)' : 'none',
      zIndex: isHighlighted ? 1000 : 1,
      // opacity: isDimmed ? 0.2 : 1,  ← 過去の実装（削除済み）
    }}
    onMouseEnter={() => dispatch(actionHoverEntity, data.id)}
    onMouseLeave={() => dispatch(actionClearHover)}
  >
    {/* ... */}
  </div>
)
```

### 過去の実装（削除済み）

コミット `cd6367b6bc05ab5cda905cc15e6ad912da8148f8` で削除された実装：

**変更内容**:

1. **EntityNode.tsx**:
   - `hasHover`を購読し、ホバー中かつ非ハイライトの場合に`isDimmed`を`true`に設定
   - `opacity: isDimmed ? 0.2 : 1`を適用してエンティティを透明化

2. **RelationshipEdge.tsx**:
   - 同様に`hasHover`を購読し、`isDimmed`を計算
   - `opacity: isDimmed ? 0.2 : 1`を適用してエッジを透明化

**削除理由**: 

- パフォーマンスの問題
- コミットメッセージに「パフォーマンス改善」とあり、削除によって改善されたことが示唆される

**パフォーマンス問題の原因（推測）**:

- `hasHover`の購読により、全てのエンティティノード・エッジが`hasHover`の変化（`null` ↔ `{type, id}`）に反応して再レンダリングされていた
- 大量のエンティティ（数十〜数百）が存在する場合、ホバーする度に全ノード・全エッジが再レンダリングされるため、描画が重くなった

### React Flowのレイヤー構造

React Flowは内部で以下のDOM構造を持つ：

```html
<div class="react-flow">
  <svg class="react-flow__edges">
    <!-- エッジ（リレーション線）が描画される -->
    <g class="react-flow__edge">
      <!-- ... -->
    </g>
  </svg>
  <div class="react-flow__nodes">
    <!-- ノード（エンティティ）が描画される -->
    <div class="react-flow__node">
      <!-- ... -->
    </div>
  </div>
</div>
```

このため、SVG要素（エッジ）とHTML要素（ノード）は異なるレイヤーに属し、CSSの`z-index`ではエッジをノードの上に表示できない。

## 制約条件

- エンティティは多くて300個程度を想定
- ホバーインタラクション時の応答性を損なわないこと（即座にハイライトが反映されること）
- 既存の`React.memo`やselector最適化などのパフォーマンス最適化を維持すること
- React Flow v12を使用（最新バージョン）

## 検討してほしい解決策

### 1. 透明化のパフォーマンス改善

過去の実装では`hasHover`の購読により全ノード・全エッジが再レンダリングされていたことがパフォーマンス問題の原因と考えられる。

**検討してほしい点**:

- **Option A**: 各ノードが`highlightedNodeIds`配列に自分が含まれているかどうかだけを購読する（現在の`isHighlighted`の実装と同様）
  - `useViewModel(vm => !vm.erDiagram.ui.highlightedNodeIds.includes(nodeId) && vm.erDiagram.ui.hover !== null, (a, b) => a === b)`
  - この方法で、ハイライト対象外のノードのみが再レンダリングされるようにできるか？
  - ただし、ホバー開始時（`hover: null → {type, id}`）と終了時（`hover: {type, id} → null`）に全ノードが再レンダリングされる懸念がある

- **Option B**: `opacity`の変更をReactの再レンダリングではなく、直接DOMを操作することで実現する
  - `useEffect`で`ref.current.style.opacity`を直接変更する
  - React.memoやselectorの最適化を維持しつつ、視覚的な変化だけを適用できるか？
  - 実装の複雑さとメンテナンス性のトレードオフ

- **Option C**: CSSクラスを使って透明化を制御し、React側は最小限の状態更新のみを行う
  - `hasHover`のような真偽値フラグをルートのReact Flowコンテナに設定し、CSSセレクタで制御
  - 例: `.react-flow.has-hover .react-flow__node:not(.highlighted) { opacity: 0.2; }`
  - Reactの再レンダリングを最小限にしつつ、CSSで一括制御できるか？
  - React Flowの構造上、このアプローチが実現可能か？

### 2. z-indexの制御強化

SVGとHTMLのレイヤー分離問題を解決する方法を検討してほしい。

**検討してほしい点**:

- **React FlowのカスタムLayer機能**:
  - React Flow v12には`<ViewportPortal>`というコンポーネントがあり、ノードレイヤーの上に描画できる
  - エッジをSVGではなく、`<ViewportPortal>`内でHTML/CSS（`border`や`::before`など）を使って描画する方法は現実的か？
  - メリット・デメリット（パフォーマンス、実装の複雑さ、エッジのルーティング精度など）

- **SVGの`z-index`相当の制御**:
  - SVG内では描画順序（DOM順序）がそのままレイヤー順序になる
  - React Flowのエッジを動的に再配置（DOM順序を変更）してハイライト中のエッジを最後に描画する方法は可能か？
  - React FlowのAPIでこれを制御できるか？

### 3. その他の視覚的な解決策

透明化やz-index以外の方法で、ハイライト中のリレーション線を見やすくする方法を検討してほしい。

**検討してほしい点**:

- **エッジの視覚強調**:
  - ハイライト中のエッジに光彩効果（`filter: drop-shadow`）やアニメーションを追加して、エンティティの下に隠れていても存在感を出す
  - エッジの太さをさらに太くする（現在は`strokeWidth: 4`だが、`8`や`10`にする）
  - 点滅アニメーション（`@keyframes`）を使って視覚的に目立たせる
  - これらの方法で実用的に「見やすくなる」か？UX的に許容できるか？

- **エンティティの視覚変更**:
  - ハイライト対象外のエンティティの背景色を変更する（`opacity`ではなく`background-color`を薄いグレーにする）
  - エンティティに`filter: blur(2px)`を適用して焦点を外す
  - これらの方法でエッジの視認性が向上するか？パフォーマンスへの影響は？

- **ポップオーバー/ツールチップ**:
  - エッジホバー時に、エッジの詳細情報（接続元/接続先エンティティ名など）をポップオーバーで表示する
  - エッジ自体が見えなくても、情報は伝わるようにする
  - 根本的な解決ではないが、UX的に許容できる代替案になるか？

- **エンティティの配置最適化**:
  - エンティティの自動配置アルゴリズムを改善し、エッジの交差やエンティティとの重なりを最小化する
  - 現在、配置最適化機能（`spec/entity_layout_optimization.md`）が実装されているが、重なりの解消が不十分
  - 配置最適化の改善で問題を根本的に軽減できるか？

## 参考情報

### 関連仕様書

- `spec/frontend_er_rendering.md`: フロントエンドER図レンダリング仕様（ホバーインタラクションセクション含む）
- `spec/frontend_state_management.md`: フロントエンド状態管理仕様
- `spec/entity_layout_optimization.md`: エンティティ配置最適化機能仕様

### 関連する実装ファイル

- `public/src/components/RelationshipEdge.tsx`: リレーションエッジコンポーネント（56行）
- `public/src/components/EntityNode.tsx`: エンティティノードコンポーネント（89行）
- `public/src/components/ERCanvas.tsx`: ER図描画コンポーネント（React Flowのコンテナ）（820行）
- `public/src/actions/hoverActions.ts`: ホバー時のアクション（ハイライト対象の計算ロジック）
- `public/src/store/erDiagramStore.ts`: 状態管理ストア（Zustand）

### 使用しているライブラリ

- React Flow v12（`@xyflow/react`）
- React 18
- TypeScript
- Zustand（状態管理）

### ViewModelの構造

すべての型は`scheme/main.tsp`で定義されている。

**EntityNodeViewModel**:

```typescript
model EntityNodeViewModel {
  id: string; // UUID
  name: string;
  x: float64;
  y: float64;
  columns: Column[];
  ddl: string;
}
```

**RelationshipEdgeViewModel**:

```typescript
model RelationshipEdgeViewModel {
  id: string; // UUID
  sourceEntityId: string;
  sourceColumnId: string;
  targetEntityId: string;
  targetColumnId: string;
  constraintName: string;
}
```

**UI State (ハイライト関連)**:

```typescript
model ERDiagramUI {
  hover: HoverState | null;
  highlightedNodeIds: string[];  // ハイライト中のエンティティID
  highlightedEdgeIds: string[];  // ハイライト中のエッジID
  highlightedColumnIds: string[]; // ハイライト中のカラムID
  isDraggingEntity: boolean;
  // ...
}

model HoverState {
  type: "entity" | "edge" | "column";
  id: string;
}
```

## 期待する回答

以下について、具体的な見解と実装案を提示してほしい：

### 1. 問題の根本原因の整理

- React FlowのSVG/HTMLレイヤー分離問題の詳細
- 過去の透明化実装でパフォーマンス問題が発生した正確な理由
- z-indexが効かない理由の技術的な説明

### 2. 透明化のパフォーマンス改善案

**各Optionについて**:

- **実現可能性**: 技術的に実装可能か？React Flowの制約に抵触しないか？
- **パフォーマンス**: 300エンティティでも快適に動作するか？再レンダリングのコストは？
- **実装の複雑さ**: 実装・メンテナンスの難易度は？
- **推奨度**: どのOptionが最も効果的か？優先順位は？

特に、**Option C（CSSクラスによる制御）**について詳しく知りたい：

- React Flowの構造上、ルートコンテナにクラスを追加して全ノードのスタイルを制御できるか？
- CSSセレクタで「ハイライト対象外」のノードを選択する方法（例: `:not(.highlighted)`）
- Reactの再レンダリングを最小限にしつつ、視覚的な変化を実現できるか？
- 実装の具体的なステップ

### 3. z-index制御強化の実現可能性

**React FlowのViewportPortalについて**:

- `<ViewportPortal>`でエッジを描画する方法の詳細
- HTML/CSSでエッジ（直角ポリライン）を描画する具体的な実装方法
- パフォーマンスへの影響（SVG vs HTML/CSS）
- エッジのルーティング計算（React Flowの`getSmoothStepPath`を使えるか？）

**SVGのDOM順序制御について**:

- React Flowのエッジの描画順序を動的に変更する方法はあるか？
- React Flow APIでエッジのDOM順序を制御できるか？
- 実装の複雑さとパフォーマンスへの影響

### 4. その他の視覚的解決策の有効性

各アプローチについて：

- **視覚強調（光彩効果、アニメーションなど）**:
  - 実用的にエッジの視認性が向上するか？
  - UX的に許容できるか？（点滅アニメーションは煩わしくないか？）
  - パフォーマンスへの影響（`filter: drop-shadow`など）

- **エンティティの視覚変更（`filter: blur`など）**:
  - `opacity`よりもパフォーマンスが良いか？
  - 視覚的な効果は`opacity`と比べてどうか？

- **ポップオーバー/ツールチップ**:
  - UX的に代替案として機能するか？
  - エッジ自体が見えないことの問題を軽減できるか？

- **エンティティの配置最適化**:
  - 配置最適化の改善で重なりを実用的なレベルまで減らせるか？
  - 配置最適化だけで問題を解決できる可能性はあるか？

### 5. 推奨する解決策と実装計画

上記の検討を踏まえ、最も効果的な解決策を提案してほしい：

- **推奨する解決策**: 単一の方法、または複数の方法の組み合わせ
- **実装の優先順位**: フェーズ1（すぐに実装すべき）、フェーズ2（次に実装すべき）、フェーズ3（将来的に検討）
- **具体的な実装ステップ**: コードの変更箇所、実装の流れ
- **期待される効果**: 視覚的な改善、パフォーマンスへの影響

### 6. 他のReact Flowプロジェクトでの事例

React Flowを使った他のプロジェクト（オープンソース、商用）で、同様の問題がどのように解決されているか：

- エッジとノードの重なり問題への対処方法
- ハイライト時の視覚表現のベストプラクティス
- React Flowの公式ドキュメントやサンプルでの推奨方法

## 補足

- 本プロジェクトはMVPフェーズであり、完璧な解決策よりも実用的な解決策を優先する
- パフォーマンスは重要だが、セキュリティや後方互換性は考慮不要
- 実装の学習コストは問題ない（AIが実装するため）
- ユーザーがエッジをホバーした際に「関連するエンティティが分かりやすく、かつエッジが視認できる」状態を実現したい
