# 矩形描画機能の実装方針検討

## リサーチ要件

以下の実装方針を検討する

* 矩形描画機能
    * 背景色を設定できる
        * 一般的なカラーピッカーを使えるほか、汎用性の高い淡めの色のプリセット８色程度を用意しておく
        * 再利用できる形で実装する（ボーダーの色や、将来実装する機能で再利用する）
        * 透明度を設定できる
    * ボーダーの色を設定できる
    * ボーダーの幅を設定できる
    * ドラッグで移動できる
    * 縁をドラッグすればサイズを変更できる

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

## 関連する既存仕様

### 矩形ノードの既存定義（TypeSpec）

現在、`scheme/main.tsp` で矩形の基本的なデータモデルが定義されている：

```typescript
model Rectangle {
  id: string; // UUID
  x: float64;
  y: float64;
  width: float64;
  height: float64;
  fill: string;
  stroke: string;
}

model LayoutData {
  entities: Record<EntityLayoutItem>;
  rectangles: Record<Rectangle>;
  texts: Record<Text>;
}
```

- 矩形は`LayoutData`の一部として保存される
- 各矩形はUUIDで識別される
- 現時点では背景色（fill）とボーダー色（stroke）のみが定義されている
- ボーダー幅や透明度は定義されていない

### フロントエンド技術スタック

#### React Flow

- **役割**: ER図のレンダリングとインタラクティブ機能（ドラッグ&ドロップ、ズーム、パンなど）
- **公式サイト**: https://reactflow.dev/
- **特徴**:
  - ノードベースのエディタを構築するためのライブラリ
  - カスタムノード（Custom Node）を定義可能
  - ドラッグ&ドロップ、リサイズなどの機能を標準で提供
  - React Flowの`NodeResizer`コンポーネントでノードのリサイズが可能

#### 現在のノード実装状況

フロントエンドでは以下のノードタイプが使用されている：

1. **エンティティノード（entityNode）**: データベーステーブルを表示
2. **矩形ノード（rectangleNode）**: エンティティのグループ化用（実装予定）
3. **テキストノード（textNode）**: 注釈用（実装予定）

`frontend_er_rendering.md`より：

> #### 補助ノード
>
> * **矩形ノード**: エンティティのグループ化用
>   * 背景色、枠線色、ラベルをカスタマイズ可能
>   * ドラッグで位置移動
>
> ### データ型マッピング
>
> #### 補助図形 → React Flow nodes
>
> ```
> Rectangle → Node {
>   id: rectangle.id,  // UUID
>   type: 'rectangleNode',
>   position: { x, y },
>   data: { id: rectangle.id, width, height, fill, stroke }
> }
> ```

### フロントエンド状態管理

`frontend_state_management.md`より、アプリケーション全体の状態管理は以下の方針：

- **単一状態ツリー**: ER図に関するすべての状態を`ERDiagramViewModel`で管理
- **純粋関数Action**: すべての状態更新は `action(viewModel, ...params) => newViewModel` の形式で実装
- **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）
- **React Flowとの統合**: ドラッグ中はReact Flow内部状態を使用、確定時のみストアに反映

現在の`ERDiagramViewModel`の型定義（TypeSpec）：

```typescript
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  ui: ERDiagramUIState;
  loading: boolean;
}
```

矩形ノードは現時点でこのViewModelに含まれていない。

### 既存のAction実装

`public/src/actions/dataActions.ts`にデータ更新関連のActionが実装されている：

- `actionSetData(viewModel, nodes, edges)`: リバースエンジニア結果を設定
- `actionUpdateNodePositions(viewModel, nodePositions)`: ノード位置を更新
- `actionSetLoading(viewModel, loading)`: ローディング状態を更新

これらのActionはすべて純粋関数として実装されており、状態に変化がない場合は同一参照を返す設計となっている。

## 検討すべき事項

以下の観点から、矩形描画機能の実装方針を提案してください：

### 1. データモデルの拡張

- **TypeSpecのRectangleモデルの拡張**
  - ボーダー幅（strokeWidth）の追加
  - 透明度（opacity）の追加
  - これらのプロパティをどのように定義すべきか？

- **ERDiagramViewModelへの統合**
  - 現在のViewModelは`nodes`（エンティティ）と`edges`（リレーション）のみ
  - 矩形ノードをどのように統合すべきか？
  - 新しいプロパティ（`rectangles: Record<RectangleViewModel>`）を追加すべきか？
  - エンティティノードと矩形ノードを統一的に扱う方法はあるか？

### 2. カラーピッカーの実装

- **React用カラーピッカーライブラリ**
  - どのようなライブラリが利用可能か？
  - 透明度（アルファチャンネル）をサポートしているか？
  - 軽量でシンプルなライブラリは？
  - 再利用可能なコンポーネントとして設計する方法は？

- **カラープリセット**
  - 汎用性の高い淡めの色のプリセット8色程度とは具体的にどのような色が適切か？
  - プリセットのデータ構造は？
  - プリセットとカラーピッカーの統合方法は？

- **色の保存形式**
  - RGB形式（`rgb(255, 255, 255)`）
  - HEX形式（`#ffffff`）
  - RGBA形式（透明度を含む）
  - どの形式が最適か？データベースへの保存や表示の観点から

### 3. React Flowでの矩形ノード実装

- **カスタムノードの実装**
  - React FlowのCustom Nodeとして矩形ノードをどう実装すべきか？
  - エンティティノードとの違いは？

- **ドラッグによる移動**
  - React Flowの標準ドラッグ機能をそのまま使用できるか？
  - `onNodeDragStop`イベントで位置を保存する流れで問題ないか？

- **縁のドラッグによるリサイズ**
  - React Flowの`NodeResizer`コンポーネントが利用可能
  - https://reactflow.dev/api-reference/components/node-resizer
  - このコンポーネントを使用した実装方法は？
  - リサイズイベントのハンドリング方法は？
  - リサイズ確定時にサイズを状態に保存する方法は？

- **スタイルのカスタマイズ**
  - 背景色、ボーダー色、ボーダー幅、透明度をどのように動的に適用するか？
  - CSSスタイルとReact Flowの統合方法

### 4. UI/UXの設計

- **矩形の作成方法**
  - ツールバーのボタンから作成？
  - キャンバス上での矩形ドラッグで作成？
  - どちらが実装しやすく、ユーザーにとって直感的か？

- **プロパティ編集UI**
  - 矩形を選択した時にプロパティ編集パネルを表示？
  - どこに配置すべきか（サイドバー、モーダル、インラインなど）？
  - カラーピッカー、透明度スライダー、ボーダー幅の入力などのレイアウト

- **再利用可能なコンポーネント設計**
  - カラーピッカーコンポーネントを矩形以外（将来的にテキストノードの色など）でも使えるようにするには？
  - プロパティ編集パネルの汎用的な設計方針は？

### 5. 状態管理とAction設計

- **矩形操作のAction**
  - 矩形追加: `actionAddRectangle(viewModel, rectangle)`
  - 矩形削除: `actionRemoveRectangle(viewModel, rectangleId)`
  - 矩形位置更新: `actionUpdateRectanglePosition(viewModel, rectangleId, x, y)`
  - 矩形サイズ更新: `actionUpdateRectangleSize(viewModel, rectangleId, width, height)`
  - 矩形スタイル更新: `actionUpdateRectangleStyle(viewModel, rectangleId, styleProps)`
  - これらのActionの実装方法と設計パターンは？

- **状態の永続化**
  - 矩形の情報を`LayoutData`に保存し、バックエンドに送信する流れ
  - 保存タイミング（リアルタイム保存？手動保存？）
  - バックエンドAPIの実装は必要か？（既存の`saveLayout`エンドポイントで対応可能か？）

### 6. z-index制御とレイヤー管理

- **矩形の表示順序**
  - 矩形はエンティティノードの背景として表示されるべき（z-indexが低い）
  - React Flowでのz-index制御方法は？
  - 矩形を選択した時に最前面に持ってくるべきか？

- **複数の矩形の重なり**
  - 矩形同士が重なった場合の制御方法
  - レイヤーの順序を変更する機能は必要か？

### 7. 実装の段階的アプローチ

- **MVPとして最小限実装すべき機能**
  - まずはどの機能から実装すべきか？
  - 段階的な実装計画の提案

- **将来的な拡張性**
  - テキストノードや他の図形（楕円、矢印など）への拡張を考慮した設計
  - 共通化すべき部分と個別実装すべき部分の切り分け

### 8. パフォーマンスと制約

- **MVPフェーズでの許容範囲**
  - プロトタイピング段階であり、過度な最適化は不要
  - ただし、明らかなパフォーマンス問題は避けたい
  - カラーピッカーの選定やリサイズ時の再レンダリングに注意すべき点は？

- **React Flowの制約**
  - React Flowの仕様上、考慮すべき制約はあるか？
  - ノードのリサイズやスタイル変更時の注意点

### 9. 既存実装との整合性

- **エンティティノードとの一貫性**
  - エンティティノードのドラッグ処理との整合性
  - 状態管理の統一性

- **ホバーインタラクションとの統合**
  - 矩形ノードにもホバーエフェクトが必要か？
  - 既存のホバー状態管理（`actionHoverEntity`など）との整合性

### 10. 具体的な実装例・サンプルコード

以下のようなサンプルコードや実装例を提供してください：

- **拡張されたRectangleモデルの定義（TypeSpec）**
- **カスタム矩形ノードコンポーネントの実装例（React + React Flow）**
- **カラーピッカーコンポーネントの実装例**
- **矩形操作Actionの実装例**
- **NodeResizerを使用したリサイズ処理の実装例**
- **プロパティ編集UIの実装例**

## 重視する点

- **再利用性**: カラーピッカーやプロパティ編集UIは他の機能でも使えるように設計
- **実装の容易さ**: MVPフェーズであり、シンプルで実装しやすい方法を優先
- **React Flowとの親和性**: React Flowの標準機能を活用し、無理のない統合
- **既存設計との整合性**: 状態管理（Action層）やTypeSpecの型定義との整合性

## 重視しない点

- **パフォーマンスの極端な最適化**: MVPフェーズでは過度な最適化は不要
- **学習コストの低減**: AIが実装するため、複雑なライブラリでも問題ない
- **後方互換性**: 考慮不要
- **高度なUI/UX**: 基本的な機能が動作すれば十分

## 期待する回答

上記の検討すべき事項について、具体的な実装方針、推奨ライブラリ、サンプルコード、および段階的な実装計画を提案してください。特に、React FlowのNodeResizerを使用したリサイズ処理や、再利用可能なカラーピッカーコンポーネントの設計について詳しく説明してください。
