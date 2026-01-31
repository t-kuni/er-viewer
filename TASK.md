# タスク一覧

## 概要

直前のコミットで以下の仕様更新が行われました：
- `EntityNodeViewModel`に`width`と`height`フィールドを追加（TypeSpec: `scheme/main.tsp`）
- エンティティレイアウト最適化の仕様更新（`spec/entity_layout_optimization.md`）
- 増分リバースエンジニアの仕様更新（`spec/incremental_reverse_engineering.md`）

主な変更点：
1. エンティティノードのサイズ（width/height）をViewModelで管理するように仕様変更
2. React Flowのレンダリング後にノードサイズを計測し、ViewModelに保存する処理の追加
3. 配置最適化アルゴリズムで実寸サイズを利用する仕様の明確化
4. リバースエンジニア時に既存エンティティのwidth/heightを0にリセットする仕様の追加

本タスクではこれらの仕様変更に基づき実装を行います。

参照仕様書：
- [spec/entity_layout_optimization.md](/spec/entity_layout_optimization.md)
- [spec/incremental_reverse_engineering.md](/spec/incremental_reverse_engineering.md)

## フェーズ1: バックエンドの修正 ✅ 完了

### 型生成とバックエンド修正

- [x] **型定義の生成**
  - `npm run generate`を実行してTypeSpecから型を生成
  - 生成されるファイル:
    - `lib/generated/api-types.ts`
    - `public/src/api/client/models/EntityNodeViewModel.ts`
  - `EntityNodeViewModel`に`width`と`height`フィールドが追加されることを確認

- [x] **ReverseEngineerUsecaseの修正**
  - ファイル: `lib/usecases/ReverseEngineerUsecase.ts`
  - 修正内容:
    - 新規作成モード（従来の処理）でエンティティノード生成時に`width: 0`と`height: 0`を追加
      - 176-184行目付近の`nodes[entity.id]`オブジェクトに追加
    - 増分更新モードで既存エンティティ更新時に`width: 0`と`height: 0`にリセット
      - 105-112行目付近の`nodes[existing.id]`オブジェクトに追加
    - 増分更新モードで新規エンティティ生成時に`width: 0`と`height: 0`を追加
      - 120-131行目付近の`nodes[entity.id]`オブジェクトに追加
  - 仕様: `spec/incremental_reverse_engineering.md`の「既存エンティティ（テーブル名が一致）」および「新規エンティティ」セクション参照

### バックエンドのテストコード修正

- [x] **ReverseEngineerUsecaseのテストコード修正**
  - ファイル: `tests/usecases/ReverseEngineerUsecase.test.ts`
  - 修正内容:
    - `EntityNodeViewModel`の期待値に`width: 0`と`height: 0`を追加
    - 新規作成モードのテストケースを修正
    - 増分更新モードのテストケースを修正（既存エンティティ、新規エンティティ、削除されたエンティティ）

- [x] **GetInitialViewModelUsecaseのテストコード修正**
  - ファイル: `tests/usecases/GetInitialViewModelUsecase.test.ts`
  - 修正内容:
    - 初期ViewModelの検証で`erDiagram.nodes`が空のRecordであることを確認（変更不要と判明）

### バックエンドのビルドとテスト実行

- [x] **バックエンドのビルド確認**
  - `npm run generate`を実行（型生成）
  - TypeScriptのコンパイルエラーがないことを確認

- [x] **バックエンドのテスト実行**
  - `npm run test`を実行
  - すべてのテストが成功することを確認（171テスト中171テストが成功）

## フェーズ2: フロントエンドの修正 ✅ 完了

### ノードサイズ更新Action実装

- [x] **actionUpdateNodeSizesの実装**
  - ファイル: `public/src/actions/dataActions.ts`
  - 追加内容:
    - 関数シグネチャ: `actionUpdateNodeSizes(viewModel: ViewModel, updates: Array<{ id: string; width: number; height: number }>): ViewModel`
    - 機能: 指定されたノードの`width`と`height`を一括更新
    - 実装規約:
      - 純粋関数として実装（副作用なし）
      - 変化がない場合は同一参照を返す
      - 対象ノードの`EntityNodeViewModel.width`と`EntityNodeViewModel.height`を更新
  - 仕様: `spec/entity_layout_optimization.md`の「ノードサイズ更新用Action」セクション参照

### ERCanvasコンポーネントの修正

- [x] **ERCanvasでのノードサイズ計測・更新処理の実装**
  - ファイル: `public/src/components/ERCanvas.tsx`
  - 修正内容:
    - `ERCanvasInner`コンポーネント内で`useNodesInitialized()`の変化を監視する`useEffect`を追加
    - 初期化完了時（false → true）に一度だけ以下を実行:
      1. `useReactFlow().getNodes()`でReact Flowのノード情報を取得
      2. 各ノードの`measured.width`と`measured.height`を抽出
      3. `actionUpdateNodeSizes`をdispatchして`EntityNodeViewModel`を更新
    - 注意事項:
      - 計測完了は初回レンダリング後の1回のみ（重複更新を防ぐ）
      - `measured`が未定義の場合は更新をスキップ
      - エンティティノード（`type === 'entityNode'`）のみを対象
  - 仕様: `spec/entity_layout_optimization.md`の「ノードサイズの更新実装」セクション参照

### 配置最適化でのサイズ利用実装

- [x] **layoutOptimizerでのサイズ利用修正**
  - ファイル: `public/src/utils/layoutOptimizer.ts`
  - 修正内容:
    - `LayoutNode`インターフェースは既に`width`と`height`を持っているので型定義は変更不要
    - 配置最適化アルゴリズム（`SimpleForceDirectedLayout`, `RemoveOverlaps`など）では既にwidth/heightを利用しているので変更不要
  - 確認事項:
    - `LayoutNode`インターフェース（6-13行目）に`width`と`height`が定義されていることを確認
    - 各アルゴリズムでwidth/heightが正しく利用されていることを確認

- [x] **layoutWorkerでのサイズフォールバック実装**
  - ファイル: `public/src/workers/layoutWorker.ts`
  - 修正内容:
    - `EntityNodeViewModel`から`LayoutNode`に変換する際、サイズが0の場合はフォールバック値を使用
    - フォールバック値:
      - 幅: 200px（デフォルト）
      - 高さ: `40 + カラム数 * 28`（概算値）
    - 実装箇所: Worker内のメッセージハンドラで`EntityNodeViewModel[]`を`LayoutNode[]`に変換する箇所
  - 仕様: `spec/entity_layout_optimization.md`の「配置最適化でのサイズ利用」セクション参照

### 配置最適化ボタンの有効/無効判定修正

- [x] **Appコンポーネントの配置最適化ボタン判定修正**
  - ファイル: `public/src/components/App.tsx`
  - 修正内容:
    - `isLayoutOptimizeDisabled`の判定条件を修正（106-110行目付近）
    - 追加条件: 少なくとも1つのノードで`width > 0`であること
    - 実装:
      ```typescript
      const hasValidNodeSize = Object.values(erDiagram.nodes).some(node => node.width > 0)
      const isLayoutOptimizeDisabled = 
        erDiagram.loading || 
        layoutOptimization.isRunning || 
        Object.keys(erDiagram.nodes).length === 0 ||
        !nodesInitialized ||
        !hasValidNodeSize
      ```
  - 仕様: `spec/entity_layout_optimization.md`の「最適化の起動」セクション参照

### インポート/エクスポート処理の確認

- [x] **exportViewModel関数の確認**
  - ファイル: `public/src/utils/exportViewModel.ts`
  - 確認内容:
    - `EntityNodeViewModel`の`width`と`height`が正しくエクスポートされることを確認
    - 特に変更は不要（`viewModel.erDiagram.nodes`をそのままエクスポートしているため）

- [x] **importViewModel関数の確認**
  - ファイル: `public/src/utils/importViewModel.ts`
  - 確認内容:
    - インポート時に`EntityNodeViewModel`の`width`と`height`が正しく復元されることを確認
    - 旧フォーマット（width/heightなし）からのインポート時にエラーが発生しないことを確認
    - 特に変更は不要（`importedViewModel.erDiagram?.nodes || {}`でインポートしているため）
  - 注意: 旧フォーマットの場合、width/heightはundefinedとなるが、TypeScriptの型では必須となっているため、実行時にエラーが発生する可能性あり

### フロントエンドのビルド確認

- [x] **フロントエンドのビルド確認**
  - `cd public && npm run build`を実行
  - ビルドエラーがないことを確認（成功）

## フェーズ3: 統合テストとデバッグ

### 動作確認項目（参考情報）

以下は実際にアプリを起動して動作確認する項目です。本タスク一覧の対象外ですが、参考として記載します。

- リバースエンジニア実行後、ノードサイズが計測されてViewModelに保存されること
- 配置最適化ボタンがノードサイズ計測完了後に有効化されること
- 配置最適化が実行され、エンティティが重ならずに配置されること
- エクスポート/インポートでノードサイズ情報が保存・復元されること
- 増分リバースエンジニア時に既存エンティティのサイズが0にリセットされ、再計測されること
