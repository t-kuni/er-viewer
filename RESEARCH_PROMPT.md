# エンティティ選択状態機能とDDL表示に関する技術調査

## リサーチ要件

以下の機能を実現するための技術調査を行いたい：

* エンティティを選択状態にできるようにする
    * 選択状態にするとカーソルがエンティティから外れてもハイライトが維持される
    * 何もないところをクリックすると選択状態が解除される
    * ESCキーでも選択状態が解除される
    * エンティティを選択中はほかのエンティティやリレーションにホバーしてもハイライトが更新されない
    * 他のエンティティをクリックすると選択状態が解除される
    * エンティティを選択状態にすると右サイドバーが表示され、右サイドバーにはそのエンティティのDDLが表示される
        * DDLはsyntax highlightされている
* 上記を実現するのにライブラリは必要か？（特にsyntax highlightあたり）

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite + React 18 + React Flow v12
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec
- **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）

### 現状のフェーズ

- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- AIが作業するため学習コストは考慮不要

## 現在の実装状況

### 状態管理

アプリケーション全体の状態は`ViewModel`で管理され、純粋関数によるAction層で更新される。

**ViewModelの構造**:
```typescript
model ViewModel {
  erDiagram: ERDiagramViewModel;
  ui: GlobalUIState;
  buildInfo: BuildInfoState;
  settings: AppSettings;
}

model ERDiagramViewModel {
  nodes: Record<string, EntityNodeViewModel>;
  edges: Record<string, RelationshipEdgeViewModel>;
  rectangles: Record<string, Rectangle>;
  texts: Record<string, TextBox>;
  index: ERDiagramIndex;
  ui: ERDiagramUIState;
  loading: boolean;
}

model ERDiagramUIState {
  hover: HoverState | null;
  highlightedNodeIds: string[];  // ハイライト中のエンティティID
  highlightedEdgeIds: string[];  // ハイライト中のエッジID
  highlightedColumnIds: string[]; // ハイライト中のカラムID
  isDraggingEntity: boolean;
  // ...
}

model HoverState {
  type: "entity" | "edge" | "column";
  id: string;
}

model EntityNodeViewModel {
  id: string; // UUID
  name: string;
  x: float64;
  y: float64;
  columns: Column[];
  ddl: string; // CREATE TABLE文
}
```

### ホバーインタラクション機能

現在、エンティティ、エッジ、カラムのホバー時に関連要素をハイライトする機能が実装されている。

**実装ファイル**:
- `public/src/components/EntityNode.tsx`: エンティティノードコンポーネント（89行）
- `public/src/components/RelationshipEdge.tsx`: リレーションエッジコンポーネント（56行）
- `public/src/actions/hoverActions.ts`: ホバー時のアクション（ハイライト対象の計算）

**EntityNode.tsxの主要部分**:
```typescript
function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const dispatch = useDispatch()
  
  // このノードがハイライトされているかどうかだけを購読（最適化）
  const isHighlighted = useViewModel(
    (vm) => vm.erDiagram.ui.highlightedNodeIds.includes(data.id),
    (a, b) => a === b
  )
  
  return (
    <div 
      className={isHighlighted ? 'entity-node is-highlighted' : 'entity-node'}
      style={{ 
        border: isHighlighted ? '3px solid #007bff' : '1px solid #333', 
        borderRadius: '4px', 
        background: 'white',
        minWidth: '200px',
        boxShadow: isHighlighted ? '0 4px 12px rgba(0, 123, 255, 0.4)' : 'none',
        zIndex: isHighlighted ? 1000 : 1,
      }}
      onMouseEnter={() => dispatch(actionHoverEntity, data.id)}
      onMouseLeave={() => dispatch(actionClearHover)}
    >
      {/* エンティティ名とカラム一覧 */}
    </div>
  )
}
```

**ホバーアクション**:
- `actionHoverEntity(viewModel, entityId)`: エンティティにホバーした時
- `actionHoverEdge(viewModel, edgeId)`: エッジにホバーした時
- `actionHoverColumn(viewModel, columnId)`: カラムにホバーした時
- `actionClearHover(viewModel)`: ホバーを解除した時

### グローバルUI状態管理

現在、矩形とテキストについては「選択」機能が実装されている。

**GlobalUIState型**:
```typescript
model GlobalUIState {
  selectedItem: ItemRef | null;  // 選択中のアイテム（矩形・テキスト）
  showBuildInfoModal: boolean;
  showLayerPanel: boolean;
  // ...
}

model ItemRef {
  kind: "rectangle" | "text";
  id: string;
}
```

**選択関連のAction**:
- `actionSelectItem(viewModel, itemRef)`: アイテム（矩形・テキスト）を選択
- `actionDeselectItem(viewModel)`: アイテムの選択を解除

### パフォーマンス最適化

現在の実装では以下のパフォーマンス最適化が施されている：

* **selector最適化**: 各コンポーネントが「自分がハイライトされているか」という真偽値だけを購読する
  - `useViewModel(vm => vm.erDiagram.ui.highlightedNodeIds.includes(nodeId), (a, b) => a === b)`
  - これにより、ホバー時に再レンダリングされるコンポーネントは「ハイライト状態が変化したコンポーネントのみ」に限定される
* **React.memoとuseCallback**: コンポーネントとイベントハンドラーをメモ化し、不要な再レンダリングを防ぐ
* **Action最適化**: 状態に変化がない場合は同一参照を返す（再レンダリング抑制）
* **逆引きインデックス**: `ERDiagramIndex`でホバー時の関連要素検索をO(1)で実現

エンティティは多くて300個程度を想定している。

### React Flowとの統合

React Flowのuncontrolledモードを使用し、ドラッグ中はReact Flow内部で状態管理、ドラッグ確定時のみViewModelに反映している。

**React Flowのイベント**:
- エンティティクリックは`onNodeClick`イベントで検出可能
- 空白領域クリックは`onPaneClick`イベントで検出可能
- キーボードイベントは親コンテナで検出する必要がある

## 要求される機能の詳細

### 選択状態とホバー状態の関係

現在のホバー状態機能に加えて、新たに「選択状態」を実装する必要がある。

**期待される動作**:

1. **選択前（現在の動作と同じ）**:
   - エンティティにホバー → ハイライト表示
   - カーソルを外す → ハイライト解除

2. **エンティティをクリックして選択**:
   - エンティティがハイライトされた状態を維持（カーソルを外してもハイライト継続）
   - 右サイドバーが表示され、そのエンティティのDDLが表示される
   - 他のエンティティやリレーションにホバーしてもハイライトが更新されない（選択中のエンティティのハイライトを維持）

3. **選択解除**:
   - 何もないところをクリック → 選択解除、右サイドバーを閉じる
   - ESCキーを押す → 選択解除、右サイドバーを閉じる
   - 他のエンティティをクリック → 前の選択を解除し、新しいエンティティを選択

### DDL表示とSyntax Highlight

右サイドバーには選択されたエンティティのDDL（CREATE TABLE文）を表示する。

**DDLの取得**:
- `EntityNodeViewModel.ddl`フィールドにCREATE TABLE文が格納されている
- 例: `"CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(255)\n)"`

**表示要件**:
- DDLをSQLとしてsyntax highlightする必要がある
- シンタックスハイライトは見やすさのためのものであり、編集機能は不要
- 読み取り専用の表示で十分

## 検討してほしいこと

### 1. 状態管理の設計

**選択状態の保持方法**:

現在の`GlobalUIState`では`selectedItem`が矩形・テキストの選択を保持している。エンティティの選択状態をどのように保持するべきか？

**Option A**: `GlobalUIState`に`selectedEntity: string | null`を追加
```typescript
model GlobalUIState {
  selectedItem: ItemRef | null;  // 矩形・テキストの選択
  selectedEntity: string | null; // エンティティの選択（NEW）
  showBuildInfoModal: boolean;
  showLayerPanel: boolean;
  // ...
}
```

**Option B**: `selectedItem`を拡張して全てのアイテムタイプを扱う
```typescript
model ItemRef {
  kind: "rectangle" | "text" | "entity";  // "entity"を追加
  id: string;
}
```

**Option C**: `ERDiagramUIState`に`selectedEntityId: string | null`を追加
```typescript
model ERDiagramUIState {
  hover: HoverState | null;
  selectedEntityId: string | null; // エンティティの選択（NEW）
  highlightedNodeIds: string[];
  // ...
}
```

どのOptionが最も適切か？それぞれのメリット・デメリットは？

**選択時のホバー動作の制御**:

エンティティ選択中は、他のエンティティやリレーションにホバーしてもハイライトが更新されないようにする必要がある。これをどのように実現するべきか？

- `actionHoverEntity`などのActionで、選択状態をチェックして早期リターンする？
- コンポーネント側で`onMouseEnter`イベントハンドラーを条件付きで無効化する？

**パフォーマンスへの影響**:

選択状態の追加により、パフォーマンスに影響があるか？特に300個のエンティティが存在する場合、選択/解除時の再レンダリングコストは問題にならないか？

### 2. UIレイアウトの設計

**右サイドバーの実装方針**:

右サイドバーは新規コンポーネントとして実装する必要がある。

**考慮すべき点**:
- サイドバーの幅はどの程度が適切か？（DDLを読みやすく表示するために十分な幅）
- サイドバーの表示/非表示アニメーションは必要か？（プロトタイプなので不要かもしれない）
- サイドバーがある場合、ER図キャンバスの表示領域は縮小するべきか？それとも重ねて表示するべきか？
- 現在、左側にレイヤーパネル（`LayerPanel`）がある。右サイドバーと同様のスタイルにするべきか？

### 3. Syntax Highlightライブラリの選定

DDLをSQLとしてsyntax highlightするために、ライブラリが必要か？

**要件**:
- SQLのsyntax highlightに対応している
- React 18で動作する
- 読み取り専用の表示（コードエディタである必要はない）
- 軽量で、プロトタイプに適している
- 2026年時点で活発にメンテナンスされている

**検討してほしいライブラリ**:
- `react-syntax-highlighter`: React用のシンタックスハイライトライブラリとして有名
- `highlight.js` + Reactラッパー
- `prism-react-renderer` + Prism.js
- その他の軽量ライブラリ

**ライブラリなしでの実装**:
- CSSのみでsyntax highlightする方法はあるか？（正規表現でトークン化など）
- ライブラリなしの場合、実装の複雑さとメンテナンス性はどうか？

**推奨ライブラリ**:
- 最も適したライブラリはどれか？
- メジャーバージョンと最新バージョンは？
- インストールコマンドと基本的な使い方の例

### 4. React Flowとの統合

**クリックイベントの処理**:

React Flowでエンティティのクリックと空白領域のクリックを区別する方法：
- `onNodeClick`: エンティティクリック時
- `onPaneClick`: 空白領域クリック時

これらのイベントハンドラーで、選択/解除のActionをdispatchする設計で問題ないか？

**キーボードイベントの処理**:

ESCキーで選択解除する機能について：
- React Flowコンテナで`onKeyDown`イベントをリスンする？
- それとも親コンポーネント（`App.tsx`や`ERCanvas.tsx`）でリスンする？
- `tabIndex`や`focus`の制御が必要か？

### 5. 実装の優先順位と段階的アプローチ

実装を段階的に進める場合、どのような順序が適切か？

**フェーズ1**:
- 選択状態の状態管理を実装
- エンティティクリック・空白クリックで選択/解除

**フェーズ2**:
- ESCキーで選択解除
- 選択中のホバー無効化

**フェーズ3**:
- 右サイドバーの実装（DDL表示なし）
- レイアウト調整

**フェーズ4**:
- DDLのsyntax highlight表示

このような段階的アプローチで問題ないか？より効率的な順序はあるか？

## 期待する回答

以下について、具体的な見解と実装案を提示してほしい：

### 1. 状態管理の設計案

- 選択状態をどのように保持するべきか？（Option A/B/Cのどれが最適か？）
- 選択時のホバー動作をどのように制御するべきか？
- パフォーマンスへの影響と対策

### 2. UIレイアウトの設計案

- 右サイドバーの幅とレイアウト
- ER図キャンバスとの関係（縮小 vs 重ねて表示）
- 既存のレイヤーパネルとのスタイル統一

### 3. Syntax Highlightライブラリの推奨

- 最も適したライブラリとその理由
- メジャーバージョンと最新バージョン
- インストール方法と基本的な使い方
- ライブラリなしで実装する場合の実現可能性と複雑さ

### 4. イベント処理の実装方法

- React Flowのクリックイベント処理の具体的な実装方法
- キーボードイベント（ESCキー）の処理方法

### 5. 実装計画

- 段階的な実装の推奨順序
- 各フェーズで実装すべき具体的な内容
- 実装時の注意点

### 6. 他のReact Flowプロジェクトでの事例

- React Flowを使った他のプロジェクトで、ノード選択機能はどのように実装されているか？
- サイドパネルとの連携のベストプラクティスは？

## 参考情報

### 関連仕様書

- `spec/frontend_state_management.md`: フロントエンド状態管理仕様（状態設計、Action層、パフォーマンス最適化）
- `spec/frontend_er_rendering.md`: フロントエンドER図レンダリング仕様（ホバーインタラクションセクション含む）
- `spec/viewmodel_based_api.md`: ViewModelベースAPI仕様

### 関連する実装ファイル

- `public/src/components/EntityNode.tsx`: エンティティノードコンポーネント（89行）
- `public/src/components/ERCanvas.tsx`: ER図描画コンポーネント（React Flowのコンテナ）（831行）
- `public/src/components/App.tsx`: アプリケーションのルートコンポーネント（275行）
- `public/src/actions/hoverActions.ts`: ホバー時のアクション
- `public/src/actions/globalUIActions.ts`: グローバルUI関連のアクション
- `public/src/store/erDiagramStore.ts`: 状態管理ストア

### TypeSpecスキーマ

- `scheme/main.tsp`: アプリケーション全体の型定義（330行）

### 使用しているライブラリ

- React 18
- React Flow v12（`@xyflow/react`）
- TypeScript
- Vite

## 補足

- 本プロジェクトはMVPフェーズであり、完璧な解決策よりも実用的な解決策を優先する
- パフォーマンスは重要だが、セキュリティや後方互換性は考慮不要
- 実装の学習コストは問題ない（AIが実装するため）
- ユーザーがエンティティを選択した際に、DDLを簡単に確認できる状態を実現したい
