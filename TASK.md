# エンティティ選択とDDLパネル機能　実装タスク

## 概要

エンティティの選択機能と、選択中のエンティティのDDLを表示する右サイドバー（DDLパネル）を実装する。

関連仕様書:
- [spec/entity_selection_and_ddl_panel.md](./spec/entity_selection_and_ddl_panel.md)
- [spec/frontend_state_management.md](./spec/frontend_state_management.md)
- [spec/layer_management.md](./spec/layer_management.md)

---

## フェーズ1: エンティティ選択の導入【完了】

### ✅ ホバーActionの修正（選択中のホバー無効化）

**編集対象**: `public/src/actions/hoverActions.ts`

**変更内容**:
- `actionHoverEntity`, `actionHoverEdge`, `actionHoverColumn` の3つの関数の先頭に選択状態チェックを追加
- ドラッグ中チェック（`if (viewModel.erDiagram.ui.isDraggingEntity)`）の直後に以下のチェックを追加:
  ```typescript
  // エンティティ選択中はホバーイベントを無視
  if (viewModel.ui.selectedItem?.kind === 'entity') {
    return viewModel;
  }
  ```
- 既存の最適化（同一参照返却、配列最適化）は維持

**注意事項**:
- 仕様書では「`vm.ui.selectedItem?.kind === 'entity'`の場合は早期リターン」と記載されているが、実装では`viewModel.ui.selectedItem?.kind === 'entity'`とする（変数名の統一）

---

### - EntityNodeコンポーネントの修正（クリックイベントとスタイル）

**編集対象**: `public/src/components/EntityNode.tsx`

**変更内容**:

1. **必要なimportの追加**:
   ```typescript
   import { actionSelectItem } from '../actions/layerActions'
   ```

2. **選択状態の購読**:
   - 既存の`isHighlighted`購読の後に、選択状態の購読を追加:
   ```typescript
   const isSelected = useViewModel(
     (vm) => vm.ui.selectedItem?.kind === 'entity' && vm.ui.selectedItem.id === data.id,
     (a, b) => a === b
   )
   ```

3. **クリックイベントハンドラーの追加**:
   - `useCallback`でメモ化したクリックハンドラーを追加:
   ```typescript
   const handleClick = useCallback((e: React.MouseEvent) => {
     e.stopPropagation()
     dispatch(actionSelectItem, { kind: 'entity', id: data.id })
   }, [dispatch, data.id])
   ```

4. **onClickイベントの追加**:
   - ルートの`<div>`要素に`onClick={handleClick}`を追加

5. **選択時のスタイルの追加**:
   - ハイライト判定を`isHighlighted || isSelected`に変更
   - または、選択時とホバー時で異なるスタイルを適用する場合は、classNameを`isSelected ? 'entity-node is-selected' : (isHighlighted ? 'entity-node is-highlighted' : 'entity-node')`のように変更

**注意事項**:
- 選択時のスタイルは、ホバー時と同じスタイルを使用する（仕様書の「選択中のエンティティ: ホバー時と同じハイライトスタイルを維持」に従う）
- `e.stopPropagation()`を追加することで、クリックイベントが`onPaneClick`に伝播しないようにする

---

### - ERCanvasコンポーネントの修正（空白クリックとESCキー）

**編集対象**: `public/src/components/ERCanvas.tsx`

**変更内容**:

1. **必要なimportの追加**:
   - React Flowの`useKeyPress`をimport:
   ```typescript
   import { ..., useKeyPress } from '@xyflow/react'
   ```

2. **ERCanvasInner内にESCキー処理を追加**:
   - `useKeyPress('Escape')`フックを使用してESCキーを検出:
   ```typescript
   const escPressed = useKeyPress('Escape')
   
   useEffect(() => {
     if (escPressed) {
       dispatch(actionSelectItem, null)
     }
   }, [escPressed, dispatch])
   ```

3. **handlePaneClickの動作確認**:
   - 既存の`handlePaneClick`が既に`dispatch(actionSelectItem, null)`を実行しているため、そのまま使用可能
   - ただし、Entity選択時にも選択解除が動作することを確認

**注意事項**:
- `useKeyPress`の戻り値は真偽値なので、前回の値を保持して連続発火を防ぐため、`useEffect`の依存配列に`escPressed`を含める
- ESCキーは選択解除のみを行い、他のモーダルを閉じる動作は既存の実装に任せる

---

### - エンティティ選択のテスト追加

**編集対象**: `public/tests/actions/layerActions.test.ts`（既存ファイルに追加）

**変更内容**:
- `actionSelectItem`のテストケースにエンティティ選択のテストを追加:
  - エンティティを選択した場合、`selectedItem`が`{ kind: 'entity', id: entityId }`になることを確認
  - 矩形が選択されている状態でエンティティを選択した場合、矩形の選択が解除されエンティティが選択されることを確認
  - `actionSelectItem(vm, null)`で選択が解除されることを確認

**テストケース例**:
```typescript
it('エンティティを選択する', () => {
  const vm = createMockViewModel()
  const next = actionSelectItem(vm, { kind: 'entity', id: 'entity-1' })
  
  expect(next.ui.selectedItem).toEqual({ kind: 'entity', id: 'entity-1' })
})

it('矩形選択中にエンティティを選択すると矩形の選択が解除される', () => {
  const vm = createMockViewModel()
  const withRectSelected = actionSelectItem(vm, { kind: 'rectangle', id: 'rect-1' })
  const next = actionSelectItem(withRectSelected, { kind: 'entity', id: 'entity-1' })
  
  expect(next.ui.selectedItem).toEqual({ kind: 'entity', id: 'entity-1' })
})
```

---

### - ホバーAction修正のテスト追加

**編集対象**: `public/tests/actions/hoverActions.test.ts`（既存ファイルに追加）

**変更内容**:
- 選択中のホバー無効化のテストを追加:
  - エンティティ選択中に別のエンティティにホバーしても、ハイライトが更新されないことを確認
  - エンティティ選択中にエッジにホバーしても、ハイライトが更新されないことを確認
  - エンティティ選択中にカラムにホバーしても、ハイライトが更新されないことを確認

**テストケース例**:
```typescript
it('エンティティ選択中は他のエンティティにホバーしてもハイライトされない', () => {
  const vm = createMockViewModel()
  const withEntitySelected = {
    ...vm,
    ui: {
      ...vm.ui,
      selectedItem: { kind: 'entity' as const, id: 'entity-1' },
    },
  }
  const next = actionHoverEntity(withEntitySelected, 'entity-2')
  
  expect(next).toBe(withEntitySelected) // 同一参照を返す
})
```

---

### - ビルドとテスト実行

**実行コマンド**:
```bash
npm run generate
npm run test
```

**確認内容**:
- 型生成が正常に完了すること
- すべてのテストがパスすること
- エンティティ選択関連のテストがパスすること
- ホバーAction修正のテストがパスすること

---

## フェーズ2: DDLパネルの実装【完了】

### ✅ ライブラリのインストール

**実行コマンド**:
```bash
cd public
npm i react-syntax-highlighter
npm i -D @types/react-syntax-highlighter
cd ..
```

**確認内容**:
- `react-syntax-highlighter`と型定義がインストールされること
- `package.json`に追加されること

---

### ✅ DDLPanelコンポーネントの作成

**新規作成**: `public/src/components/DDLPanel.tsx`

**実装内容**:

1. **必要なimportと型定義**:
   ```typescript
   import React from 'react'
   import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
   import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism'
   import { useViewModel, useDispatch } from '../store/hooks'
   import { actionSelectItem } from '../actions/layerActions'
   ```

2. **コンポーネントの実装**:
   - Props: なし（Storeから選択中のエンティティを取得）
   - 選択中のエンティティIDを取得: `useViewModel((vm) => vm.ui.selectedItem)`
   - エンティティIDからノードを取得: `useViewModel((vm) => vm.erDiagram.nodes[selectedItem.id])`
   - 閉じるボタン: `dispatch(actionSelectItem, null)`

3. **レイアウト**:
   - 固定幅: `420px`（基準）
   - `min-width: 360px; max-width: 50vw;`
   - ヘッダー: エンティティ名と閉じるボタン
   - コンテンツ: `<SyntaxHighlighter>`でDDLを表示

4. **スタイル**:
   - 左レイヤーパネルと同じパネルスタイルを使用（枠/影/ヘッダ/閉じるボタン）
   - 既存の`LayerPanel`コンポーネントのスタイルを参考にする

5. **Syntax Highlighterの設定**:
   ```typescript
   <SyntaxHighlighter
     language="sql"
     style={prism}
     wrapLongLines={true}
     customStyle={{
       margin: 0,
       borderRadius: 0,
       fontSize: '14px',
       lineHeight: '1.5',
     }}
   >
     {ddl}
   </SyntaxHighlighter>
   ```

**注意事項**:
- `@types/react-syntax-highlighter`の型定義が古い場合、サブパスimportに型が追いつかない可能性がある
- その場合は、ファイル先頭に以下の`declare module`を追加:
  ```typescript
  declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
    const prism: any
    export { prism }
  }
  ```
- DDLパネル内のクリックが`onPaneClick`を発火しないように、パネル内で`onClick={(e) => e.stopPropagation()}`を使用

---

### ✅ App.tsxの修正（DDLパネルの統合）

**編集対象**: `public/src/components/App.tsx`

**変更内容**:

1. **DDLPanelのimport**:
   ```typescript
   import DDLPanel from './DDLPanel'
   ```

2. **右サイドバーの条件分岐を修正**:
   - 既存の`{selectedItem && (...) }`ブロック内で、選択対象に応じて表示を切り替え:
   ```typescript
   {selectedItem && (
     <div 
       style={{ 
         width: selectedItem.kind === 'entity' ? '420px' : '300px', 
         minWidth: selectedItem.kind === 'entity' ? '360px' : '300px',
         maxWidth: selectedItem.kind === 'entity' ? '50vw' : '300px',
         background: '#ffffff', 
         borderLeft: '1px solid #ddd', 
         overflowY: 'auto' 
       }}
       onMouseDown={(e) => e.stopPropagation()}
       onPointerDown={(e) => e.stopPropagation()}
       onClick={(e) => e.stopPropagation()}
       onTouchStart={(e) => e.stopPropagation()}
     >
       {selectedItem.kind === 'rectangle' && (
         <RectanglePropertyPanel rectangleId={selectedItem.id} />
       )}
       {selectedItem.kind === 'text' && (
         <TextPropertyPanel textId={selectedItem.id} />
       )}
       {selectedItem.kind === 'entity' && (
         <DDLPanel />
       )}
     </div>
   )}
   ```

**注意事項**:
- DDLパネルは幅が異なるため、`selectedItem.kind`に応じて幅を動的に変更する
- `stopPropagation()`は既存の実装と同じように適用

---

### ✅ ビルドとテスト実行

**実行コマンド**:
```bash
npm run generate
npm run test
```

**確認内容**:
- ✅ 型生成が正常に完了すること
- ⚠️ すべてのテストがパスすること → **既存のテストエラーが検出された（詳細は下記）**
- ✅ DDLPanelコンポーネントが作成されていること
- ✅ App.tsxにDDLPanelが統合されていること

**⚠️ 検出された問題**:

テスト実行時に2つの既存テストが失敗しました（DDLパネル実装とは無関係）:

1. `public/tests/actions/dataActions.test.ts` - 「既存エンティティの座標とIDを維持する」テスト
2. `public/tests/actions/mergeERData.test.ts` - 「既存エンティティの座標とIDを維持する」テスト

**エラー内容**:
- テストでは「幅と高さは0にリセットされる」ことを期待しているが、実際には200が返される
- エラー箇所: `expect(usersNode.width).toBe(0)` が失敗（実際の値は200）

**原因の推測**:
- `actionMergeERData`の増分更新モードにおいて、エンティティの幅・高さがリセットされない不具合がある
- または、テストの期待値が間違っている可能性がある

**影響範囲**:
- この問題はフェーズ1完了時点で既に存在していた可能性が高い
- DDLパネルの実装では`actionMergeERData`や`dataActions`には一切触れていない

**今後の対応**:
- この問題を修正するか、またはテストの期待値を見直す必要がある
- フェーズ2のDDLパネル実装は完了しているため、この問題を解決後にフェーズ3へ進むべき

---

## フェーズ3: 統合テストと動作確認

### - Lintエラーの確認

**実行コマンド**:
```bash
npm run test
```

**確認内容**:
- すべてのテストがパスすること
- Lintエラーがないこと
- 型エラーがないこと

---

### - ビルドの確認

**実行コマンド**:
```bash
cd public
npm run build
cd ..
```

**確認内容**:
- フロントエンドのビルドが成功すること
- ビルドエラーがないこと

---

## 備考

### 仕様上の確認事項

- `GlobalUIState.selectedItem`は既に矩形・テキストの選択を管理しており、`LayerItemKind`に`entity`が含まれているため、型の拡張は不要
- `actionSelectItem`は既にレイヤー管理機能で実装されているため、新規Actionの追加は不要
- エンティティ選択時のハイライト表示は、既存のホバーロジックを流用（`isHighlighted || isSelected`で判定）
- React Flowの`useKeyPress`はReact Flow v11系以降で利用可能（プロジェクトの`@xyflow/react`のバージョンを確認）

### 段階的な実装アプローチ

仕様書では5つのフェーズに分けられているが、タスク洗い出しでは以下のようにまとめている:
- フェーズ1: エンティティ選択の導入、選択中のホバー無効化、ESCキー対応を統合
- フェーズ2: DDLパネルの枠組みとSyntax Highlightを統合
- フェーズ3: 統合テストと動作確認

この順序により、ビルド・テスト可能な単位でフェーズ分けしている。

### スコープ外の機能

以下の機能は本タスクの対象外:
- DDLの編集機能（読み取り専用表示のみ）
- DDLのコピー機能
- 複数エンティティの同時選択
- レイヤーパネル上でのエンティティ選択

---

## バグ修正: エンティティ選択時の関連エンティティハイライト【完了】

### 問題の概要

フェーズ1完了後、以下のバグが発見された:
- エンティティを選択状態にすると、そのエンティティ自体はハイライトされるが、**関連エンティティがハイライトされない**
- 期待動作: 選択中はエンティティにホバーしたときと同じ状態（関連エンティティ・エッジ・カラムのハイライト）が維持されるべき

### 原因分析

1. **仕様の不備**: 仕様書には「関連するエンティティ・カラムをハイライト」と明記されていたが、TASK.mdに正しく反映されていなかった
2. **実装の不足**: `actionSelectItem`が単に`selectedItem`を更新するだけで、ハイライト状態（`highlightedNodeIds`, `highlightedEdgeIds`, `highlightedColumnIds`）を設定していなかった
3. **ホバー無効化の副作用**: エンティティ選択中はホバーイベントが無効化されるため、ハイライト情報は選択時に設定する必要があった

### 修正内容

#### ✅ actionSelectItemの拡張

**編集対象**: `public/src/actions/layerActions.ts`

**変更内容**:
- エンティティ選択時（`itemRef.kind === 'entity'`）に、`actionHoverEntity`と同じロジックで関連エンティティ・エッジ・カラムをハイライト
- 具体的には:
  1. `entityToEdges`インデックスを使って接続エッジを検索
  2. 接続エッジから関連エンティティとカラムを収集
  3. `highlightedNodeIds`, `highlightedEdgeIds`, `highlightedColumnIds`を設定
- エンティティ以外の選択時または選択解除時は、ハイライト状態をクリア（空配列に設定）

#### ✅ テストの追加

**編集対象**: `public/tests/actions/layerActions.test.ts`

**変更内容**:
1. **モックデータの修正**: `createInitialViewModel`に`index`プロパティを追加
2. **新規テストケースの追加**:
   - エンティティ選択時、関連エンティティとエッジもハイライトされることを確認
   - 選択解除時、ハイライトがクリアされることを確認
   - 矩形選択時、ハイライトがクリアされることを確認

#### ✅ 仕様書の更新

**編集対象**: `spec/entity_selection_and_ddl_panel.md`

**変更内容**:
- Action設計セクションに、`actionSelectItem`がエンティティ選択時にハイライト状態を設定する処理を明記
- 「ホバーイベントを無効化するだけでは不十分」という注意書きを追加

### 確認結果

**テスト実行結果**:
```bash
npm run test
```
- ✅ 全196テストがパス
- ✅ 新規追加した3つのテストケースがパス
- ✅ 既存テストに影響なし

### 学んだこと

- エンティティ選択時は「選択状態の設定」だけでなく、「ハイライト状態の設定」も必要
- ホバーイベントを無効化する場合、選択時にハイライト情報を明示的に設定する必要がある
- 仕様書からタスクへの転記時に、重要な詳細が漏れないよう注意が必要

---

## バグ修正: エンティティ選択後のホバー解除時にハイライトが消える問題【完了】

### 問題の概要

前回のバグ修正後、新たに以下のバグが発見された:
- エンティティを選択状態にすると、エンティティと関連エンティティが正しくハイライトされる
- しかし、**エンティティからホバーを外すと、関連エンティティのハイライトが解除されてしまう**
- 選択したエンティティそのもののハイライトは維持されているが、関連エンティティ・エッジ・カラムのハイライトが消える
- 選択したエンティティ内のカラムにホバーした時も同じ症状が発生

### 期待動作

- エンティティ選択中は、カーソルがエンティティから離れても、選択によるハイライト（関連エンティティ・エッジ・カラム）が**維持されるべき**

### 原因分析

1. **`actionClearHover`の不適切な動作**: `actionClearHover`が、エンティティ選択中でも無条件にすべてのハイライト情報をクリアしていた
2. **仕様書の不備**: 仕様書に`actionClearHover`の動作仕様が記載されていなかった
3. **ホバー解除とハイライト維持の矛盾**: ホバー状態（`hover`）をクリアすることと、選択によるハイライト状態を維持することは別の処理として扱う必要があった

### 修正内容

#### ✅ actionClearHoverの修正

**編集対象**: `public/src/actions/hoverActions.ts`

**変更内容**:
- エンティティ選択中（`viewModel.ui.selectedItem?.kind === 'entity'`）の場合:
  - `hover`のみを`null`にクリア
  - `highlightedNodeIds`, `highlightedEdgeIds`, `highlightedColumnIds`は**維持する**
- エンティティ未選択時:
  - 既存の動作を維持（`hover`と全ハイライト配列をクリア）

#### ✅ テストの追加

**編集対象**: `public/tests/actions/hoverActions.test.ts`

**変更内容**:
1. **エンティティ選択中のハイライト維持テスト**:
   - エンティティ選択中に`actionClearHover`を呼んでも、ハイライト状態が維持されることを確認
   - `hover`のみが`null`になることを確認
2. **最適化テスト**:
   - エンティティ選択中で`hover`が既に`null`の場合、同一参照を返すことを確認

#### ✅ 仕様書の更新

**編集対象**: `spec/entity_selection_and_ddl_panel.md`

**変更内容**:
- 「actionClearHoverの修正」セクションを追加
- エンティティ選択中は`hover`のみをクリアし、ハイライト配列は維持することを明記
- エンティティ未選択時は全てクリアする既存の動作を維持することを明記

### 確認結果

**テスト実行結果**:
```bash
npm run test
```
- ✅ 新規追加したテストケース（2件）がパス
- ✅ 既存テストに影響なし

### 学んだこと

- **ホバー状態とハイライト状態は別々に管理する必要がある**: ホバー解除時（`actionClearHover`）は、選択状態に応じてハイライトを維持する処理が必要
- **エンティティ選択の状態遷移が複雑**: 選択 → ホバー → ホバー解除 → 選択維持という流れで、各段階でハイライト状態を適切に管理する必要がある
- **仕様書の網羅性の重要性**: 主要なActionだけでなく、それに関連する補助的なAction（`actionClearHover`など）の仕様も明記する必要がある
