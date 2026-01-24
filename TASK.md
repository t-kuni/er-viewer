# タスク一覧

## 概要

[spec/frontend_state_management.md](spec/frontend_state_management.md)の仕様変更に対応するため、Storeの状態を`ERDiagramViewModel`から`ViewModel`に移行し、グローバルUI状態とビルド情報キャッシュをStoreで管理する。

**仕様変更のポイント**:
- 状態管理のルート型を`ERDiagramViewModel`から`ViewModel`に変更
- `ViewModel`は3つのプロパティを持つ:
  - `erDiagram`: ER図の状態（従来の`ERDiagramViewModel`）
  - `ui`: グローバルUI状態（`selectedRectangleId`, `showBuildInfoModal`）
  - `buildInfo`: ビルド情報のキャッシュ（`data`, `loading`, `error`）
- `scheme/main.tsp`で型が定義され、`lib/generated/api-types.ts`に自動生成済み

## 実装タスク

### Store基盤の更新

- [ ] **Store型を`ViewModel`に更新**
  - **ファイル**: `public/src/store/erDiagramStore.ts`
  - **変更内容**:
    - `ActionFn`の型を`ActionFn<Args extends any[] = any[]> = (viewModel: ViewModel, ...args: Args) => ViewModel`に変更
    - `Store`インターフェースの`getState`の戻り値を`ViewModel`に変更
    - 初期状態を`ViewModel`型に更新:
      ```typescript
      const initialState: ViewModel = {
        erDiagram: {
          nodes: {},
          edges: {},
          rectangles: {},
          ui: {
            hover: null,
            highlightedNodeIds: [],
            highlightedEdgeIds: [],
            highlightedColumnIds: [],
          },
          loading: false,
        },
        ui: {
          selectedRectangleId: null,
          showBuildInfoModal: false,
        },
        buildInfo: {
          data: null,
          loading: false,
          error: null,
        },
      };
      ```
    - `components['schemas']['ViewModel']`型をimport
  - **参照仕様**: [spec/frontend_state_management.md#状態設計](spec/frontend_state_management.md#状態設計)

- [ ] **Hooksの型を`ViewModel`に更新**
  - **ファイル**: `public/src/store/hooks.ts`
  - **変更内容**:
    - `useERViewModel`を`useViewModel`にリネーム
    - selectorの引数型を`ViewModel`に変更: `selector: (viewModel: ViewModel) => T`
    - `useERDispatch`を`useDispatch`にリネーム
    - `components['schemas']['ViewModel']`型をimport
  - **参照仕様**: [spec/frontend_state_management.md#Store購読とdispatch](spec/frontend_state_management.md#Store購読とdispatch)

### 既存Actionの型更新

- [ ] **dataActionsの型を`ViewModel`に更新**
  - **ファイル**: `public/src/actions/dataActions.ts`
  - **変更内容**:
    - 各Action関数の第1引数を`viewModel: ViewModel`に変更
    - `actionSetData`:
      - `viewModel.erDiagram`を更新するように変更
      - 戻り値: `{ ...viewModel, erDiagram: { ...viewModel.erDiagram, nodes, edges } }`
    - `actionUpdateNodePositions`:
      - `viewModel.erDiagram.nodes`にアクセスして更新
      - 戻り値: `{ ...viewModel, erDiagram: { ...viewModel.erDiagram, nodes: newNodes } }`
    - `actionSetLoading`:
      - `viewModel.erDiagram.loading`を更新
      - 戻り値: `{ ...viewModel, erDiagram: { ...viewModel.erDiagram, loading } }`
  - **参照仕様**: [spec/frontend_state_management.md#主要なAction](spec/frontend_state_management.md#主要なAction)

- [ ] **hoverActionsの型を`ViewModel`に更新**
  - **ファイル**: `public/src/actions/hoverActions.ts`
  - **変更内容**:
    - 各Action関数の第1引数を`viewModel: ViewModel`に変更
    - `actionHoverEntity`, `actionHoverEdge`, `actionHoverColumn`, `actionClearHover`:
      - `viewModel.erDiagram.edges`, `viewModel.erDiagram.nodes`にアクセス
      - `viewModel.erDiagram.ui`を更新
      - 戻り値: `{ ...viewModel, erDiagram: { ...viewModel.erDiagram, ui: newUi } }`
  - **参照仕様**: [spec/frontend_state_management.md#主要なAction](spec/frontend_state_management.md#主要なAction)

- [ ] **rectangleActionsの型を`ViewModel`に更新**
  - **ファイル**: `public/src/actions/rectangleActions.ts`
  - **変更内容**:
    - 各Action関数の第1引数を`viewModel: ViewModel`に変更
    - `actionAddRectangle`, `actionRemoveRectangle`, `actionUpdateRectanglePosition`, `actionUpdateRectangleSize`, `actionUpdateRectangleBounds`, `actionUpdateRectangleStyle`:
      - `viewModel.erDiagram.rectangles`にアクセスして更新
      - 戻り値: `{ ...viewModel, erDiagram: { ...viewModel.erDiagram, rectangles: newRectangles } }`
  - **参照仕様**: [spec/frontend_state_management.md#主要なAction](spec/frontend_state_management.md#主要なAction)

### グローバルUI関連のActionを追加

- [ ] **globalUIActionsを作成**
  - **ファイル**: `public/src/actions/globalUIActions.ts`（新規作成）
  - **変更内容**:
    - 以下のAction関数を実装:
      - `actionSelectRectangle(viewModel: ViewModel, rectangleId: string): ViewModel`
        - `viewModel.ui.selectedRectangleId`を更新
        - 変化がない場合は同一参照を返す
      - `actionDeselectRectangle(viewModel: ViewModel): ViewModel`
        - `viewModel.ui.selectedRectangleId`をnullに設定
        - 変化がない場合は同一参照を返す
      - `actionShowBuildInfoModal(viewModel: ViewModel): ViewModel`
        - `viewModel.ui.showBuildInfoModal`をtrueに設定
        - 変化がない場合は同一参照を返す
      - `actionHideBuildInfoModal(viewModel: ViewModel): ViewModel`
        - `viewModel.ui.showBuildInfoModal`をfalseに設定
        - 変化がない場合は同一参照を返す
  - **参照仕様**: [spec/frontend_state_management.md#グローバルUI関連のAction](spec/frontend_state_management.md#グローバルUI関連のAction)

### ビルド情報関連のActionを追加

- [ ] **buildInfoActionsを作成**
  - **ファイル**: `public/src/actions/buildInfoActions.ts`（新規作成）
  - **変更内容**:
    - 以下のAction関数を実装:
      - `actionSetBuildInfoLoading(viewModel: ViewModel, loading: boolean): ViewModel`
        - `viewModel.buildInfo.loading`を更新
        - 変化がない場合は同一参照を返す
      - `actionSetBuildInfo(viewModel: ViewModel, buildInfo: BuildInfo): ViewModel`
        - `viewModel.buildInfo.data`を設定
        - `viewModel.buildInfo.error`をnullに設定
      - `actionSetBuildInfoError(viewModel: ViewModel, error: string): ViewModel`
        - `viewModel.buildInfo.error`を設定
  - **参照仕様**: [spec/frontend_state_management.md#ビルド情報関連のAction](spec/frontend_state_management.md#ビルド情報関連のAction)

### Commandの更新

- [ ] **reverseEngineerCommandの型を`ViewModel`に対応**
  - **ファイル**: `public/src/commands/reverseEngineerCommand.ts`
  - **変更内容**:
    - 特に変更不要（Actionが`ViewModel`を受け取るように変更されるため、dispatchの引数は変わらない）
    - `actionSetData`の引数は`nodes`と`edges`のみ（矩形は返されない）
    - `buildERDiagramViewModel`の戻り値が`ERDiagramViewModel`であることを確認

- [ ] **commandFetchBuildInfoを作成**
  - **ファイル**: `public/src/commands/buildInfoCommand.ts`（新規作成）
  - **変更内容**:
    - 以下のCommand関数を実装:
      ```typescript
      export async function commandFetchBuildInfo(dispatch: Store['dispatch']): Promise<void> {
        dispatch(actionSetBuildInfoLoading, true);
        try {
          const buildInfo = await DefaultService.apiGetBuildInfo();
          if ('error' in buildInfo) {
            throw new Error(buildInfo.error);
          }
          dispatch(actionSetBuildInfo, buildInfo);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'ビルド情報の取得に失敗しました';
          dispatch(actionSetBuildInfoError, errorMessage);
        } finally {
          dispatch(actionSetBuildInfoLoading, false);
        }
      }
      ```
  - **参照仕様**: [spec/frontend_state_management.md#Command層](spec/frontend_state_management.md#Command層)

### コンポーネントの更新

- [ ] **App.tsxをStoreベースに移行**
  - **ファイル**: `public/src/components/App.tsx`
  - **変更内容**:
    - ローカル状態（`showBuildInfo`, `selectedRectangleId`）を削除
    - `useViewModel`と`useDispatch`をimport（`useERViewModel`, `useERDispatch`から変更）
    - `selectedRectangleId`の取得: `useViewModel(vm => vm.ui.selectedRectangleId)`
    - `showBuildInfo`の取得: `useViewModel(vm => vm.ui.showBuildInfoModal)`
    - ビルド情報ボタンのクリック: `dispatch(actionShowBuildInfoModal)`
    - モーダルを閉じる: `dispatch(actionHideBuildInfoModal)`
    - 矩形選択: ERCanvasの`onSelectionChange`から`dispatch(actionSelectRectangle, rectangleId)`または`dispatch(actionDeselectRectangle)`
  - **参照仕様**: [spec/frontend_state_management.md#グローバルUI関連のAction](spec/frontend_state_management.md#グローバルUI関連のAction)

- [ ] **ERCanvas.tsxをStoreベースに移行**
  - **ファイル**: `public/src/components/ERCanvas.tsx`
  - **変更内容**:
    - `useERViewModel`を`useViewModel`に変更
    - `useERDispatch`を`useDispatch`に変更
    - Storeからの購読を`viewModel.erDiagram`にアクセスするように変更:
      - `useViewModel(vm => vm.erDiagram.nodes)`
      - `useViewModel(vm => vm.erDiagram.edges)`
      - `useViewModel(vm => vm.erDiagram.rectangles)`
      - `useViewModel(vm => vm.erDiagram.loading)`
    - `onSelectionChange`のコールバックをそのまま親に通知（親でActionをdispatch）
  - **注意**: 既存のロジックは維持し、Storeへのアクセス方法のみ変更

- [ ] **BuildInfoModal.tsxをStoreベースに移行**
  - **ファイル**: `public/src/components/BuildInfoModal.tsx`
  - **変更内容**:
    - ローカル状態（`buildInfo`, `loading`, `error`）を削除
    - `useViewModel`と`useDispatch`をimport
    - `buildInfo`の取得: `useViewModel(vm => vm.buildInfo.data)`
    - `loading`の取得: `useViewModel(vm => vm.buildInfo.loading)`
    - `error`の取得: `useViewModel(vm => vm.buildInfo.error)`
    - `useEffect`でマウント時（依存配列を空`[]`にする）に、`buildInfo.data`がnullの場合のみ`commandFetchBuildInfo(dispatch)`を実行
      - これにより、アプリケーション起動後の初回モーダル表示時のみAPIを呼び出し、2回目以降はキャッシュを使用
    - `onClose`を呼ぶ際は、親から`actionHideBuildInfoModal`がdispatchされる
  - **参照仕様**: [spec/frontend_state_management.md#ビルド情報のキャッシュについて](spec/frontend_state_management.md#ビルド情報のキャッシュについて)

### テストコードの更新

- [ ] **dataActions.test.tsの型を`ViewModel`に更新**
  - **ファイル**: `public/tests/actions/dataActions.test.ts`
  - **変更内容**:
    - `createMockViewModel`の戻り値を`ViewModel`型に変更
    - モックデータを`ViewModel`の構造に合わせて変更（`erDiagram`, `ui`, `buildInfo`を含む）
    - 各テストケースで`result.erDiagram.nodes`などにアクセス
  - **テストカバレッジ**: 既存のテストケースを維持し、型だけ更新

- [ ] **hoverActions.test.tsの型を`ViewModel`に更新**
  - **ファイル**: `public/tests/actions/hoverActions.test.ts`
  - **変更内容**:
    - `createMockViewModel`の戻り値を`ViewModel`型に変更
    - 各テストケースで`result.erDiagram.ui.hover`などにアクセス
  - **テストカバレッジ**: 既存のテストケースを維持し、型だけ更新

- [ ] **rectangleActions.test.tsの型を`ViewModel`に更新**
  - **ファイル**: `public/tests/actions/rectangleActions.test.ts`
  - **変更内容**:
    - `createMockViewModel`の戻り値を`ViewModel`型に変更
    - 各テストケースで`result.erDiagram.rectangles`にアクセス
  - **テストカバレッジ**: 既存のテストケースを維持し、型だけ更新

- [ ] **globalUIActionsのテストを作成**
  - **ファイル**: `public/tests/actions/globalUIActions.test.ts`（新規作成）
  - **変更内容**:
    - 以下のテストケースを実装:
      - `actionSelectRectangle`: 矩形が選択される
      - `actionDeselectRectangle`: 矩形の選択が解除される
      - `actionShowBuildInfoModal`: ビルド情報モーダルが表示される
      - `actionHideBuildInfoModal`: ビルド情報モーダルが非表示になる
      - 変化がない場合に同一参照を返すことを確認
  - **参照仕様**: [spec/frontend_state_management.md#テスト設計](spec/frontend_state_management.md#テスト設計)

- [ ] **buildInfoActionsのテストを作成**
  - **ファイル**: `public/tests/actions/buildInfoActions.test.ts`（新規作成）
  - **変更内容**:
    - 以下のテストケースを実装:
      - `actionSetBuildInfoLoading`: ローディング状態が設定される
      - `actionSetBuildInfo`: ビルド情報が設定される（errorがnullになる）
      - `actionSetBuildInfoError`: エラーが設定される
      - 変化がない場合に同一参照を返すことを確認
  - **参照仕様**: [spec/frontend_state_management.md#テスト設計](spec/frontend_state_management.md#テスト設計)

### ビルド・テストの確認

- [ ] **型生成を実行**
  - **コマンド**: `npm run generate`
  - **確認内容**: `lib/generated/api-types.ts`と`public/src/api/client/models/`に`ViewModel`, `GlobalUIState`, `BuildInfoState`が生成されていることを確認

- [ ] **ビルドの確認**
  - **コマンド**: フロントエンドとバックエンドのビルドを実行
  - **確認内容**: 型エラーが発生しないことを確認

- [ ] **テストの実行**
  - **コマンド**: `npm run test`
  - **確認内容**: すべてのテストが通ることを確認
