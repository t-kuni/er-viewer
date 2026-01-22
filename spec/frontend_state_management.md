# フロントエンド状態管理仕様

## 概要

本仕様書は、ER Diagram Viewerのフロントエンドにおける状態管理とテスト戦略を定義する。
単一状態ツリーと純粋関数による状態更新（Action層）を採用し、テスト容易性を最大化する。

関連仕様：
- ER図の描画とインタラクションについては[frontend_er_rendering.md](./frontend_er_rendering.md)を参照
- リサーチ背景は[research/20260122_0017_flux_action_layer_state_management.md](../research/20260122_0017_flux_action_layer_state_management.md)を参照

## 基本方針

### 設計原則

* **単一状態ツリー**: ER図に関するすべての状態を`ERDiagramViewModel`で管理
* **純粋関数Action**: すべての状態更新は `action(viewModel, ...params) => newViewModel` の形式で実装
* **テスト容易性**: Actionを直接テストすることでロジックをカバー

### 技術選定

* **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）
* **React Flowとの統合**: ドラッグ中はReact Flow内部状態を使用、確定時のみストアに反映
* **ホバー判定**: React Flowのイベントシステムを活用

## 状態設計

### ERDiagramViewModel型定義

ER図に関するすべての状態を保持する型：

```typescript
type ERDiagramViewModel = {
  // ERダイアグラムのデータ
  nodes: Record<string, EntityNodeViewModel>;
  edges: Record<string, RelationshipEdgeViewModel>;
  
  // UI状態
  ui: {
    // ホバー中の要素情報
    hover: HoverTarget;
    
    // ハイライト対象（集合で保持）
    highlightedNodeIds: Set<string>; // Entity IDs (UUID)
    highlightedEdgeIds: Set<string>; // Edge IDs (UUID)
    highlightedColumnIds: Set<string>; // Column IDs (UUID)
  };
  
  // ローディング状態
  loading: boolean;
};

type HoverTarget =
  | { type: 'entity'; id: string }
  | { type: 'edge'; id: string }
  | { type: 'column'; id: string }
  | null;
```

**TypeSpecとの関係**:
- `ERDiagramViewModel`、`EntityNodeViewModel`、`RelationshipEdgeViewModel`、`HoverTarget`はすべてTypeSpec（`scheme/main.tsp`）で定義されている
- TypeSpecでは`Set`や`Map`を配列で表現しているため、フロントエンドでは受け取ったデータを`Set`や`Map`に変換して使用する
- TypeSpecの型定義が単一の真実の情報源（Single Source of Truth）となる

**ID仕様**:
- すべての`id`フィールドはUUID（Universally Unique Identifier）
- UUIDは`crypto.randomUUID()`で生成
- 一度生成されたIDは保存され、増分更新時も維持される（永続性を持つ）
- 詳細は[typespec_api_definition.md](./typespec_api_definition.md)の「ID仕様の基本方針」を参照

### UIフラグの保持方法

ハイライト状態は集合（Set）で保持し、個々のノード/エッジ/カラムに `isHighlighted` フラグを持たせない：

* **メリット**: ホバー時にハイライト対象のIDのみ更新するため、O(1)の更新で済む
* **判定方法**: 
  - ノード: `highlightedNodeIds.has(nodeId)`
  - エッジ: `highlightedEdgeIds.has(edgeId)`
  - カラム: `highlightedColumnIds.has(columnId)`

## Action層の設計

### Actionの定義

すべてのActionは以下の形式の純粋関数として定義：

```typescript
type ActionFn<Args extends any[] = any[]> = (
  viewModel: ERDiagramViewModel,
  ...args: Args
) => ERDiagramViewModel;
```

### 主要なAction

#### ホバー関連

* `actionHoverEntity(viewModel, entityId)`: エンティティにホバーした時
  - ホバー対象と隣接するノード・エッジ・関連カラムをハイライト対象に設定
  
* `actionHoverEdge(viewModel, edgeId)`: エッジにホバーした時
  - エッジと両端のノード、両端のカラム（IDで識別）をハイライト対象に設定
  
* `actionHoverColumn(viewModel, columnId)`: カラムにホバーした時
  - カラムと関連するエッジ・ノード・対応カラムをハイライト対象に設定
  
* `actionClearHover(viewModel)`: ホバーを解除した時
  - すべてのハイライトをクリア

#### データ更新関連

* `actionSetData(viewModel, nodes, edges)`: リバースエンジニア結果を設定
  - 既存のUI状態を保持したままデータ部分のみ更新
  
* `actionUpdateNodePositions(viewModel, nodePositions)`: ノードドラッグ確定時の位置更新
  - `nodePositions`: `Array<{ id: string, x: number, y: number }>`
  
* `actionSetLoading(viewModel, loading)`: ローディング状態の更新

### Actionの実装ルール

* 副作用を持たない（API呼び出し、DOM操作等を含まない）
* 状態に変化がない場合は同一参照を返す（再レンダリング抑制のため）
* 検索・計算処理はActionの中で実行可能（副作用ではない）

## Store実装

### Store API

```typescript
interface Store {
  getState: () => ERDiagramViewModel;
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
function useERViewModel<T>(selector: (vm: ERDiagramViewModel) => T): T;
function useERDispatch(): Store['dispatch'];
```

* `useERViewModel(selector)`: 必要な部分だけ購読（再レンダリング最小化）
* `useERDispatch()`: dispatch関数を取得

## React Flowとの統合

### 統合方針

**B案: ドラッグ中はReact Flow内部、確定だけVMへ**

* ドラッグ中の見た目はReact Flowに任せる（uncontrolledモード）
* `onNodeDragStop`で最終位置を取得し、`actionUpdateNodePositions`をdispatch
* エッジハンドルの再計算もドラッグ確定時に実行

### データフロー

1. **初期表示・更新時**
   - Store の `ERDiagramViewModel` → React Flow の `nodes/edges` に変換（selector）
   - 変換は毎回実行されるが、参照が変わらなければReact Flowは再描画しない

2. **ドラッグ中**
   - React Flowが内部状態で位置を管理
   - Storeは更新しない

3. **ドラッグ確定時（onNodeDragStop）**
   - `getNodes()`で最終位置を取得
   - `actionUpdateNodePositions` をdispatch
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

Actionは純粋関数のため、API呼び出しは別層（Command）で実施：

```typescript
async function commandReverseEngineer(dispatch) {
  dispatch(actionSetLoading, true);
  try {
    const response = await api.reverseEngineer();
    // ReverseEngineerResponseからERDiagramViewModelを構築
    const viewModel = buildERDiagramViewModel(response.erData, response.layoutData);
    dispatch(actionSetData, viewModel.nodes, viewModel.edges);
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
    
    expect(next.ui.hover).toEqual({ type: 'entity', id: 'entity1' });
    expect(next.ui.highlightedNodeIds.has('entity1')).toBe(true);
    // ...
  });
});
```

* 入力（viewModel + params）と出力（newViewModel）の比較のみ
* React非依存でテスト可能
* テストは `public/tests/` に配置（バックエンドの `/tests/` と対称的な構成）

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

1. Store・Action基盤を実装（`ERDiagramViewModel`を状態として保持）
2. HoverContextのロジックをAction化し、Contextを廃止
3. ERCanvasの状態管理をStoreに移行
4. React Flow統合を調整（ドラッグ確定時の反映）

### 初期状態の構築

APIレスポンス（`ReverseEngineerResponse`）から受け取ったデータを`ERDiagramViewModel`に変換する際の処理：

```typescript
function createInitialViewModel(nodes: Record<string, EntityNodeViewModel>, edges: Record<string, RelationshipEdgeViewModel>): ERDiagramViewModel {
  return {
    nodes,
    edges,
    ui: {
      hover: null,
      highlightedNodeIds: [], // TypeSpecでは配列として定義されている
      highlightedEdgeIds: [],
      highlightedColumnIds: [],
    },
    loading: false,
  };
}
```

**注意**: フロントエンドで実際に使用する際は、`highlightedNodeIds`、`highlightedEdgeIds`、`highlightedColumnIds`を配列から`Set`に変換してパフォーマンスを最適化する（O(1)の検索性能）。

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
