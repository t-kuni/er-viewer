# ER Diagram Viewerにおけるテキスト描画機能の実装方針検討

## リサーチ要件

以下の仕様のテキスト描画機能を検討してほしい：

* テキストを描画できる
* 改行できる
* 矩形を設定してその範囲に文字列を描画することができる。また、入力した文字に範囲を最適化することもできる。
* ドラッグで位置を変更できる
* 矩形の端のハンドル(?)をドラッグするとリサイズできる
* 大まかな操作感は矩形編集と揃える
* 左寄せ、中央寄せ、右寄せを選択できる
* 塗りつぶし色とボーダー色を選択できる（矩形編集のカラーピッカーとプリセット色を踏襲する）
* ドロップシャドウを設定できる
* 右サイドパネルでプロパティを編集する
* フォントのサイズを編集できる
* フォントを選択できる必要はないが、クロスプラットフォーム対応で、多言語に対応できるとありがたい
* ライブラリを導入したほうがよいか？

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite + React + React Flow
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec

### 現状のフェーズ

- アプリケーションを丸ごと作り直そうとしているので不要なコードが残っているケースあり
- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- 後方互換も考慮しない
- 不要になったコードは捨てる
- AIが作業するため学習コストは考慮不要

## 現在の状態管理アーキテクチャ

### ViewModelの構造

アプリケーション全体の状態は`ViewModel`という単一の型で管理されている。すべての型は`scheme/main.tsp`で定義されている。

#### ViewModel（ルート型）

```typescript
model ViewModel {
  format: string; // データフォーマット識別子（固定値: "er-viewer"）
  version: int32; // データフォーマットのバージョン（現在は 1 固定）
  erDiagram: ERDiagramViewModel; // ER図の状態
  ui: GlobalUIState; // グローバルUI状態
  buildInfo: BuildInfoState; // ビルド情報のキャッシュ
}
```

#### ERDiagramViewModel

```typescript
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;       // エンティティノード（テーブル）
  edges: Record<RelationshipEdgeViewModel>; // リレーションシップ（外部キー）
  rectangles: Record<Rectangle>;            // 矩形（グループ化・領域区別用）
  ui: ERDiagramUIState;                     // ER図のUI状態
  loading: boolean;                         // リバースエンジニア処理中フラグ
}
```

#### Text（現在の定義）

現在、TypeSpecには以下のようなText型が定義されているが、実装はされていない：

```typescript
model Text {
  id: string; // UUID
  x: float64;
  y: float64;
  content: string;
  fontSize: float64;
  fill: string;
}
```

#### Rectangle（既存実装の参考）

矩形機能は既に実装済みで、以下の型定義がある：

```typescript
model Rectangle {
  id: string; // UUID
  x: float64;
  y: float64;
  width: float64;
  height: float64;
  fill: string;        // 背景色（例: "#E3F2FD"）
  stroke: string;      // 枠線色（例: "#90CAF9"）
  strokeWidth: float64;// 枠線幅（px）
  opacity: float64;    // 透明度（0〜1）
}
```

#### GlobalUIState（グローバルUI状態）

```typescript
model GlobalUIState {
  selectedItem: LayerItemRef | null; // 選択中のアイテム（矩形、テキスト、エンティティ）
  showBuildInfoModal: boolean;       // ビルド情報モーダル表示フラグ
  showLayerPanel: boolean;           // レイヤーパネル表示フラグ
}
```

#### LayerItemRef

```typescript
enum LayerItemKind {
  entity,    // エンティティ（ER図レイヤー固定、編集不可）
  relation,  // リレーション（ER図レイヤー固定、編集不可）
  rectangle, // 矩形（前面・背面に配置可能）
  text,      // テキスト（前面・背面に配置可能）
}

model LayerItemRef {
  kind: LayerItemKind;
  id: string; // UUID
}
```

### 状態管理の仕組み

- **単一状態ツリー**: アプリケーション全体の状態を`ViewModel`で管理
- **純粋関数Action**: すべての状態更新は `action(viewModel, ...params) => newViewModel` の形式で実装
- **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）

Storeは`public/src/store/erDiagramStore.ts`に実装されている。

### ID仕様

すべての`id`フィールドはUUID (Universally Unique Identifier)を使用している。

- UUIDは`crypto.randomUUID()`で生成
- 一度生成されたIDは保存され、増分更新時も維持される（永続性を持つ）

## 矩形描画機能の既存実装（参考情報）

テキスト描画機能と操作感を揃えるため、既に実装されている矩形描画機能の仕様を参考情報として記載する。

### 矩形の基本機能

* ツールバーの「矩形追加」ボタンをクリックすると、viewport中央に固定サイズの矩形を追加
* 新規作成時のデフォルト値：
  - サイズ: 幅200px × 高さ150px
  - 背景色: 淡い青（`#E3F2FD`）
  - 枠線色: 青（`#90CAF9`）
  - 枠線幅: 2px
  - 透明度: 0.5

### 矩形の操作

* 矩形をドラッグして位置を変更可能
* 選択中の矩形に対してリサイズハンドルを表示
* React Flowの`NodeResizer`コンポーネントを使用してリサイズ
* 最小サイズ: 幅40px × 高さ40px

### 矩形のプロパティパネル

右サイドバーに矩形プロパティパネルが表示される（矩形選択時のみ）：

#### プロパティ編集項目

1. **背景色（fill）**
   - カラーピッカー（`HexColorPicker` + `HexColorInput` from react-colorful）
   - プリセット色ボタン: 8色を横2列 × 縦4行でグリッド表示
   - プリセット色:
     * 青: `#E3F2FD`
     * シアン: `#E0F7FA`
     * ティール: `#E0F2F1`
     * 緑: `#E8F5E9`
     * 黄: `#FFFDE7`
     * オレンジ: `#FFF3E0`
     * ピンク: `#FCE4EC`
     * グレー: `#F5F5F5`

2. **枠線色（stroke）**
   - カラーピッカー（同上）
   - プリセット色ボタン（同上）

3. **透明度（opacity）**
   - `<input type="range">`スライダー + 現在値表示
   - 範囲: 0〜1、ステップ0.01
   - 表示形式: パーセント表示（例: 50%）

4. **枠線幅（strokeWidth）**
   - `<input type="number">` + 単位表示（px）
   - 範囲: 0以上、ステップ1

5. **削除ボタン**
   - 赤背景（`#dc3545`）、白文字
   - クリック時に即座に削除（確認ダイアログなし）

### カラーピッカーの実装

矩形機能では以下のライブラリを使用している：

* **react-colorful**: 軽量なカラーピッカーライブラリ
  - `HexColorPicker`: インタラクティブなカラーピッカー
  - `HexColorInput`: HEX値の直接入力フィールド

カラーピッカーとプリセット色を一体化した再利用可能なコンポーネント（`ColorPickerWithPresets`）が実装されている。

### React Flow統合

矩形はReact Flowのカスタムノード（`rectangleNode`）として実装されている：

* `RectangleNode`コンポーネント（`public/src/components/RectangleNode.tsx`）
* `NodeResizer`を内包し、選択時にリサイズハンドルを表示
* 最小サイズ: 幅40px × 高さ40px
* `onResizeEnd`でリサイズ完了時に座標とサイズを更新

### Action設計

矩形操作用のActionが`public/src/actions/rectangleActions.ts`に実装されている：

* `actionAddRectangle(vm, rectangle)`: 新規矩形を追加
* `actionRemoveRectangle(vm, rectangleId)`: 矩形を削除
* `actionUpdateRectanglePosition(vm, rectangleId, x, y)`: 矩形の位置を更新
* `actionUpdateRectangleSize(vm, rectangleId, width, height)`: 矩形のサイズを更新
* `actionUpdateRectangleBounds(vm, rectangleId, {x, y, width, height})`: 矩形の座標とサイズを一括更新
* `actionUpdateRectangleStyle(vm, rectangleId, stylePatch)`: 矩形のスタイルを部分更新

すべてのActionは純粋関数で実装され、状態に変化がない場合は同一参照を返す。

### z-index制御

矩形はエンティティより背景に配置される：

* 矩形ノード: `zIndex = 0`
* エンティティノード: `zIndex = 100`
* エッジ: デフォルト（0未満）

React Flow設定：

* `elevateNodesOnSelect={false}`: 選択時に矩形が前面に出ないようにする
* または`zIndexMode="manual"`: 自動z-index制御を無効化し、明示的にzIndexを管理

## 既存のレイヤー管理機能

レイヤー管理機能が実装されている。テキストもこのレイヤー管理システムに統合される予定。

### LayerOrder

```typescript
model LayerOrder {
  backgroundItems: LayerItemRef[]; // 背面アイテム（配列の後ろが前面寄り）
  foregroundItems: LayerItemRef[]; // 前面アイテム（配列の後ろが前面寄り）
}
```

矩形やテキストは前面・背面に配置可能。エンティティとリレーションはER図レイヤー固定で編集不可。

### レイヤーパネル

レイヤーパネル（`LayerPanel`コンポーネント）が実装されており、以下の機能がある：

* レイヤー順序の表示
* アイテムの選択
* レイヤー順序の変更（ドラッグ&ドロップ）

## 検討してほしい内容

以下の観点から、テキスト描画機能の実装方針を検討してほしい：

### 1. データモデル設計

- 現在のText型をどのように拡張すべきか？
- 必要なプロパティは何か？（例: width, height, textAlign, fontFamily, stroke, strokeWidth, opacity, shadowなど）
- 矩形を設定してその範囲に文字列を描画する仕様をどのように実装すべきか？
- 「入力した文字に範囲を最適化する」機能をどのように実装すべきか？
- 改行対応はどのように実装すべきか？

### 2. テキスト編集の実装方法

- テキストの編集UIをどのように実装すべきか？
  - インライン編集（ダブルクリックで編集モード）
  - サイドパネルのテキストエリア
  - モーダルダイアログ
- 改行の入力方法
- リアルタイム編集とプレビュー
- 編集中と編集完了後の状態管理

### 3. React Flowとの統合

- テキストをReact Flowのカスタムノードとして実装すべきか？
- テキストのドラッグ移動の実装方法
- リサイズハンドルの実装方法（`NodeResizer`を使うか、独自実装か）
- テキストの描画方法（HTML要素、SVG、Canvasなど）
- 矩形との操作感の統一

### 4. プロパティパネルの設計

右サイドバーに表示するテキストプロパティパネルの項目：

- テキスト内容の編集
- フォントサイズ
- テキスト配置（左寄せ、中央寄せ、右寄せ）
- 塗りつぶし色（矩形と同じカラーピッカー）
- ボーダー色（矩形と同じカラーピッカー）
- ボーダー幅
- 透明度
- ドロップシャドウ（設定項目は何が必要か？）
- 削除ボタン

### 5. フォントの扱い

- クロスプラットフォーム対応のフォント選択
- 多言語対応（日本語、英語、中国語など）
- フォントファミリーの選択は必要か？不要か？
- システムフォントを使うか、Webフォントを使うか？
- フォールバックフォントの設定

### 6. ドロップシャドウの実装

- ドロップシャドウの設定項目（例: offsetX, offsetY, blur, color, opacity）
- CSSの`box-shadow`や`text-shadow`を使うか？
- SVGフィルターを使うか？
- プロパティパネルでの設定UI

### 7. テキストのレンダリング

- HTML要素（`<div>`）で描画するか？
- SVG（`<text>`）で描画するか？
- Canvasで描画するか？
- 各方法のメリット・デメリット
- 改行、テキスト配置、ドロップシャドウの実装難易度

### 8. リサイズ機能

- テキストボックスのリサイズ方法
- 「入力した文字に範囲を最適化する」機能の実装
  - 自動サイズ調整ボタン
  - 常に自動調整（リサイズ不可）
  - ユーザーが選択可能
- 最小サイズの設定
- テキストがボックスからあふれた場合の処理（省略記号、スクロール、自動拡大など）

### 9. Action設計

テキスト操作用のActionに必要な関数：

- `actionAddText(vm, text)`: 新規テキストを追加
- `actionRemoveText(vm, textId)`: テキストを削除
- `actionUpdateTextPosition(vm, textId, x, y)`: テキストの位置を更新
- `actionUpdateTextSize(vm, textId, width, height)`: テキストのサイズを更新
- `actionUpdateTextBounds(vm, textId, {x, y, width, height})`: テキストの座標とサイズを一括更新
- `actionUpdateTextContent(vm, textId, content)`: テキスト内容を更新
- `actionUpdateTextStyle(vm, textId, stylePatch)`: テキストのスタイルを部分更新

その他必要なActionはあるか？

### 10. ライブラリの必要性

以下のようなライブラリの導入を検討すべきか？

- リッチテキストエディタ（例: Slate, Draft.js, Quill）
- テキスト描画ライブラリ（例: fabric.js, konva）
- SVGテキスト処理ライブラリ
- フォント管理ライブラリ

または、ネイティブHTMLとCSSで十分か？

### 11. z-index制御

- テキストのz-indexをどのように設定すべきか？
- 矩形と同様に背景・前面レイヤーに配置可能にするか？
- デフォルトの配置位置は？

### 12. テキスト作成のUX

- テキスト作成方法
  - ツールバーの「テキスト追加」ボタン（矩形と同様）
  - キャンバス上でクリック
  - キャンバス上でドラッグ範囲選択
- 新規作成時のデフォルト値（サイズ、色、フォントサイズなど）

### 13. 複数選択時の挙動

- 複数のテキストが選択されている場合の処理
- 一括編集機能は必要か？（MVPでは不要かもしれない）

### 14. パフォーマンス

- テキストノードが大量に存在する場合のパフォーマンス
- 仮想化やレンダリング最適化は必要か？（MVPでは不要かもしれない）

### 15. アクセシビリティ

- テキストノードのアクセシビリティ
- スクリーンリーダー対応
- キーボード操作対応

### 16. 既存機能との統合

- レイヤー管理機能との統合
- インポート・エクスポート機能との統合
- テキストデータの永続化

### 17. 他のWebアプリケーションでの事例

- 類似のアプリケーション（図表作成ツール、ダイアグラムエディタなど）でのテキスト描画機能の実装例
  - Figma
  - Miro
  - Excalidraw
  - draw.io
  - Lucidchart
- ベストプラクティスや参考になる設計パターン

## 期待する回答

以下について、具体的な見解と理由を提示してほしい：

1. **データモデル設計**
   - Text型に必要なプロパティの完全なリスト（具体的な型定義）
   - 矩形を設定して文字列を描画する仕様の実装方法
   - 自動サイズ調整機能の実装方法

2. **テキスト編集の実装方法**
   - 編集UIの実装方法（インライン編集、サイドパネル、モーダルなど）
   - 改行対応の実装方法
   - メリット・デメリット

3. **テキストのレンダリング方法**
   - HTML、SVG、Canvasのどれを使うべきか
   - 各方法のメリット・デメリット
   - 改行、テキスト配置、ドロップシャドウの実装難易度

4. **React Flowとの統合方法**
   - カスタムノードとして実装する際の注意点
   - ドラッグ移動とリサイズの実装方法

5. **プロパティパネルの設計**
   - 必要な編集項目のリスト
   - UIレイアウト
   - 矩形プロパティパネルとの共通化

6. **フォントの扱い**
   - クロスプラットフォーム対応のフォント選択方法
   - 多言語対応の実装方法
   - フォントファミリーの選択が必要かどうか

7. **ドロップシャドウの実装**
   - 必要な設定項目
   - 実装方法（CSS、SVGフィルターなど）
   - プロパティパネルのUI

8. **ライブラリの必要性**
   - どのライブラリが有用か、またはネイティブAPIで十分か
   - 各ライブラリのメリット・デメリット

9. **Action設計**
   - 必要なActionのリスト
   - 純粋関数としての実装方法

10. **UXとアクセシビリティ**
    - テキスト作成方法
    - 編集フロー
    - キーボード操作対応

11. **他のアプリケーションでの事例**
    - 参考になる実装例やベストプラクティス
    - 類似ツールの分析

可能であれば、複数の実装案を比較し、それぞれのメリット・デメリットを示してほしい。
