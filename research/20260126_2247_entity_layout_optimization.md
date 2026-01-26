## 1. アルゴリズムの選定

結論としては、**「ハイブリッド（多段）レイアウト」**が一番現実的です。単一の最適化（例：交差数・重なり数の直接最小化）に寄せるほど、計算が重くなりがちで、ブラウザ数秒の制約に合いにくいです。

### 推奨フロー（描画済み前提で“配置だけ”最適化）

1. **連結成分（connected components）分割**
   ER図は疎なことが多いので、コンポーネントごとに独立にレイアウトして最後に詰めるのが効きます（計算量が落ちる・品質も上がりやすい）。

2. **（任意）コミュニティ検出でクラスタ化（Louvain 等）**
   リレーション密度が高い部分を自動で塊にし、塊同士→塊の中、の2段で解くと「関連ノードが近い」が出やすいです。Louvain は大規模グラフ向けにコミュニティを高速検出できる実装があり、graphology 標準ライブラリで提供されています。([Graphology][1])

3. **粗レイアウト（クラスタ単位）**

   * **Force-directed（d3-force）**か**ELK Stress**のどちらかを推奨
   * 目的：クラスタ間の距離と大局配置を決める

4. **詳細レイアウト（クラスタ内）**

   * Force-directed / Stress をクラスタ内で短時間回す
   * 目的：関連ノードを近づけつつ局所的に整える

5. **重なり除去（rectangle overlap removal）**

   * 自前衝突解消でもよいが、ELK には **Overlap Removal** 系のオプション・アルゴリズムがあるので、品質と実装コストのバランスが良いです。([eclipse.dev][2])

6. **コンポーネントのパッキング（詰め配置）**

   * コンポーネント矩形を詰める（余白最小化、視界に収める）

### アルゴリズム比較（要点）

| 手法                             |  実装 | コスト |              品質 | チューニング |        ブラウザ適性 |
| ------------------------------ | --: | --: | --------------: | -----: | ------------: |
| Force-directed（Fruchterman/類似） |   低 |   中 | 中〜高（クラスタ感出しやすい） |      中 | 高（d3-force 等） |
| ELK（layered / stress 等）        |   中 | 中〜高 | 高（交差・整列が安定しやすい） |      中 |    中（ライブラリ重め） |
| Simulated Annealing（スコア直接最小化）  |   高 |   高 |          高になり得る |      高 |  低（数百ノードは厳しい） |
| 遺伝的アルゴリズム                      |   高 |   高 |          高になり得る |      高 |             低 |
| Sugiyama系（dagre等の階層レイアウト）      | 低〜中 |   中 |       方向性があると強い |    低〜中 |           中〜高 |

**MVPの推奨**：

* まず **Force-directed + 重なり除去 +（軽い）交差ペナルティ**
* 次に「より整った見た目」を狙うなら **ELK（stress or layered） + overlap removal** に寄せる

---

## 2. スコアリング関数の設計

「スコア最小化型（SA/GA）」にしない場合でも、**採否判定**や**パラメータ評価**にスコアは有用です。設計は **連続量（面積・距離）を中心**にすると、改善が安定します。

### 推奨スコア（例）

[
Score = w_o \cdot O + w_c \cdot C + w_d \cdot D + w_p \cdot P
]

* **重なり (O)**（矩形同士）

  * 基本：(\sum_{i<j} overlapArea(i,j))
  * 「被っている数」を目的にしたいなら：(\sum_{i<j} [overlapArea(i,j) > 0]) も併用（ただし勾配がなく不安定）
* **交差 (C)**（中心同士の線分の交差数）

  * (\sum_{e1<e2} [intersect(seg(e1), seg(e2))])
  * ただし **同じ端点を共有する辺同士は除外**（交差扱いしない）
* **距離 (D)**（関連エンティティを近づける）

  * (\sum_{(u,v)\in E} (dist(center(u),center(v)) - L)^2)
  * ユークリッドでOK（見た目が自然）。マンハッタンは格子レイアウト寄りにしたい場合のみ。
* **位置変化ペナルティ (P)**（任意）

  * 既存配置を尊重したい場合：(\sum_i ||pos_i - pos_i^{(0)}||^2)

### 重み付けの考え方

* 体感上の優先度は **重なり > 交差 > 距離** になりやすい

  * 例：まず (w_o) を大きくして「絶対に重ねない」を作る
  * 次に (w_c) を上げて「線が見やすい」を改善
  * 最後に (w_d) で「関連が近い」を整える
* チューニングを楽にするなら、各項を **0〜1 に正規化**（例：最大値やペア数・辺数で割る）してから重みを当てる

### 交差判定（線分）

* 2線分交差は **CCW（向き）/ orientation** を使う標準の線分交差判定でOK（O(1)）
* 計算量は (O(m^2)) になるので、後述のパフォーマンス対策（候補削減）が重要

---

## 3. エンティティのサイズの扱い（width/height）

推奨は **パターン2（フロントで計測）を主**にして、将来拡張でパターン1を足せる形です。

* React Flow v12 では、計測後の寸法が **`node.measured.width/height`** に入る仕様になっています。([React Flow][3])
* さらに **`useNodesInitialized()`** で「全ノードが計測済みか」を判定できます。([React Flow][4])
* `width/height` を自分で直接セットするのは推奨されていません（React Flow側で計算・利用されるため）。([React Flow][5])

### 推奨運用

* 最適化処理開始条件：`useNodesInitialized()` が true（計測済み）
* 取得：Storeのnodes（React FlowのNode）から `measured` を参照
* 永続化：

  * MVPは「最適化のための一時情報」と割り切って ViewModel には保存しない
  * 将来「バックエンド最適化」や「インポート直後に同じ見た目を再現」をやるなら、パターン1で `width/height`（または measured）をオプショナル追加する余地はある

---

## 4. 実装場所（フロント or バック）

要件（描画済み・実寸取得可能・ボタン押下で即実行）から、**フロント実装が第一候補**です。

### フロント推奨の根拠

* 実寸（`node.measured`）をそのまま使える ([React Flow][3])
* MVP要件で「性能/セキュリティ無視」なら、ネットワーク越しにする理由が薄い
* 既存のReact Flow描画・操作（ドラッグ等）との整合が取りやすい

### 例外的にバックでやるなら

* 「リバースエンジニア直後にサーバで最適化して初期配置として返す」など、**描画前最適化**が欲しいとき
  → その場合はサイズ推定（パターン3 or パターン1で保存）が必要

---

## 5. UI/UX設計

* **ボタン配置**：既存の操作が集約されている場所（上部ツールバー等）に「配置最適化」

  * リバースエンジニアの近くは自然（“生成→整える”の流れ）
* **有効/無効条件**：

  * `loading` 中は無効
  * ノード未計測（`useNodesInitialized()==false`）は無効（または「計測中…」）
* **実行時表示**：

  * 数秒以内想定でも、押下直後にローディング（スピナー）を出す方が体感が良い
* **アニメーション**：

  * React Flow自体が自動で“気持ちよく移動”を付けるより、**ノードDOM側にCSS transition**（transform）を付ける方が実装しやすいことが多い
* **元に戻す**：

  * MVPなら **「最適化前スナップショットを1段だけ保持して戻す」**が低コスト
  * 本格Undo/Redoは後回しでOK

---

## 6. 段階的な実装計画

1. **MVP**

* `useNodesInitialized()` 待ち → 現在の nodes/edges を入力に最適化
* **Force-directed（リンク距離 + 斥力）**
* **重なり除去のみ強制**（交差は無視 or 軽いペナルティ）
* 「戻す（1回）」だけ入れる

2. **改善ステップ**

* ステップ1：矩形前提の衝突解消を強化（面積ベースで押し出し）
* ステップ2：交差数のペナルティ導入（全組み合わせではなく候補を絞る）
* ステップ3：Louvain等でクラスタ検出して2段レイアウト ([Graphology][1])
* ステップ4：ELK（stress / layered）に切替・併用、設定最適化 ([eclipse.dev][6])

---

## 7. 既存ライブラリの活用案

### 推奨優先度

1. **d3-force（自前制御しやすい）**

* many-body が **quadtree + Barnes–Hut** で高速化されるので、100〜200ノード規模で現実的です。([D3.js][7])
* ただし矩形衝突は追加実装（円近似 or 自前）

2. **elkjs（品質重視・機能豊富）**

* ELKをJSで使える形にしたもの。layer-based（Sugiyama系）を旗艦としている。([GitHub][8])
* Overlap Removal など関連機能・アルゴリズムが体系的に揃っている。([eclipse.dev][6])
* 反面、バンドルサイズが大きめ（例：minified 1.4MB 程度という計測例）。([bundlephobia.com][9])

3. **WebCola（制約付きレイアウト）**

* 制約ベースで「揃え」「間隔」などを入れやすい。([GitHub][10])
* 速度が課題なら wasm fork も選択肢。([GitHub][11])

### “今回は優先低め”になりやすいもの

* **dagre**：有向・階層が前提のとき強い。クライアント向けレイアウトの代表格。([GitHub][12])

  * ただし npm の `dagre` は更新が止まって見える一方で、GitHubでは新しめのリリースもあるため、採用時に配布形態の確認が必要。([npm][13])
* **cytoscape.js**：可視化フレームワーク寄りで、React Flowと二重構成になりがち（“座標計算だけ借りる”目的なら過剰になりやすい）。([Cytoscape.js][14])

---

## 8. パフォーマンス（100〜200エンティティ）

* **連結成分ごとに分けて処理**：n, m を実質分割して効く
* **反復回数を固定上限（例：200〜500 tick）**＋早期終了（改善が鈍化したら止める）
* **交差数カウントは毎tickやらない**

  * 例：最後だけ評価、または数回に1回
  * 候補削減：線分をグリッドに入れて“近い線分同士だけ”交差判定（全 (m^2) 回避）
* **Web Worker**：最適化ループをUIスレッドから外す（React Flowの再レンダリングを止める）
* **Forceの高速化を活かす**

  * d3-forceのmany-bodyは quadtree + Barnes–Hut で改善されるので、斥力計算がボトルネックになりにくい。([D3.js][7])
* **適用は一括**

  * ループ中は内部座標だけ更新し、完了時にまとめて `setNodes`（描画更新回数を抑える）

[1]: https://graphology.github.io/standard-library/communities-louvain.html?utm_source=chatgpt.com "communities-louvain"
[2]: https://eclipse.dev/elk/reference/options/org-eclipse-elk-graphviz-overlapMode.html?utm_source=chatgpt.com "Overlap Removal (ELK)"
[3]: https://reactflow.dev/learn/troubleshooting/migrate-to-v12?utm_source=chatgpt.com "Migrate to React Flow 12"
[4]: https://reactflow.dev/api-reference/hooks/use-nodes-initialized?utm_source=chatgpt.com "useNodesInitialized()"
[5]: https://reactflow.dev/api-reference/types/node?utm_source=chatgpt.com "Node"
[6]: https://eclipse.dev/elk/reference/algorithms.html?utm_source=chatgpt.com "Algorithms (ELK)"
[7]: https://d3js.org/d3-force/many-body?utm_source=chatgpt.com "Many-body force | D3 by Observable"
[8]: https://github.com/kieler/elkjs?utm_source=chatgpt.com "kieler/elkjs: ELK's layout algorithms for JavaScript"
[9]: https://bundlephobia.com/package/elkjs?utm_source=chatgpt.com "elkjs v0.11.0 ❘ Bundlephobia"
[10]: https://github.com/tgdwyer/WebCola?utm_source=chatgpt.com "tgdwyer/WebCola: Javascript constraint-based graph layout"
[11]: https://github.com/juanbono/webcola-wasm?utm_source=chatgpt.com "juanbono/webcola-wasm: Javascript constraint-based ..."
[12]: https://github.com/dagrejs/dagre?utm_source=chatgpt.com "dagrejs/dagre: Directed graph layout for JavaScript"
[13]: https://www.npmjs.com/package/dagre?utm_source=chatgpt.com "dagre"
[14]: https://js.cytoscape.org/?utm_source=chatgpt.com "Cytoscape.js"


-----------------

以下の条件を加えると計画は変わる？

* エンティティは多くて300個程度を想定
* 実行時間はローディングアイコンを表示する前提で最大10秒ぐらいに収めたい
* 処理が複数種類あるなら進捗バーを表示して種類が進む毎にバーを進めてもいいかも。
* 視覚的な遊びとして処理が１種類進む毎に、表示されているエンティティの配置を更新してアルゴリズムがどういう最適化をしているかを可視化できると面白いかも。（簡単に実現できるならこういうのもアリ。待ち時間も誤魔化せるし）


-----------------


変わる。主に「300ノード」と「10秒上限」を守るために、最適化のやり方と更新方法を“段階化・分割・非同期化”に寄せるのが前提になる。

### 計画の変更点（アルゴリズム面）

* **連結成分分割は必須**（コンポーネントごとに別レイアウト→最後にパッキング）。300ノードを一塊で回すより安定して速い。
* **交差数の最小化は“常時計測しない”前提**にする（交差判定は重いので、各ステップの最後だけ or 低頻度で実施）。

  * 交差の完全最小化を狙うより、**「層/クラスタで粗く整える」＋「重なりを潰す」**を優先する方が10秒制約に合う。
* Force系を使うなら、tick回数を固定上限にして**短時間で妥協**する設計にする（品質は“十分よい”で止める）。
* クラスタリング（Louvain等）を入れる場合も、**最初の1回だけ**で、以降の反復で再計算しない。

### 計画の変更点（実装・パフォーマンス面）

* **Web Worker 前提**にする（UIスレッドで300ノード10秒は、描画更新を混ぜるとカクつきやすい）。
* React Flowへの反映は「毎tick」ではなく、**一定間隔（例：100〜300ms）で間引いて反映**するのが現実的。
* 重なり判定は全ペアO(n²)を避けて、**空間ハッシュ（グリッド）で近傍だけ**にする方が安全（300でもギリ回るが、他処理と併用で効いてくる）。

### 進捗バーの扱い（やるなら）

「複数種類の処理」という前提にすると作りやすい。例えば：

1. 準備（サイズ確定・成分分割）
2. 粗レイアウト（クラスタ/成分単位）
3. 詳細レイアウト（成分内）
4. 重なり除去
5. パッキング・最終調整

この“段階”をそのままバーに割り当てると、正確な％推定が不要で破綻しにくい。

### 「可視化しながら進む」案は計画に入れられる？

入れられる。ただし条件付きで、やり方は以下が現実的。

* **段階ごとに一括更新**（ステップ2完了→座標反映、ステップ3完了→反映…）
  → 実装が簡単で、10秒制約とも両立しやすい。
* もう少し動きを見せたいなら、ステップ2/3の内部で **間引き更新（例：200msごと）**
  → “最適化してる感”は出るが、更新頻度を上げるほど遅くなるので上限を決める。

要するに、追加条件があるなら「ハイブリッド多段レイアウト」は維持しつつ、**(1)分割、(2)Worker、(3)段階進捗、(4)更新間引き**を最初から前提にした計画に変えるのが良い。
