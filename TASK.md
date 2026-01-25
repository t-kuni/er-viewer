# インポート・エクスポート機能実装タスク

仕様書の更新（インポート・エクスポート機能の追加）に基づき、タスクを洗い出しました。

参照仕様書：[インポート・エクスポート機能仕様](/spec/import_export_feature.md)

## フェーズ1: バックエンド実装（format/version対応）✅ 完了

### GetInitialViewModelUsecaseの修正

- [x] `lib/usecases/GetInitialViewModelUsecase.ts`を修正
  - ViewModelに`format`フィールドを追加（固定値: `"er-viewer"`）
  - ViewModelに`version`フィールドを追加（固定値: `1`）
  - 返却するViewModelに以下を追加:
    ```typescript
    const viewModel: ViewModel = {
      format: "er-viewer",
      version: 1,
      erDiagram,
      ui,
      buildInfo: buildInfoState,
    };
    ```
  - 参考: [ViewModelベースAPI仕様](/spec/viewmodel_based_api.md)の「GetInitialViewModelUsecase」セクション

### ReverseEngineerUsecaseの修正

- [x] `lib/usecases/ReverseEngineerUsecase.ts`を修正
  - ViewModelを返却する際に`format`と`version`を引き継ぐ
  - 返却するViewModelを以下のように変更:
    ```typescript
    return {
      format: viewModel.format,     // 追加
      version: viewModel.version,   // 追加
      erDiagram: {
        ...viewModel.erDiagram,
        nodes,
        edges,
        loading: false,
      },
      ui: viewModel.ui,
      buildInfo: viewModel.buildInfo,
    };
    ```
  - 参考: [ViewModelベースAPI仕様](/spec/viewmodel_based_api.md)の「ReverseEngineerUsecase」セクション

### GetInitialViewModelUsecaseのテスト修正

- [x] `tests/usecases/GetInitialViewModelUsecase.test.ts`を修正
  - テストケースを更新して`format`と`version`フィールドの検証を追加
  - 期待値に以下を追加:
    ```typescript
    expect(viewModel.format).toBe("er-viewer");
    expect(viewModel.version).toBe(1);
    ```

### ReverseEngineerUsecaseのテスト修正

- [x] `tests/usecases/ReverseEngineerUsecase.test.ts`を修正
  - テストケースを更新して`format`と`version`が引き継がれることを検証
  - リクエストViewModelに`format`と`version`を追加
  - レスポンスViewModelで`format`と`version`が維持されていることを確認

### ビルド確認

- [x] ビルドの実行（バックエンド）
  - コマンド: `npm run generate && npx tsc --project tsconfig.server.json`
  - エラーなし、ビルド成功

### テスト実行

- [x] テスト実行（バックエンド）
  - コマンド: `npm run test`
  - すべてのテスト（64 tests）が通過しました

## フェーズ2: フロントエンド実装（エクスポート・インポート機能）✅ 完了

### react-dropzoneのインストール

- [x] `public/package.json`に`react-dropzone`を追加
  - コマンド: `cd public && npm install react-dropzone`
  - 型定義も同時にインストールされました

### エクスポート用ユーティリティの作成

- [x] `public/src/utils/exportViewModel.ts`を新規作成
  - 関数: `exportViewModel(viewModel: ViewModel): void`
  - 処理内容:
    1. ViewModelをコピーして一時UI状態とキャッシュを初期化（[仕様書](/spec/import_export_feature.md)の「エクスポート時の処理」参照）
    2. JSON文字列にシリアライズ（インデント: 2スペース）
    3. ファイル名を生成（フォーマット: `er-viewer-{YYYY-MM-DD}.json`）
    4. `Blob`と`URL.createObjectURL`を使ってダウンロード
    5. ダウンロード後にオブジェクトURLをrevokeしてメモリ解放
  - エラーハンドリング: try-catchで囲み、失敗時はコンソールエラー出力

### インポート用ユーティリティの作成

- [x] `public/src/utils/importViewModel.ts`を新規作成
  - 関数: `importViewModel(file: File, currentBuildInfo: BuildInfoState): Promise<ViewModel>`
  - 処理内容:
    1. FileReaderでファイルを読み込み
    2. JSONとしてパース
    3. バリデーションを実行（[仕様書](/spec/import_export_feature.md)の「バリデーション」参照）
    4. 一時UI状態とキャッシュを補完（[仕様書](/spec/import_export_feature.md)の「インポート時の処理」参照）
    5. 補完したViewModelを返却
  - バリデーションエラー時: エラーメッセージを含む例外をthrow
  - ファイル読み込みエラー時: 「Failed to read file」をthrow
  - 注: BuildInfoStateを引数で受け取るように実装しました（TASK.mdの懸念事項に記載の方針）

### ViewModelの初期値取得関数の作成

- [x] `public/src/utils/getInitialViewModelValues.ts`を新規作成
  - 関数: `getInitialErDiagramUIState(): ERDiagramUIState`
    - 空のERDiagramUIStateを返却
  - 関数: `getInitialGlobalUIState(): GlobalUIState`
    - 空のGlobalUIStateを返却
  - 関数: `getInitialBuildInfoState(buildInfo: BuildInfo): BuildInfoState`
    - BuildInfoを受け取り、BuildInfoStateを返却
  - 初期値の詳細は[ViewModelベースAPI仕様](/spec/viewmodel_based_api.md)の「GET /api/init」を参照

### エクスポートボタンの追加

- [x] `public/src/components/App.tsx`を修正
  - ヘッダーに「エクスポート」ボタンを追加
  - ボタン配置順序（左から右）:
    1. レイヤーボタン（既存）
    2. エクスポートボタン（新規）
    3. インポートボタン（新規）
    4. ビルド情報ボタン（既存）
  - ボタンクリック時:
    - `useViewModel`でViewModelを取得
    - `exportViewModel(viewModel)`を呼び出し

### インポートボタンとD&D領域の追加

- [x] `public/src/components/App.tsx`を修正
  - `react-dropzone`の`useDropzone`フックを使用
  - ヘッダー全体をドロップ可能領域にする（`getRootProps()`を適用）
  - ヘッダーに「インポート」ボタンを追加（エクスポートボタンの右隣）
  - ボタンクリック時: `open()`を呼び出してファイル選択ダイアログを開く
  - ドラッグオーバー時: 背景色を変更して視覚的フィードバックを提供
  - ファイルドロップ時またはファイル選択時:
    1. `onDrop`コールバックで`importViewModel(file, buildInfo)`を呼び出し
    2. `actionSetViewModel`をdispatchして取得したViewModelをStoreに設定
    3. エラー時: `alert()`でエラーメッセージを表示（トースト通知が実装されていないため）
  - 受け入れるファイル形式: `.json`のみ（`accept: { 'application/json': ['.json'] }`）

### ビルド確認

- [x] ビルドの実行（フロントエンド）
  - コマンド: `cd public && npm run build`
  - ビルド成功（警告のみ、エラーなし）

## 指示者宛ての懸念事項（作業対象外）

### テストコードについて

- インポート・エクスポート機能のユーティリティ関数に対するテストコードは作成していません
  - エクスポート機能は副作用（ファイルダウンロード）が主であり、テストが困難
  - インポート機能はファイル読み込みが含まれ、モックが複雑になる
  - MVP段階では手動テストで十分と判断
- 必要であればテストコード作成を別途指示してください

### エラーハンドリングについて

- MVP段階では簡易的なエラーハンドリング（`alert()`）を採用
- トースト通知ライブラリ（`react-toastify`など）の導入が望ましいですが、仕様書に「実装が簡単でなければアラート」と記載があるため、`alert()`で実装
- より良いUXを求める場合は、トースト通知ライブラリの導入を検討してください

### BuildInfo取得方法について

- インポート時に`buildInfo`を現在の状態から保持する必要がありますが、ユーティリティ関数内では現在のStoreにアクセスできません
- 解決策として、`importViewModel`関数を`importViewModel(file: File, currentBuildInfo: BuildInfoState): Promise<ViewModel>`に変更し、呼び出し側で現在の`buildInfo`を渡すように実装します
