# タスク一覧

仕様書の差分に基づいて実装対象のタスクを洗い出しています。

## 概要

以下の仕様変更に対応する実装を行う：

1. **TypeSpec（scheme/main.tsp）**: UUID仕様の追加、`ForeignKey`と`Relationship`のフィールド名変更（ID参照に統一）、`ERDiagramViewModel`への`ui`と`loading`フィールド追加
2. **frontend_er_rendering.md**: RelationshipのフィールドがID参照に変更されたことに合わせて仕様を更新
3. **frontend_state_management.md**: 新規作成された仕様書（Action層・Store実装・テスト戦略）

## バックエンド実装

### lib/database.ts の修正

- [ ] `generateERData` メソッドを修正してカラム名→カラムID変換マップを構築
  - **実装方針**:
    - 第1段階（エンティティ生成）で、各エンティティごとに「カラム名→カラムID」のマップを作成
    - 例: `Map<entityId, Map<columnName, columnId>>`の2段階マップ、または`Map<"entityId:columnName", columnId>`の1段階マップ
    - このマップを第2段階（リレーションシップ生成）で利用
  - **参照**: `lib/database.ts` の `generateERData` メソッド (126-180行目)

- [ ] `getForeignKeys` メソッドの戻り値を新しい`ForeignKey`型に対応させる
  - **変更内容**: 
    - `column` → `columnId` (カラムIDをUUIDで参照)
    - `referencedTable` → `referencedTableId` (参照先エンティティIDをUUIDで参照)
    - `referencedColumn` → `referencedColumnId` (参照先カラムIDをUUIDで参照)
  - **実装方針**: 
    - `getForeignKeys`には引数として「カラム名→カラムIDマップ」と「テーブル名→エンティティIDマップ」を渡す
    - SQLで取得したカラム名を、マップを使ってカラムIDに変換
    - テーブル名をエンティティIDに変換
  - **参照**: `lib/database.ts` の `getForeignKeys` メソッド (88-115行目)
  - **注意**: シグネチャの変更が必要（引数追加）

- [ ] `generateERData` メソッドの`Relationship`生成部分を修正
  - **変更内容**:
    - `from`, `to` フィールドを削除（テーブル名は不要、IDのみで識別）
    - `fromId` → `fromEntityId`
    - `fromColumn` → `fromColumnId` (カラムIDをUUIDで参照)
    - `toId` → `toEntityId`
    - `toColumn` → `toColumnId` (カラムIDをUUIDで参照)
  - **実装方針**:
    - `ForeignKey`の`columnId`、`referencedTableId`、`referencedColumnId`をそのまま使用
    - 上記の修正により、`ForeignKey`は既にID情報を持っているため変換不要
  - **参照**: `lib/database.ts` の `generateERData` メソッド (154-177行目)
  - **TypeSpec定義**: `scheme/main.tsp` の `Relationship` モデル (54-62行目)

### lib/usecases/ReverseEngineerUsecase.ts の確認

- [ ] TypeScript型エラーがないことを確認
  - **確認内容**: `generateERData`の戻り値が新しい型定義と一致しているか
  - **参照**: `lib/usecases/ReverseEngineerUsecase.ts`

## フロントエンド実装

### 型生成

- [ ] TypeSpec から型を再生成
  - **コマンド**: `npm run generate`
  - **生成されるファイル**:
    - `lib/generated/api-types.ts` (バックエンド用)
    - `public/src/api/client/models/` (フロントエンド用)
  - **確認事項**: 
    - `ForeignKey`の型が`columnId`, `referencedTableId`, `referencedColumnId`を持つこと
    - `Relationship`の型が`fromEntityId`, `fromColumnId`, `toEntityId`, `toColumnId`を持つこと
    - `ERDiagramViewModel`の型が`ui`と`loading`フィールドを持つこと
  - **参照**: `spec/typespec_api_definition.md`

### public/src/utils/viewModelConverter.ts の修正

- [ ] `buildERDiagramViewModel` 関数を修正して新しい型に対応
  - **変更内容**:
    - `RelationshipEdgeViewModel`の構築時に、`source/target`ではなく`sourceEntityId/targetEntityId`を使用
    - `fromColumn/toColumn`ではなく`fromColumnId/toColumnId`を使用
    - `ERDiagramViewModel`に`ui`と`loading`フィールドを追加
  - **実装方針**:
    - `relationship.fromEntityId` → `edge.sourceEntityId`
    - `relationship.toEntityId` → `edge.targetEntityId`
    - `relationship.fromColumnId` → `edge.sourceColumnId`
    - `relationship.toColumnId` → `edge.targetColumnId`
    - `ui`は初期状態として空の値を設定（`hover: null`, `highlightedNodeIds: []`, `highlightedEdgeIds: []`, `highlightedColumnIds: []`）
    - `loading`は`false`を設定
  - **参照**: `public/src/utils/viewModelConverter.ts` (44-53行目)
  - **TypeSpec定義**: `scheme/main.tsp` の `RelationshipEdgeViewModel` (150-158行目)、`ERDiagramViewModel` (166-171行目)

### public/src/utils/reactFlowConverter.ts の修正

- [ ] `convertToReactFlowEdges` 関数を修正して新しいフィールド名に対応
  - **変更内容**:
    - `edge.source` → `edge.sourceEntityId`
    - `edge.target` → `edge.targetEntityId`
    - `edge.fromColumn` → `edge.sourceColumnId`
    - `edge.toColumn` → `edge.targetColumnId`
  - **参照**: `public/src/utils/reactFlowConverter.ts` (82-117行目)
  - **注意**: React Flowの`Edge`型の`source`と`target`フィールドには`sourceEntityId`/`targetEntityId`の値を設定する

### public/src/contexts/HoverContext.tsx の修正（カラム名→カラムIDへの移行）

- [ ] `HoverState`の`highlightedColumns`をカラムIDベースに変更
  - **変更内容**:
    - `highlightedColumns: Map<string, Set<string>>`（entityId → Set<columnName>）を削除
    - 代わりに`highlightedColumnIds: Set<string>`（カラムIDの集合）を使用
  - **実装方針**:
    - カラムIDをキーとする集合で管理することで、エンティティをまたいだカラムの検索が不要になる
    - ただし、カラムのハイライト判定時に「エンティティID + カラムID」で検索する必要があるため、実装の複雑さとのトレードオフを検討
  - **参照**: `public/src/contexts/HoverContext.tsx` (10-17行目)
  - **仕様**: `spec/frontend_state_management.md` のERDiagramViewModel型定義 (28-58行目)

- [ ] `setHoverEdge` 関数でカラムIDを使用するように修正
  - **変更内容**:
    - `edge.fromColumn/toColumn`（カラム名）ではなく`edge.sourceColumnId/targetColumnId`（カラムID）を使用
  - **参照**: `public/src/contexts/HoverContext.tsx` (79-102行目)

- [ ] `setHoverColumn` 関数でカラムIDを使用するように修正
  - **変更内容**:
    - 引数を`(entityId: string, columnName: string)`から`(columnId: string)`に変更
    - エッジ検索時に`edge.fromColumn/toColumn`（カラム名）ではなく`edge.sourceColumnId/targetColumnId`（カラムID）を使用
  - **参照**: `public/src/contexts/HoverContext.tsx` (105-141行目)
  - **注意**: この変更により、EntityNodeコンポーネントからの呼び出し方法も変更が必要

### public/src/components/EntityNode.tsx の修正

- [ ] カラムホバー時にカラムIDを渡すように修正
  - **変更内容**:
    - `setHoverColumn(data.id, columnName)` → `setHoverColumn(column.id)`
    - カラムのハイライト判定を`hoverState.highlightedColumnIds.has(col.id)`で行う
  - **参照**: `public/src/components/EntityNode.tsx` (22-30行目、73-95行目)
  - **注意**: `col.name`ではなく`col.id`を使用する

### public/src/components/RelationshipEdge.tsx の修正

- [ ] カラムIDベースのハイライト判定に対応（必要に応じて）
  - **確認内容**: エッジコンポーネントで特にカラム情報を表示していないため、修正は不要の可能性が高い
  - **参照**: `public/src/components/RelationshipEdge.tsx`

## テストコード修正

### tests/usecases/ReverseEngineerUsecase.test.ts の修正

- [ ] `Relationship`の検証部分を新しいフィールド名に対応させる
  - **変更内容**:
    - `firstRelationship.from/to`のアサーションを削除（フィールドが存在しなくなる）
    - `firstRelationship.fromId` → `firstRelationship.fromEntityId`
    - `firstRelationship.toId` → `firstRelationship.toEntityId`
    - `fromEntityId/toEntityId`が実際のエンティティIDと一致することを確認
  - **参照**: `tests/usecases/ReverseEngineerUsecase.test.ts` (85-103行目)

- [ ] `ForeignKey`の検証部分を新しいフィールド名に対応させる
  - **変更内容**:
    - `firstFK.column` → `firstFK.columnId`
    - `firstFK.referencedTable` → `firstFK.referencedTableId`
    - `firstFK.referencedColumn` → `firstFK.referencedColumnId`
    - これらのIDが実際のエンティティID・カラムIDと一致することを確認
  - **参照**: `tests/usecases/ReverseEngineerUsecase.test.ts` (78-83行目)

## フロントエンド状態管理実装（新規仕様）

### 状態管理基盤の実装

- [ ] `public/src/store/erDiagramStore.ts` を作成
  - **実装内容**:
    - `Store`インターフェースの実装（`getState`, `subscribe`, `dispatch`）
    - `ERDiagramViewModel`を状態として保持
    - Action適用時の変化検知（参照比較）と購読者への通知
  - **参照**: `spec/frontend_state_management.md` の Store実装 (126-155行目)

- [ ] `public/src/store/hooks.ts` を作成
  - **実装内容**:
    - `useERViewModel<T>(selector)`: `useSyncExternalStore`を使った購読
    - `useERDispatch()`: dispatch関数を取得
  - **参照**: `spec/frontend_state_management.md` の React統合 (145-155行目)

### Action層の実装

- [ ] `public/src/actions/hoverActions.ts` を作成
  - **実装内容**:
    - `actionHoverEntity(viewModel, entityId)`: エンティティホバー時の処理
    - `actionHoverEdge(viewModel, edgeId)`: エッジホバー時の処理
    - `actionHoverColumn(viewModel, columnId)`: カラムホバー時の処理
    - `actionClearHover(viewModel)`: ホバー解除時の処理
  - **実装方針**:
    - すべて純粋関数として実装（副作用なし）
    - 状態に変化がない場合は同一参照を返す
    - ハイライト対象のIDを検索し、`Set`形式で保持
  - **参照**: `spec/frontend_state_management.md` の Action層の設計 (81-125行目)

- [ ] `public/src/actions/dataActions.ts` を作成
  - **実装内容**:
    - `actionSetData(viewModel, nodes, edges)`: リバースエンジニア結果を設定
    - `actionUpdateNodePositions(viewModel, nodePositions)`: ノード位置更新
    - `actionSetLoading(viewModel, loading)`: ローディング状態の更新
  - **参照**: `spec/frontend_state_management.md` の Action層の設計 (110-119行目)

### Command層の実装

- [ ] `public/src/commands/reverseEngineerCommand.ts` を作成
  - **実装内容**:
    - `commandReverseEngineer(dispatch)`: API呼び出し＋Action dispatch
    - ローディング状態の管理
    - エラーハンドリング
  - **参照**: `spec/frontend_state_management.md` の Command層 (192-219行目)

### HoverContextの廃止とStoreへの移行

- [ ] `public/src/contexts/HoverContext.tsx` を削除
  - **理由**: Action層とStoreで状態管理を行うため、HoverContextは不要
  - **タイミング**: すぐに削除してOK（全タスク完了時にビルドできれば途中で壊れていても問題なし）

- [ ] コンポーネントをStore利用に移行
  - **対象コンポーネント**:
    - `public/src/components/EntityNode.tsx`
    - `public/src/components/RelationshipEdge.tsx`
    - `public/src/components/ERCanvas.tsx`（存在する場合）
  - **変更内容**:
    - `useHover()`を削除し、`useERViewModel`と`useERDispatch`を使用
    - ホバーイベント時に対応するActionをdispatch
  - **参照**: `spec/frontend_state_management.md` の React統合 (145-155行目)

## テストコード作成（新規）

### Action層のテスト

- [ ] `public/tests/actions/hoverActions.test.ts` を作成
  - **テスト内容**:
    - `actionHoverEntity`: ホバーしたエンティティと隣接要素がハイライトされる
    - `actionHoverEdge`: エッジと両端のノード、両端のカラムがハイライトされる
    - `actionHoverColumn`: カラムと関連するエッジ・ノード・対応カラムがハイライトされる
    - `actionClearHover`: すべてのハイライトがクリアされる
  - **参照**: `spec/frontend_state_management.md` のテスト戦略 (220-246行目)

- [ ] `public/tests/actions/dataActions.test.ts` を作成
  - **テスト内容**:
    - `actionSetData`: データが正しく設定される
    - `actionUpdateNodePositions`: ノード位置が正しく更新される
    - `actionSetLoading`: ローディング状態が正しく更新される

## ビルドとテスト実行

- [ ] TypeScript型エラーの確認
  - **コマンド**: `npm run generate` でコード生成後、エディタやビルドで型エラーがないことを確認
  - **確認対象**: すべての`.ts`/`.tsx`ファイル

- [ ] バックエンドテストの実行
  - **コマンド**: `npm run test`
  - **確認内容**: `tests/usecases/ReverseEngineerUsecase.test.ts`が成功すること

- [ ] フロントエンドテストの実行（Actionテスト等が実装された後）
  - **コマンド**: フロントエンド用のテストコマンドを実行
  - **確認内容**: すべてのテストが成功すること

## 実装時の注意事項

- **カラムIDの生成**: 現在`crypto.randomUUID()`で生成しているため、リバースエンジニアリングのたびにIDが変わります。MVPフェーズではこれを許容し、将来的に永続化の仕組みを追加します。
- **TypeSpecの配列とフロントエンドのSetの変換**: `ERDiagramUIState`の`highlightedNodeIds`等はTypeSpecでは配列として定義されていますが、フロントエンドではSetとして使用します。APIレスポンスからViewModelへの変換処理で、配列→Setの変換を行う必要があります。
