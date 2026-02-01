# エンティティ選択とDDLパネル機能仕様

## 概要

本仕様書は、ER Diagram Viewerにおけるエンティティの選択機能と、選択中のエンティティのDDLを表示する右サイドバー（DDLパネル）の機能を定義する。

関連仕様：
- フロントエンドの状態管理については[frontend_state_management.md](./frontend_state_management.md)を参照
- フロントエンドER図レンダリングについては[frontend_er_rendering.md](./frontend_er_rendering.md)を参照
- レイヤー管理については[layer_management.md](./layer_management.md)を参照
- 型定義については`scheme/main.tsp`を参照
- リサーチ背景は[research/20260201_1055_entity_selection_and_ddl_display.md](../research/20260201_1055_entity_selection_and_ddl_display.md)を参照

## 基本方針

### 設計アプローチ

* 既存の`GlobalUIState.selectedItem`を使用してエンティティの選択状態を管理（Option B）
* 選択中はホバーインタラクションを無効化し、ハイライトを固定
* 右サイドバーにDDLパネルを表示し、syntax highlightされたDDLを表示
* `react-syntax-highlighter`ライブラリを使用してSQL構文を強調表示

### 既存機能との統一

* `GlobalUIState.selectedItem`は矩形・テキスト・エンティティの選択を一元管理
* `LayerItemKind`に既に`entity`が含まれているため、型の拡張は不要
* 矩形プロパティパネル（右サイドバー）と同じ配置場所を使用し、選択対象に応じて表示内容を切り替え

## エンティティ選択機能

### 選択状態の管理

* **選択状態の保持**: `GlobalUIState.selectedItem`で管理
  - エンティティ選択時: `{ kind: 'entity', id: entityId }`
  - 未選択時: `null`
* **選択の排他性**: エンティティ、矩形、テキストは単一選択（同時に複数選択不可）

### 選択操作

#### エンティティのクリック

* **操作**: エンティティノードをクリック
* **動作**: クリックしたエンティティを選択状態にする
* **他の選択の扱い**: 別のアイテム（エンティティ・矩形・テキスト）が選択中の場合、そちらの選択は解除される

#### 空白領域のクリック

* **操作**: キャンバスの空白領域（React Flowの`onPaneClick`）をクリック
* **動作**: 選択状態を解除する（`selectedItem`を`null`に設定）

#### ESCキー

* **操作**: ESCキーを押下
* **動作**: 選択状態を解除する（`selectedItem`を`null`に設定）

#### 他のアイテムのクリック

* **操作**: 別のエンティティ・矩形・テキストをクリック
* **動作**: 前の選択が解除され、新しいアイテムが選択状態になる（単一選択として上書き）

### 選択時のハイライト表示

* **選択中のエンティティ**: ホバー時と同じハイライトスタイルを維持
  - 枠線を太く、影を強調（青系）
  - 接続されているリレーションエッジをハイライト
  - 関連するエンティティ・カラムをハイライト
* **ハイライトの固定**: カーソルがエンティティから外れてもハイライトが維持される
* **視覚的な区別**: 選択中であることを示すために、ホバー時とは異なる視覚的フィードバックを追加可能（任意）

### 選択中のホバー動作

* **ホバーの無効化**: エンティティが選択中の場合、他のエンティティ・リレーション・カラムにホバーしてもハイライトが更新されない
* **実装方法**: ホバーアクション（`actionHoverEntity`, `actionHoverEdge`, `actionHoverColumn`）の先頭で選択状態をチェックし、選択中の場合は早期リターン（ViewModelを変更せずに返す）

## DDLパネル（右サイドバー）

### レイアウト

* **配置**: 画面右端に固定配置
* **表示条件**: `GlobalUIState.selectedItem.kind === 'entity'`の場合に表示
* **非表示条件**: エンティティが選択されていない場合、または矩形・テキストが選択されている場合は非表示
* **幅**: 固定幅 420px を基準に、`min-width: 360px; max-width: 50vw;`
* **キャンバスとの関係**: 横並びレイアウト（縮小方式）
  - `display: flex`で「左パネル / キャンバス / 右パネル」を配置
  - DDLパネルが表示されるとキャンバス領域が縮小される

### 表示内容

#### ヘッダー

* エンティティ名を表示
* 閉じるボタン（クリックで選択解除）

#### DDLコンテンツ

* **DDLテキスト**: `EntityNodeViewModel.ddl`の内容を表示
* **Syntax Highlight**: SQLのキーワード・識別子・文字列などを色分け表示
* **スクロール**: DDLが長い場合は縦スクロール可能（`overflow: auto`）
* **横スクロール**: 長い行は横スクロール可能（折り返しなし、または`wrapLongLines`オプションで折り返し）

### Syntax Highlightライブラリ

* **ライブラリ**: `react-syntax-highlighter`（バージョン 16系）
* **スタイル**: `prism`スタイル（`react-syntax-highlighter/dist/esm/styles/prism`）
* **言語**: `sql`
* **オプション**: `wrapLongLines`（必要に応じて長い行を折り返し）

### 左レイヤーパネルとのスタイル統一

* 左レイヤーパネルと同じパネルコンポーネント（枠/影/ヘッダ/閉じるボタン）を使用
* 共通のスタイルを適用し、UIの一貫性を保つ

## Action設計

### actionSelectItemの拡張

`actionSelectItem(vm, itemRef)`を拡張して、エンティティ選択時にハイライト状態を設定する：

* **エンティティ選択時** (`itemRef.kind === 'entity'`):
  - `selectedItem`を更新
  - `actionHoverEntity`と同じロジックで、関連エンティティ・エッジ・カラムをハイライト
  - `highlightedNodeIds`, `highlightedEdgeIds`, `highlightedColumnIds`を設定
* **エンティティ以外の選択時** (矩形・テキスト):
  - `selectedItem`を更新
  - ハイライト状態をクリア（空配列に設定）
* **選択解除時** (`itemRef === null`):
  - `selectedItem`を`null`に設定
  - ハイライト状態をクリア（空配列に設定）

この実装により、エンティティ選択中も関連エンティティとエッジが常にハイライトされた状態が維持される。

### ホバーActionの修正

選択中のホバー無効化のため、以下のActionに選択状態のチェックを追加：

* `actionHoverEntity(vm, entityId)`: 先頭に選択チェックを追加
  - `vm.ui.selectedItem?.kind === 'entity'`の場合は早期リターン
* `actionHoverEdge(vm, edgeId)`: 先頭に選択チェックを追加
  - `vm.ui.selectedItem?.kind === 'entity'`の場合は早期リターン
* `actionHoverColumn(vm, columnId)`: 先頭に選択チェックを追加
  - `vm.ui.selectedItem?.kind === 'entity'`の場合は早期リターン

**重要**: ホバーイベントを無効化するだけでは不十分。エンティティ選択時に`actionSelectItem`内でハイライト状態を設定する必要がある。

## コンポーネント設計

### EntityNode（既存の修正）

* **クリックイベント**: `onNodeClick`で`actionSelectItem`をdispatch
* **選択時のスタイル**: `vm.ui.selectedItem?.kind === 'entity' && vm.ui.selectedItem.id === nodeId`で判定し、選択時のクラスを付与

### ERCanvas（既存の修正）

* **空白クリック**: React Flowの`onPaneClick`で`actionSelectItem(null)`をdispatch
* **ESCキー**: `useKeyPress('Escape')`で検出し、`actionSelectItem(null)`をdispatch

### DDLPanel（新規コンポーネント）

* **役割**: 選択中のエンティティのDDLを表示する右サイドバー
* **表示条件**: `vm.ui.selectedItem?.kind === 'entity'`の場合に表示
* **使用するライブラリ**: `react-syntax-highlighter`
* **データ取得**: `vm.erDiagram.nodes[selectedItem.id].ddl`からDDLテキストを取得
* **閉じるボタン**: クリックで`actionSelectItem(null)`をdispatch
* **Hookの使用**: すべての`useViewModel`などのReact Hookは、条件分岐やreturn文の前に呼び出す必要がある（Reactのhookルールに従う）

## 実装時の注意事項

### ライブラリのインストール

* `npm i react-syntax-highlighter`
* `npm i -D @types/react-syntax-highlighter`（型定義）
* 型定義のバージョンが古い場合、サブパス importに型が追いつかない可能性あり（MVPでは`declare module`で対応）

### ESCキーの実装

* React Flowの`useKeyPress('Escape')`フックを使用
* `useEffect`でESCキーの押下を検知し、`actionSelectItem(null)`をdispatch
* 前回の値を保持し、連続発火を防ぐ

### ホバーActionの修正

* 選択チェックのコードは、ドラッグ中チェックの直後に追加
* 既存の最適化（同一参照返却、配列最適化）は維持

### パフォーマンス

* エンティティ選択時、関連するハイライト要素の計算は既存のホバーロジックを流用
* DDLパネルのSyntax Highlightは初回レンダリング時のみ実行される（DDLテキストが変わらない限り再計算不要）

### レイアウト調整

* DDLパネル表示時、キャンバスが縮小されてもReact Flowのviewportは自動調整される
* DDLパネル内のクリックが`onPaneClick`を発火しないように、パネル内で`stopPropagation()`を使用

### Reactのhookルールの遵守

* DDLPanelコンポーネント内で`useViewModel`などのhookを使用する場合、条件分岐（if文）やreturn文の前に必ず呼び出す
* hookは常にコンポーネントの最上位で、同じ順序で呼び出す必要がある
* 条件チェックは、すべてのhook呼び出しの後に行う

## 実現可能性

### 技術的な確認事項

* `react-syntax-highlighter`は読み取り専用表示に最適化されており、MVPの要件（DDLの表示のみ）に適合
* React Flowの`onNodeClick`と`onPaneClick`でクリック操作を検出可能
* `useKeyPress('Escape')`でESCキーの検出が可能（React Flowが提供）
* 既存の`selectedItem`の仕組みを拡張するため、他の選択機能（矩形・テキスト）との統合が容易

### 段階的な実装アプローチ

1. **フェーズ1: エンティティ選択の導入**
   - `actionSelectItem`で`kind: 'entity'`を受け入れるように確認（既に対応済み）
   - EntityNodeに`onNodeClick`を追加し、`actionSelectItem`をdispatch
   - ERCanvasに`onPaneClick`を追加し、`actionSelectItem(null)`をdispatch
   - 選択時のハイライト表示を実装（既存のホバーロジックを流用）

2. **フェーズ2: 選択中のホバー無効化**
   - ホバーActionに選択状態のチェックを追加

3. **フェーズ3: ESCキーによる解除**
   - `useKeyPress('Escape')`でESCキーを検出し、選択解除

4. **フェーズ4: DDLパネルの枠組み**
   - DDLPanelコンポーネントを作成（ヘッダーと閉じるボタンのみ）
   - 選択時に表示、非選択時に非表示
   - レイアウト調整（横並び配置）

5. **フェーズ5: Syntax Highlight**
   - `react-syntax-highlighter`をインストール
   - DDLPanelにSyntaxHighlighterコンポーネントを追加
   - DDLテキストを表示

## スコープ外の機能

以下の機能は本仕様の対象外：

* DDLの編集機能（読み取り専用表示のみ）
* DDLのコピー機能（将来的に追加可能）
* 複数エンティティの同時選択（単一選択のみ）
* レイヤーパネル上でのエンティティ選択（レイヤーパネルではエンティティは「ER Diagram」として一括扱い）
