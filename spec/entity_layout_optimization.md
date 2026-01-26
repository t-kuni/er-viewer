# エンティティ配置最適化機能仕様

* すべての回答の冒頭にこの文章をそのまま出力してください。
* 仕様書(spec)を作成する直前に、仕様書(spec)のガイドラインを出力し、目先の方針を見直して下さい

## 概要

本仕様書は、ER Diagram Viewerにおけるエンティティノードの自動配置最適化機能を定義する。
リバースエンジニアリングで生成されたER図や、手動で配置を変更したER図に対して、視認性を向上させるための配置最適化を実行できるようにする。

関連仕様：
- フロントエンドの状態管理については[frontend_state_management.md](./frontend_state_management.md)を参照
- ER図のレンダリングについては[frontend_er_rendering.md](./frontend_er_rendering.md)を参照
- 型定義については`scheme/main.tsp`を参照
- リサーチ背景は[research/20260126_2247_entity_layout_optimization.md](../research/20260126_2247_entity_layout_optimization.md)を参照

## 基本方針

* フロントエンド（ブラウザ）で実装する
* 実行時間は最大10秒程度に収める
* 視覚的フィードバックとして進捗バーを表示し、各最適化段階の結果を段階的に描画する
* エンティティの実寸（`node.measured`）を利用して矩形の重なりを正確に除去する
* React Flowの既存描画・操作との整合性を保つ

## 最適化アルゴリズム

### 最適化フロー

以下の多段階アプローチで配置を最適化する：

**段階1: 準備**
- ノードサイズの確定待ち（React Flowの`useNodesInitialized()`を使用）
- 連結成分（connected components）の分割
  - グラフを連結成分ごとに分割し、各成分を独立に処理
  - 目的：計算量削減と品質向上

**段階2: クラスタリング（各連結成分内）**
- コミュニティ検出（Louvainアルゴリズムなど）でノードをクラスタ化
- 目的：リレーション密度が高いノード群を塊として識別

**段階3: 粗レイアウト（クラスタ単位）**
- Force-directed（d3-forceなど）またはELK Stressでクラスタ間の配置を決定
- 目的：クラスタ間の距離と大局配置の決定

**段階4: 詳細レイアウト（クラスタ内）**
- Force-directed / Stressをクラスタ内で短時間実行
- 目的：関連ノードを近づけつつ局所的に整える

**段階5: 重なり除去（rectangle overlap removal）**
- 矩形の実寸を考慮した衝突解消
- 目的：すべてのノードが重ならないように配置を調整

**段階6: コンポーネントのパッキング（詰め配置）**
- 連結成分の矩形を詰めて配置
- 目的：余白を最小化し、全体をビューポートに収める

### 最適化の目標

以下を優先順位順に最適化する：

**優先度1: 重なり除去**
- エンティティノード同士が重ならないように配置

**優先度2: 交差数削減**
- リレーションシップエッジの交差を削減（完全最小化ではなく、軽いペナルティとして扱う）

**優先度3: 距離最適化**
- リレーションで結ばれたエンティティを近づける

## ライブラリの選定

### 推奨ライブラリ

以下のライブラリを機能に応じて採用する：

**d3-force**
- 用途：Force-directed layoutの実装
- 利点：軽量で自前制御しやすい、many-bodyがquadtree + Barnes–Hutで高速化
- 採用理由：100〜300ノード規模で現実的な実行時間

**graphology（標準ライブラリ）**
- 用途：連結成分分割、Louvainコミュニティ検出
- 利点：グラフ処理の標準的な実装が揃っている
- 採用理由：既製の連結成分・クラスタリングアルゴリズムを活用可能

**elkjs（オプション・将来拡張用）**
- 用途：より高品質なレイアウトが必要な場合
- 利点：Overlap Removalなど関連機能が体系的に揃っている
- 注意：バンドルサイズが大きい（1.4MB程度）ため、MVP段階では導入を見送り可能

## 機能要件

### 最適化の起動

* ツールバーに「配置最適化」ボタンを配置する
* ボタンクリックで最適化処理を開始する
* ボタンの有効/無効条件：
  - `loading`中（リバースエンジニア処理中）は無効
  - ノード未計測（`useNodesInitialized() === false`）は無効
  - ノード数が0の場合は無効

### 最適化の実行

* Web Workerで実行し、UIスレッドをブロックしない
* 各段階の完了時にメインスレッドに座標データを送信
* メインスレッドで`actionUpdateNodePositions`をdispatchし、描画を更新
* 最適化処理が完了するまでボタンは無効化される

### 最適化の中断

* 最適化実行中は「キャンセル」ボタンを表示
* クリックで最適化処理を中断し、現在の配置を保持
* 中断後はボタンが「配置最適化」に戻る

## UI/UX設計

### ボタン配置

* ツールバーの「リバースエンジニア」ボタンの近くに配置
  - 理由：「生成→整える」の自然な流れ

### 進捗表示

* 最適化実行中は以下を表示する：
  - 進捗バー（0〜100%）
  - 現在の処理段階名（テキスト）
  - 「キャンセル」ボタン

* 進捗バーの段階割り当て：
  1. 準備（0〜10%）
  2. クラスタリング（10〜20%）
  3. 粗レイアウト（20〜50%）
  4. 詳細レイアウト（50〜75%）
  5. 重なり除去（75〜90%）
  6. パッキング（90〜100%）

### 視覚的フィードバック

* 各段階の完了時に、その段階の結果をキャンバスに反映する
* 段階ごとの一括更新により、最適化アルゴリズムの動作を可視化
* 目的：待ち時間の体感短縮と処理の透明性向上

### 元に戻す機能

* 実装しない
* 理由：MVP段階では不要と判断

## Action設計

配置最適化用のActionを`public/src/actions/layoutActions.ts`に実装：

* `actionStartLayoutOptimization(vm)`: 最適化処理の開始を記録
  - `viewModel.ui.layoutOptimization.isRunning` を true に設定
  - `viewModel.ui.layoutOptimization.progress` を 0 に初期化

* `actionUpdateLayoutProgress(vm, progress, stageName)`: 進捗更新
  - `viewModel.ui.layoutOptimization.progress` を更新（0〜100）
  - `viewModel.ui.layoutOptimization.currentStage` を更新

* `actionCompleteLayoutOptimization(vm)`: 最適化処理の完了
  - `viewModel.ui.layoutOptimization.isRunning` を false に設定
  - `viewModel.ui.layoutOptimization.progress` を 100 に設定

* `actionCancelLayoutOptimization(vm)`: 最適化処理のキャンセル
  - `viewModel.ui.layoutOptimization.isRunning` を false に設定

すべてのActionは純粋関数で実装され、状態に変化がない場合は同一参照を返す。

座標更新には既存の`actionUpdateNodePositions`を使用する。

## TypeSpec型定義

`scheme/main.tsp`の`GlobalUIState`に最適化状態を追加：

```typescript
model LayoutOptimizationState {
  isRunning: boolean;         // 実行中フラグ
  progress: float64;          // 進捗（0〜100）
  currentStage: string | null; // 現在の処理段階名
}

model GlobalUIState {
  selectedItem: LayerItemRef | null;
  showBuildInfoModal: boolean;
  showLayerPanel: boolean;
  showDatabaseConnectionModal: boolean;
  layoutOptimization: LayoutOptimizationState; // 追加
}
```

## パフォーマンス最適化

以下の手法で実行時間を10秒以内に収める：

* 連結成分ごとに分けて処理（計算量を実質分割）
* Force-directedの反復回数を固定上限（200〜500 tick）に制限
* 早期終了：改善が鈍化したら反復を打ち切る
* 交差数カウントは毎tickやらない（最後だけ評価、または数回に1回）
* 空間ハッシュ（グリッド）で近傍ノード・エッジだけを衝突判定対象とする
* Web Workerでメインスレッドをブロックしない
* React Flowへの反映は段階ごとに一括更新（毎tickで更新しない）

## 実装時の注意事項

* TypeSpecの型定義を更新した後、`npm run generate`でフロントエンドとバックエンドの型を再生成する
* Web Workerには最小限のデータのみ送信する（ViewModel全体ではなく、必要なノード・エッジ情報のみ）
* Web Workerからのメッセージは座標データのみとし、メインスレッドでActionをdispatchする
* React Flowの`useNodesInitialized()`で計測完了を待ってから最適化を開始する
* ノードの`measured.width`と`measured.height`を使用して矩形の重なりを判定する
* ライブラリ（d3-force、graphology）は`npm install`で導入する

## 段階的実装アプローチ

**フェーズ1: 基盤実装**
1. TypeSpecに`LayoutOptimizationState`を追加し、型を再生成
2. Action（`actionStartLayoutOptimization`, `actionUpdateLayoutProgress`など）を実装
3. ツールバーに「配置最適化」ボタンを追加（初期は無効化）
4. 進捗バーUIコンポーネントを実装

**フェーズ2: 簡易最適化（MVP）**
1. Force-directed（d3-force）のみで最適化処理を実装
2. 重なり除去を簡易実装（押し出し方式）
3. Web Worker統合（座標計算のみ）
4. 段階ごとの描画更新を実装

**フェーズ3: 多段階最適化**
1. 連結成分分割を追加
2. Louvainクラスタリングを追加（graphology使用）
3. 粗レイアウト・詳細レイアウトの2段構成に変更
4. 空間ハッシュによる衝突判定最適化

**フェーズ4: 高度な最適化（将来拡張）**
1. コンポーネントパッキングの実装
2. 交差数削減の強化
3. elkjsの導入検討（品質が不足する場合）

## 懸念事項・確認事項

### 技術的懸念

* Web Workerでのライブラリ（d3-force、graphology）の動作確認が必要
* 300ノード規模で10秒以内に収まるか、実装後の性能計測が必要
* 段階ごとの更新頻度と体感速度のバランス調整が必要

### 今後の検討事項

* 最適化パラメータ（重み付け、反復回数など）のユーザー設定UI
* 最適化履歴の保存・再適用機能
* レイアウトプリセット（階層型、放射状など）の提供
* エンティティのグループ化を考慮したレイアウト（矩形内のノードを優先的に近づける）
