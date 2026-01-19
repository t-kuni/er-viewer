# タスク一覧

仕様書の差分に基づいて洗い出したタスクです。

## 変更の概要

`ERDiagramViewModel`のデータ構造を配列形式から連想配列（Record）形式に変更。
これにより、ホバーインタラクション時のID検索がO(1)で可能となり、パフォーマンスが向上します。

**主な変更点**:
- `scheme/main.tsp`: `ERDiagramViewModel.nodes`と`ERDiagramViewModel.edges`を配列からRecordに変更
- `spec/frontend_er_rendering.md`: ホバーインタラクション仕様を追加

**参照仕様書**: 
- [spec/frontend_er_rendering.md](/spec/frontend_er_rendering.md) - ER図レンダリング仕様（ホバーインタラクション含む）
- [scheme/main.tsp](/scheme/main.tsp) - API型定義

---

## TypeSpecコンパイルと型生成

**担当ファイル**: `lib/generated/api-types.ts`（自動生成）

### タスク内容
- [ ] TypeSpecのコンパイルを実行: `npm run generate`
- [ ] `lib/generated/api-types.ts`が更新されていることを確認
  - `ERDiagramViewModel.nodes`が`Record<string, EntityNodeViewModel>`型になっていること
  - `ERDiagramViewModel.edges`が`Record<string, RelationshipEdgeViewModel>`型になっていること

### 注意事項
- このタスクは他のタスクの前提となるため、最初に実行すること
- 型生成が失敗した場合は、`scheme/main.tsp`の構文エラーを確認

---

## ERData + LayoutData → ERDiagramViewModel 変換関数の作成

**担当ファイル**: `public/src/utils/viewModelConverter.ts`（新規作成）

### タスク内容
- [ ] `public/src/utils/viewModelConverter.ts`を新規作成
- [ ] `buildERDiagramViewModel`関数を実装
  - **引数**: `erData: ERData`, `layoutData: LayoutData`
  - **戻り値**: `ERDiagramViewModel`
  - **処理内容**:
    1. `erData.entities`を`layoutData.entities`の座標情報と組み合わせて`EntityNodeViewModel`の連想配列（Record）を構築
    2. `erData.relationships`を`RelationshipEdgeViewModel`の連想配列（Record）に変換
    3. `{ nodes: Record<EntityNodeViewModel>, edges: Record<RelationshipEdgeViewModel> }`を返す

### 実装の詳細

**EntityNodeViewModel構築のポイント**:
- entities配列をループして、各entityのIDをキーとしたRecord形式に変換
- layoutData.entitiesから座標（x, y）を取得してマージ
- レイアウトデータが存在しないエンティティはスキップし、警告を出力

**RelationshipEdgeViewModel構築のポイント**:
- relationships配列をループして、Record形式に変換
- エッジIDは一意になるよう、`${from}_${fromColumn}_to_${to}_${toColumn}`形式で生成
- source/targetにはエンティティのIDを設定

### 型定義
関数シグネチャ: `export function buildERDiagramViewModel(erData: ERData, layoutData: LayoutData): ERDiagramViewModel`

必要なimport: `ERData`, `LayoutData`, `EntityNodeViewModel`, `RelationshipEdgeViewModel`, `ERDiagramViewModel` を `../../lib/generated/api-types` からimport

---

## ERDiagramViewModel → React Flow nodes/edges 変換関数の作成

**担当ファイル**: `public/src/utils/reactFlowConverter.ts`（新規作成）

### タスク内容
- [ ] `public/src/utils/reactFlowConverter.ts`を新規作成
- [ ] `convertToReactFlowNodes`関数を実装
  - **引数**: `nodes: Record<string, EntityNodeViewModel>`
  - **戻り値**: `Node[]`（React Flowのノード配列）
  - **処理内容**: `Object.values(nodes)`で配列に変換し、React Flowの形式にマッピング
- [ ] `convertToReactFlowEdges`関数を実装
  - **引数**: `edges: Record<string, RelationshipEdgeViewModel>`
  - **戻り値**: `Edge[]`（React Flowのエッジ配列）
  - **処理内容**: `Object.values(edges)`で配列に変換し、React Flowの形式にマッピング

### 実装の詳細

**convertToReactFlowNodes関数**:
- Record形式をObject.values()で配列に変換
- 各ノードをReact Flow形式にマッピング: `{ id, type: 'entityNode', position: { x, y }, data: { id, name, columns, ddl } }`

**convertToReactFlowEdges関数**:
- Record形式をObject.values()で配列に変換
- 各エッジをReact Flow形式にマッピング: `{ id, type: 'relationshipEdge', source, target, markerEnd, data: { fromColumn, toColumn, constraintName } }`
- markerEndには`MarkerType.ArrowClosed`を設定

### 必要なimport
- `Node`, `Edge`, `MarkerType` を `reactflow` からimport
- `EntityNodeViewModel`, `RelationshipEdgeViewModel` を `../../lib/generated/api-types` からimport

---

## ERCanvasコンポーネントでの変換処理適用

**担当ファイル**: `public/src/components/ERCanvas.tsx`

### タスク内容
- [ ] `buildERDiagramViewModel`, `convertToReactFlowNodes`, `convertToReactFlowEdges` をimport
- [ ] `handleReverseEngineer`関数内の処理を修正
  - バックエンドから取得した`erData`と`layoutData`を`buildERDiagramViewModel`に渡してERDiagramViewModelを生成
  - 得られたERDiagramViewModelを`convertToReactFlowNodes`/`convertToReactFlowEdges`で変換
  - 変換結果を`setNodes`/`setEdges`に渡す
- [ ] 既存の直接変換処理を削除

### 変更のポイント
- 現在は`handleReverseEngineer`内でentitiesとrelationshipsを直接React Flow形式に変換しているが、これを2段階の変換処理に置き換える
- エラーハンドリングとローディング状態の管理は維持すること

---

## ホバー状態管理のContext作成

**担当ファイル**: `public/src/contexts/HoverContext.tsx`（新規作成）

**参照仕様**: [spec/frontend_er_rendering.md](/spec/frontend_er_rendering.md) の「ホバーインタラクション仕様」セクション

### タスク内容
- [ ] `public/src/contexts/HoverContext.tsx`を新規作成
- [ ] ホバー状態の型定義を作成
  - `HoverElementType`: ホバー中の要素タイプ（`'entity'` | `'edge'` | `'column'` | `null`）
  - `HoverState`: ホバー中の要素ID、ハイライト対象のID集合（`Set<string>`）、ハイライト対象カラムのMap
  - `HoverContextValue`: Contextが提供する値の型
- [ ] React Context（`HoverContext`）とProvider（`HoverProvider`）を作成
- [ ] カスタムフック（`useHover`）を作成
- [ ] ハイライト対象を計算する関数を実装
  - `setHoverEntity`: エンティティホバー時の処理
  - `setHoverEdge`: エッジホバー時の処理
  - `setHoverColumn`: カラムホバー時の処理
  - `clearHover`: ホバー解除時の処理

### 実装の詳細

**型定義のインタフェース**:
- `HoverState`: elementType, elementId, columnName, highlightedNodes (Set), highlightedEdges (Set), highlightedColumns (Map<entityId, Set<columnName>>)
- `HoverContextValue`: hoverState, setHoverEntity, setHoverEdge, setHoverColumn, clearHover

**HoverProviderのProps**:
- `children: React.ReactNode`
- `viewModel: ERDiagramViewModel` - 関連要素検索に使用

**関連要素検索のロジック**:
- エンティティホバー時: そのエンティティに接続されている全エッジを`Object.values(viewModel.edges).filter()`で検索し、反対側のエンティティをハイライト対象に追加
- エッジホバー時: `viewModel.edges[edgeId]`でエッジを取得し、source/targetのエンティティとfromColumn/toColumnをハイライト対象に追加
- カラムホバー時: 全エッジからそのカラムが関係するものを検索し、関連するエンティティとカラムをハイライト対象に追加

### 注意事項
- 連想配列形式により、ID検索はO(1)で実行可能
- エッジ検索は`Object.values(edges).filter(...)`で実施（MVPフェーズではパフォーマンス許容範囲）

---

## EntityNodeコンポーネントのホバー対応

**担当ファイル**: `public/src/components/EntityNode.tsx`

### タスク内容
- [ ] `useHover`フックをimport
- [ ] エンティティノードに`onMouseEnter`/`onMouseLeave`イベントハンドラを追加
  - `onMouseEnter`: `setHoverEntity(data.id)`を呼び出し
  - `onMouseLeave`: `clearHover()`を呼び出し
- [ ] ハイライト状態に応じてスタイルを変更
  - ハイライト対象: 枠線を太く（3px）、影を強調、z-index: 1000
  - 非ハイライト（他の要素がホバー中）: opacity: 0.2
- [ ] 各カラムに`onMouseEnter`/`onMouseLeave`イベントハンドラを追加
  - `onMouseEnter`: `setHoverColumn(data.id, col.name)`を呼び出し（イベント伝播を停止）
  - `onMouseLeave`: `clearHover()`を呼び出し（イベント伝播を停止）
  - カラムホバー時: 背景色を強調表示（例: `#e3f2fd`）

### スタイル仕様
- ハイライト時: border 3px solid #007bff, boxShadow 0 4px 12px rgba(0, 123, 255, 0.4), zIndex 1000
- 非ハイライト時: opacity 0.2
- トランジション効果を追加してスムーズな視覚変化を実現

### 注意事項
- カラムホバーイベントは親（エンティティ）へのイベント伝播を停止（`e.stopPropagation()`）
- z-indexは動的に設定

---

## RelationshipEdgeコンポーネントのホバー対応

**担当ファイル**: `public/src/components/RelationshipEdge.tsx`

### タスク内容
- [ ] `useHover`フックをimport
- [ ] エッジ全体を`<g>`要素で囲み、`onMouseEnter`/`onMouseLeave`イベントハンドラを追加
  - `onMouseEnter`: `setHoverEdge(id)`を呼び出し
  - `onMouseLeave`: `clearHover()`を呼び出し
- [ ] ハイライト状態に応じてスタイルを変更
  - ハイライト対象: 線を太く（4px）、色を強調（#007bff）、z-index: 999
  - 非ハイライト（他の要素がホバー中）: opacity: 0.2

### スタイル仕様
- ハイライト時: stroke #007bff, strokeWidth 4, zIndex 999
- 非ハイライト時: opacity 0.2
- トランジション効果を追加

### 注意事項
- z-indexは`<g>`要素のstyleで設定（React Flowの仕様に従う）

---

## ERCanvasへのHoverProvider追加

**担当ファイル**: `public/src/components/ERCanvas.tsx`

### タスク内容
- [ ] `HoverProvider`と`ERDiagramViewModel`型をimport
- [ ] `ERDiagramViewModel`を状態として保持する（初期値: `{ nodes: {}, edges: {} }`）
- [ ] `handleReverseEngineer`関数内で生成したViewModelを状態に保存
- [ ] `ReactFlow`コンポーネントを`HoverProvider`でラップ
- [ ] `HoverProvider`に`viewModel`をPropsとして渡す

### 変更のポイント
- `useState<ERDiagramViewModel>`を追加
- `handleReverseEngineer`内で`setViewModel(vm)`を呼び出し
- JSX内で`<HoverProvider viewModel={viewModel}>`を使ってReactFlowをラップ

---

## ビルド確認

### タスク内容
- [ ] TypeScriptのビルドエラーがないことを確認
  - `npm run generate` でコード生成
  - `npm run build` でビルド実行
- [ ] ビルド成功を確認

### 確認コマンド
```bash
npm run generate
npm run build
```

---

## テスト実行

### タスク内容
- [ ] 既存のテストが通ることを確認
  - `npm run test`

### 確認コマンド
```bash
npm run test
```

### 注意事項
- テストが失敗した場合は、型定義の変更によるテストコードの修正が必要になる可能性がある
- 新規作成したユーティリティ関数のテストは現時点では不要（MVPフェーズのため）

---

## 指示者宛ての懸念事項（作業対象外）

### 懸念: パフォーマンスについて

現在の実装では、ホバー時にエッジ検索を`Object.values(edges).filter(...)`で実施しています。
仕様書には「MVPフェーズではパフォーマンスは許容範囲」と記載されていますが、
エンティティ数が100を超える場合、以下の最適化が必要になる可能性があります：

- エンティティ→エッジの逆引きインデックスを事前構築
- カラム→エッジの逆引きインデックスを事前構築

### 懸念: 非ハイライト要素の透明度

仕様書では`opacity: 0.2`と指定されていますが、実際のUXとして適切かどうかは
実装後にユーザーフィードバックを得て調整する必要があると思われます。

値の候補: `0.1`, `0.15`, `0.2`, `0.3`

### 懸念: z-index制御の制限事項

React Flowでノードの`z-index`は使えることが確認できましたが、以下の制限があります：

- ノード同士の前後関係は制御可能（`zIndex`プロパティまたは`style.zIndex`で指定）
- エッジは通常ノードより背面に描画され、`z-index`を上げてもノードの前に出せない場合がある
- エッジとノードの前後関係の制御には制限がある

**影響範囲**:
- エンティティノードのハイライト時のz-index制御は問題なく動作する見込み
- エッジのハイライト時に他のノードより前面に出したい場合、期待通りに動作しない可能性がある

**対応方針**:
- MVPフェーズでは、エッジは常にノードの背面に表示される仕様として許容する
- 将来的に問題となる場合は、SVGレイヤーの再配置やReact Flowのバージョンアップで対応を検討

---

## 事前修正提案

現時点ではありません。

---

## 作業順序の推奨

1. TypeSpecコンパイル（他のタスクの前提）
2. ViewModel変換関数の作成
3. React Flow変換関数の作成
4. ERCanvasでの変換処理適用
5. ビルド確認（ここまででデータ構造変更が完了）
6. HoverContext作成
7. EntityNodeのホバー対応
8. RelationshipEdgeのホバー対応
9. HoverProviderの追加
10. テスト実行

**理由**: データ構造の変更を先に完了させてから、ホバーインタラクション機能を追加することで、
段階的に動作確認が可能となり、問題の切り分けが容易になります。
