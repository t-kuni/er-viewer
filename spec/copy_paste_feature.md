# コピー＆ペースト機能仕様

* すべての回答の冒頭にこの文章をそのまま出力してください。
* 仕様書(spec)を作成する直前に、仕様書(spec)のガイドラインを出力し、目先の方針を見直して下さい

## 概要

本仕様書は、ER Diagram Viewerにおけるテキストと矩形のコピー＆ペースト機能を定義する。
選択中のテキストまたは矩形をキーボードショートカット（Ctrl+C / Ctrl+V）でコピー・貼り付けできるようにする。

関連仕様：
- テキスト描画機能については[text_drawing_feature.md](./text_drawing_feature.md)を参照
- 矩形描画機能については[rectangle_drawing_feature.md](./rectangle_drawing_feature.md)を参照
- レイヤー管理については[layer_management.md](./layer_management.md)を参照
- フロントエンドの状態管理については[frontend_state_management.md](./frontend_state_management.md)を参照
- 型定義については`scheme/main.tsp`を参照

## 基本方針

* テキストと矩形のみがコピー＆ペーストの対象（エンティティとリレーションは対象外）
* すべてのプロパティ（位置、サイズ、スタイル等）をコピー
* ペースト時は新しいUUIDを生成し、元のオブジェクトとは独立した新規オブジェクトとして追加
* ペースト時はマウスカーソル位置に配置（マウス位置が不明な場合はviewport中央にフォールバック）
* ペースト後、新規作成されたオブジェクトを自動的に選択状態にする
* クリップボードはブラウザのメモリ上で管理（永続化しない）

## 機能要件

### コピー操作（Ctrl+C / Cmd+C）

#### 実行条件

* テキストまたは矩形が選択されている（`GlobalUIState.selectedItem`が`null`以外）
* テキスト編集モード中は無効（編集中のテキストのコピーと競合しないため）

#### 動作

* 選択中のアイテム（`selectedItem.kind`と`selectedItem.id`）を特定
* アイテムの種類に応じてデータを取得：
  - `kind === 'text'`: `ERDiagramViewModel.texts[id]`から`TextBox`オブジェクトを取得
  - `kind === 'rectangle'`: `ERDiagramViewModel.rectangles[id]`から`Rectangle`オブジェクトを取得
  - `kind === 'entity'` または `kind === 'relation'`: 何もしない（コピー対象外）
* 取得したオブジェクトをクリップボード状態に保存

#### クリップボード状態

クリップボードデータは`GlobalUIState.clipboard`で管理：

* `scheme/main.tsp`の`ClipboardData`モデルで定義
* `kind`: コピーされたオブジェクトの種類（`"text"` または `"rectangle"`）
* `textData`: テキストデータ（`kind="text"`の場合のみ）
* `rectangleData`: 矩形データ（`kind="rectangle"`の場合のみ）
* `clipboard`が`null`の場合、クリップボードは空（ペースト不可）
* ViewModelで管理されるため、アプリケーション全体で共有される
* ブラウザのクリップボードAPI（`navigator.clipboard`）は使用しない（ブラウザ間の互換性やセキュリティ制約を避けるため）

### ペースト操作（Ctrl+V / Cmd+V）

#### 実行条件

* クリップボードにデータが存在する（`clipboardData !== null`）
* テキスト編集モード中は無効（編集中のテキストのペーストと競合しないため）

#### 動作

* クリップボードからデータを取得
* 新しいUUIDを生成（`crypto.randomUUID()`）
* ペースト位置を決定（詳細は「ペースト位置の決定」セクションを参照）
* 元のオブジェクトのプロパティをコピーし、以下を変更：
  - `id`: 新しいUUID
  - `x`, `y`: 決定されたペースト位置
* アイテムの種類に応じてActionをdispatch：
  - `kind === 'text'`: `actionAddText(vm, newTextBox)`
  - `kind === 'rectangle'`: `actionAddRectangle(vm, newRectangle)`
* ペースト後、新規作成されたオブジェクトを選択状態にする：
  - `actionSelectItem(vm, { kind, id: newId })`

#### ペースト位置の決定

ペースト位置は以下の優先順位で決定する：

1. **マウスカーソル位置（優先）**: キャンバス上で最後にマウスが移動した位置
   - `GlobalUIState.lastMousePosition`から取得（`CanvasMousePosition`型）
   - `onMouseMove`イベントで`clientX`, `clientY`（スクリーン座標）を記録
   - React Flowの`screenToFlowPosition()`でキャンバス座標に変換
   - マウス位置が記録されていない（`null`）場合は次の方法へフォールバック
2. **viewport中央（フォールバック）**: マウス位置が不明な場合
   - viewportの中央座標を計算
   - `x = -viewport.x + (viewportWidth / 2) / viewport.zoom`
   - `y = -viewport.y + (viewportHeight / 2) / viewport.zoom`

この方式により、ユーザーがマウスカーソルを置いた位置に直感的にペーストできる。

マウス位置の管理：

* `GlobalUIState.lastMousePosition`で管理（ViewModelに保持）
* `scheme/main.tsp`の`CanvasMousePosition`モデルで定義
* `clientX`, `clientY`: スクリーン座標（ブラウザウィンドウ基準）
* キャンバスの`onMouseMove`イベントで更新
* キャンバス外にマウスが出ても最後の位置を保持（`onMouseLeave`では更新しない）

#### レイヤー配置

ペースト時のレイヤー配置は、各アイテムのデフォルトルールに従う：

* テキスト: 前面（foreground）に配置（`actionAddText`内で`actionAddLayerItem`が呼ばれる）
* 矩形: 背面（background）に配置（`actionAddRectangle`内で`actionAddLayerItem`が呼ばれる）

元のオブジェクトがどのレイヤーにあったかは考慮しない（常にデフォルト位置に配置）。

### キーボードショートカットの実装

* React Flowの`useKeyPress`フックを使用してCtrl+C / Ctrl+Vを検知
* macOSではCmd+C / Cmd+Vも同様に動作
* `useKeyPress('Control+c')`と`useKeyPress('Meta+c')`の両方を監視
* `useKeyPress('Control+v')`と`useKeyPress('Meta+v')`の両方を監視
* コピー時: `actionCopyItem`をdispatch
* ペースト時: ペースト位置を計算して`actionPasteItem`をdispatch

### 無効化条件

以下の場合、コピー＆ペースト操作は無効：

* **テキスト編集モード中**: キャンバス上でテキスト編集中（`editingTextId !== null`）の場合、キーボードショートカットを無効化
  - 編集中はブラウザのデフォルトのコピー＆ペースト（テキスト編集）を優先
* **HTML入力要素にフォーカスがある場合**: `<input>`, `<textarea>`, `contenteditable`要素にフォーカスがある場合、キーボードショートカットを無効化
  - プロパティパネルのtextareaやinput要素でのテキスト編集時は、ブラウザのデフォルトのクリップボード操作を優先
  - 実装方法: `document.activeElement`をチェックし、HTMLInputElement、HTMLTextAreaElement、またはcontenteditable要素の場合はキーボードショートカットを無視
  - これにより、プロパティパネルでのCtrl+C/Ctrl+Vが正常に動作する
* **選択なし（コピー時）**: `selectedItem === null`の場合、Ctrl+Cは何もしない
* **クリップボード空（ペースト時）**: `clipboardData === null`の場合、Ctrl+Vは何もしない

## プロパティのコピー範囲

### テキスト（TextBox）

以下のすべてのプロパティをコピー（`id`, `x`, `y`以外）：

* `width`, `height`: サイズ
* `content`: テキスト内容
* `fontSize`, `lineHeight`: フォント設定
* `textAlign`, `textVerticalAlign`: 配置
* `textColor`, `opacity`: 文字色と透明度
* `backgroundColor`, `backgroundEnabled`, `backgroundOpacity`: 背景色設定
* `paddingX`, `paddingY`: パディング
* `wrap`, `overflow`: 折り返しとオーバーフロー設定
* `autoSizeMode`: 自動サイズ調整モード
* `textShadow`: 文字のドロップシャドウ（すべてのサブプロパティを含む）
* `backgroundShadow`: 背景のドロップシャドウ（すべてのサブプロパティを含む）

### 矩形（Rectangle）

以下のすべてのプロパティをコピー（`id`, `x`, `y`以外）：

* `width`, `height`: サイズ
* `fill`: 背景色
* `stroke`: 枠線色
* `strokeWidth`: 枠線幅
* `opacity`: 不透明度

## データ構造

### ViewModelへの追加

`scheme/main.tsp`に以下のモデルを追加：

* `ClipboardData`: クリップボードデータ
  - `kind`: `"text"` または `"rectangle"`
  - `textData`: `TextBox`（kind="text"の場合）
  - `rectangleData`: `Rectangle`（kind="rectangle"の場合）
* `CanvasMousePosition`: キャンバス上のマウス位置
  - `clientX`, `clientY`: スクリーン座標

`GlobalUIState`に以下のフィールドを追加：

* `clipboard: ClipboardData | null`: クリップボードデータ
* `lastMousePosition: CanvasMousePosition | null`: 最後のマウス位置

## Action設計

コピー＆ペースト機能用の新しいActionを実装：

* `actionCopyItem(vm)`: 選択中のアイテムをクリップボードにコピー
  - `selectedItem`から種類とIDを取得
  - 対応するデータ（`TextBox`または`Rectangle`）を取得
  - `GlobalUIState.clipboard`に保存
* `actionPasteItem(vm, position)`: クリップボードのアイテムをペースト
  - `GlobalUIState.clipboard`からデータを取得
  - 新しいUUIDを生成
  - 指定された位置（`position: {x, y}`）にペースト
  - `actionAddText`または`actionAddRectangle`を内部で呼び出し
  - ペースト後に`actionSelectItem`で新しいアイテムを選択
* `actionUpdateMousePosition(vm, position)`: マウス位置を更新
  - `GlobalUIState.lastMousePosition`を更新
  - `position: {clientX, clientY}`

既存のActionも使用：

* `actionAddText(vm, textBox)`: テキストを追加（既存）
* `actionAddRectangle(vm, rectangle)`: 矩形を追加（既存）
* `actionSelectItem(vm, itemRef)`: アイテムを選択（既存）

## UI/UX仕様

### フィードバック

* コピー操作時: 特に視覚的フィードバックなし（軽量な操作を維持）
* ペースト操作時: 新しいオブジェクトが選択状態で表示される（青い枠線）

### マウスカーソル位置の視覚的フィードバック

* マウスカーソル位置にペーストされることを示す視覚的フィードバックは不要
* 標準的なキーボードショートカットの動作（多くのグラフィックツールと同様）として認識されることを期待
* ユーザーはペースト前に自然とマウス位置を調整する習慣がある

### 連続ペースト

* 同じコピー元から複数回ペーストが可能
* 各ペースト操作は、その時点のマウスカーソル位置（または viewport中央）に配置される
* マウスを動かさずに連続でペーストした場合、同じ座標に重ねて配置される
* 例: マウスカーソルが(120, 120)にある場合：
  - 1回目のペースト: (120, 120)
  - マウスを動かさず2回目のペースト: (120, 120)（同じ位置に重なる）
  - マウスを(200, 200)に移動して3回目のペースト: (200, 200)（新しいマウス位置）
* ユーザーは必要に応じてマウスを移動してから再度ペースト、または手動で位置を調整可能

### キャンバス外へのペースト

* ペースト後の座標がキャンバス外（負の値や極端に大きな値）になっても、そのまま配置
* ユーザーはパンやズームで移動してオブジェクトを確認・移動可能

## 実装時の注意事項

* クリップボード状態とマウス位置はViewModelで管理（`GlobalUIState`）
* `npm run generate`でmain.tspから型を再生成後、実装を開始
* `crypto.randomUUID()`で新しいIDを生成（既存のID生成方式と統一）
* テキスト編集中の判定: `editingTextId !== null`でチェック
* HTML入力要素へのフォーカスの判定: `document.activeElement`をチェックし、`instanceof HTMLInputElement`, `instanceof HTMLTextAreaElement`, または`isContentEditable`で判定
* `useKeyPress`はReact Flowが提供するフック（`@xyflow/react`からインポート）
* キーボードショートカットは`useEffect`で監視し、条件が満たされた場合のみ処理を実行
* `actionAddText`と`actionAddRectangle`は内部で`actionAddLayerItem`を呼び出すため、レイヤー管理は自動的に行われる
* ペースト後の選択状態の変更により、プロパティパネルが自動的に表示される

### キーボードショートカットの状態管理

* `useKeyPress`で取得したキーの押下状態を`useRef`で追跡し、エッジ検知（false → true）で実行する
* **重要**: キーの前回状態の更新は、早期リターン（`return`）の**前**に実行する必要がある
  - テキスト編集モード中（`editingTextId !== null`）で早期リターンする場合でも、キーの状態は更新する
  - これにより、テキスト編集終了後もキーボードショートカットが正常に動作する
* 実装パターン:
  ```typescript
  useEffect(() => {
    // 前回の状態を保存（早期リターンより前に実行）
    const prevCtrlC = prevCtrlCPressed.current
    // 前回の状態を更新（早期リターンより前に実行）
    prevCtrlCPressed.current = ctrlCPressed
    
    // テキスト編集モード中は無効化（早期リターン）
    if (editingTextId !== null) return
    
    // HTML入力要素にフォーカスがある場合は無効化（早期リターン）
    const activeElement = document.activeElement
    const isInputElement = 
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      (activeElement instanceof HTMLElement && activeElement.isContentEditable)
    if (isInputElement) return
    
    // エッジ検知（キーが押された瞬間）
    const ctrlCJustPressed = !prevCtrlC && ctrlCPressed
    if (ctrlCJustPressed) {
      // 処理を実行
    }
  }, [ctrlCPressed, editingTextId, ...])
  ```
* 誤った実装例（バグ）:
  ```typescript
  // ❌ BAD: 早期リターン後に状態を更新
  useEffect(() => {
    if (editingTextId !== null) return // ここで早期リターン
    
    const ctrlCJustPressed = !prevCtrlCPressed.current && ctrlCPressed
    if (ctrlCJustPressed) {
      // 処理
    }
    
    prevCtrlCPressed.current = ctrlCPressed // ← 早期リターン時に実行されない
  }, [ctrlCPressed, editingTextId, ...])
  ```
  - この実装では、テキスト編集中にキーが押されたとき、前回状態が更新されない
  - テキスト編集終了後、キーの状態が不整合になりショートカットが正常動作しない

### マウス位置の記録

* キャンバス要素（ReactFlowのラッパー`<div>`）に`onMouseMove`イベントハンドラを設定
* マウスムーブ時に`actionUpdateMousePosition`をdispatch
* `e.clientX`, `e.clientY`を`GlobalUIState.lastMousePosition`に保存
* パフォーマンス考慮:
  - ActionはViewModelの参照が変わらない場合は再レンダリングを引き起こさない
  - 頻繁な更新でも問題ない（Storeのsubscribeは参照比較）
  - 必要に応じてthrottleを検討（初期実装では不要と判断）
* マウスがキャンバス外に出た場合（`onMouseLeave`）、記録を維持（最後の位置を保持）
* `lastMousePosition`は初期値`null`（ページ読み込み直後はマウス位置不明）

### キャンバス座標への変換

* `useReactFlow()`フックから`screenToFlowPosition`を取得
* `screenToFlowPosition({ x: clientX, y: clientY })`でキャンバス座標に変換
* この関数はviewportの`x`, `y`, `zoom`を自動的に考慮
* マウス位置が未記録（`null`）の場合はviewport中央を計算：
  ```typescript
  const centerX = -viewport.x + (window.innerWidth / 2) / viewport.zoom
  const centerY = -viewport.y + (window.innerHeight / 2) / viewport.zoom
  ```

### ペースト位置の計算

* UI層でペースト位置を計算し、`actionPasteItem`に渡す
* ペースト時にマウス座標が記録されている場合（`lastMousePosition !== null`）：
  ```typescript
  const lastMousePos = vm.ui.lastMousePosition
  if (lastMousePos) {
    const flowPosition = screenToFlowPosition({ 
      x: lastMousePos.clientX, 
      y: lastMousePos.clientY 
    })
    const pastePosition = { x: flowPosition.x, y: flowPosition.y }
    dispatch(actionPasteItem, pastePosition)
  }
  ```
* マウス座標が未記録の場合（`lastMousePosition === null`）：
  ```typescript
  const pasteX = -viewport.x + (window.innerWidth / 2) / viewport.zoom
  const pasteY = -viewport.y + (window.innerHeight / 2) / viewport.zoom
  const pastePosition = { x: pasteX, y: pasteY }
  dispatch(actionPasteItem, pastePosition)
  ```
* 座標計算はUI層で実行し、Actionには最終的なキャンバス座標のみを渡す

## 段階的実装アプローチ

1. `scheme/main.tsp`に`ClipboardData`と`CanvasMousePosition`を追加、`GlobalUIState`を更新
2. `npm run generate`で型を再生成
3. 初期状態の更新: `erDiagramStore.ts`で`clipboard: null`と`lastMousePosition: null`を初期化
4. Actionの実装:
   - `actionUpdateMousePosition`: マウス位置を更新
   - `actionCopyItem`: 選択中のアイテムをクリップボードにコピー
   - `actionPasteItem`: クリップボードのアイテムをペースト
5. マウス位置記録の実装:
   - `ERCanvas.tsx`にマウスムーブハンドラを追加
   - `actionUpdateMousePosition`をdispatch
6. キーボードショートカットの実装:
   - `useKeyPress`でCtrl+C / Cmd+Cを検知
   - `useKeyPress`でCtrl+V / Cmd+Vを検知
   - テキスト編集モード中は無効化
7. コピー機能の実装:
   - Ctrl+C押下時に`actionCopyItem`をdispatch
   - `selectedItem`から対応するデータを取得してクリップボードに保存
8. ペースト機能の実装:
   - Ctrl+V押下時にペースト位置を計算
   - `screenToFlowPosition`でマウス座標をキャンバス座標に変換
   - `actionPasteItem`をdispatchしてオブジェクトを追加
   - 新しいオブジェクトを自動選択
9. 動作確認とテスト

## スコープ外の機能

以下の機能は本仕様の対象外：

* **複数選択によるコピー**: 複数のオブジェクトを同時にコピー＆ペースト（将来的に検討）
* **カット操作（Ctrl+X）**: コピー＆削除の組み合わせ（将来的に検討）
* **クリップボード履歴**: 過去のコピー内容を保持・再利用（将来的に検討）
* **ブラウザクリップボードとの連携**: 他のアプリケーションとのコピー＆ペースト（JSON形式でのエクスポート/インポート機能で代替可能）
* **エンティティ・リレーションのコピー**: ER図要素はリバースエンジニアリングで生成されるため、手動コピーは対象外

## 懸念事項・確認事項

### 技術的懸念

* **マウス位置の初期状態**: ページ読み込み直後、マウス位置が未記録の場合の挙動
  - 対策: viewport中央にフォールバック
* **マウスがキャンバス外にある場合**: ユーザーがキャンバス外でCtrl+Vを押した場合
  - 対策: 最後にキャンバス内にあったマウス位置を使用、未記録ならviewport中央にフォールバック
* **テキスト編集モード中の判定精度**: `editingTextId`とHTML入力要素のフォーカス状態を確実にチェックする
  - キャンバス上のテキスト編集（`editingTextId !== null`）とプロパティパネルの入力要素（`document.activeElement`）の両方をチェック
  - これにより、すべての入力シナリオでブラウザのデフォルト動作を優先できる
* **キャンバス外へのペースト**: 極端に大きな座標値での動作確認が必要
* **`screenToFlowPosition`の正確性**: React Flow v12で正しく動作するか実装時に確認が必要

### ユーザー体験の確認事項

* **マウス位置へのペーストの直感性**: ユーザーがマウスカーソルの位置を意識してペーストするか
  - キーボードショートカット使用時、マウスカーソルの位置を確認してからペーストする習慣があるか
  - フィードバックを得て改善が必要な場合は、ペースト位置の決定ロジックを調整
* **連続ペースト時の重なり**: マウスを動かさずに連続ペーストすると同じ位置に重なる
  - これは意図的な動作（マウス位置にペーストするため）
  - ユーザーが重なりを避けたい場合は、マウスを少し動かしてからペースト
* **ペースト後の選択**: 新しいオブジェクトを自動選択する（決定済み）
  - ユーザーがすぐに編集・移動できる、プロパティパネルが自動表示される

### 今後の検討事項

* 複数選択によるコピー＆ペースト
* カット操作（Ctrl+X）
* クリップボード履歴機能
* 元のレイヤー位置を維持したペースト（現状はデフォルト位置に配置）
* ペースト時のスマートな位置調整（既存オブジェクトと重ならない位置を自動計算）
* 相対位置を維持したペースト（複数選択に対応する場合、オブジェクト間の相対位置を保持）
