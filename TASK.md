# ViewModelベースAPI実装タスク

仕様書の更新に基づき、APIをViewModelベースに刷新するタスクを洗い出しました。

## フェーズ1: バックエンドAPI実装

### scheme/main.tspの型定義復活

- [x] `scheme/main.tsp`に内部実装用の型を再追加
  - `ERData` - `lib/database.ts`の`generateERData()`の戻り値として使用
  - `LayoutData` - `lib/database.ts`の`generateDefaultLayoutData()`の戻り値として使用
  - `EntityLayoutItem` - `LayoutData`の要素として使用
  - **注意**: これらの型はAPIエンドポイントでは使用しないが、内部実装で使用するため定義が必要
  - 型定義の位置: API定義（`namespace API`）の前に配置

### TypeSpec定義の型生成

- [x] `npm run generate`を実行してTypeSpecから型定義を生成
  - `scheme/main.tsp`の変更を反映
  - `lib/generated/api-types.ts`と`public/src/api/client/`が更新される
  - **対処済み**: API名を`init`から`initialize`に変更

### GetInitialViewModelUsecaseの実装

- [x] `lib/usecases/GetInitialViewModelUsecase.ts`を新規作成
  - インタフェース: `createGetInitialViewModelUsecase(deps: GetInitialViewModelDeps) => () => ViewModel`
  - 依存性注入するもの:
    - `getBuildInfo: () => BuildInfo` (GetBuildInfoUsecaseの実行関数)
  - 処理内容:
    - 空のERDiagramViewModelを生成
    - 初期のGlobalUIStateを生成
    - `getBuildInfo()`を呼び出してBuildInfoを取得
    - BuildInfoStateを構築 (`data: buildInfo, loading: false, error: null`)
    - これらを組み合わせてViewModelを返却
  - 参考: [ViewModelベースAPI仕様](./spec/viewmodel_based_api.md)の「GetInitialViewModelUsecase」セクション

### ReverseEngineerUsecaseの修正

- [x] `lib/usecases/ReverseEngineerUsecase.ts`を修正
  - インタフェース変更: `(viewModel: ViewModel) => Promise<ViewModel>`
    - 引数: 現在のViewModelを受け取る
    - 戻り値: 更新後のViewModelを返す
  - 依存性注入は変更なし
  - 処理内容の変更:
    - データベースからER図を生成（既存の処理を流用）
    - `erData`から`EntityNodeViewModel`のRecord（nodes）を生成
    - `relationships`から`RelationshipEdgeViewModel`のRecord（edges）を生成
    - レイアウト生成ロジックをnodes生成時に統合（別途LayoutDataを生成しない）
    - リクエストで受け取ったViewModelの`erDiagram`を更新
    - `ui`状態と`buildInfo`状態はリクエストから引き継ぐ
    - 更新後のViewModelを返却
  - 参考: [ViewModelベースAPI仕様](./spec/viewmodel_based_api.md)の「ReverseEngineerUsecase」セクション

### DatabaseManagerの修正

- [x] `lib/database.ts`を修正（変更不要、既存のメソッドをそのまま使用）
  - `generateERData()`メソッドは削除せず残す（ReverseEngineerUsecase内で利用）
  - `generateDefaultLayoutData()`メソッドは削除せず残す（またはロジックをUsecaseに移動）
  - `ERData`, `LayoutData`, `EntityLayoutItem`型は復活させた型定義を使用
  - `getTableDDL()`メソッドは残す（将来的に使用する可能性があるため）

### server.tsのAPI実装

- [x] `server.ts`を修正
  - 新規エンドポイント追加:
    - `GET /api/init` - GetInitialViewModelUsecaseを呼び出し、ViewModelを返却
  - 既存エンドポイント修正:
    - `POST /api/reverse-engineer` - リクエストボディから`ViewModel`を取得し、ReverseEngineerUsecaseに渡し、更新後のViewModelを返却
  - 削除するエンドポイント:
    - `GET /api/er-data`
    - `POST /api/layout`
    - `GET /api/layout`
    - `GET /api/table/:tableName/ddl`
    - `GET /api/build-info`
  - 参考: [ViewModelベースAPI仕様](./spec/viewmodel_based_api.md)のAPIセクション

### バックエンドテストの実装

- [x] `tests/usecases/GetInitialViewModelUsecase.test.ts`を新規作成
  - GetInitialViewModelUsecaseの動作を検証
  - ビルド情報が正しく含まれることを確認
  - 初期状態が正しいことを確認

- [x] `tests/usecases/ReverseEngineerUsecase.test.ts`を修正
  - ViewModelを引数として受け取る新しいインタフェースに対応
  - ViewModelの`erDiagram`が更新されることを確認
  - `ui`と`buildInfo`が引き継がれることを確認

### ビルド・テストの確認

- [x] バックエンドのビルドを確認
  - `npm run generate`でTypeSpecから型定義を生成
  - TypeScriptのコンパイルエラーがないことを確認

- [x] バックエンドのテストを実行
  - `npm run test`でテストが全てパスすることを確認

## フェーズ2: フロントエンド実装

### actionSetViewModelの実装

- [x] `public/src/actions/dataActions.ts`に`actionSetViewModel`を追加
  - インタフェース: `(viewModel: ViewModel, newViewModel: ViewModel) => ViewModel`
  - 処理内容: ViewModelを丸ごと差し替える（`return newViewModel`）
  - 参考: [フロントエンド状態管理仕様](./spec/frontend_state_management.md)の「ViewModel全体を更新するAction」セクション
  - **注**: 既に実装済みでした

### commandInitializeの実装

- [x] `public/src/commands/initializeCommand.ts`を新規作成
  - インタフェース: `async (dispatch: Store['dispatch']) => Promise<void>`
  - 処理内容:
    - `GET /api/init`を呼び出し
    - 取得したViewModelを`actionSetViewModel`でStoreに設定
    - エラー時はコンソールに出力
  - 参考: [フロントエンド状態管理仕様](./spec/frontend_state_management.md)の「Command層」セクション

### commandReverseEngineerの修正

- [x] `public/src/commands/reverseEngineerCommand.ts`を修正
  - 処理内容の変更:
    - 現在のViewModelを`erDiagramStore.getState()`で取得
    - `POST /api/reverse-engineer`に現在のViewModelを送信
    - レスポンスのViewModelを`actionSetViewModel`でStoreに設定
    - `buildERDiagramViewModel()`関数の呼び出しは削除（サーバーがViewModelを返すため不要）
  - 参考: [フロントエンド状態管理仕様](./spec/frontend_state_management.md)の「Command層」セクション
  - **注**: ERCanvas.tsxでの呼び出しも修正（getStateを渡すように変更）

### App.tsxの初期化処理追加

- [x] `public/src/components/App.tsx`を修正
  - `useEffect`を追加し、コンポーネントマウント時に`commandInitialize`を実行
  - 依存配列は空配列（初回マウント時のみ実行）
  - 参考: [フロントエンド状態管理仕様](./spec/frontend_state_management.md)の「初期化フロー」セクション

### BuildInfoModalの修正

- [x] `public/src/components/BuildInfoModal.tsx`を修正
  - ローカル状態（`buildInfo`, `loading`, `error`）を削除
  - `useViewModel`でStoreから`viewModel.buildInfo`を取得
  - `commandFetchBuildInfo`の呼び出しを削除
  - キャッシュされたビルド情報を表示するだけに簡素化
  - 参考: [フロントエンド状態管理仕様](./spec/frontend_state_management.md)の「ビルド情報について」セクション

### buildInfoActionsの削除

- [x] `public/src/actions/buildInfoActions.ts`を削除
  - `actionSetBuildInfoLoading`, `actionSetBuildInfo`, `actionSetBuildInfoError`は不要
  - `actionSetViewModel`で代替

### buildInfoCommandの削除

- [x] `public/src/commands/buildInfoCommand.ts`を削除
  - `commandFetchBuildInfo`は不要（初期化時に取得済み）

### viewModelConverterの削除

- [x] `public/src/utils/viewModelConverter.ts`を削除
  - `buildERDiagramViewModel()`関数は不要（サーバーがViewModelを返すため）

### 不要ファイルの削除

- [x] `public/src/app.ts`を削除
  - 旧実装で使用されていないファイル

### フロントエンドテストの修正

- [x] `public/tests/actions/buildInfoActions.test.ts`を削除
  - 対応するActionが削除されたため

- [x] `public/tests/actions/dataActions.test.ts`を修正
  - `actionSetViewModel`のテストを追加
  - 既存のテストは保持

### ビルドの確認

- [x] フロントエンドのビルドを確認
  - Viteビルドが成功することを確認
  - テストが全てパス（64テスト）することを確認

## 懸念事項

### ERData/LayoutData型について（解決済み）

`scheme/main.tsp`から`ERData`, `LayoutData`, `EntityLayoutItem`などが削除されましたが、`lib/database.ts`の既存メソッドが依然としてこれらの型を使用しています。

**対処方針**（確認済み）:
- これらの型を`scheme/main.tsp`に復活させる（APIエンドポイントでは使用しないが、内部実装で使用）
- `lib/database.ts`は既存のメソッドをそのまま使用

### APIクライアントコードの自動生成

TypeSpecから生成されるAPIクライアント（`public/src/api/client/services/DefaultService.ts`）が新しいAPI仕様に対応しているかを確認する必要があります。

**確認ポイント**:
- `init()`メソッドが生成されているか
- `reverseEngineer(viewModel: ViewModel)`メソッドがViewModelを引数として受け取るか
- 削除されたAPIのメソッドが残っていないか

### 初期化のタイミング（確認済み）

`App.tsx`のマウント時に`commandInitialize`を実行します。

**対処方針**（確認済み）:
- MVPフェーズではエラーはコンソール出力のみとし、ローディング表示は後回し
- ビルド情報の取得に失敗した場合もコンソールにエラーを出力するのみ

## 事前修正提案

特になし。仕様書に従って実装を進めることで問題なく実現可能です。

## 参考仕様書

- [ViewModelベースAPI仕様](./spec/viewmodel_based_api.md)
- [フロントエンド状態管理仕様](./spec/frontend_state_management.md)
- [バックエンドUsecaseアーキテクチャ仕様](./spec/backend_usecase_architecture.md)
- [scheme/main.tsp](./scheme/main.tsp)
