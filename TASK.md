# 配置最適化アルゴリズム改善タスク

仕様書: [spec/entity_layout_optimization.md](./spec/entity_layout_optimization.md)

リサーチ背景:
- [research/20260126_2247_entity_layout_optimization.md](./research/20260126_2247_entity_layout_optimization.md)
- [research/20260131_1208_entity_layout_optimization_improvement.md](./research/20260131_1208_entity_layout_optimization_improvement.md)

## フェーズ1: 名前類似度計算とd3-forceパラメータ改善

### □ 名前類似度計算の実装

**対象ファイル:** `public/src/utils/layoutOptimizer.ts`

**変更内容:**

名前類似度を計算する新しい関数を追加する。

1. `NameSimilarity`インタフェースを追加
   ```typescript
   interface NameSimilarity {
     sourceId: string;
     targetId: string;
     score: number;
   }
   ```

2. `normalizeName(name: string): string`関数を実装
   - 小文字化
   - 連続する`_`を1つに整理
   - 既知のprefix（`tbl_`など）を除去（オプション）
   - 語尾の`s`を除去

3. `calculateTokenJaccard(name1: string, name2: string): number`関数を実装
   - `_`で分割したトークンの集合でJaccard係数を計算
   - Jaccard係数 = `|A ∩ B| / |A ∪ B|`
   - ゼロ除算を避ける（`|A ∪ B| = 0`の場合は0を返す）

4. `calculateBigramJaccard(name1: string, name2: string): number`関数を実装
   - 2文字のn-gramの集合でJaccard係数を計算
   - ゼロ除算を避ける

5. `calculateNameSimilarity(name1: string, name2: string): number`関数を実装
   - `0.6 * token_jaccard + 0.4 * bigram_jaccard`で最終スコアを算出

6. `calculateSimilarityEdges(nodes: LayoutNode[], k: number = 3, threshold: number = 0.35): LayoutEdge[]`関数を実装
   - 全ノードペアの類似度を計算
   - 各ノードにつき上位k件を抽出（ただしthreshold未満は除外）
   - 類似度の降順でソート
   - `LayoutEdge[]`として返す（重複を避けるため、`source < target`の順に統一）

**注意事項:**
- `LayoutNode`インタフェースに`name`フィールドを追加する必要がある
- パフォーマンス確認：300ノードで約45,000ペアの計算となるが、数十ms程度で完了することを確認

### □ d3-forceパラメータの改善

**対象ファイル:** `public/src/utils/layoutOptimizer.ts`

**変更内容:**

`SimpleForceDirectedLayout`関数を改善し、新仕様に合わせてパラメータを調整する。

1. 衝突半径の計算を対角ベースに変更
   - 現在: `Math.max(d.width, d.height) / 2 + 20`
   - 変更後: `0.5 * Math.sqrt(d.width ** 2 + d.height ** 2) + 15`

2. リンク距離をノードサイズに基づいて計算
   - 現在: 固定値150
   - 変更後: ノードペアの衝突半径の合計 + gap（30px）
   - `forceLink.distance`を関数化して、source/targetのサイズから計算

3. 名前類似エッジの追加
   - `calculateSimilarityEdges`で類似エッジを計算
   - 実リレーションと類似エッジを分けて管理
   - 2つの`forceLink`を作成:
     - リレーションシップエッジ: `strength: 0.7`, `iterations: 2`
     - 類似エッジ: `strength: 0.15`, `iterations: 2`, `distance`は類似度に応じて調整（`r1 + r2 + (80 - 60 * similarity)`）

4. `forceManyBody`のstrengthを動的に計算
   - 現在: 固定値-300
   - 変更後: `-(mean_link_distance * 1.5)`
   - mean_link_distanceを実リレーションのdistanceの平均から算出

5. `forceCenter`を削除
   - 連結成分が中心に潰れる副作用があるため削除

6. alpha収束パラメータの調整
   - `alphaMin: 0.02`
   - 最大tick数: 400

**関数シグネチャの変更:**
```typescript
export async function SimpleForceDirectedLayout(
  nodes: LayoutNode[], // name フィールドを含む
  edges: LayoutEdge[],
  onProgress?: ProgressCallback,
  cancelCheck?: () => boolean
): Promise<LayoutResult>
```

### □ LayoutNodeインタフェースの拡張

**対象ファイル:** `public/src/utils/layoutOptimizer.ts`

**変更内容:**

`LayoutNode`インタフェースに`name`フィールドを追加:
```typescript
export interface LayoutNode {
  id: string;
  name: string; // 追加
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### □ 連結成分パッキングの実装

**対象ファイル:** `public/src/utils/layoutOptimizer.ts`

**変更内容:**

連結成分のパッキング関数を新規作成する。

1. `BoundingBox`インタフェースを追加
   ```typescript
   interface BoundingBox {
     minX: number;
     minY: number;
     maxX: number;
     maxY: number;
     width: number;
     height: number;
   }
   ```

2. `calculateBoundingBox(nodes: LayoutNode[]): BoundingBox`関数を実装
   - 全ノードの最小・最大座標を計算
   - width/heightも算出して返す

3. `packConnectedComponents(components: ConnectedComponent[], margin: number = 50): LayoutResult`関数を実装
   - Shelf-packingアルゴリズムの簡易実装
   - 各成分のbounding boxを計算
   - 成分を面積の降順にソート
   - 左上から順に配置（幅が一定値を超えたら改行、推奨: 2000px）
   - 成分間のマージン: 50px
   - 各成分内のノード座標を一括でオフセット
   - 成分の左上が指定位置に来るように調整

**関数シグネチャ:**
```typescript
export async function packConnectedComponents(
  components: ConnectedComponent[],
  margin?: number
): Promise<LayoutResult>
```

### □ Web Workerの更新（アルゴリズム変更）

**対象ファイル:** `public/src/workers/layoutWorker.ts`

**変更内容:**

新しいアルゴリズムフローに合わせてWorkerのロジックを更新する。

1. Louvainクラスタリング・CoarseLayout・FineLayoutの呼び出しを削除

2. 新しいフロー:
   - 段階1: 準備・連結成分分割（0〜10%）
     - `SplitConnectedComponents`を実行
     - 進捗: 10%、"連結成分分割"
   - 段階2: 名前類似度計算（10〜20%）
     - 全成分のノードをマージして`calculateSimilarityEdges`を実行
     - 進捗: 20%、"名前類似度計算"
   - 段階3: 成分内配置最適化（20〜80%）
     - 各連結成分に対して`SimpleForceDirectedLayout`を実行
     - リレーションシップエッジ + 類似エッジを使用
     - 連結成分ごとに進捗を加算（例: 3つの成分 → 各20%ずつ）
     - 進捗メッセージ: "成分N配置最適化"
   - 段階4: 連結成分パッキング（80〜100%）
     - `packConnectedComponents`を実行
     - 進捗: 80%、"パッキング"

3. 各段階で`cancelCheck`を確認

4. 進捗報告は各段階の完了時に実行

### □ コマンドの更新（ノード名の追加）

**対象ファイル:** `public/src/commands/layoutOptimizeCommand.ts`

**変更内容:**

`LayoutNode`の構築時に`name`フィールドを追加する。

変更箇所（46-56行目）:
```typescript
const nodes: LayoutNode[] = entityNodes.map(node => {
  // カラム数に応じた概算の高さを計算
  const estimatedHeight = 40 + (node.columns.length * 28); // ヘッダー40px + カラムごとに約28px
  return {
    id: node.id,
    name: node.name, // 追加
    x: node.x,
    y: node.y,
    width: 200, // デフォルト幅
    height: estimatedHeight
  };
});
```

### □ 配置最適化テストの更新

**対象ファイル:** `public/tests/utils/layoutOptimizer.test.ts`

**変更内容:**

新しい関数のテストを追加し、既存テストを更新する。

1. `normalizeName`のテスト
   - 小文字化の確認
   - 連続`_`の整理
   - prefix除去
   - 語尾`s`の除去

2. `calculateTokenJaccard`のテスト
   - 完全一致（1.0）
   - 部分一致
   - 全く異なる名前（0.0）
   - ゼロ除算の処理

3. `calculateBigramJaccard`のテスト
   - 同様のパターン

4. `calculateNameSimilarity`のテスト
   - 類似したテーブル名（`post_groups`と`post_scheduled`など）
   - 異なるテーブル名

5. `calculateSimilarityEdges`のテスト
   - top-k抽出の確認
   - threshold未満の除外
   - エッジの重複がないこと

6. `calculateBoundingBox`のテスト
   - 基本的な計算
   - 1ノードの場合
   - 空配列の処理

7. `packConnectedComponents`のテスト
   - 2つの成分をパッキング
   - 成分間のマージン確認
   - 座標オフセットの確認

8. 既存テストの更新
   - `LayoutNode`に`name`フィールドを追加
   - `LouvainClustering`, `CoarseLayout`, `FineLayout`のテストは残す（将来使用する可能性があるため）

### □ ビルドの確認

**実行コマンド:**
```bash
cd /home/kuni/Documents/er-viewer/public
npm run build
```

ビルドエラーが発生した場合は修正する。

### □ テストの実行

**実行コマンド:**
```bash
cd /home/kuni/Documents/er-viewer
npm run test
```

テストが失敗した場合は修正する。

## フェーズ2: 矩形衝突の導入（オプション・将来実装）

このフェーズは、フェーズ1完了後に実装効果を確認してから着手するか判断する。

### □ 矩形衝突forceの実装

**対象ファイル:** `public/src/utils/layoutOptimizer.ts`

**変更内容:**

矩形衝突判定を実装する。

実装方法の選択肢：
1. 自前実装（推奨）
   - quadtreeで近傍ノードのみを対象に矩形AABB衝突判定
   - 重なりがあれば押し出しベクトルを計算してvelocityに加算
   - `iterations`: 2〜4
   
2. 外部ライブラリ
   - `d3-force-rectangle`などのnpmパッケージを検討
   - メンテナンス状況とバンドルサイズを確認

`forceCollide`（円近似）を矩形衝突に置き換える。

衝突マージン: 各ノードの矩形を+10〜15px拡大して判定

### □ d3-forceへの統合

**対象ファイル:** `public/src/utils/layoutOptimizer.ts`

**変更内容:**

`SimpleForceDirectedLayout`の`forceCollide`を矩形衝突forceに置き換える。

### □ テストの追加

**対象ファイル:** `public/tests/utils/layoutOptimizer.test.ts`

**変更内容:**

矩形衝突のテストを追加:
- 矩形の重なり判定が正しく動作すること
- 円近似よりも精度が高いこと

### □ ビルドの確認

### □ テストの実行

## 懸念事項（作業対象外）

### パフォーマンス検証が必要

300ノード規模で10秒以内に収まるか、実装後の性能計測が必要です。

目標:
- 名前類似度計算：< 500ms
- 各連結成分のforce計算：< 5秒（300ノードの場合）
- パッキング：< 100ms

### パラメータチューニングが必要

d3-forceのパラメータは仕様書の推奨値を初期値としていますが、実装後に実際のER図で品質を確認し、必要に応じて調整が必要です。

特に調整が必要になりそうなパラメータ:
- `forceLink.strength`（リレーションと類似エッジの強さ）
- `forceManyBody.strength`（斥力の強さ）
- 類似エッジのtop-k（k=3〜5）
- 類似度閾値（0.35）

### Web Worker互換性の確認

d3-forceとgraphologyがWeb Worker環境で動作するか確認が必要です。
DOMに依存する機能がないため、問題ないと想定していますが、実装後に確認が必要です。

## 事前修正提案

特になし。

現在の実装は、Louvainクラスタリング・CoarseLayout・FineLayoutを含む多段階の最適化を実装していますが、新仕様では連結成分単位でのシンプルなforce-directedレイアウトに変更されます。この変更により、コードがシンプルになり、メンテナンス性が向上します。
