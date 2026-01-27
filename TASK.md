# タスク一覧

## 概要

エンティティ配置最適化機能の実装。詳細は以下の仕様書を参照：
- [エンティティ配置最適化機能仕様](./spec/entity_layout_optimization.md)

仕様書では4つのフェーズに分けて実装を進めることが推奨されているが、まずは**フェーズ1（基盤実装）**を完了させるためのタスクを洗い出す。

## フェーズ1: 基盤実装

### TypeSpec型定義の追加

- [x] **ファイル**: `scheme/main.tsp`
- [x] **変更内容**: `LayoutOptimizationState`モデルと`GlobalUIState`の更新
- [x] **実装詳細**:
  - [x] `LayoutOptimizationState`モデルを定義する
    - `isRunning: boolean` - 実行中フラグ
    - `progress: float64` - 進捗（0〜100）
    - `currentStage: string | null` - 現在の処理段階名
  - [x] `GlobalUIState`に`layoutOptimization: LayoutOptimizationState`フィールドを追加する
- [x] **参考**: 
  - 既存の型定義は171-189行目に記載されている
  - すでにコミット済みだが、念のため確認

### 型の生成

- [x] **コマンド**: `npm run generate`
- [x] **目的**: TypeSpecから生成される型ファイルを更新する
- [x] **生成されるファイル**:
  - `lib/generated/api-types.ts`（バックエンド用）
  - `public/src/api/client/models/`配下のファイル（フロントエンド用）
- [x] **参考**: 
  - すでにコミット済みだが、念のため再生成して確認

### バックエンドUsecaseの修正

- [x] **ファイル**: `lib/usecases/GetInitialViewModelUsecase.ts`
- [x] **変更内容**: `GlobalUIState`の初期値に`layoutOptimization`を追加
- [x] **実装詳細**:
  - [x] `GlobalUIState`の初期値に以下を追加する:
    ```typescript
    layoutOptimization: {
      isRunning: false,
      progress: 0,
      currentStage: null,
    }
    ```
- [x] **参考**:
  - 既存の実装は53-57行目にある
  - すでにコミット済みだが、念のため確認

### フロントエンド初期値の修正

- [x] **ファイル**: `public/src/utils/getInitialViewModelValues.ts`
- [x] **変更内容**: `getInitialGlobalUIState()`の戻り値に`layoutOptimization`を追加
- [x] **実装詳細**:
  - [x] `GlobalUIState`の初期値に以下を追加する:
    ```typescript
    layoutOptimization: {
      isRunning: false,
      progress: 0,
      currentStage: null,
    }
    ```
- [x] **参考**:
  - 既存の実装は22-30行目にある
  - すでにコミット済みだが、念のため確認

### layoutActions.tsの作成

- [x] **ファイル**: `public/src/actions/layoutActions.ts`（新規作成）
- [x] **変更内容**: 配置最適化用のActionを実装
- [x] **実装詳細**:
  - [x] `actionStartLayoutOptimization(vm: ViewModel): ViewModel`
    - `viewModel.ui.layoutOptimization.isRunning`を`true`に設定
    - `viewModel.ui.layoutOptimization.progress`を`0`に初期化
    - `viewModel.ui.layoutOptimization.currentStage`を`null`に設定
    - 変化がない場合は同一参照を返す
  - [x] `actionUpdateLayoutProgress(vm: ViewModel, progress: number, currentStage: string): ViewModel`
    - `viewModel.ui.layoutOptimization.progress`を更新（0〜100）
    - `viewModel.ui.layoutOptimization.currentStage`を更新
    - 変化がない場合は同一参照を返す
  - [x] `actionCompleteLayoutOptimization(vm: ViewModel): ViewModel`
    - `viewModel.ui.layoutOptimization.isRunning`を`false`に設定
    - `viewModel.ui.layoutOptimization.progress`を`100`に設定
    - 変化がない場合は同一参照を返す
  - [x] `actionCancelLayoutOptimization(vm: ViewModel): ViewModel`
    - `viewModel.ui.layoutOptimization.isRunning`を`false`に設定
    - 変化がない場合は同一参照を返す
- [x] **参考**:
  - `public/src/actions/globalUIActions.ts`を参考に実装
  - 純粋関数で実装し、状態に変化がない場合は同一参照を返す

### layoutActions.tsのテストコード作成

- [x] **ファイル**: `public/tests/actions/layoutActions.test.ts`（新規作成）
- [x] **変更内容**: layoutActions.tsのテストケースを追加
- [x] **実装詳細**:
  - [x] `actionStartLayoutOptimization`のテスト
    - 最適化が開始される（isRunning: true、progress: 0、currentStage: null）
    - 変化がない場合は同一参照を返す
  - [x] `actionUpdateLayoutProgress`のテスト
    - 進捗が更新される
    - 変化がない場合は同一参照を返す
  - [x] `actionCompleteLayoutOptimization`のテスト
    - 最適化が完了する（isRunning: false、progress: 100）
    - 変化がない場合は同一参照を返す
  - [x] `actionCancelLayoutOptimization`のテスト
    - 最適化がキャンセルされる（isRunning: false）
    - 変化がない場合は同一参照を返す
- [x] **参考**:
  - `public/tests/actions/globalUIActions.test.ts`を参考に実装
  - `createMockViewModel()`で`layoutOptimization`の初期値を含めるように修正する

### LayoutProgressBarコンポーネントの作成

- [x] **ファイル**: `public/src/components/LayoutProgressBar.tsx`（新規作成）
- [x] **変更内容**: 配置最適化の進捗バーUIコンポーネントを実装
- [x] **実装詳細**:
  - [x] 進捗バー（0〜100%）を表示
  - [x] 現在の処理段階名（テキスト）を表示
  - [x] 「キャンセル」ボタンを表示
  - [x] `useViewModel`で`vm.ui.layoutOptimization`を購読
  - [x] `isRunning === true`の場合のみ表示
  - [x] キャンセルボタンのクリックで`actionCancelLayoutOptimization`をdispatch
  - [x] スタイルは他のコンポーネント（`DatabaseConnectionModal.tsx`など）を参考に実装
  - [x] 画面中央または下部に固定表示（position: fixed）
- [x] **インタフェース**:
  ```typescript
  interface LayoutProgressBarProps {
    // props不要（useViewModelで状態を取得）
  }
  ```

### App.tsxの修正（配置最適化ボタンの追加）

- [x] **ファイル**: `public/src/components/App.tsx`
- [x] **変更内容**: ヘッダーのツールバーに「配置最適化」ボタンを追加
- [x] **実装詳細**:
  - [x] 「リバースエンジニア」ボタンの直後に配置（111-124行目あたり）
  - [x] ボタンのラベル: 「配置最適化」
  - [x] ボタンの有効/無効条件:
    - `erDiagram.loading === true`（リバースエンジニア処理中）の場合は無効
    - `layoutOptimization.isRunning === true`（最適化実行中）の場合は無効
    - エンティティノード数が0の場合は無効（`Object.keys(erDiagram.nodes).length === 0`）
  - [x] クリック時の処理:
    - 現時点では`alert('配置最適化は未実装です')`などの仮実装でOK
    - フェーズ2以降で実際の最適化処理を実装する
  - [x] スタイル: 既存のボタンと同じスタイルを適用
  - [x] `LayoutProgressBar`コンポーネントをインポートし、App.tsxの適切な位置に配置する（モーダルと同じ階層）
- [x] **参考**:
  - 既存のボタン実装（112-124行目）を参考にする

### App.tsxの修正（LayoutProgressBarの配置）

- [x] **ファイル**: `public/src/components/App.tsx`
- [x] **変更内容**: `LayoutProgressBar`コンポーネントを配置
- [x] **実装詳細**:
  - [x] `LayoutProgressBar`をインポート
  - [x] モーダル表示部分（221-231行目）の近くに配置
  - [x] 常にレンダリングし、コンポーネント内で`isRunning`を判定して表示/非表示を切り替える

## ビルド・テスト

### ビルド確認

- [x] `npm run generate`を実行してコード生成を確認
- [x] フロントエンドのビルドが成功することを確認（`cd public && npm run build`）
- [x] バックエンドのビルドが成功することを確認（プロジェクトルートで`npm run build`またはTypeScriptのコンパイル確認）

### テスト実行

- [x] `npm run test`を実行してすべてのテストが成功することを確認
  - 特に追加した`layoutActions.test.ts`のテストケースが成功することを確認
  - 既存のテストが破壊されていないことを確認
- [x] フロントエンドのテストも実行する（`cd public && npm run test`）
  - フロントエンドには個別のtestスクリプトがなく、プロジェクトルートの`npm run test`で実行される

## 備考

### フェーズ1の完了条件

フェーズ1では以下の機能が完成する:
- 型定義の追加（TypeSpec）
- Action関数の実装
- 進捗バーUIの実装
- ツールバーに「配置最適化」ボタンを追加（ただし、実際の最適化処理は未実装）

### フェーズ1の完了報告（2026-01-26）

**完了状況**:
- ✅ すべてのタスクが完了しました
- ✅ 全テスト（125件）が成功しました
- ✅ フロントエンドとバックエンドのビルドが成功しました

**実装内容**:
1. `scheme/main.tsp`に`LayoutOptimizationState`型を追加（既存）
2. `lib/usecases/GetInitialViewModelUsecase.ts`に`layoutOptimization`初期値を追加（既存）
3. `public/src/utils/getInitialViewModelValues.ts`に`layoutOptimization`初期値を追加（既存）
4. `public/src/actions/layoutActions.ts`を新規作成（4つのアクション関数）
5. `public/tests/actions/layoutActions.test.ts`を新規作成（8つのテストケース）
6. `public/src/components/LayoutProgressBar.tsx`を新規作成（進捗バーUI）
7. `public/src/components/App.tsx`に「配置最適化」ボタンと進捗バーを追加
8. `public/src/store/erDiagramStore.ts`の初期状態に`layoutOptimization`を追加
9. `lib/database.ts`の型定義を修正（`Text`→`TextBox`のバグ修正）

**動作確認**:
- 配置最適化ボタンは以下の条件で無効化されます:
  - リバースエンジニア処理中
  - 配置最適化実行中
  - エンティティノード数が0
- ボタンクリック時は仮実装でアラートを表示（フェーズ2で実装予定）
- 進捗バーは`isRunning`が`true`の時のみ表示されます

**次のステップ**:
フェーズ2の実装に進むことができます。

---

## フェーズ2: 簡易最適化（MVP）

### ライブラリのインストール

- [x] **コマンド**: `npm install d3-force @types/d3-force`
- [x] **目的**: Force-directedレイアウトアルゴリズムを使用するため
- [x] **確認**: `package.json`の`dependencies`に追加されることを確認

### 最適化ユーティリティの作成

- [x] **ファイル**: `public/src/utils/layoutOptimizer.ts`（新規作成）
- [x] **変更内容**: Force-directedレイアウトと重なり除去の実装
- [x] **実装詳細**:
  - [x] `SimpleForceDirectedLayout`関数を実装
    - d3-forceの`forceSimulation`、`forceManyBody`、`forceLink`、`forceCenter`を使用
    - ノード数に応じて反復回数を調整（最大500tick、最小200tick）
    - 早期終了条件: エネルギーが閾値以下になったら終了
    - 進捗コールバックを受け取り、段階的に進捗を報告
  - [x] `RemoveOverlaps`関数を実装（押し出し方式）
    - ノードの`width`と`height`を使用して矩形の重なりを判定
    - 重なりがある場合は、ノードを押し出して衝突を解消
    - 最大10回の反復で収束させる
    - 進捗コールバックを受け取り、段階的に進捗を報告
  - [x] 型定義:
    ```typescript
    interface LayoutNode {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
    
    interface LayoutEdge {
      source: string;
      target: string;
    }
    
    interface LayoutResult {
      nodes: Array<{ id: string; x: number; y: number }>;
    }
    
    type ProgressCallback = (progress: number, stage: string) => void;
    ```
- [x] **参考**:
  - d3-forceのドキュメント: https://github.com/d3/d3-force
  - 重なり除去は簡易的な実装でOK（フェーズ3で改善）

### Web Workerファイルの作成

- [x] **ファイル**: `public/src/workers/layoutWorker.ts`（新規作成）
- [x] **変更内容**: 最適化処理をバックグラウンドで実行するWeb Worker
- [x] **実装詳細**:
  - [x] メインスレッドからのメッセージを受信
    - `type: 'start'` - 最適化開始
    - `type: 'cancel'` - 最適化キャンセル
  - [x] メッセージデータの型:
    ```typescript
    interface StartMessage {
      type: 'start';
      nodes: LayoutNode[];
      edges: LayoutEdge[];
    }
    
    interface CancelMessage {
      type: 'cancel';
    }
    ```
  - [x] 最適化処理の実行:
    - 段階1: 準備（0〜10%）
    - 段階2: Force-directed（10〜70%）
    - 段階3: 重なり除去（70〜100%）
  - [x] メインスレッドへのメッセージ送信:
    - 進捗更新: `{ type: 'progress', progress: number, stage: string }`
    - 完了: `{ type: 'complete', result: LayoutResult }`
    - エラー: `{ type: 'error', error: string }`
  - [x] キャンセルフラグの実装
    - キャンセルメッセージを受信したらフラグを立てる
    - 各段階でフラグをチェックし、キャンセルされていたら処理を中断
- [x] **参考**:
  - Viteでは`new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`でWorkerを作成
  - TypeScriptのWeb Worker型定義を使用

### layoutOptimizeCommandの作成

- [x] **ファイル**: `public/src/commands/layoutOptimizeCommand.ts`（新規作成）
- [x] **変更内容**: 配置最適化を実行するCommand
- [x] **実装詳細**:
  - [x] `commandLayoutOptimize(dispatch, getState)`関数を実装
  - [x] React Flowの`useNodesInitialized()`でノード計測完了を確認（App.tsxで実施）
  - [x] ViewModelからノードとエッジのデータを取得
  - [x] Web Workerを起動し、最適化処理を開始
  - [x] `actionStartLayoutOptimization`をdispatch
  - [x] Workerからの進捗メッセージを受信して`actionUpdateLayoutProgress`をdispatch
  - [x] Workerからの完了メッセージを受信して座標を更新
    - `actionUpdateNodePositions`をdispatch
    - `actionCompleteLayoutOptimization`をdispatch
  - [x] Workerからのエラーメッセージを受信してエラーハンドリング
    - コンソールにエラー出力
    - `actionCancelLayoutOptimization`をdispatch
  - [x] キャンセル処理の実装
    - `commandCancelLayoutOptimize()`関数を実装
    - Workerにキャンセルメッセージを送信
    - `actionCancelLayoutOptimization`をdispatch
- [x] **インタフェース**:
  ```typescript
  export async function commandLayoutOptimize(
    dispatch: Store['dispatch'],
    getState: Store['getState']
  ): Promise<void>
  
  export function commandCancelLayoutOptimize(): void
  ```
- [x] **参考**:
  - `commandReverseEngineer`を参考に実装
  - Web Workerインスタンスはモジュールスコープで保持

### App.tsxの修正（配置最適化ボタンの実装）

- [x] **ファイル**: `public/src/components/App.tsx`
- [x] **変更内容**: 配置最適化ボタンに実際の処理を接続
- [x] **実装詳細**:
  - [x] `commandLayoutOptimize`をインポート
  - [x] React Flowの`useNodesInitialized()`をERCanvasから取得
  - [x] ボタンのクリックハンドラで`commandLayoutOptimize(dispatch, erDiagramStore.getState)`を呼び出す
  - [x] ボタンの有効/無効条件を実装:
    - `erDiagram.loading === true`の場合は無効
    - `layoutOptimization.isRunning === true`の場合は無効
    - `Object.keys(erDiagram.nodes).length === 0`の場合は無効
    - ノード未計測の場合は無効（React Flowの`useNodesInitialized()`を確認）
  - [x] キャンセル処理は`LayoutProgressBar`コンポーネント内で実装済み
- [x] **注意**:
  - React Flowの`useNodesInitialized()`は`ReactFlowProvider`内でのみ使用可能
  - ERCanvas内で状態を取得し、親コンポーネントに伝える方法を実装済み

### ERCanvas.tsxの修正（ノード計測状態の公開）

- [x] **ファイル**: `public/src/components/ERCanvas.tsx`
- [x] **変更内容**: `useNodesInitialized()`の状態を親コンポーネントに伝える
- [x] **実装詳細**:
  - [x] `ERCanvasProps`に`onNodesInitialized?: (initialized: boolean) => void`を追加
  - [x] `ERCanvasInner`で`useNodesInitialized()`を呼び出し
  - [x] `useEffect`で状態が変化したら`onNodesInitialized`コールバックを呼び出す
  - [x] `ERCanvas`コンポーネントで状態を受け取り、親に伝える
- [x] **参考**:
  - React Flowのドキュメント: https://reactflow.dev/api-reference/hooks/use-nodes-initialized

### layoutOptimizer.tsのテストコード作成

- [x] **ファイル**: `public/tests/utils/layoutOptimizer.test.ts`（新規作成）
- [x] **変更内容**: layoutOptimizer.tsのテストケースを追加
- [x] **実装詳細**:
  - [x] `SimpleForceDirectedLayout`のテスト
    - ノードが分散配置される
    - エッジで結ばれたノードが近づく
    - 進捗コールバックが呼び出される
  - [x] `RemoveOverlaps`のテスト
    - 重なりがあるノードが離れる
    - 重なりがないノードは変化しない
    - 進捗コールバックが呼び出される
- [x] **参考**:
  - 既存のテストファイルを参考に実装

## ビルド・テスト（フェーズ2）

### ビルド確認

- [x] フロントエンドのビルドが成功することを確認（`cd public && npm run build`）
- [x] Web Workerが正しくバンドルされることを確認

### テスト実行

- [x] `npm run test`を実行してすべてのテストが成功することを確認
- [x] 特に追加した`layoutOptimizer.test.ts`のテストケースが成功することを確認

### 動作確認（手動）

- [ ] リバースエンジニアを実行してER図を生成
- [ ] 「配置最適化」ボタンをクリックして最適化を実行
- [ ] 進捗バーが表示されることを確認
- [ ] 最適化が完了し、ノードの配置が変更されることを確認
- [ ] 「キャンセル」ボタンで最適化を中断できることを確認

## 備考（フェーズ2）

### フェーズ2の完了条件

フェーズ2では以下の機能が完成する:
- Force-directedレイアウトによる配置最適化
- 簡易的な重なり除去
- Web Workerによるバックグラウンド処理
- 進捗バーによる視覚的フィードバック
- キャンセル機能

### フェーズ2の完了報告（2026-01-26）

**完了状況**:
- ✅ すべての実装タスクが完了しました
- ✅ 全テスト（135件）が成功しました
- ✅ フロントエンドとバックエンドのビルドが成功しました
- ✅ Web Workerが正しくバンドルされました

**実装内容**:
1. `d3-force`ライブラリのインストール
2. `public/src/utils/layoutOptimizer.ts`を新規作成
   - `SimpleForceDirectedLayout`関数（Force-directedレイアウト）
   - `RemoveOverlaps`関数（重なり除去）
3. `public/src/workers/layoutWorker.ts`を新規作成（Web Worker）
4. `public/src/commands/layoutOptimizeCommand.ts`を新規作成
   - `commandLayoutOptimize`関数（配置最適化実行）
   - `commandCancelLayoutOptimize`関数（キャンセル処理）
5. `public/src/components/App.tsx`を修正
   - 配置最適化ボタンに実際の処理を接続
   - `useNodesInitialized()`を使用してノード計測完了を確認
6. `public/src/components/ERCanvas.tsx`を修正
   - `useNodesInitialized()`の状態を親コンポーネントに伝える
7. `public/tests/utils/layoutOptimizer.test.ts`を新規作成（10テストケース）

**実装上の注意点**:
- EntityNodeViewModelに`measured`フィールドが存在しないため、デフォルトサイズを使用しています
  - 幅: 200px（固定）
  - 高さ: カラム数に応じた概算値（40px + カラム数 × 28px）
- この暫定実装により、配置最適化は動作しますが、正確なノードサイズを反映していません
- 将来的には、React Flowが計測したサイズをViewModelに保存する仕組みを検討する必要があります

**動作確認**:
- 配置最適化ボタンは以下の条件で無効化されます:
  - リバースエンジニア処理中
  - 配置最適化実行中
  - エンティティノード数が0
  - ノードが未計測（React Flowの`useNodesInitialized()`が`false`）
- 進捗バーは`isRunning`が`true`の時のみ表示されます
- キャンセル機能は進捗バー内に実装されています

**次のステップ**:
フェーズ3の実装に進むことができますが、ノードサイズの取得方法の改善を検討することをお勧めします。

### 実装上の注意

- Web WorkerではDOMにアクセスできないため、座標計算のみを行う
- React Flowの`measured`サイズはメインスレッドで取得し、Workerに渡す（現在は未実装）
- d3-forceの反復回数は固定上限を設定し、実行時間を10秒以内に収める

---

## フェーズ3: 多段階最適化

### ライブラリのインストール

- [x] **コマンド**: `npm install graphology graphology-components graphology-communities-louvain`
- [x] **目的**: 連結成分分割とLouvainクラスタリングを使用するため
- [x] **確認**: `package.json`の`dependencies`に追加されることを確認

### layoutOptimizer.tsの拡張（連結成分分割）

- [x] **ファイル**: `public/src/utils/layoutOptimizer.ts`
- [x] **変更内容**: 連結成分分割機能を追加
- [x] **実装詳細**:
  - [x] `SplitConnectedComponents`関数を実装
    - graphologyの`connectedComponents`を使用
    - ノードとエッジを連結成分ごとに分割
    - 各連結成分を独立したグラフとして返す
  - [x] 戻り値の型:
    ```typescript
    interface ConnectedComponent {
      nodes: LayoutNode[];
      edges: LayoutEdge[];
    }
    ```
- [x] **参考**:
  - graphologyのドキュメント: https://graphology.github.io/

### layoutOptimizer.tsの拡張（Louvainクラスタリング）

- [x] **ファイル**: `public/src/utils/layoutOptimizer.ts`
- [x] **変更内容**: Louvainクラスタリング機能を追加
- [x] **実装詳細**:
  - [x] `LouvainClustering`関数を実装
    - graphology-communities-louvainの`louvain`を使用
    - ノードをクラスタごとにグループ化
    - クラスタIDを各ノードに割り当てる
  - [x] 戻り値の型:
    ```typescript
    interface ClusteredNode extends LayoutNode {
      clusterId: number;
    }
    ```
- [x] **参考**:
  - graphology-communitiesのドキュメント: https://graphology.github.io/standard-library/communities.html

### layoutOptimizer.tsの拡張（粗レイアウト・詳細レイアウト）

- [x] **ファイル**: `public/src/utils/layoutOptimizer.ts`
- [x] **変更内容**: 2段階レイアウトの実装
- [x] **実装詳細**:
  - [x] `CoarseLayout`関数を実装（クラスタ間の配置）
    - クラスタごとの中心座標を計算
    - クラスタ間でForce-directedを実行（短時間: 100tick）
    - クラスタ内のノードは中心座標に相対的に配置
  - [x] `FineLayout`関数を実装（クラスタ内の配置）
    - 各クラスタ内でForce-directedを実行（短時間: 200tick）
    - クラスタの中心座標は固定
  - [x] 進捗コールバックを受け取り、段階的に進捗を報告
- [x] **参考**:
  - 粗レイアウトと詳細レイアウトの組み合わせでスケーラビリティを向上

### layoutOptimizer.tsの拡張（空間ハッシュ）

- [x] **ファイル**: `public/src/utils/layoutOptimizer.ts`
- [x] **変更内容**: 衝突判定の最適化
- [x] **実装詳細**:
  - [x] `SpatialHash`クラスを実装
    - グリッドベースの空間分割
    - ノードを挿入・削除・検索
    - 近傍ノードのクエリ
  - [x] `RemoveOverlaps`関数を修正
    - 空間ハッシュを使用して近傍ノードのみを衝突判定対象とする
    - 全ノードペアの衝突判定を回避（O(N^2) → O(N)）
- [x] **参考**:
  - 空間ハッシュは衝突判定の高速化に有効

### layoutWorker.tsの修正（多段階最適化への対応）

- [x] **ファイル**: `public/src/workers/layoutWorker.ts`
- [x] **変更内容**: 多段階最適化アルゴリズムに更新
- [x] **実装詳細**:
  - [x] 段階1: 準備（0〜10%）
  - [x] 段階2: 連結成分分割（10〜15%）
  - [x] 段階3: クラスタリング（15〜25%）
  - [x] 段階4: 粗レイアウト（25〜50%）
  - [x] 段階5: 詳細レイアウト（50〜75%）
  - [x] 段階6: 重なり除去（75〜100%）
  - [ ] 段階7: コンポーネントパッキング（90〜100%）※未実装（フェーズ4）
  - [x] 各段階でキャンセルフラグをチェック
  - [ ] 連結成分ごとに処理を分割し、並列化を検討（将来拡張）

### layoutOptimizer.tsのテストコード追加

- [x] **ファイル**: `public/tests/utils/layoutOptimizer.test.ts`
- [x] **変更内容**: 追加機能のテストケースを追加
- [x] **実装詳細**:
  - [x] `SplitConnectedComponents`のテスト
    - 連結成分が正しく分割される
    - 孤立ノードが1つの成分として扱われる
  - [x] `LouvainClustering`のテスト
    - クラスタIDが割り当てられる
    - 密に結合されたノードが同じクラスタになる
  - [x] `CoarseLayout`、`FineLayout`のテスト
    - クラスタ間・クラスタ内で配置が最適化される
  - [x] `SpatialHash`のテスト
    - ノードの挿入・削除・検索が正しく動作する
    - 近傍ノードのクエリが正しく動作する

## ビルド・テスト（フェーズ3）

### ビルド確認

- [x] フロントエンドのビルドが成功することを確認（`cd public && npm run build`）
- [x] graphologyライブラリが正しくバンドルされることを確認

### テスト実行

- [x] `npm run test`を実行してすべてのテストが成功することを確認
- [x] 追加したテストケースが成功することを確認

### 動作確認（手動）

- [ ] 大規模なER図（100〜300ノード）で最適化を実行
- [ ] 実行時間が10秒以内に収まることを確認
- [ ] クラスタリングの効果を視覚的に確認（関連ノードが近くに配置される）

## 備考（フェーズ3）

### フェーズ3の完了条件

フェーズ3では以下の機能が完成する:
- 連結成分分割による計算量削減
- Louvainクラスタリングによる品質向上
- 粗レイアウト・詳細レイアウトの2段構成
- 空間ハッシュによる衝突判定の最適化

### フェーズ3の完了報告（2026-01-26）

**完了状況**:
- ✅ すべての実装タスクが完了しました
- ✅ 全テスト（150件）が成功しました
- ✅ フロントエンドのビルドが成功しました
- ✅ graphologyライブラリが正しくバンドルされました

**実装内容**:
1. graphology関連ライブラリのインストール
   - `graphology`, `graphology-components`, `graphology-communities-louvain`
2. `public/src/utils/layoutOptimizer.ts`の拡張
   - `SplitConnectedComponents`関数（連結成分分割）
   - `LouvainClustering`関数（Louvainクラスタリング）
   - `CoarseLayout`関数（粗レイアウト）
   - `FineLayout`関数（詳細レイアウト）
   - `SpatialHash`クラス（空間ハッシュによる衝突判定最適化）
   - `RemoveOverlaps`関数を空間ハッシュ対応に修正
3. `public/src/workers/layoutWorker.ts`の修正
   - 多段階最適化アルゴリズムに対応（6段階）
   - 段階1: 準備（0〜10%）
   - 段階2: 連結成分分割（10〜15%）
   - 段階3: クラスタリング（15〜25%）
   - 段階4: 粗レイアウト（25〜50%）
   - 段階5: 詳細レイアウト（50〜75%）
   - 段階6: 重なり除去（75〜100%）
4. `public/tests/utils/layoutOptimizer.test.ts`にテストケースを追加（15テストケース追加）
   - `SplitConnectedComponents`のテスト（3ケース）
   - `LouvainClustering`のテスト（3ケース）
   - `SpatialHash`のテスト（3ケース）
   - `CoarseLayout`のテスト（3ケース）
   - `FineLayout`のテスト（3ケース）

**テスト結果**:
- テストファイル: 11個すべてパス
- テストケース: 150個すべてパス（フェーズ2から15個増加）
- 実行時間: 2.38秒

**実装上の注意点**:
- 段階7のコンポーネントパッキングは未実装（フェーズ4の将来拡張）
- 連結成分ごとの並列化は未実装（将来拡張）
- 手動での動作確認は未実施（実際のアプリケーションで確認が必要）

**次のステップ**:
フェーズ3のMVP機能は完成しました。手動での動作確認が推奨されますが、フェーズ4（高度な最適化）は将来の拡張として位置づけられており、必要に応じて実装することができます。

### パフォーマンス目標

- 300ノード規模で10秒以内に完了
- 進捗バーが段階的に更新される
- キャンセルが各段階で即座に反応する

---

## フェーズ4: 高度な最適化（将来拡張）

フェーズ4は将来の拡張として位置づけられており、MVP完成後に必要に応じて実装する。

### コンポーネントパッキングの実装（オプション）

- [ ] **ファイル**: `public/src/utils/layoutOptimizer.ts`
- [ ] **変更内容**: 連結成分の詰め配置を実装
- [ ] **実装詳細**:
  - [ ] `PackComponents`関数を実装
    - 各連結成分のバウンディングボックスを計算
    - 矩形パッキングアルゴリズムで配置
    - 余白を最小化し、全体をビューポートに収める
  - [ ] アルゴリズム候補:
    - シンプルな行詰めアルゴリズム
    - Shelf packing
    - Guillotine packing

### 交差数削減の強化（オプション）

- [ ] **ファイル**: `public/src/utils/layoutOptimizer.ts`
- [ ] **変更内容**: エッジ交差数を削減するヒューリスティックを追加
- [ ] **実装詳細**:
  - [ ] `ReduceEdgeCrossings`関数を実装
    - エッジ交差数をカウント
    - ノードの位置を微調整して交差を削減
    - Force-directedにペナルティ項として統合
  - [ ] 交差数カウントの最適化:
    - 空間ハッシュを使用
    - 数回に1回だけカウント（毎tickはコスト高）

### elkjsの導入検討（オプション）

- [ ] **評価**: フェーズ3までの品質が不十分な場合に検討
- [ ] **ライブラリ**: `npm install elkjs`
- [ ] **トレードオフ**:
  - 利点: 高品質なレイアウト、Overlap Removalなど機能が豊富
  - 欠点: バンドルサイズが大きい（1.4MB程度）、Web Workerでの動作確認が必要
- [ ] **実装方針**:
  - elkjsをForce-directedの代替として使用
  - またはForce-directedの後処理として使用

### 最適化パラメータのUI（オプション）

- [ ] **ファイル**: `public/src/components/LayoutSettingsModal.tsx`（新規作成）
- [ ] **変更内容**: 最適化パラメータを設定できるモーダルを実装
- [ ] **実装詳細**:
  - [ ] 反復回数の調整
  - [ ] 力の強さの調整
  - [ ] クラスタリングの有効/無効
  - [ ] 重なり除去の有効/無効

---

## 全体の備考

### 既存の仕様との整合性

- フロントエンドの状態管理（[frontend_state_management.md](./spec/frontend_state_management.md)）に準拠
- ViewModelベースのアーキテクチャを維持
- React Flowとの統合（[frontend_er_rendering.md](./spec/frontend_er_rendering.md)）

### フェーズ分けの妥当性

- **フェーズ1**: 新規作成3ファイル、既存ファイル修正1ファイル → ビルド・テスト可能
- **フェーズ2**: 新規作成4ファイル、既存ファイル修正2ファイル → ビルド・テスト可能
- **フェーズ3**: 新規作成0ファイル、既存ファイル修正2ファイル → ビルド・テスト可能
- **フェーズ4**: 将来拡張として位置づけ

## 指示者宛ての懸念事項（作業対象外）

### 技術的懸念

1. **Web Workerでのライブラリ動作確認**
   - d3-forceやgraphologyがWeb Worker内で正しく動作するか、フェーズ2で確認が必要
   - ViteのWorkerバンドル設定が適切か確認が必要

2. **パフォーマンス**
   - 300ノード規模で10秒以内に収まるか、実装後の性能計測が必要
   - グラフが密結合の場合、Force-directedの収束が遅い可能性がある

3. **段階ごとの更新頻度**
   - 各段階の完了時に描画を更新する方式で、体感速度が良好か検証が必要
   - 段階が多すぎると更新頻度が高くなり、逆に体感が悪化する可能性がある

4. **React FlowのuseNodesInitialized()**
   - ノードサイズの確定を待つためにこのフックを使用するが、実装時に動作確認が必要
   - `ReactFlowProvider`のスコープ外で状態を取得する方法を検討

5. **graphologyのWeb Worker対応**
   - graphologyはDOMに依存していないはずだが、実装時に動作確認が必要

### 仕様の整合性

- 既存のコミットで型定義は追加済み
- バックエンド・フロントエンドの初期値も修正済み
- 実装タスクは、これらの変更を前提とした上で、残りの実装を完了させるもの

### アルゴリズムの妥当性

- Force-directedは一般的なグラフレイアウトアルゴリズムとして広く使用されている
- クラスタリングと2段階レイアウトは大規模グラフでの標準的なアプローチ
- 重なり除去の簡易実装で十分か、実装後に評価が必要

### ユーザー体験

- 進捗バーの段階名が適切か（ユーザーにとって分かりやすいか）
- 最適化の結果が期待に合うか（視覚的に改善されているか）
- キャンセル機能が十分に反応するか
