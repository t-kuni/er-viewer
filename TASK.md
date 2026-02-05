# コピー&ペースト機能実装タスク一覧

仕様書: [spec/copy_paste_feature.md](spec/copy_paste_feature.md)

---

## フェーズ1: Action層とStoreの準備

### 型生成

- [ ] `npm run generate` を実行して、`ClipboardData` と `CanvasMousePosition` 型をフロントエンド用に生成
  - `scheme/main.tsp` の変更が既にコミットされている
  - `public/src/api/client/` に型が生成される
  - `GlobalUIState` に `clipboard` と `lastMousePosition` フィールドが追加される

### 初期状態の更新

- [ ] `public/src/store/erDiagramStore.ts` の初期状態を更新
  - `ui.clipboard: null` を追加
  - `ui.lastMousePosition: null` を追加
  - 初期ViewModel生成時にこれらのフィールドが含まれるようにする

### Action実装 (`public/src/actions/`)

コピー&ペースト機能用のActionファイルを新規作成します。

- [ ] `public/src/actions/clipboardActions.ts` を新規作成
  - 以下のActionを実装:
    - `actionCopyItem(vm)`: 選択中のアイテムをクリップボードにコピー
      - `vm.ui.selectedItem` が `null` の場合は何もしない（同一参照を返す）
      - `selectedItem.kind` が `'entity'` または `'relation'` の場合は何もしない（同一参照を返す）
      - `selectedItem.kind` が `'text'` の場合: `vm.erDiagram.texts[selectedItem.id]` からデータを取得
      - `selectedItem.kind` が `'rectangle'` の場合: `vm.erDiagram.rectangles[selectedItem.id]` からデータを取得
      - `ClipboardData` オブジェクトを作成し、`vm.ui.clipboard` に保存
      - 純粋関数として実装（副作用なし）
    - `actionPasteItem(vm, position: {x: number, y: number})`: クリップボードのアイテムをペースト
      - `vm.ui.clipboard` が `null` の場合は何もしない（同一参照を返す）
      - `crypto.randomUUID()` で新しいIDを生成
      - `clipboard.kind` に応じて元データをコピー:
        - `kind === 'text'`: `clipboard.textData` をコピーし、`id` と `x`, `y` を新しい値に変更
        - `kind === 'rectangle'`: `clipboard.rectangleData` をコピーし、`id` と `x`, `y` を新しい値に変更
      - 内部で `actionAddText` または `actionAddRectangle` を呼び出し
      - 内部で `actionSelectItem(vm, { kind, id: newId })` を呼び出して新しいアイテムを選択
      - 純粋関数として実装（副作用なし）
    - `actionUpdateMousePosition(vm, position: {clientX: number, clientY: number})`: マウス位置を更新
      - `vm.ui.lastMousePosition` を更新
      - 値が変わっていない場合は同一参照を返す
      - 純粋関数として実装（副作用なし）
  - 既存のActionをインポート:
    - `actionAddText`, `actionAddRectangle` from `./textActions`, `./rectangleActions`
    - `actionSelectItem` from `./layerActions`
  - 型定義をインポート:
    - `type ViewModel` from `'../api/client'`
    - `type ClipboardData` from `'../api/client'`
    - `type TextBox` from `'../api/client'`
    - `type Rectangle` from `'../api/client'`

### テスト実装 (`public/tests/actions/`)

- [ ] `public/tests/actions/clipboardActions.test.ts` を新規作成
  - `actionCopyItem` のテスト:
    - 選択なしの場合、何もしない
    - テキスト選択時、クリップボードにテキストデータが保存される
    - 矩形選択時、クリップボードに矩形データが保存される
    - エンティティ選択時、何もしない
  - `actionPasteItem` のテスト:
    - クリップボードが空の場合、何もしない
    - テキストをペーストすると新しいテキストが追加され、選択状態になる
    - 矩形をペーストすると新しい矩形が追加され、選択状態になる
    - IDが新しく生成され、元のオブジェクトとは異なる
    - 指定された位置にペーストされる
  - `actionUpdateMousePosition` のテスト:
    - マウス位置が更新される
    - 値が変わっていない場合は同一参照を返す

---

## フェーズ2: UI統合（マウス位置記録とキーボードショートカット）

### マウス位置記録の実装

- [ ] `public/src/components/ERCanvas.tsx` の `ERCanvasInner` コンポーネントを更新
  - キャンバスのラッパー `<div>` に `onMouseMove` イベントハンドラを追加
  - マウスムーブ時に `actionUpdateMousePosition` をdispatch
  - `e.clientX` と `e.clientY` を渡す
  - `useCallback` でハンドラーをメモ化してパフォーマンスを確保
  - 注意: `onMouseLeave` では `lastMousePosition` を更新しない（最後の位置を保持）

### キーボードショートカット実装

- [ ] `public/src/components/ERCanvas.tsx` の `ERCanvasInner` コンポーネントを更新
  - `useKeyPress('Control+c')` と `useKeyPress('Meta+c')` でコピー操作を検知（既に `useKeyPress` がインポート済み）
  - `useKeyPress('Control+v')` と `useKeyPress('Meta+v')` でペースト操作を検知
  - `useEffect` でキーボードイベントを監視
  - **テキスト編集モード中は無効化**: `editingTextId !== null` の場合、キーボードショートカットを無視
  - コピー時:
    - `selectedItem` が `null` または `kind === 'entity'` または `kind === 'relation'` の場合は何もしない
    - それ以外の場合は `dispatch(actionCopyItem)` を実行
  - ペースト時:
    - `clipboard` が `null` の場合は何もしない
    - ペースト位置を計算:
      - `lastMousePosition` が `null` でない場合: `screenToFlowPosition({ x: lastMousePosition.clientX, y: lastMousePosition.clientY })` でキャンバス座標に変換
      - `lastMousePosition` が `null` の場合: viewport中央を計算 (`x = -viewport.x + (window.innerWidth / 2) / viewport.zoom`, `y = -viewport.y + (window.innerHeight / 2) / viewport.zoom`)
    - `dispatch(actionPasteItem, pastePosition)` を実行
  - `useReactFlow()` から `screenToFlowPosition` を取得
  - `useViewport()` から `viewport` を取得（フォールバック時の中央計算用）
  - 必要な型とActionをインポート:
    - `actionCopyItem`, `actionPasteItem`, `actionUpdateMousePosition` from `'../actions/clipboardActions'`

### ビルドとテストの実行

- [ ] `npm run generate` を実行してビルドエラーがないことを確認
- [ ] `npm run test` を実行してテストがパスすることを確認

---

## 備考

### 実装上の注意点

* **マウス位置の座標系**: `lastMousePosition` にはスクリーン座標（`clientX`, `clientY`）を保存し、ペースト時に `screenToFlowPosition()` でキャンバス座標に変換する
* **キーボードショートカットの無効化条件**: テキスト編集中（`editingTextId !== null`）はブラウザのデフォルトのコピー&ペーストを優先
* **パフォーマンス**: マウスムーブイベントは頻繁に発生するため、`useCallback` でハンドラーをメモ化する。初期実装ではthrottleは不要
* **レイヤー配置**: ペースト時のレイヤー配置は各アイテムのデフォルトルールに従う（テキストは前面、矩形は背面）。`actionAddText` と `actionAddRectangle` が内部で `actionAddLayerItem` を呼び出すため、自動的に処理される
* **連続ペースト**: 同じコピー元から複数回ペーストが可能。各ペースト操作は、その時点のマウスカーソル位置（またはviewport中央）に配置される

### スコープ外の機能

以下は今回のタスクに含まれません:

* 複数選択によるコピー&ペースト
* カット操作（Ctrl+X）
* クリップボード履歴
* ブラウザクリップボードAPIとの連携
* エンティティ・リレーションのコピー

### 参照仕様書

* [コピー&ペースト機能仕様](spec/copy_paste_feature.md)
* [フロントエンド状態管理仕様](spec/frontend_state_management.md)
* [テキスト描画機能仕様](spec/text_drawing_feature.md)
* [矩形描画機能仕様](spec/rectangle_drawing_feature.md)
* [レイヤー管理機能仕様](spec/layer_management.md)
