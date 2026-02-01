# リバースエンジニアリング履歴機能 実装タスク

## 概要

リバースエンジニアリングの履歴を記録し、UI上で確認できる機能を実装する。

参照仕様書: [リバースエンジニアリング履歴機能仕様](/spec/reverse_engineering_history.md)

## フェーズ1: バックエンド・フロントエンドコア実装

### 概要
- バックエンド: 初期値対応（1ファイル更新 + テスト更新）
- フロントエンド: マージアクション更新、UI状態アクション追加、エクスポート/インポート対応（4ファイル更新 + テスト更新）
- 合計: 約5ファイル更新 + テストファイル更新

### バックエンド

#### 初期値対応

- [ ] `lib/usecases/GetInitialViewModelUsecase.ts` を更新
  - `ERDiagramViewModel` に `history` フィールドを追加（空配列 `[]`）
  - 仕様: [ViewModelベースAPI仕様](/spec/viewmodel_based_api.md) の「GET /api/init」を参照
  - 初期値は `history: []`

- [ ] バックエンドのビルド確認
  - `npm run generate` を実行して型生成
  - `npm run build` を実行してビルド成功を確認

- [ ] バックエンドのテストコード作成
  - `tests/usecases/GetInitialViewModelUsecase.test.ts` を更新
  - `history` フィールドが空配列であることを確認するテストを追加

- [ ] バックエンドのテスト実行
  - `npm run test` を実行してテストが通ることを確認

### フロントエンド - マージアクション更新（差分検出統合）

#### アクション更新

- [ ] `public/src/actions/dataActions.ts` の `actionMergeERData` を更新
  - 初回/増分の判定処理（既に実装済み: `isIncrementalMode`）
  - **増分リバースの場合、マージ処理と並行して差分情報を収集**:
    - テーブルの差分:
      - 追加: `erData.entities` で `existingNodesByName.get(entity.name)` が `undefined` のもの（既に判定済み）
      - 削除: `deletedNodeIds` に含まれるテーブル名（既に計算済み）
    - カラムの差分:
      - マッチしたテーブル（`existingNode` がある場合）について:
        - 既存カラムと新規カラムの名前の集合を比較（Set演算）
        - 追加カラム: 新規にあって既存にないもの
        - 削除カラム: 既存にあって新規にないもの
        - 変更カラム: 両方に存在し、スナップショット（type, nullable, key, default, extra, isForeignKey）が異なるもの
    - リレーションの差分:
      - 既存リレーション（`viewModel.erDiagram.edges`）と新規リレーション（`erData.relationships`）を比較
      - キー生成: `constraintName` または `${fromTable}.${fromColumn}->${toTable}.${toColumn}`
      - 追加リレーション: 新規にあって既存にないもの
      - 削除リレーション: 既存にあって新規にないもの
  - 履歴エントリ（`ReverseEngineeringHistoryEntry`）を作成:
    - `timestamp`: `Date.now()`
    - `type`: `"initial"` または `"incremental"`
    - `summary`: サマリー情報（追加・削除・変更の件数）
    - `changes`: 変更詳細（増分の場合のみ、初回の場合は `undefined`）
  - 既存の `viewModel.erDiagram.history` 配列に履歴エントリを追記（存在しない場合は空配列として扱う）
  - 更新後の `ViewModel` に履歴配列を含める
  - 仕様: [リバースエンジニアリング履歴機能仕様](/spec/reverse_engineering_history.md) の「処理の流れ」を参照
  - **実装方針**: 既存のマージ処理ループ内で差分情報を収集することで、データの1回走査で効率的に実装する

#### グローバルUIアクション追加

- [ ] `public/src/actions/globalUIActions.ts` にアクションを追加
  - `actionToggleHistoryPanel(viewModel: ViewModel): ViewModel`
    - `viewModel.ui.showHistoryPanel` をトグル
    - 変化がない場合は同一参照を返す（既存のアクションと同じパターン）
  - 仕様: [フロントエンド状態管理仕様](/spec/frontend_state_management.md) を参照

#### 初期値対応

- [ ] `public/src/utils/getInitialViewModelValues.ts` を更新
  - `getInitialGlobalUIState()` に `showHistoryPanel: false` を追加

#### エクスポート対応

- [ ] `public/src/utils/exportViewModel.ts` を更新
  - `erDiagram.history` を保持する（既存のnodesやedgesと同様に、そのままエクスポート対象に含める）
  - 仕様: [リバースエンジニアリング履歴機能仕様](/spec/reverse_engineering_history.md) の「保存とインポート・エクスポート」を参照

#### インポート対応

- [ ] `public/src/utils/importViewModel.ts` を更新
  - `erDiagram.history` 配列をインポート
  - 配列でない場合や存在しない場合は空配列として扱う
  - 各エントリの型チェック（`timestamp` と `type` の存在確認）
  - 不正なエントリは無視してインポート継続
  - 仕様: [リバースエンジニアリング履歴機能仕様](/spec/reverse_engineering_history.md) の「保存とインポート・エクスポート」を参照

### フロントエンド - テストコード

- [ ] `public/tests/actions/dataActions.test.ts` を更新
  - `actionMergeERData` の履歴記録機能のテストを追加
  - 初回リバース時に `type: "initial"` の履歴エントリが作成されることを確認
  - 増分リバース時に `type: "incremental"` の履歴エントリが作成されることを確認
  - 変更がない場合でも履歴エントリが作成されることを確認
  - サマリー情報が正しく記録されることを確認

- [ ] `public/tests/actions/globalUIActions.test.ts` を更新
  - `actionToggleHistoryPanel` のテストを追加

- [ ] `public/tests/utils/exportViewModel.test.ts` を新規作成または更新
  - `history` 配列がエクスポート対象に含まれることを確認

- [ ] `public/tests/utils/importViewModel.test.ts` を新規作成または更新
  - `history` 配列が正しくインポートされることを確認
  - `history` が存在しない場合に空配列として扱われることを確認
  - 不正なエントリが無視されることを確認

### ビルド・テスト確認

- [ ] フロントエンドのビルド確認
  - `cd public && npm run build` を実行してビルド成功を確認

- [ ] フロントエンドのテスト実行
  - `cd public && npm run test` を実行してテストが通ることを確認

## フェーズ2: UI実装

### 概要
- 履歴パネルコンポーネント新規作成（1ファイル新規）
- App.tsx更新（1ファイル更新）
- 合計: 1ファイル新規作成 + 1ファイル更新 + テストファイル追加

### コンポーネント実装

- [ ] `public/src/components/HistoryPanel.tsx` を新規作成
  - 履歴パネルコンポーネントを実装
  - 履歴エントリを新しい順に表示（`timestamp` でソート）
  - 各エントリの表示内容:
    - 日時（`timestamp` を `new Date(timestamp).toLocaleString('ja-JP')` でフォーマット）
    - リバース種別（初回 / 増分）
    - サマリー（例: `+3テーブル, -1テーブル, +5カラム, ~2カラム`）
  - 各エントリは `<details>`/`<summary>` 要素で折りたたみ可能
  - 展開時の表示内容:
    - 追加されたテーブル名のリスト
    - 削除されたテーブル名のリスト
    - 追加されたカラム（`テーブル名.カラム名` 形式）
    - 削除されたカラム（`テーブル名.カラム名` 形式）
    - 変更されたカラム（`テーブル名.カラム名` と `before`/`after` の差分）
    - 追加されたリレーション（`constraintName` またはエンドポイント）
    - 削除されたリレーション（`constraintName` またはエンドポイント）
  - スタイリング: 既存のパネル（LayerPanel、RectanglePropertyPanel等）と統一感のあるデザイン
  - 仕様: [リバースエンジニアリング履歴機能仕様](/spec/reverse_engineering_history.md) の「UI仕様」を参照

#### App.tsx 更新

- [ ] `public/src/components/App.tsx` を更新
  - `HistoryPanel` コンポーネントをインポート
  - `showHistoryPanel` を `useViewModel` で取得
  - ヘッダーに「履歴」ボタンを追加
    - ボタンクリック時に `actionToggleHistoryPanel` をdispatch
    - ボタンの配置順序: レイヤー / エクスポート / インポート / 履歴 / ビルド情報
    - スタイル: 既存のボタンと統一（`showHistoryPanel` が `true` の場合は背景色を `#777` に）
  - `showHistoryPanel` が `true` の場合に `HistoryPanel` を右サイドバーに表示
    - 配置: 右サイドバー（LayerPanel や RectanglePropertyPanel と同様の位置）
  - 仕様: [リバースエンジニアリング履歴機能仕様](/spec/reverse_engineering_history.md) の「UI仕様」を参照

### テストコード

- [ ] `public/tests/components/HistoryPanel.test.tsx` を新規作成
  - 履歴エントリが新しい順に表示されることを確認
  - 初回リバースと増分リバースの表示が正しいことを確認
  - サマリー情報が正しく表示されることを確認
  - 折りたたみが動作することを確認（省略可能）

### ビルド確認

- [ ] フロントエンドのビルド確認
  - `cd public && npm run build` を実行してビルド成功を確認

- [ ] フロントエンドのテスト実行
  - `cd public && npm run test` を実行してテストが通ることを確認

## 備考

- 型定義（`scheme/main.tsp` および `lib/generated/api-types.ts`、`public/src/api/client/`）は既にコミット済み
- 各フェーズの最後にビルド・テストを実行して動作確認を行う
- MVP段階のため、パフォーマンスやエラーハンドリングの最適化は不要
