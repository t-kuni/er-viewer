## 1. データモデル設計（TypeSpec案）

### 基本方針

* **「テキスト＝矩形（ボックス）＋中身（文字）」**として扱う（矩形と同じく *x,y,width,height* を持つ）
* 矩形と操作感・プロパティ体系を揃えるため、**fill/stroke/strokeWidth/opacity** は矩形と同じ意味（ボックス側）
* 文字色は矩形の `fill` と衝突するので **textColor** を別に持つ
* 「範囲に描画」と「内容に合わせて範囲最適化」を両立するため、**autoSizeMode** を持つ

### TypeSpec例（Textの置き換え）

```typescript
enum TextAlign {
  left,
  center,
  right,
}

enum TextAutoSizeMode {
  manual,      // ユーザーのwidth/heightを維持
  fitContent,  // 内容に合わせて width/height を両方更新
  fitWidth,    // width固定で、高さだけ内容に合わせて更新（折り返し前提）
}

enum TextOverflowMode {
  clip,    // はみ出しは隠す
  scroll,  // スクロール（表示側だけ）
}

model DropShadow {
  enabled: boolean;
  offsetX: float64;
  offsetY: float64;
  blur: float64;
  spread: float64;
  color: string;    // "#RRGGBB"
  opacity: float64; // 0..1
}

model TextBox {
  id: string;    // UUID
  x: float64;
  y: float64;
  width: float64;
  height: float64;

  content: string;      // "\n" を含むプレーンテキスト
  fontSize: float64;    // px
  lineHeight: float64;  // px（または倍率にしたいなら float64 で 1.4 など）
  textAlign: TextAlign;

  textColor: string;    // 文字色（例 "#111111"）

  fill: string;         // ボックス背景色（矩形と同義）
  stroke: string;       // ボックス枠線色
  strokeWidth: float64; // ボックス枠線幅
  opacity: float64;     // ボックス全体の不透明度（0..1）

  paddingX: float64;
  paddingY: float64;

  wrap: boolean;                 // true: 折り返し（幅制約あり）
  overflow: TextOverflowMode;    // 表示のはみ出し

  autoSizeMode: TextAutoSizeMode;
  shadow: DropShadow;
}
```

### 「矩形を設定してその範囲に描画」の実装

* `width/height` を持つため、そのまま **ボックス内に描画**すれば成立
* 折り返しは `wrap=true` のとき **width 制約で折り返し、height は clip/scroll/fitWidthで処理**に分岐

### 「入力した文字に範囲を最適化」の実装

* `autoSizeMode=fitContent` のとき：**測定結果で width/height を更新**
* `autoSizeMode=fitWidth` のとき：**width固定で height だけ測定値に更新**
* `autoSizeMode=manual` のとき：更新しない（パネルに「内容に合わせる」ボタンで一回実行できると扱いやすい）

### 改行対応

* `content` はそのまま `\n` を保存
* 描画は `white-space: pre-wrap`（HTML案）で改行と連続スペースを自然に表現

---

## 2. テキスト編集UIの実装方法

### 推奨：インライン編集（ダブルクリック）＋サイドパネル（テキストエリア）

* **インライン編集**：配置しながら編集でき、ダイアグラム用途と相性が良い
* **サイドパネル**：長文や微修正、コピペに強い（インラインだけだと視認性が落ちる）

### 編集部品

* **`textarea` のオーバーレイ**を推奨（contenteditableより挙動が安定）

  * Enterで改行が自然
  * IME（日本語入力）・複数行・Undo/Redo がブラウザ標準で安定

### リアルタイム編集と状態管理

* 編集中は **ローカル状態（React state）に draft** を保持し、表示も draft を優先
* コミットタイミング：

  * `blur`（フォーカスアウト）で確定
  * `Esc` でキャンセル（draft破棄）
  * `Ctrl/Cmd+Enter` で確定（任意）
* `autoSizeMode` が `fitContent/fitWidth` の場合は **確定時に測定→bounds更新**（「入力に追随」させる）

---

## 3. テキストのレンダリング方法（HTML / SVG / Canvas）

### 結論（MVP推奨）

* **HTML（React Flowのカスタムノード内で `<div>` 描画）**が最短で要件を満たしやすい

### HTML（推奨）

* 改行：`white-space: pre-wrap`
* 折り返し：`overflow-wrap: anywhere; word-break: break-word;`
* 位置・サイズ：node styleで `width/height`
* 影：`box-shadow`
* 枠線/背景/透明度：CSSで直に対応
* 実装難度が最も低い

### SVG

* `<text>` は **複数行折り返しが弱い**（自前でtspan分割・測定が必要）
* 影は filter で可能だがUIと測定の難度が上がる
* 「ブラウザ上だけ」ならやれるが、MVPの工数が増える

### Canvas

* 測定・描画は自由だが、**選択・編集・IME・ドラッグ・リサイズ**を全部自前で持つことになり、React Flowの恩恵が薄れる
* 将来、手書きや高度な描画まで含めるなら選択肢になる

---

## 4. React Flowとの統合方法

### カスタムノードとして実装：推奨

* 矩形と同じく **Node** にすることで「ドラッグ」「選択」「リサイズ」を揃えやすい
* リサイズUIは矩形と同じく **`NodeResizer`** を使うのが最短（minWidth/minHeightも取れる） ([React Flow][1])
* ハンドルの見た目を矩形と完全に合わせたい場合は **`NodeResizeControl`** でカスタム化できる ([React Flow][2])

### ドラッグ移動

* React Flowのノードドラッグを使い、`onNodeDragStop`（または nodes change ハンドラ）で

  * `actionUpdateTextPosition(vm, id, x, y)` を呼ぶ
* 矩形と同じイベントフローに揃える

### リサイズ

* `NodeResizer` の `onResizeEnd` 相当で

  * `actionUpdateTextBounds(vm, id, {x,y,width,height})`
* `autoSizeMode != manual` の場合は、**ユーザーリサイズを行った瞬間に manual に切り替える**（「ユーザーが手で決めた」を優先）

---

## 5. プロパティパネル設計（項目と共通化）

### 必須項目（要件対応）

* 内容：textarea
* フォントサイズ：number（px）
* 配置：left/center/right（トグル or segmented）
* 背景色（fill）：矩形の `ColorPickerWithPresets` を再利用
* 枠線色（stroke）：同上
* 枠線幅（strokeWidth）
* 透明度（opacity）
* ドロップシャドウ：

  * enabled
  * offsetX / offsetY
  * blur / spread
  * color（矩形と同じピッカー再利用）
  * opacity
* 削除ボタン（矩形と同様の即削除）

### 追加しておくと要件を安定させる項目

* 文字色（textColor）：同じピッカーで追加（背景色と別）
* paddingX / paddingY（少なくとも固定値でもよいが、モデルにあるならUI化しやすい）
* autoSizeMode（manual / fitContent / fitWidth）
* overflow（clip / scroll）
* wrap（on/off）

### 共通化方針

* `ColorPickerWithPresets` をそのまま再利用（背景・枠線・文字・影色）
* 透明度・枠線幅の入力コンポーネントも矩形から抽出して共通化（Text/Rectangleで同じUI）

---

## 6. フォントの扱い（クロスプラットフォーム＋多言語）

### 推奨

* フォント選択UIは作らず、**CSSで「システムフォント＋Noto系フォールバック」固定**にする
* 多言語はフォールバックで吸収

例：CSSの `font-family` を固定（実装側の定数）

* `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif`

### Webフォントを入れるか

* 見た目の一貫性が重要なら Noto をWebフォントで読み込む選択はある
* ただしMVPで「余計な機能を盛り込まない」なら、まずは **システム＋フォールバック**で十分

---

## 7. ドロップシャドウの実装

### 推奨：CSS `box-shadow`

* ボックス（背景＋枠）に対する影：`box-shadow` が最短
* 設定値は `DropShadow`（offsetX, offsetY, blur, spread, color, opacity）で表現し、CSSに変換

（SVGフィルターは、HTMLノード前提のReact Flow構成だと採用理由が薄い）

---

## 8. ライブラリの必要性（導入判断）

### MVPで不要（推奨）

* 要件はプレーンテキスト中心で、React Flowがドラッグ・選択・リサイズを担うため
* リッチテキストエディタ（Slate/Quill等）は過剰（太字/リンク/部分装飾が要件にない）

### 将来ライブラリ導入を検討する条件

* 「回転」「テキストのパス配置」「部分装飾」「図形内の高度な回り込み」などに拡張したい
* その場合、Canvas系（Konva/Fabric）に寄せる判断が出るが、React Flowとの責務分離を作り直すコストが大きい

---

## 9. Action設計（純粋関数）

### 追加/更新系（要件＋運用で必要になりやすいもの）

* `actionAddText(vm, textBox)`
* `actionRemoveText(vm, textId)`
* `actionUpdateTextPosition(vm, textId, x, y)`
* `actionUpdateTextSize(vm, textId, width, height)`
* `actionUpdateTextBounds(vm, textId, {x, y, width, height})`
* `actionUpdateTextContent(vm, textId, content)`
* `actionUpdateTextStyle(vm, textId, stylePatch)`

### あると実装が楽になるもの

* `actionSetTextAutoSizeMode(vm, textId, mode)`
* `actionFitTextBoundsToContent(vm, textId)`（測定結果を受け取って bounds を更新する前提。測定自体はUI側で行い、actionには数値を渡す）
* `actionUpdateTextShadow(vm, textId, shadowPatch)`
* `actionUpdateTextPadding(vm, textId, paddingX, paddingY)`

※ 測定はDOM依存になるため、**純粋関数action内部で測定しない**。UI側で測定して結果（width/height）をactionに渡す設計が一番割り切れる。

---

## 10. UXとアクセシビリティ

### テキスト作成UX（矩形と揃える）

* ツールバー「テキスト追加」クリック → viewport中央にデフォルトサイズのTextBox追加 → すぐ編集モード
* デフォルト例（矩形に寄せる）

  * width 200, height 80
  * fill `#F5F5F5`（薄グレー） or 矩形デフォルト踏襲
  * stroke `#90CAF9`, strokeWidth 2, opacity 1
  * fontSize 14〜16

### キーボード操作

* 選択：Tabでフォーカスできるよう `tabIndex=0`
* 編集開始：Enter または F2（どちらか片方でも）
* 編集終了：Escでキャンセル、Ctrl/Cmd+Enterで確定、blurで確定
* `aria-label` は「Text: {先頭の数十文字}」などで付与

---

## 11. 他アプリの事例（実装方針に効く部分）

### draw.io（diagrams.net）

* SVG出力でテキストを **`foreignObject`（HTML埋め込み）**にしており、ブラウザ以外のSVGレンダラで崩れる/出ない問題が説明されている ([drawio.com][3])
  → 「HTMLでテキスト表示」はブラウザ内では強いが、**SVG互換性が必要な世界では弱点**になり得る、という示唆。

### React Flow

* ノードのリサイズは `NodeResizer` を公式が提供しており、最小サイズ指定などもサポート ([React Flow][1])
  → 矩形と同じ操作感を作るのに最短。

### Excalidraw（テキスト測定）

* `measureText` 等の測定結果がデバイスで揺れるケースが議論されている ([GitHub][4])
  → 「内容に合わせる」自動サイズは、環境差で微妙にズレる前提を置き、**手動リサイズ（manual）へ逃げられる設計**（autoSizeMode）にしておくのが安定。

### Miro（テキストボックスのリサイズ）

* テキストボックスのリサイズ操作（左右境界ドラッグ等）がヘルプに記載されている ([Miroヘルプセンター][5])
  → “テキスト＝ボックス”のメンタルモデルは一般的で、今回のTextBox設計と整合する。

[1]: https://reactflow.dev/api-reference/components/node-resizer?utm_source=chatgpt.com "The NodeResizer component"
[2]: https://reactflow.dev/api-reference/components/node-resize-control?utm_source=chatgpt.com "The NodeResizeControl component"
[3]: https://www.drawio.com/doc/faq/svg-export-text-problems?utm_source=chatgpt.com "Why text in exported SVG images may not display correctly"
[4]: https://github.com/excalidraw/excalidraw/issues/4926?utm_source=chatgpt.com "measureText results in different metrics on different devices"
[5]: https://help.miro.com/hc/en-us/articles/360017572094-Text?utm_source=chatgpt.com "Text"
