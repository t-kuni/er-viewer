## 1. 状態管理の設計案

### 選択状態の保持（Option A/B/C）

**結論：Option B（`ItemRef.kind` に `"entity"` を追加）が最も扱いやすい**です。

* **Option B（推奨）**: `selectedItem` を「キャンバス上で“いま選択しているもの”」に統一できる

  * ✅ 既存の「矩形・テキスト選択」の仕組み（Action / 解除処理 / UI連携）をそのまま流用できる
  * ✅ 「他のエンティティをクリックすると前の選択が解除される」が自然に実現（単一選択として上書き）
  * ✅ ESC / 空白クリックでの解除も 1 経路に集約できる
  * ❗ `selectedItem` という名前が実態とズレるなら `selectedRef` 等に改名（MVPなら後回しでもOK）

* **Option A**: `selectedItem` と `selectedEntity` が並立する

  * ✅ 変更が局所的に見える
  * ❗ 排他制御（両方同時に選択されないようにする）をどこかで必ず書く必要があり、バグ温床になりやすい

* **Option C**: ER図専用の選択として `ERDiagramUIState` に入れる

  * ✅ レイヤとしては一番きれい（図のUIは図のUIに閉じる）
  * ❗ 現状「矩形・テキスト選択」が Global にあるので、選択が二系統になりやすい（統一するなら移設もセットになりがち）

**Option B の型案**

```ts
model GlobalUIState {
  selectedItem: ItemRef | null;
  // ...
}

model ItemRef {
  kind: "rectangle" | "text" | "entity";
  id: string;
}
```

### 選択時のホバー動作の制御

**結論：Action層で“選択中はホバー更新を無視”が一番崩れにくい**です。

* コンポーネント側で `onMouseEnter` を条件で外す方式だと、

  * ノード/エッジ/カラム等の全コンポーネントで分岐が増えやすい
  * 将来インタラクションが増えるほど「外し忘れ」が起きやすい
* Action層なら「入口が少ない」ので安全（`actionHoverEntity/Edge/Column` だけ見ればよい）

**実装方針（例）**

```ts
const getSelectedEntityId = (vm: ViewModel): string | null =>
  vm.ui.selectedItem?.kind === "entity" ? vm.ui.selectedItem.id : null;

export function actionHoverEntity(vm: ViewModel, entityId: string): ViewModel {
  if (getSelectedEntityId(vm) !== null) return vm; // 選択中はホバー無効
  // 既存の hover → highlight 計算
  return computeHoverHighlights(vm, { type: "entity", id: entityId });
}
```

選択を切り替えるときは、ホバー状態も一緒にクリアしておくと「mouseleave で意図せず消える」みたいな揺れを減らせます。

```ts
export function actionSelectItem(vm: ViewModel, item: ItemRef): ViewModel {
  // 既存ロジックに加えて、entity選択時は hover をクリアする等
}
```

### パフォーマンスへの影響

* いまの「自分がハイライトされているか（boolean）だけ購読」の作りは、選択導入後もそのまま効きます。
* 選択/解除で `highlightedNodeIds` などが更新されても、再レンダリングは「boolean が変わったコンポーネントのみ」になります（現状の selector 最適化が維持されるため）。
* エンティティ最大 300 程度なら、関連ハイライトの計算が O(関連数) でも実用上まず問題になりません（逆引き index が既にある前提ならなおさら）。

---

## 2. UIレイアウトの設計案

### 右サイドバーの幅

* **固定幅 420px 前後**を基準に、`min/max` を付けるのが扱いやすいです。

  * `min-width: 360px; width: 420px; max-width: 50vw;`

DDLは横スクロールが発生しやすいので、本文は `overflow: auto` 前提が楽です。

### キャンバスとの関係（縮小 vs 重ね）

* **結論：縮小（横並びレイアウト）が無難**です。

  * オーバーレイだと、背後のノード操作（ドラッグ・選択）が「見えてるのに触れない」領域が増えやすい
  * MVPで“考えること”を減らすなら、`display:flex` で「左パネル / キャンバス / 右パネル」にするのが安定

### 左レイヤーパネルとのスタイル統一

* 左右とも「同じパネルコンポーネント（枠/影/ヘッダ/閉じる）」に寄せるのが最小工数です。

  * 例：`PanelShell`（title + close + body）を共通化して、左は LayerPanel、右は EntityDDLPanel を差し替え

---

## 3. Syntax Highlightライブラリの推奨

### ライブラリは必要か？

* **“ちゃんとした” SQL ハイライトを狙うなら、ライブラリを入れるのが現実的**です。
* CSSだけでやる場合は結局「SQLをトークナイズする処理（正規表現地獄 or 自前lexer）」が必要になり、メンテコストが上がります（文字列・コメント・バッククォート・複合キーワード等で破綻しがち）。

### 推奨：`react-syntax-highlighter`

**理由（MVP向き）**

* React 用コンポーネントとして完結していて、読み取り専用表示が最短で実装できる
* npm 上で直近（2025-10-28）に更新があり、2026時点でも動いている前提を置きやすい ([npmjs.com][1])

**バージョン**

* メジャー：16系 / 最新：16.1.0 ([npmjs.com][1])

**インストール**

```bash
npm i react-syntax-highlighter
# TSで必要なら（ただし更新はやや停滞）
npm i -D @types/react-syntax-highlighter
```

`@types/react-syntax-highlighter` の最新は 15.5.13（2024-05-03）なので、サブパス import に型が追いつかないケースは起こり得ます。 ([npmjs.com][2])
（MVPなら `declare module` で逃がすのが早い）

**基本例（読み取り専用DDL表示）**

```tsx
import SyntaxHighlighter from "react-syntax-highlighter";
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism";

export function DdlViewer({ ddl }: { ddl: string }) {
  return (
    <SyntaxHighlighter language="sql" style={prism} wrapLongLines>
      {ddl}
    </SyntaxHighlighter>
  );
}
```

### 代替（より“活発”寄り）：`shiki`

* `shiki` は 2026-01-07 時点で 3.21.0 が出ており更新がかなり新しいです。 ([npmjs.com][3])
* ただしブラウザ側での初期化が **非同期** になりやすく、MVPの配線は少し増えます。

（参考）`shiki` 自体：3.21.0 ([npmjs.com][3]) / Reactラッパ例として `react-shiki`：0.9.1 ([npmjs.com][4])

### 比較対象としての現状

* `prism-react-renderer` 最新は 2.4.1（2024-12-11） ([npmjs.com][5])
* `highlight.js` 自体は 11.11.1（2024-12-25） ([npmjs.com][6])
* `react-highlight` は 0.15.0（2022-11-17）で更新が古め ([npmjs.com][7])

---

## 4. イベント処理の実装方法

### クリック（React Flow）

設計として **`onNodeClick` / `onPaneClick` で dispatch** は問題ありません。

```tsx
<ReactFlow
  onNodeClick={(_, node) => dispatch(actionSelectItem, { kind: "entity", id: node.id })}
  onPaneClick={() => dispatch(actionDeselectItem)}
/>
```

右サイドバー内クリックで `onPaneClick` が起きないように、サイドバー外側で `stopPropagation` が必要になることがあります（配置次第）。

### ESCキー（選択解除）

実装コストが低いのは **`useKeyPress('Escape')` を使う**案です（React Flowのフックだが、ReactFlow配下でなくても使える）。 ([React Flow][8])

```tsx
import { useEffect, useRef } from "react";
import { useKeyPress } from "@xyflow/react";

export function EscapeToDeselect() {
  const esc = useKeyPress("Escape");
  const prev = useRef(false);

  useEffect(() => {
    if (esc && !prev.current) {
      dispatch(actionDeselectItem);
    }
    prev.current = esc;
  }, [esc]);

  return null;
}
```

React Flow自体もアクセシビリティ機能として「Escapeで選択解除」を案内していますが、これはReact Flow側の“選択”を使う場合の話です。 ([React Flow][9])
（今回の要件はあなたの ViewModel 選択なので、上のように明示的に解除する方が確実です）

---

## 5. 実装計画（段階的アプローチ）

提示のフェーズ分割で大筋OKですが、**「選択がハイライトを固定する」までを早めに通す**のが後戻りを減らします。

* **フェーズ1（選択の導入 + ハイライト固定）**

  * Option B の型変更（`ItemRef.kind: "entity"`）
  * `onNodeClick` / `onPaneClick` で選択/解除
  * hoverActions を「選択中は早期return」に変更（= 選択固定が成立）

* **フェーズ2（ESC解除）**

  * `useKeyPress('Escape')` 等で `actionDeselectItem` を叩く

* **フェーズ3（右サイドバー：枠だけ）**

  * `selectedItem.kind === "entity"` のときだけ開く
  * レイアウトを flex 化（キャンバス縮小）

* **フェーズ4（DDL表示 + syntax highlight）**

  * `EntityNodeViewModel.ddl` を表示
  * `react-syntax-highlighter` を入れる（もしくは shiki）

注意点としては、**「選択解除時に `hover` と `highlighted*` をどうするか」**を決め打ちしておくのが重要です。おすすめは「解除した瞬間は hover もクリア（=何もハイライトされない）」で、挙動が読みやすくなります。

---

## 6. 他のReact Flowプロジェクトでの事例

* **ノード選択の基本は React Flow の“Selection”機構に乗せる**のが一般的で、カスタムノードでは `selected` prop を使って見た目を変えるのが想定されています。 ([React Flow][10])
* **サイドパネル連携は `onSelectionChange` / `useOnSelectionChange` で外部状態に橋渡し**するのが定番です（選択ノードIDをパネルに渡す）。 ([React Flow][11])
* 実際に「左が構造、右がノード詳細（属性）」の構成で、ノード移動時の保存確認などを相談している例もあります。 ([GitHub][12])

[1]: https://www.npmjs.com/package/react-syntax-highlighter?utm_source=chatgpt.com "react-syntax-highlighter"
[2]: https://www.npmjs.com/package/%40types/react-syntax-highlighter?activeTab=versions&utm_source=chatgpt.com "types/react-syntax-highlighter"
[3]: https://www.npmjs.com/package/shiki?utm_source=chatgpt.com "shiki"
[4]: https://www.npmjs.com/react-shiki?utm_source=chatgpt.com "react-shiki"
[5]: https://npmjs.com/package/prism-react-renderer?utm_source=chatgpt.com "prism-react-renderer"
[6]: https://www.npmjs.com/package/highlight.js?activeTab=readme&utm_source=chatgpt.com "highlight.js"
[7]: https://www.npmjs.com/package/react-highlight?activeTab=readme&utm_source=chatgpt.com "react-highlight"
[8]: https://reactflow.dev/api-reference/hooks/use-key-press "useKeyPress() - React Flow"
[9]: https://reactflow.dev/learn/advanced-use/accessibility "Accessibility - React Flow"
[10]: https://reactflow.dev/learn/concepts/terms-and-definitions "Overview - React Flow"
[11]: https://reactflow.dev/api-reference/hooks/use-on-selection-change "useOnSelectionChange() - React Flow"
[12]: https://github.com/xyflow/xyflow/discussions/2455?utm_source=chatgpt.com "How to trigger onNodeClick on a certain node #2455"
