# フロントエンド状態管理仕様

## 概要

本仕様書は、ER Diagram Viewerのフロントエンドにおける状態管理とテスト戦略を定義する。
単一状態ツリー（`ViewModel`）と純粋関数による状態更新（Action層）を採用し、テスト容易性を最大化する。

**目的**:
- Actionで管理できる範囲を最大化する
- Actionにテストを書くことでテストできる範囲を最大化する
- グローバルUI状態やキャッシュもActionで管理し、Reactコンポーネントのローカル状態を最小化する

関連仕様：
- ER図の描画とインタラクションについては[frontend_er_rendering.md](./frontend_er_rendering.md)を参照
- リサーチ背景は[research/20260122_0017_flux_action_layer_state_management.md](../research/20260122_0017_flux_action_layer_state_management.md)を参照

## 基本方針

### 設計原則

* **単一状態ツリー**: アプリケーション全体の状態を`ViewModel`で管理
  - ER図関連の状態は`ViewModel.erDiagram`（`ERDiagramViewModel`型）
  - グローバルUI状態は`ViewModel.ui`
  - ビルド情報キャッシュは`ViewModel.buildInfo`
* **純粋関数Action**: すべての状態更新は `action(viewModel, ...params) => newViewModel` の形式で実装
* **テスト容易性の最大化**: Actionを直接テストすることでロジックをカバー
  - ER図のビジネスロジック（ホバー、ハイライト、データ更新）
  - グローバルUI制御（選択、モーダル表示）
  - ビルド情報管理（キャッシュ、エラーハンドリング）

### 技術選定

* **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）
* **React Flowとの統合**: ドラッグ中はReact Flow内部状態を使用、確定時のみストアに反映
* **ホバー判定**: React Flowのイベントシステムを活用

## 状態設計

### ViewModel型定義

アプリケーション全体の状態を保持するルート型。型定義の詳細は[`scheme/main.tsp`](../scheme/main.tsp)を参照。

**型の構造**:
- `ViewModel`: アプリケーション全体のルート型
  - `erDiagram`: ER図の状態（`ERDiagramViewModel`型）
  - `ui`: グローバルUI状態（`GlobalUIState`型）
  - `buildInfo`: ビルド情報のキャッシュ（`BuildInfoState`型）
- `ERDiagramViewModel`: ER図関連の状態
  - `nodes`: エンティティノード（`Record<EntityNodeViewModel>`）
  - `edges`: リレーションシップエッジ（`Record<RelationshipEdgeViewModel>`）
  - `rectangles`: 矩形（`Record<Rectangle>`）
  - `ui`: ER図のUI状態（`ERDiagramUIState`型）
  - `loading`: リバースエンジニア処理中フラグ

**TypeSpecとフロントエンドの型変換**:
- TypeSpecでは`Set`や`Map`を配列で表現している
- フロントエンドでは配列を`Set`や`Map`に変換して使用する
  - 例: `highlightedNodeIds`は配列として定義されているが、実装では`Set`に変換してO(1)検索を実現
- TypeScript型は`npm run generate`で自動生成される

**ID仕様**:
- ID仕様の詳細は[`scheme/main.tsp`](../scheme/main.tsp)のコメントを参照

### UIフラグの保持方法

ハイライト状態は集合（Set）で保持し、個々のノード/エッジ/カラムに `isHighlighted` フラグを持たせない：

* **メリット**: ホバー時にハイライト対象のIDのみ更新するため、O(1)の更新で済む
* **判定方法**: 
  - ノード: `highlightedNodeIds.has(nodeId)`
  - エッジ: `highlightedEdgeIds.has(edgeId)`
  - カラム: `highlightedColumnIds.has(columnId)`

### ローカル状態で管理すべきもの

以下はViewModelに含めず、Reactコンポーネントのローカル状態で管理する：

* **React Flow内部状態**: ドラッグ中のノード位置（uncontrolledモードでパフォーマンス確保）
* **フォーム入力中の一時的な値**: 確定前のテキスト入力など

### ビルド情報について

`ViewModel.buildInfo`はビルド情報をキャッシュし、次の利点を提供する：

* **初期化時取得**: `GET /api/init`でアプリケーション起動時に取得（詳細は[ViewModelベースAPI仕様](./viewmodel_based_api.md)を参照）
* **キャッシュ**: モーダルを閉じても、次回開いたときに再取得不要
* **テスト容易性**: ビルド情報の状態をActionでテスト可能
* **状態の一元管理**: ビルド情報の状態をコンポーネント外で管理

**実装方法**:
- アプリケーション起動時に`commandInitialize`を実行し、`GET /api/init`から初期ViewModelを取得
- 初期ViewModelには既にビルド情報が含まれている
- `BuildInfoModal`は`viewModel.buildInfo.data`を表示するだけ

## Action層の設計

### Actionの定義

すべてのActionは以下の形式の純粋関数として定義：

```typescript
type ActionFn<Args extends any[] = any[]> = (
  viewModel: ViewModel,
  ...args: Args
) => ViewModel;
```

Actionは `ViewModel` 全体を受け取り、新しい `ViewModel` を返す。ER図関連のActionは `viewModel.erDiagram` のみを更新し、グローバルUI関連のActionは `viewModel.ui` を更新する。

### 主要なAction

#### ER図関連のAction

##### ホバー関連

* `actionHoverEntity(viewModel, entityId)`: エンティティにホバーした時
  - ホバー対象と隣接するノード・エッジ・関連カラムをハイライト対象に設定
  - `viewModel.erDiagram.ui.hover` と `highlightedXxxIds` を更新
  
* `actionHoverEdge(viewModel, edgeId)`: エッジにホバーした時
  - エッジと両端のノード、両端のカラム（IDで識別）をハイライト対象に設定
  
* `actionHoverColumn(viewModel, columnId)`: カラムにホバーした時
  - カラムと関連するエッジ・ノード・対応カラムをハイライト対象に設定
  
* `actionClearHover(viewModel)`: ホバーを解除した時
  - すべてのハイライトをクリア

##### データ更新関連

* `actionSetData(viewModel, nodes, edges)`: リバースエンジニア結果を設定
  - 既存のUI状態を保持したままデータ部分のみ更新
  - 注意: リバースエンジニアリング時に矩形データは返されない（矩形は手動で追加される）
  
* `actionUpdateNodePositions(viewModel, nodePositions)`: ノードドラッグ確定時の位置更新
  - `nodePositions`: `Array<{ id: string, x: number, y: number }>`
  
* `actionSetLoading(viewModel, loading)`: ローディング状態の更新（リバースエンジニア処理）

##### 矩形関連

* `actionAddRectangle(viewModel, rectangle)`: 矩形を追加
* `actionUpdateRectanglePosition(viewModel, rectangleId, x, y)`: 矩形の位置を更新
* `actionUpdateRectangleStyle(viewModel, rectangleId, style)`: 矩形のスタイルを更新
* `actionRemoveRectangle(viewModel, rectangleId)`: 矩形を削除

#### グローバルUI関連のAction

* `actionSelectRectangle(viewModel, rectangleId)`: 矩形を選択
  - `viewModel.ui.selectedRectangleId` を更新
  
* `actionDeselectRectangle(viewModel)`: 矩形の選択を解除
  - `viewModel.ui.selectedRectangleId` を null に設定
  
* `actionShowBuildInfoModal(viewModel)`: ビルド情報モーダルを表示
  - `viewModel.ui.showBuildInfoModal` を true に設定
  
* `actionHideBuildInfoModal(viewModel)`: ビルド情報モーダルを非表示
  - `viewModel.ui.showBuildInfoModal` を false に設定

#### ViewModel全体を更新するAction

* `actionSetViewModel(viewModel, newViewModel)`: ViewModel全体を更新（APIレスポンスの反映用）

### Actionの実装ルール

* 副作用を持たない（API呼び出し、DOM操作等を含まない）
* 状態に変化がない場合は同一参照を返す（再レンダリング抑制のため）
* 検索・計算処理はActionの中で実行可能（副作用ではない）

## Store実装

### Store API

```typescript
interface Store {
  getState: () => ViewModel;
  subscribe: (listener: () => void) => () => void;
  dispatch: <Args extends any[]>(action: ActionFn<Args>, ...args: Args) => void;
}
```

### Storeの責務

* ViewModelの保持と通知
* Action適用時の変化検知（参照比較）と購読者への通知
* 開発時の観測性（任意）: dispatchログ、action履歴の記録

### React統合

`useSyncExternalStore`を使った購読：

```typescript
function useViewModel<T>(selector: (vm: ViewModel) => T): T;
function useDispatch(): Store['dispatch'];
```

* `useViewModel(selector)`: 必要な部分だけ購読（再レンダリング最小化）
  - 例: `useViewModel(vm => vm.erDiagram.nodes)` でER図のノードだけを購読
  - 例: `useViewModel(vm => vm.ui.selectedRectangleId)` で選択中の矩形IDだけを購読
* `useDispatch()`: dispatch関数を取得

## React Flowとの統合

### 統合方針

**B案: ドラッグ中はReact Flow内部、確定だけVMへ**

* ドラッグ中の見た目はReact Flowに任せる（uncontrolledモード）
* `onNodeDragStop`で最終位置を取得し、`actionUpdateNodePositions`をdispatch
* エッジハンドルの再計算もドラッグ確定時に実行

### データフロー

1. **初期表示・更新時**
   - Store の `ViewModel.erDiagram` → React Flow の `nodes/edges` に変換（selector）
   - 変換は毎回実行されるが、参照が変わらなければReact Flowは再描画しない

2. **ドラッグ中**
   - React Flowが内部状態で位置を管理
   - Storeは更新しない

3. **ドラッグ確定時（onNodeDragStop）**
   - `getNodes()`で最終位置を取得
   - `actionUpdateNodePositions` をdispatch（`ViewModel.erDiagram.nodes`を更新）
   - エッジハンドル再計算を実行

### ホバー検出

React Flowのイベントを使用し、mousemoveは使わない：

* **エンティティノード**: カスタムノード内で `onMouseEnter`/`onMouseLeave` → Actionをdispatch
* **エッジ**: カスタムエッジ内で `onMouseEnter`/`onMouseLeave` → Actionをdispatch
* **カラム**: カスタムノード内のカラム要素で `onMouseEnter`/`onMouseLeave` → Actionをdispatch
  - カラムIDを使ってActionをdispatch（`actionHoverColumn(viewModel, columnId)`）

カラムホバーは `stopPropagation()` でエンティティホバーを抑制する。

## 非同期処理（API呼び出し）

### Command層

Actionは純粋関数のため、API呼び出しは別層（Command）で実施。

API仕様の詳細は[ViewModelベースAPI仕様](./viewmodel_based_api.md)を参照。

```typescript
async function commandInitialize(dispatch) {
  try {
    // GET /api/init から初期ViewModelを取得
    const viewModel = await api.init();
    // ViewModelをそのままストアに設定
    dispatch(actionSetViewModel, viewModel);
  } catch (error) {
    // エラーハンドリング
  }
}

async function commandReverseEngineer(dispatch, getState) {
  dispatch(actionSetLoading, true);
  try {
    // 現在のViewModelをリクエストとして送信
    const currentViewModel = getState();
    const viewModel = await api.reverseEngineer(currentViewModel);
    // レスポンスのViewModelでストアを更新
    dispatch(actionSetViewModel, viewModel);
  } catch (error) {
    // エラーハンドリング
  } finally {
    dispatch(actionSetLoading, false);
  }
}
```

### Commandの配置

* `src/commands/` ディレクトリに配置
* UIコンポーネントから直接呼び出し可能
* Commandはdispatch関数を受け取る

## テスト戦略

### Action単体テスト

すべてのビジネスロジックをActionの単体テストでカバー：

```typescript
describe('actionHoverEntity', () => {
  it('ホバーしたエンティティと隣接要素がハイライトされる', () => {
    const viewModel = createTestViewModel();
    const next = actionHoverEntity(viewModel, 'entity1');
    
    expect(next.erDiagram.ui.hover).toEqual({ type: 'entity', id: 'entity1' });
    expect(next.erDiagram.ui.highlightedNodeIds.has('entity1')).toBe(true);
    // ...
  });
});

describe('actionSelectRectangle', () => {
  it('矩形を選択する', () => {
    const viewModel = createTestViewModel();
    const next = actionSelectRectangle(viewModel, 'rect1');
    
    expect(next.ui.selectedRectangleId).toBe('rect1');
  });
});

describe('actionShowBuildInfoModal', () => {
  it('ビルド情報モーダルを表示する', () => {
    const viewModel = createTestViewModel();
    const next = actionShowBuildInfoModal(viewModel);
    
    expect(next.ui.showBuildInfoModal).toBe(true);
  });
});
```

* 入力（viewModel + params）と出力（newViewModel）の比較のみ
* React非依存でテスト可能
* テストは `public/tests/` に配置（バックエンドの `/tests/` と対称的な構成）
* **テスト可能な範囲の最大化**: グローバルUIやビルド情報管理もActionで実装することで、すべてのロジックをテスト可能にする

### テストツール

* テストフレームワーク: Vitest（既存と統一）

## 実装時の注意事項

### パフォーマンス

* selector購読により必要な部分だけ再描画される
* Actionで「変化がない場合は同一参照を返す」を徹底
* `React.memo` や `useMemo` でコンポーネント最適化

### DOMサイズの反映

現時点では不要と判断。今後の実装で必要になった場合に検討：

* `ResizeObserver` でサイズ監視
* `actionUpdateNodeSize(state, nodeId, width, height)` をdispatch

### 開発時の観測性

Redux DevTools相当はないが、以下で補完可能：

* Store内でdispatchログを出力（開発環境のみ）
* 直近N件のaction履歴を保持（デバッグ用）

### 段階的移行

既存コードからの移行手順：

1. `scheme/main.tsp`に`ViewModel`型と関連する型を追加（完了済み）
2. バックエンドAPIを新仕様に変更（[ViewModelベースAPI仕様](./viewmodel_based_api.md)参照）
3. Store・Action基盤を実装（`ViewModel`を状態として保持）
4. `commandInitialize`を実装し、アプリケーション起動時に`GET /api/init`を呼び出し
5. HoverContextのロジックをAction化し、Contextを廃止
6. ERCanvasの状態管理をStoreに移行
7. React Flow統合を調整（ドラッグ確定時の反映）
8. App.tsxのローカル状態（`selectedItem`, `showBuildInfoModal`, `showLayerPanel`）をStoreに移行
9. BuildInfoModalをキャッシュされたビルド情報を表示するだけに簡素化

### 初期状態の構築

アプリケーション起動時の初期状態は`GET /api/init`から取得する（詳細は[ViewModelベースAPI仕様](./viewmodel_based_api.md)を参照）。

**初期化フロー**:
1. アプリケーション起動時に`commandInitialize`を実行
2. `GET /api/init`から初期ViewModelを取得
3. ViewModelをそのままストアに設定

**初期ViewModelの内容**:
初期ViewModelの詳細な値は [ViewModelベースAPI仕様](/spec/viewmodel_based_api.md) の「GET /api/init」を参照。

**実装時の注意**:
- `highlightedNodeIds`、`highlightedEdgeIds`、`highlightedColumnIds`は、配列から`Set`に変換してパフォーマンスを最適化する（O(1)の検索性能）

## 懸念事項・確認事項

### 実現可能性

* **React Flowとの統合**: uncontrolledモードでも問題なく動作するか
  - React Flowは公式にcontrolled/uncontrolled両対応
  - `onNodeDragStop`で状態を同期する設計は一般的

* **ホバーパフォーマンス**: React Flowイベント経由でも十分な応答速度が得られるか
  - リサーチによれば、変化がある時だけ更新すれば問題ない
  - 集合で保持することでO(1)更新が可能

### 今後の検討事項

* DOMサイズの状態反映の必要性
* 開発時の観測性向上（action履歴ビューア等）
* Commandのエラーハンドリング戦略

## 型生成の確認

`npm run generate`を実行すると、[`scheme/main.tsp`](../scheme/main.tsp)で定義されたすべての型がTypeScript型として自動生成される。

- **バックエンド用**: `lib/generated/api-types.ts`
- **フロントエンド用**: `public/src/api/client/models/`

主要な型：`ViewModel`, `ERDiagramViewModel`, `GlobalUIState`, `BuildInfoState`, `EntityNodeViewModel`, `RelationshipEdgeViewModel`, `HoverTarget`, `BuildInfo`など。
