# タスク一覧

## 概要

ドラッグ中のホバーインタラクション無効化機能の実装。詳細は以下の仕様書を参照：
- [フロントエンドER図レンダリング仕様](./spec/frontend_er_rendering.md) - ホバーインタラクション仕様の「4. ドラッグ中の動作」
- [フロントエンド状態管理仕様](./spec/frontend_state_management.md) - ホバー検出の「ドラッグ中のホバー動作」

エンティティをドラッグ中に描画が飛び飛びになる（カクつく）現象を防ぐため、ドラッグ中はホバーインタラクション機能を無効化する。

## フロントエンド実装

### ViewModelへのドラッグ状態フラグの追加

- [ ] **ファイル**: `scheme/main.tsp`
- [ ] **変更内容**: `ERDiagramUIState`に`isDraggingEntity`フラグを追加
- [ ] **実装詳細**:
  - `ERDiagramUIState`モデルに`isDraggingEntity: boolean;`フィールドを追加
  - ドラッグ中かどうかを示すフラグ（true: ドラッグ中、false: 通常状態）
  - デフォルト値は`false`

### 型の再生成

- [ ] `npm run generate`を実行してTypeSpecから型を再生成

### hoverActionsの修正

- [ ] **ファイル**: `public/src/actions/hoverActions.ts`
- [ ] **変更内容**: ドラッグ中にホバーイベントを無視するようActionを修正
- [ ] **実装詳細**:
  - `actionHoverEntity`、`actionHoverEdge`、`actionHoverColumn`の各関数の先頭で`viewModel.erDiagram.ui.isDraggingEntity`をチェック
  - `isDraggingEntity === true`の場合は、何もせずに元の`viewModel`をそのまま返す（同一参照を返す）
  - これにより、ドラッグ中はホバーイベントが発生してもハイライト状態が更新されない

### ドラッグ開始・終了Actionの追加

- [ ] **ファイル**: `public/src/actions/hoverActions.ts`
- [ ] **変更内容**: ドラッグ開始・終了のActionを追加
- [ ] **実装詳細**:
  - `actionStartEntityDrag(viewModel: ViewModel): ViewModel`を追加
    - `isDraggingEntity`を`true`に設定
    - `hover`を`null`に設定
    - `highlightedNodeIds`、`highlightedEdgeIds`、`highlightedColumnIds`を空配列に設定
  - `actionStopEntityDrag(viewModel: ViewModel): ViewModel`を追加
    - `isDraggingEntity`を`false`に設定
  - 両方とも変化がない場合は同一参照を返す（再レンダリング抑制）

### ERCanvasでのドラッグイベント処理

- [ ] **ファイル**: `public/src/components/ERCanvas.tsx`
- [ ] **変更内容**: React Flowの`onNodeDragStart`/`onNodeDragStop`イベントでActionをdispatch
- [ ] **実装詳細**:
  - `onNodeDragStart`コールバックを追加
    - `actionStartEntityDrag`をimport
    - `node.type === 'entityNode'`の場合に`dispatch(actionStartEntityDrag)`を実行
  - `onNodeDragStop`コールバックに処理を追加
    - 既存の処理（位置更新、エッジハンドル再計算）の後に`dispatch(actionStopEntityDrag)`を実行

### EntityNodeのCSS transition制御

- [ ] **ファイル**: `public/src/components/EntityNode.tsx`
- [ ] **変更内容**: ドラッグ中はCSS transitionを無効化
- [ ] **実装詳細**:
  - `isDraggingEntity`フラグをStoreから購読（`useViewModel`使用）
  - ノードのスタイルに`transition`プロパティを追加
    - `isDraggingEntity === true`の場合: `transition: 'none'`（transition無効）
    - `isDraggingEntity === false`の場合: `transition: 'all 0.2s ease-in-out'`（既存のtransition）
  - React Flowのドラッグ操作とCSS transitionの干渉を防ぎ、スムーズな移動を実現

### hoverActionsのテストコード修正

- [ ] **ファイル**: `public/tests/actions/hoverActions.test.ts`
- [ ] **変更内容**: ドラッグ中のホバー無効化とドラッグAction追加のテストケース追加
- [ ] **追加するテストケース**:
  - `actionHoverEntity`、`actionHoverEdge`、`actionHoverColumn`に対して
    - ドラッグ中（`isDraggingEntity: true`）の場合、元の状態を返す（同一参照）
  - `actionStartEntityDrag`に対して
    - `isDraggingEntity`が`true`に設定される
    - `hover`が`null`に設定される
    - 全てのハイライト配列が空になる
    - すでにドラッグ中の場合は同一参照を返す
  - `actionStopEntityDrag`に対して
    - `isDraggingEntity`が`false`に設定される
    - すでにドラッグ停止状態の場合は同一参照を返す

### 初期ViewModelの更新

- [ ] **ファイル**: `public/src/utils/getInitialViewModelValues.ts`
- [ ] **変更内容**: `isDraggingEntity`の初期値を追加
- [ ] **実装詳細**:
  - `erDiagram.ui`の初期値に`isDraggingEntity: false`を追加

### バックエンドGetInitialViewModelUsecaseの更新

- [ ] **ファイル**: `lib/usecases/GetInitialViewModelUsecase.ts`
- [ ] **変更内容**: 初期ViewModelに`isDraggingEntity: false`を含める
- [ ] **実装詳細**:
  - `erDiagram.ui`の初期値に`isDraggingEntity: false`を追加

### バックエンドReverseEngineerUsecaseの更新

- [ ] **ファイル**: `lib/usecases/ReverseEngineerUsecase.ts`
- [ ] **変更内容**: リバースエンジニアリング後の`erDiagram.ui`に`isDraggingEntity: false`を含める
- [ ] **実装詳細**:
  - UI状態クリア処理の箇所（hover、highlightedXxxIdsをクリアしている箇所）で`isDraggingEntity: false`も設定
  - リバースエンジニアリング処理中はドラッグ操作が発生しないため、常に`false`

## ビルド・テスト

### ビルド確認

- [ ] `npm run generate`を実行してコード生成を確認
- [ ] バックエンドとフロントエンドのビルドが成功することを確認

### テスト実行

- [ ] `npm run test`を実行してすべてのテストが成功することを確認
- [ ] 特に追加したドラッグ中のホバー無効化のテストケースが成功することを確認

## 備考

### 実装のポイント

* **ホバー無効化の実装方法**: `isDraggingEntity`フラグをチェックして、ドラッグ中はホバーActionで何もせず元のviewModelを返す（同一参照を返すことで再レンダリングを抑制）
* **ドラッグ検出**: React Flowの`onNodeDragStart`/`onNodeDragStop`イベントを使用
* **CSS transition制御**: `isDraggingEntity`フラグに応じてEntityNodeのtransitionプロパティを動的に切り替え
* **対象範囲**: エンティティノードのドラッグのみが対象。矩形ノードやテキストノードのドラッグは別の管理方式のため影響なし

### テスト戦略

* Action単体テストで`isDraggingEntity`フラグの動作を検証
* ドラッグ中のホバーイベントが無視されることをテスト
* ドラッグ開始・終了Actionのテスト

### 既存機能との整合性

* 既存のホバーインタラクション機能は維持（ドラッグ中以外は正常に動作）
* ViewModelの構造に`isDraggingEntity`フラグを追加するのみで、既存のフィールドは変更しない
* React Flowの既存のドラッグ処理には影響を与えない
