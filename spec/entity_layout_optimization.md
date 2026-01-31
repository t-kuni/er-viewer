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
- リサーチ背景：
  - 初期調査：[research/20260126_2247_entity_layout_optimization.md](../research/20260126_2247_entity_layout_optimization.md)
  - 改善案：[research/20260131_1208_entity_layout_optimization_improvement.md](../research/20260131_1208_entity_layout_optimization_improvement.md)

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
  - 実リレーションのみを使用してグラフを連結成分ごとに分割
  - `graphology`の`connectedComponents`を使用
  - 各成分を独立に処理することで計算量削減と品質向上
- 名前類似度の計算
  - 全エンティティペアに対して名前類似度を算出
  - 各ノードにつき上位k件（k=3〜5）を類似エッジとして記録
  - ただし類似度が0.35未満のペアは除外

**段階2: 各連結成分内の配置最適化**

各連結成分に対して以下を実行：

- **力学モデル（d3-force）の構築**
  - リレーションシップエッジ + 名前類似エッジを使用
  - 矩形衝突を統合した力学シミュレーション
  - 目的：関連性の高いノードを近づけつつ重なりを回避

**段階3: 連結成分のパッキング**
- 各連結成分のbounding boxを計算
- 成分同士が重ならないように詰めて配置
- Shelf-packingアルゴリズムまたはシンプルなグリッド配置を使用
- 目的：連結成分間の重なりを防ぎ、全体をコンパクトに配置

### 最適化の目標

以下を優先順位順に最適化する：

**優先度1: 重なり除去**
- エンティティノード同士が重ならないように配置
- 矩形の実寸（`measured.width`と`measured.height`）を考慮

**優先度2: 距離最適化**
- **リレーションで結ばれたエンティティを近づける**（強い制約）
- **名前が似ているエンティティを近づける**（弱い制約）
  - 例：`post_groups`, `post_scheduled`, `post_approval_histories`など
  - リレーションより弱い引力として機能

**優先度3: 交差数削減**
- リレーションシップエッジの交差を削減（完全最小化ではなく、副次的な目標として扱う）

## ライブラリの選定

### 採用ライブラリ（確定）

**d3-force**
- 用途：Force-directed layoutの実装
- バージョン：v3以上
- 利点：軽量で自前制御しやすい、many-bodyがquadtree + Barnes–Hutで高速化
- 採用理由：100〜300ノード規模で現実的な実行時間、矩形衝突の統合が可能

**graphology**
- 用途：連結成分分割（`connectedComponents`）
- 利点：グラフ処理の標準的な実装が揃っている
- 採用理由：既製の連結成分アルゴリズムを活用可能

### 導入を見送るライブラリ

**graphology-layout-forceatlas2（見送り）**
- 理由：矩形サイズを考慮せず、根本問題（成分packing/矩形衝突）を解決しない
- 代替：d3-forceで十分な品質を実現可能

**graphology-communities-louvain（見送り）**
- 理由：MVP段階では多段階クラスタリングは不要
- 代替：連結成分単位での処理で十分な品質を実現

**elkjs（見送り）**
- 理由：バンドルサイズが大きい（1.4MB）、MVP段階では過剰
- 将来検討：直交配線・交差最小化・整列が必要になった場合に検討

## アルゴリズムの詳細仕様

### 名前類似度の計算

エンティティ名の類似度を計算し、関連性の推定に使用する。

**正規化処理**
1. 小文字化
2. 連続する`_`を1つに整理
3. 既知のprefix（`tbl_`など）を除去（オプション）
4. 語尾の`s`を除去（`histories` → `historie`など、簡易的な単複正規化）

**類似度計算**

以下の2つの手法を組み合わせる：

1. **Token Jaccard係数**
   - `_`で分割したトークンの集合で計算
   - 例：`post_approval_histories` → `["post", "approval", "historie"]`
   - Jaccard係数 = `|A ∩ B| / |A ∪ B|`

2. **Bigram Jaccard係数**
   - 2文字のn-gramの集合で計算
   - 例：`post` → `["po", "os", "st"]`

**最終スコア**
```
similarity_score = 0.6 * token_jaccard + 0.4 * bigram_jaccard
```

**類似エッジの抽出**
- 各ノードにつき、類似度上位k件（k=3〜5）を抽出
- ただし`similarity_score < 0.35`は除外（ノイズ防止）

### d3-forceのパラメータ設定

各ノードの衝突半径（矩形の対角半径ベース）：
```
collision_radius = 0.5 * sqrt(width^2 + height^2) + padding
padding = 12〜20（推奨：15）
```

2ノード間の望ましい距離：
```
desired_distance = collision_radius_source + collision_radius_target + gap
gap = 20〜60（推奨：30）
```

**forceLink（リンク制約）**

リレーションシップエッジ（実FK）：
- `distance`: `r_source + r_target + 30`
- `strength`: `0.7`（疎グラフでも寄せる強さ）
- `iterations`: `2`（収束品質向上）

名前類似エッジ（仮想エッジ）：
- `distance`: `r_source + r_target + (80 - 60 * similarity_score)`
  - similarity_score=0.8 なら +32
  - similarity_score=0.4 なら +56
- `strength`: `0.15`（リレーションより弱く）
- `iterations`: `2`

**forceManyBody（斥力）**
- `strength`: `-(mean_link_distance * 1.5)`
  - mean_link_distance が 180 なら -270
- `theta`: `0.9`（デフォルト、精度とパフォーマンスのバランス）
- `distanceMin`: `1`
- `distanceMax`: `Infinity`

**forceCollide（矩形衝突）**

円近似ではなく、矩形衝突を実装する。

実装方法（2つのオプション）：
1. **自前実装（推奨）**
   - quadtreeで近傍ノードのみを対象に矩形AABB衝突判定
   - 重なりがあれば押し出しベクトルを計算してvelocityに加算
   - `iterations`: `2〜4`
   
2. **外部ライブラリ**
   - `d3-force-rectangle`などのnpmパッケージを検討
   - ただし、メンテナンス状況とバンドルサイズを確認

矩形衝突のマージン：
- 各ノードの矩形を`+10〜15px`拡大して判定

**forceCenter（中心引力）**
- 使用しない
- 理由：連結成分が中心に潰れる副作用があるため

**収束条件**
- `alphaMin`: `0.02`
- 最大tick数: `400`
- 収束判定：`alpha < alphaMin` または tick数が上限に達した場合

### 連結成分のパッキング

各連結成分の配置完了後、成分間の重なりを防ぐためにパッキングを実行する。

**アルゴリズム**

Shelf-packingアルゴリズムの簡易実装：
1. 各成分のbounding box（最小・最大座標）を計算
2. 成分を面積の降順にソート
3. 左上から順に配置（幅が一定値を超えたら改行）
4. 成分間のマージン：`50px`

**座標の調整**
- 各成分内のノード座標を一括でオフセット
- 成分の左上が指定位置に来るように調整

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
  1. 準備・連結成分分割（0〜10%）
  2. 名前類似度計算（10〜20%）
  3. 成分内配置最適化（20〜80%）
     - 連結成分ごとに進捗を加算
     - 例：3つの成分がある場合、各成分で20%ずつ進捗
  4. 連結成分パッキング（80〜100%）

### 視覚的フィードバック

* 各段階の完了時に、その段階の結果をキャンバスに反映する
* 段階ごとの一括更新により、最適化アルゴリズムの動作を可視化
* 目的：待ち時間の体感短縮と処理の透明性向上

### 元に戻す機能

* 実装しない
* 理由：MVP段階では不要と判断

## Action設計

配置最適化用のActionを`public/src/actions/layoutActions.ts`に実装：

**最適化ライフサイクル**

* `actionStartLayoutOptimization(vm)`: 最適化処理の開始を記録
  - `viewModel.ui.layoutOptimization.isRunning` を true に設定
  - `viewModel.ui.layoutOptimization.progress` を 0 に初期化
  - `viewModel.ui.layoutOptimization.currentStage` を "準備中" に設定

* `actionUpdateLayoutProgress(vm, progress, stageName)`: 進捗更新
  - `viewModel.ui.layoutOptimization.progress` を更新（0〜100）
  - `viewModel.ui.layoutOptimization.currentStage` を更新
  - 呼び出しタイミング：
    - 連結成分分割完了時（10%、"連結成分分割"）
    - 名前類似度計算完了時（20%、"名前類似度計算"）
    - 各連結成分の配置完了時（20%〜80%を分割、"成分N配置最適化"）
    - パッキング開始時（80%、"パッキング"）

* `actionCompleteLayoutOptimization(vm)`: 最適化処理の完了
  - `viewModel.ui.layoutOptimization.isRunning` を false に設定
  - `viewModel.ui.layoutOptimization.progress` を 100 に設定
  - `viewModel.ui.layoutOptimization.currentStage` を null に設定

* `actionCancelLayoutOptimization(vm)`: 最適化処理のキャンセル
  - `viewModel.ui.layoutOptimization.isRunning` を false に設定
  - `viewModel.ui.layoutOptimization.currentStage` を null に設定

**座標更新**

座標更新には既存の`actionUpdateNodePositions`を使用する：
* Web Workerから座標データを受信
* `actionUpdateNodePositions(vm, updates)`をdispatch
  - `updates: Array<{ id: string, x: number, y: number }>`

**実装規約**

* すべてのActionは純粋関数で実装
* 状態に変化がない場合は同一参照を返す（React最適化）
* Immutable更新パターンを使用

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

**計算量削減**
* 連結成分ごとに分けて処理（小さいグラフを複数回す方が収束が速い）
* 名前類似度は全ペア計算（O(n²)）だが、各ノードにつきtop-k + 閾値で制限
  - 300ノード → 約45,000ペア、十分に高速
  - 類似エッジの爆発を防止

**d3-forceの最適化**
* alpha収束 + 最大tick数の併用
  - `alphaMin: 0.02`で打ち切り
  - 上限: `400 tick`
* quadtreeによる近傍探索（d3-forceのmany-body/collideで自動）
* 矩形衝突は必ず近傍探索を使用（全ペア禁止）
  - quadtreeまたはspatial hashで実装

**描画更新の最適化**
* Web Workerでメインスレッドをブロックしない
* React Flowへの反映は段階ごとに一括更新（毎tickで更新しない）
* 各連結成分の完了時に座標を送信

**ボトルネック優先度**
1. d3-forceのtick数（特にエッジが増えた時） → alpha収束で対処
2. 矩形衝突の計算量 → 近傍探索で対処
3. 名前類似度の計算 → 許容範囲内（45k程度なら数十ms）

## 実装時の注意事項

### ライブラリの導入

```bash
npm install d3-force graphology
```

### 型定義の生成

TypeSpecの型定義を更新した後、`npm run generate`でフロントエンドとバックエンドの型を再生成する（ただし、今回の変更ではTypeSpec更新は不要）

### Web Worker実装

* Web Workerには最小限のデータのみ送信する
  - ノードID、名前、位置（x, y）、サイズ（width, height）
  - エッジの接続情報（source, target）
  - ViewModel全体は送信しない
* Web Workerからのメッセージは座標データのみ
  - `{ nodeId: string, x: number, y: number }[]`
* メインスレッドでActionをdispatchする
  - `actionUpdateNodePositions`を使用

### ノードサイズの取得

* React Flowの`useNodesInitialized()`で計測完了を待つ
* ノードの`measured.width`と`measured.height`を使用
  - 未計測の場合は最適化を実行しない

### 名前類似度の実装

* 正規化処理を確実に行う（小文字化、`_`の整理など）
* Jaccard係数の計算時にゼロ除算を避ける
  - `|A ∪ B| = 0` の場合は類似度を0とする
* top-k抽出時、類似度の降順でソート

### d3-force実装

* `forceCenter`は使用しない（連結成分が潰れるため）
* 各forceのパラメータは仕様書の値を使用
* 矩形衝突は必ず近傍探索を実装（全ペア計算禁止）
* alpha収束と最大tick数の両方を実装

### 連結成分パッキング

* 各成分のbounding boxは、全ノードの最小・最大座標から計算
* 成分間のマージンを確保（50px推奨）
* パッキング後の座標オフセットは、成分内の全ノードに一括適用

## 段階的実装アプローチ

**フェーズ1: 効果最大・即実装（根本問題の解決）**

実装優先度：高（これだけで大幅な品質改善が見込める）

1. 連結成分のパッキング実装（段階6）
   - 未実装の穴を塞ぐ（成分同士の重なりを防止）
2. `forceCollide`の衝突半径を対角ベースに変更
   - `0.5 * sqrt(width^2 + height^2) + 15`
3. `forceLink.distance`をサイズ由来に変更
   - 固定値150を撤廃し、`r_source + r_target + gap`に
4. 名前類似度の導入
   - token Jaccard + bigram Jaccardで計算
   - 仮想エッジとして`forceLink`に追加（top-k + 閾値）

**フェーズ2: 矩形衝突の導入（次に効く）**

実装優先度：中（円近似の限界を克服）

1. 矩形衝突forceの実装
   - 自前実装（quadtree + AABB衝突判定）
   - または`d3-force-rectangle`などのライブラリ導入
2. `forceCollide`（円近似）を矩形衝突に置き換え
3. 衝突マージンの調整（+10〜15px）

**フェーズ3: 高度化（将来拡張）**

実装優先度：低（MVP完成後に検討）

1. 交差削減・整列・直交配線
   - elkjsの導入検討
2. 位置の安定性向上
   - 初期値を前回座標に寄せる
   - 固定ノード/ピン留め機能（ユーザーが動かした位置を尊重）
3. 最適化パラメータのユーザー設定UI

## 技術的な懸念事項

### Web Worker互換性

* d3-forceとgraphologyがWeb Worker環境で動作するか確認が必要
* DOMに依存する機能がないため、問題ないと想定

### パフォーマンス検証

* 300ノード規模で10秒以内に収まるか、実装後の性能計測が必要
* 目標：
  - 名前類似度計算：< 500ms
  - 各連結成分のforce計算：< 5秒（300ノードの場合）
  - パッキング：< 100ms

### パラメータチューニング

* d3-forceのパラメータは仕様書の推奨値を初期値とする
* 実装後、実際のER図で品質を確認し、必要に応じて調整
* 特に調整が必要になりそうなパラメータ：
  - `forceLink.strength`（リレーションと類似エッジの強さ）
  - `forceManyBody.strength`（斥力の強さ）
  - 類似エッジのtop-k（k=3〜5）
  - 類似度閾値（0.35）

## 将来の拡張検討事項

以下はMVP完成後に検討する：

* 最適化パラメータのユーザー設定UI
  - リレーション vs 名前類似のバランス調整
  - 最大実行時間の設定
* 最適化履歴の保存・再適用機能
  - Undo/Redoの実装
* レイアウトプリセット（階層型、放射状など）の提供
* 矩形グループを考慮したレイアウト
  - 矩形内のノードを優先的に近づける
  - クラスタとして扱う
* インクリメンタルレイアウト
  - 既存の配置を尊重しつつ、新規ノードのみ配置
  - ユーザーが手動調整した位置を固定
