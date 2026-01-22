# フロントエンド状態管理のリアーキテクチャ実装タスク

本タスクリストは、仕様書 `spec/frontend_state_management.md` に基づき、現在の `HoverContext` ベースの実装を単一状態ツリー + Action層 + Store の設計に移行するためのタスクを定義します。

## 前提条件

- 仕様書: [spec/frontend_state_management.md](./spec/frontend_state_management.md)
- 関連仕様: [spec/frontend_er_rendering.md](./spec/frontend_er_rendering.md)
- リサーチ背景: [research/20260122_0017_flux_action_layer_state_management.md](./research/20260122_0017_flux_action_layer_state_management.md)

## 基盤実装

### □ 拡張ViewModelの型定義を作成

**ファイル**: `public/src/types/ERDiagramViewModel.ts`（新規作成）

**内容**:
- TypeSpecで生成された `ERDiagramViewModel` を拡張し、UI状態（hover, highlight, loading）を含む型を定義
- 以下の型を定義:
  - `HoverTarget`: ホバー対象を表す型（仕様書参照）
  - `ERDiagramViewModel`: TypeSpecの型を拡張した型（uiとloadingフィールドを追加）
- TypeSpecの生成型（`public/src/api/client/models/ERDiagramViewModel.ts`）をインポートし、その型に`ui`と`loading`を追加する形で拡張
- 参照: `spec/frontend_state_management.md` の「状態設計」セクション
- 注意: `npm run generate` を実行すると、TypeSpecからフロントエンドの型も自動更新される

### □ Action関数の型定義を作成

**ファイル**: `public/src/types/Action.ts`（新規作成）

**内容**:
- `ActionFn<Args extends any[] = any[]>` 型を定義
- 形式: `(viewModel: ERDiagramViewModel, ...args: Args) => ERDiagramViewModel`
- `ERDiagramViewModel`は`public/src/types/ERDiagramViewModel.ts`で定義する拡張版の型
- 参照: `spec/frontend_state_management.md` の「Action層の設計」セクション

### □ ホバーActionの実装

**ファイル**: `public/src/actions/hoverActions.ts`（新規作成）

**内容**:
- `actionHoverEntity(viewModel, entityId)`: エンティティホバー時のAction
- `actionHoverEdge(viewModel, edgeId)`: エッジホバー時のAction
- `actionHoverColumn(viewModel, entityId, columnName)`: カラムホバー時のAction
- `actionClearHover(viewModel)`: ホバー解除時のAction
- 各Actionは純粋関数として実装
- 状態に変化がない場合は同一参照を返す
- 参照: `spec/frontend_state_management.md` の「主要なAction」セクション
- 既存のロジックは `public/src/contexts/HoverContext.tsx` の `setHoverEntity`, `setHoverEdge`, `setHoverColumn` を参考にする

### □ データ更新Actionの実装

**ファイル**: `public/src/actions/dataActions.ts`（新規作成）

**内容**:
- `actionSetData(viewModel, nodes, edges)`: リバースエンジニア結果を設定するAction
  - 引数: `nodes` (Record<string, EntityNodeViewModel>), `edges` (Record<string, RelationshipEdgeViewModel>)
  - 既存のUI状態を保持したままデータ部分のみ更新
- `actionUpdateNodePositions(viewModel, nodePositions)`: ノードドラッグ確定時の位置更新Action
  - 引数: `nodePositions` (Array<{ id: string, x: number, y: number }>)
  - 該当ノードの座標のみ更新
- `actionSetLoading(viewModel, loading)`: ローディング状態の更新Action
- 参照: `spec/frontend_state_management.md` の「主要なAction」セクション

### □ Store実装

**ファイル**: `public/src/store/ERStore.ts`（新規作成）

**内容**:
- `ERStore` インターフェースを実装
  - `getState(): ERDiagramViewModel`
  - `subscribe(listener: () => void): () => void`
  - `dispatch<Args>(action: ActionFn<Args>, ...args: Args): void`
- 開発環境のみdispatchログを出力
- 状態変化時（参照比較）のみsubscriberに通知
- 初期状態を返す `createInitialViewModel()` 関数を実装
- 参照: `spec/frontend_state_management.md` の「Store実装」セクション

### □ React統合フックの実装

**ファイル**: `public/src/hooks/useERStore.ts`（新規作成）

**内容**:
- `useERViewModel<T>(selector: (vm: ERDiagramViewModel) => T): T` フックを実装
  - `useSyncExternalStore` を使用してStoreを購読
  - selectorで必要な部分だけ購読し、再レンダリングを最小化
- `useERDispatch(): Store['dispatch']` フックを実装
  - dispatch関数を取得するフック
- グローバルなStoreインスタンスを作成してexport
- 参照: `spec/frontend_state_management.md` の「React統合」セクション

## Commandレイヤー実装

### □ リバースエンジニアCommandの実装

**ファイル**: `public/src/commands/reverseEngineerCommand.ts`（新規作成）

**内容**:
- `commandReverseEngineer(dispatch)` 関数を実装
  - API呼び出し前に `actionSetLoading(true)` をdispatch
  - `DefaultService.apiReverseEngineer()` を呼び出し
  - 成功時、`buildERDiagramViewModel()` でViewModelを構築
  - `actionSetData()` をdispatch
  - finally で `actionSetLoading(false)` をdispatch
- 参照: `spec/frontend_state_management.md` の「非同期処理（API呼び出し）」セクション
- 既存コード: `public/src/components/ERCanvas.tsx` の `handleReverseEngineer` 関数を参考

## コンポーネントのリファクタリング

### □ ERCanvasコンポーネントの移行

**ファイル**: `public/src/components/ERCanvas.tsx`

**変更内容**:
- `HoverProvider` の使用を削除
- `useState` で管理していた `viewModel`, `loading` を削除
- `useERViewModel` で必要な状態を購読
- `useERDispatch` でdispatch関数を取得
- `handleReverseEngineer` を `commandReverseEngineer` の呼び出しに置き換え
- React FlowのnodesとedgesはViewModelから導出（selector内で変換）
- `onNodeDragStop` 内で `actionUpdateNodePositions` をdispatch
- ドラッグ中はホバー判定を行わない（実装の簡略化）
- 参照: `spec/frontend_state_management.md` の「React Flowとの統合」セクション

### □ EntityNodeコンポーネントの移行

**ファイル**: `public/src/components/EntityNode.tsx`

**変更内容**:
- `useHover()` の使用を `useERViewModel` と `useERDispatch` に置き換え
- `setHoverEntity`, `setHoverColumn`, `clearHover` を dispatch経由のAction呼び出しに変更
  - 例: `dispatch(actionHoverEntity, data.id)`
- ハイライト判定は `useERViewModel` から取得した状態を使用
- 参照: `spec/frontend_state_management.md` の「React Flowとの統合」セクション

### □ RelationshipEdgeコンポーネントの移行

**ファイル**: `public/src/components/RelationshipEdge.tsx`

**変更内容**:
- `useHover()` の使用を `useERViewModel` と `useERDispatch` に置き換え
- `setHoverEdge`, `clearHover` を dispatch経由のAction呼び出しに変更
  - 例: `dispatch(actionHoverEdge, id)`
- ハイライト判定は `useERViewModel` から取得した状態を使用
- 参照: `spec/frontend_state_management.md` の「React Flowとの統合」セクション

## 旧実装の削除

### □ HoverContextの削除

**ファイル**: `public/src/contexts/HoverContext.tsx`

**内容**:
- ファイルを削除
- 理由: Store + Action層に置き換えられたため不要

## テスト環境のセットアップ

### □ フロントエンド用Vitest設定ファイルの作成

**ファイル**: `public/vitest.config.ts`（新規作成）

**内容**:
- Vitestの設定ファイルを作成
- `test.globals: true` を設定（グローバルなテストAPI使用）
- `test.environment: 'jsdom'` を設定（React コンポーネントのテスト用）
- テストファイルのパターンを設定: `test.include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx']`
- エイリアス設定（必要に応じて）
- 参考: ルートの `vitest.config.ts` と同様の構成

### □ フロントエンドのテストディレクトリ作成

**ディレクトリ**: `public/tests/`（新規作成）

**内容**:
- 以下のサブディレクトリを作成:
  - `public/tests/actions/` - Actionのテスト

### □ フロントエンドのテスト用依存関係の追加

**ファイル**: `public/package.json`

**変更内容**:
- `devDependencies` に以下を追加:
  - `vitest`: 最新版
  - `@vitest/ui`: 最新版（任意、UI表示用）
  - `jsdom`: 最新版（DOM環境エミュレート用）
  - `@testing-library/react`: 最新版（React コンポーネントテスト用、将来的に必要な場合）
  - `@testing-library/jest-dom`: 最新版（DOM マッチャー用、将来的に必要な場合）
- `scripts` にテストコマンドを追加:
  - `"test": "vitest"`
  - `"test:ui": "vitest --ui"`
  - `"test:run": "vitest run"`（CI用）

## テストの実装

### □ hoverActionsのテスト作成

**ファイル**: `public/tests/actions/hoverActions.test.ts`（新規作成）

**内容**:
- `actionHoverEntity` のテスト
  - ホバーしたエンティティと隣接要素がハイライトされることを検証
  - 状態に変化がない場合は同一参照が返されることを検証
- `actionHoverEdge` のテスト
  - エッジと両端のノード、関連カラムがハイライトされることを検証
- `actionHoverColumn` のテスト
  - カラムと関連するエッジ・ノード・対応カラムがハイライトされることを検証
- `actionClearHover` のテスト
  - すべてのハイライトがクリアされることを検証
- テストフレームワーク: Vitest
- テストデータはDAMP原則に従い、テストケース毎に即値で定義（ヘルパー関数は不要）
- 参照: `spec/frontend_state_management.md` の「Action単体テスト」セクション

### □ dataActionsのテスト作成

**ファイル**: `public/tests/actions/dataActions.test.ts`（新規作成）

**内容**:
- `actionSetData` のテスト
  - データが正しく設定され、UI状態が保持されることを検証
- `actionUpdateNodePositions` のテスト
  - 指定したノードの座標のみ更新されることを検証
- `actionSetLoading` のテスト
  - loading状態が正しく更新されることを検証
- テストフレームワーク: Vitest
- テストデータはDAMP原則に従い、テストケース毎に即値で定義（ヘルパー関数は不要）

## ビルド・動作確認

### □ フロントエンドのビルド確認

**コマンド**: `cd public && npm run build`

**確認内容**:
- ビルドエラーがないこと
- 型エラーがないこと

### □ フロントエンドテストの実行

**コマンド**: `cd public && npm run test:run`

**確認内容**:
- すべてのテストがパスすること
- カバレッジが十分であること（主要なActionロジックをカバー）
- テストが正しく実行できる環境が整っていること

## 事前修正提案

特になし。仕様書に従って段階的に実装可能。

## 指示者宛ての懸念事項（作業対象外）

### React Flowとの統合の実現可能性

- 仕様書では「ドラッグ中はReact Flow内部状態、確定時のみVMへ反映」とあるが、実際に実装してみないと問題点が見えない可能性がある
- ドラッグ中はホバー判定を行わないことで実装を簡略化する方針

### パフォーマンスの検証

- 仕様書では「変化がない場合は同一参照を返す」ことで再レンダリングを抑制するとあるが、実際にパフォーマンスが改善されるかは計測が必要
- 大規模なER図（100エンティティ以上）での動作確認が望ましい
