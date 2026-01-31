# ER図エンティティ配置最適化アルゴリズムの改善検討

## リサーチ要件

エンティティノードの自動配置最適化機能（`spec/entity_layout_optimization.md`）について、現状の仕様・実装では以下の問題があるため対策を考える：

* 関連のあるエンティティ同士が近くに配置されていない（そもそも大して最適化できてない）
* 多くのエンティティ（矩形）が重なって表示されてしまっている
    * 矩形の重なり解消時に、最適化が崩れている可能性もある
* 名前が似ているエンティティも近くに配置したい（例えばpost_groups, post_scheduled, post_approval_historiesなど）
    * つまり、リレーションの有無と名前の類似度でエンティティの近さを判断する必要がありそう
    * 軽く試した感じ、名前の類似度は2-gram+Jaccard係数で算出できそう
* 仕様書ではアルゴリズムが「など」のように曖昧に書かれているので明確にする
* 使用するライブラリも明確にする

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite + React + React Flow
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec

### 現状のフェーズ

- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- AIが作業するため学習コストは考慮不要

## 現在の実装状況

### 配置最適化の仕様（`spec/entity_layout_optimization.md`）

配置最適化は以下の多段階アプローチで実装されている：

**段階1: 準備**
- ノードサイズの確定待ち（React Flowの`useNodesInitialized()`を使用）
- 連結成分（connected components）の分割

**段階2: クラスタリング（各連結成分内）**
- コミュニティ検出（Louvainアルゴリズムなど）でノードをクラスタ化

**段階3: 粗レイアウト（クラスタ単位）**
- Force-directed（d3-forceなど）またはELK Stressでクラスタ間の配置を決定

**段階4: 詳細レイアウト（クラスタ内）**
- Force-directed / Stressをクラスタ内で短時間実行

**段階5: 重なり除去（rectangle overlap removal）**
- 矩形の実寸を考慮した衝突解消

**段階6: コンポーネントのパッキング（詰め配置）**
- 連結成分の矩形を詰めて配置

### 使用中のライブラリ（`public/package.json`）

以下のライブラリが導入されている：

```json
{
  "graphology": "^0.26.0",
  "graphology-communities-louvain": "^2.0.2",
  "graphology-components": "^1.5.4",
  "graphology-layout-forceatlas2": "^0.10.1"
}
```

**注意**: `d3-force`は`public/src/utils/layoutOptimizer.ts`でインポートされているが、`package.json`には明示されていない（依存関係として追加されている可能性がある）。

### 実装コード（`public/src/utils/layoutOptimizer.ts`）

現在、以下のアルゴリズムが実装されている：

1. **`SimpleForceDirectedLayout`**
   - d3-forceを使用したForce-directedレイアウト
   - `forceLink`: リンクの理想的な距離 = 150px
   - `forceManyBody`: ノード間の反発力 = -300
   - `forceCenter`: 中心に引き寄せる力
   - `forceCollide`: 衝突半径 = `Math.max(width, height) / 2 + 20`
   - 反復回数: 200〜500 tick（ノード数に応じて調整）
   - 早期終了条件: `simulation.alpha() < 0.01`

2. **`SplitConnectedComponents`**
   - graphologyを使用した連結成分分割
   - 無向グラフとして扱う

3. **`LouvainClustering`**
   - graphology-communities-louvainを使用したクラスタリング
   - クラスタIDをノードに付与

4. **`CoarseLayout`**
   - クラスタ間のForce-directedレイアウト
   - `forceLink`: 距離 = 300px（クラスタ間を広く取る）
   - `forceManyBody`: 反発力 = -500（強めの反発）
   - 反復回数: 100 tick

5. **`FineLayout`**
   - クラスタ内のForce-directedレイアウト
   - `forceLink`: 距離 = 150px
   - `forceManyBody`: 反発力 = -200
   - `forceCollide`: 衝突半径 = `Math.max(width, height) / 2 + 20`
   - 反復回数: 200 tick

6. **`RemoveOverlaps`**
   - 空間ハッシュ（グリッド）を使用した重なり除去
   - 押し出し方式で矩形の重なりを解消
   - セルサイズ: 200px
   - 最大反復回数: 10回
   - 重なり判定: 矩形の幅・高さを考慮
   - 押し出し方向: 重なりが小さい方向に押し出す（+5pxのマージン）

7. **`SpatialHash`**
   - グリッドベースの空間分割で近傍ノードを高速検索
   - セルサイズ: 200px

### 実行フロー（`public/src/workers/layoutWorker.ts`）

Web Workerで実行される配置最適化の実際のフローは以下の通り：

1. 準備（0〜10%）
2. 連結成分分割（10〜15%）
3. クラスタリング（15〜25%）
4. 粗レイアウト（25〜50%）
5. 詳細レイアウト（50〜75%）
6. 重なり除去（75〜100%）

**注意**: 段階6（コンポーネントのパッキング）は実装されていない。

## 問題の詳細分析

### 問題1: 関連のあるエンティティ同士が近くに配置されていない

現状の実装では以下の点が考えられる：

- Force-directedの`forceLink`の距離（150px）が適切でない可能性
- `forceManyBody`の反発力（-300）が強すぎる可能性
- クラスタリングが適切に機能していない可能性
- 粗レイアウトと詳細レイアウトの2段構成が最適化を妨げている可能性

### 問題2: 多くのエンティティが重なって表示されている

現状の重なり除去アルゴリズム（`RemoveOverlaps`）には以下の問題が考えられる：

- 押し出し方式が最大10回の反復では不十分
- 押し出しのマージン（+5px）が小さすぎる
- 空間ハッシュのセルサイズ（200px）が不適切
- 重なり除去が最適化の最後に実行されるため、Force-directedで整えられた配置が崩れる
- 粗レイアウト・詳細レイアウトで`forceCollide`を使っているが、矩形の重なりが完全に解消されていない

### 問題3: 名前が似ているエンティティを近くに配置したい

現状の実装では名前の類似度は全く考慮されていない。以下の対応が必要：

- エンティティ名の類似度を計算するロジックの追加
  - 提案: 2-gram + Jaccard係数
- 類似度に基づく仮想的なエッジの追加（Force-directedのリンクとして扱う）
- または、類似度をForce-directedの距離に反映

### 問題4: 仕様書のアルゴリズムが曖昧

仕様書では「Louvainアルゴリズムなど」「d3-forceなど」「またはELK Stress」のように、具体的なアルゴリズムやパラメータが明確に定義されていない。

### 問題5: 使用するライブラリが明確でない

仕様書では複数の選択肢が提示されているが、実際に使うべきライブラリが明確でない：

- d3-force vs ELK
- graphology-layout-forceatlas2（導入済みだが未使用）

## ViewModelの構造

すべての型は`scheme/main.tsp`で定義されている。

### EntityNodeViewModel（エンティティノード）

```typescript
model EntityNodeViewModel {
  id: string; // UUID (エンティティID)
  name: string;
  x: float64;      // X座標（配置情報）
  y: float64;      // Y座標（配置情報）
  columns: Column[];
  ddl: string;
}
```

エンティティの`width`と`height`は明示的に保存されていない。React Flowでレンダリング後に`node.measured.width/height`で取得できる。

### RelationshipEdgeViewModel（リレーション）

```typescript
model RelationshipEdgeViewModel {
  id: string; // UUID (リレーションシップID)
  sourceEntityId: string; // エンティティID (UUID)
  sourceColumnId: string; // カラムID (UUID)
  targetEntityId: string; // エンティティID (UUID)
  targetColumnId: string; // カラムID (UUID)
  constraintName: string;
}
```

リレーションは`sourceEntityId`と`targetEntityId`でエンティティ同士をつないでいる。

### LayoutOptimizationState（配置最適化の状態）

```typescript
model LayoutOptimizationState {
  isRunning: boolean;         // 実行中フラグ
  progress: float64;          // 進捗（0〜100）
  currentStage: string | null; // 現在の処理段階名
}
```

## 制約条件

- エンティティは多くて300個程度を想定
- 実行時間は最大10秒程度に収める
- フロントエンド（ブラウザ）で実装する
- Web Workerで実行し、UIスレッドをブロックしない
- 各段階の完了時に座標データを送信し、段階的に描画を更新する

## 期待する回答

以下について、具体的な見解と改善案を提示してほしい：

### 1. 現状の問題の根本原因の特定

現在の実装でエンティティが適切に配置されない・重なってしまう根本原因は何か？

考えられる原因：
- Force-directedのパラメータ（距離、反発力）が不適切
- 粗レイアウト・詳細レイアウトの2段構成が逆効果
- 重なり除去のアルゴリズムが不十分
- `forceCollide`の衝突半径の計算方法が矩形に適していない
- その他

### 2. Force-directedのパラメータチューニング

現在のパラメータ設定を改善するための具体的な推奨値：

- `forceLink`の距離（現状: 150px）
- `forceManyBody`の反発力（現状: -300）
- `forceCollide`の衝突半径（現状: `Math.max(width, height) / 2 + 20`）
- 反復回数（現状: 200〜500 tick）

これらのパラメータをどう調整すべきか？
また、エンティティのサイズ（width, height）を考慮したパラメータ設定はあるか？

### 3. 重なり除去アルゴリズムの改善

現在の押し出し方式の重なり除去を改善する方法：

- 反復回数を増やす（現状: 10回）べきか？
- 押し出しのマージンを増やす（現状: +5px）べきか？
- 押し出しの強さを調整すべきか？
- 別のアルゴリズム（例: ELKのOverlap Removal）を使うべきか？
- 重なり除去を最後に実行するのではなく、Force-directedと統合すべきか？

### 4. 名前の類似度を考慮した配置の実装方法

エンティティ名の類似度を配置に反映する具体的な実装方法：

**パターンA: 仮想的なエッジの追加**
- 名前の類似度が高いエンティティ間に仮想的なエッジを追加
- Force-directedの`forceLink`で扱う
- メリット・デメリット

**パターンB: Force-directedのカスタム力の追加**
- d3-forceに名前の類似度に基づく引力を追加
- `simulation.force('similarity', customForce)`
- メリット・デメリット

**パターンC: クラスタリングに名前の類似度を反映**
- Louvainクラスタリングの重み付けに名前の類似度を追加
- メリット・デメリット

どのパターンが適切か？または別の方法があるか？

**名前の類似度の計算方法**：
- 2-gram + Jaccard係数で実装する方針で問題ないか？
- 他に適切な方法はあるか？
- どの程度の類似度を「似ている」と判断すべきか？（閾値の設定）

### 5. アルゴリズムの具体化と明確化

仕様書で曖昧に書かれている部分を明確にする：

**クラスタリング**：
- Louvainを使う（現在実装済み）で確定して良いか？
- 他のアルゴリズム（例: Community detection、Modularity-based clustering）との比較
- Louvainのパラメータ設定

**Force-directedレイアウト**：
- d3-forceで確定して良いか？
- graphology-layout-forceatlas2（導入済みだが未使用）を使うべきか？
- ELKを導入すべきか？（バンドルサイズ約1.4MB）

**重なり除去**：
- 現在の押し出し方式で良いか？
- ELKのOverlap Removalを使うべきか？

**コンポーネントのパッキング**：
- 仕様書では段階6として記載されているが未実装
- 実装すべきか？実装する場合のアルゴリズムは？

### 6. 多段階アプローチの見直し

現在の多段階アプローチ（準備→クラスタリング→粗レイアウト→詳細レイアウト→重なり除去→パッキング）は適切か？

代替案：
- **パターンA**: 連結成分分割 → Force-directed（全体）→ 重なり除去
- **パターンB**: クラスタリング → クラスタごとにForce-directed → 重なり除去 → クラスタのパッキング
- **パターンC**: Force-directedと重なり除去を統合（`forceCollide`の改善）

どのアプローチが最も効果的か？

### 7. 使用ライブラリの決定

以下のライブラリの使用を決定したい：

**d3-force**：
- 現在使用中
- メリット: 軽量、自前制御しやすい、many-bodyがquadtree + Barnes–Hutで高速化
- デメリット: 矩形衝突は追加実装が必要

**graphology-layout-forceatlas2**：
- 導入済みだが未使用
- Force Atlas 2はCytoscapeやGephiで使われる高品質なレイアウトアルゴリズム
- d3-forceと比較してどうか？

**elkjs**：
- 未導入
- メリット: 高品質、Overlap Removalなど体系的な機能
- デメリット: バンドルサイズが大きい（約1.4MB）
- MVP段階で導入すべきか？

**推奨**: どのライブラリを使うべきか、またはどのように組み合わせるべきか？

### 8. パフォーマンスの検証

300エンティティで10秒以内に収まるか？

- 現在の実装での性能見積もり
- ボトルネックはどこか？（連結成分分割、クラスタリング、Force-directed、重なり除去）
- パフォーマンス改善のための具体的な施策

### 9. 段階的な実装計画

問題を解決するための段階的な実装計画を提案してほしい：

**フェーズ1**: 最も効果が高い改善（すぐに実装すべき）
**フェーズ2**: 中程度の改善（次に実装すべき）
**フェーズ3**: 高度な最適化（将来的に実装）

優先順位と実装順序を明確にしてほしい。

## 参考情報

### 関連仕様書

- `spec/entity_layout_optimization.md`: エンティティ配置最適化機能仕様
- `spec/frontend_state_management.md`: フロントエンド状態管理仕様
- `spec/frontend_er_rendering.md`: ER図のレンダリング仕様
- `scheme/main.tsp`: API型定義（TypeSpec）

### リサーチ背景

- `research/20260126_2247_entity_layout_optimization.md`: 配置最適化のアルゴリズム検討（初回リサーチ）

### 関連する実装ファイル

- `public/src/utils/layoutOptimizer.ts`: 配置最適化アルゴリズムの実装
- `public/src/workers/layoutWorker.ts`: Web Workerでの実行ロジック
- `public/src/commands/layoutOptimizeCommand.ts`: 配置最適化のコマンド
- `public/src/components/ERCanvas.tsx`: ER図描画コンポーネント
