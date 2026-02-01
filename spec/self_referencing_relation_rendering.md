# 自己参照リレーションのレンダリング仕様

## 概要

本仕様書は、同一エンティティ内でのリレーション（自己参照リレーション）の視覚的表現を定義する。
自己参照リレーションは、通常のエンティティ間のリレーションとは異なる視覚表現を採用し、ユーザーが一目で識別できるようにする。

背景となるリサーチ: [research/20260201_1835_self_referencing_relation_ui.md](../research/20260201_1835_self_referencing_relation_ui.md)

## 自己参照リレーションの定義

自己参照リレーションは以下の条件を満たすリレーションとして検出される:

* `sourceEntityId === targetEntityId`

例: employeeテーブルのmanager_idカラムがemployeeテーブルのidカラムを参照する場合

## 視覚表現

### エッジタイプ

自己参照リレーションは専用のエッジタイプ `selfRelationshipEdge` として描画される。

通常のリレーションエッジについては[frontend_er_rendering.md](./frontend_er_rendering.md)の「エッジ設計」セクションを参照。

### 外周ループの形状

自己参照リレーションは、エンティティノードの外側を回って戻る「外周ループ」として描画される。

* **パス形式**: cubic-bezier曲線によるC字/U字型
* **配置位置**: エンティティノードの右側に固定
* **視覚的効果**: 
  - エッジがノードの外側に張り出すことで、自己参照であることが一目で分かる
  - 他のエンティティ間のエッジと視覚的に分離される

### ハンドル配置

自己参照リレーション用に、エンティティノードに専用のハンドル（接続点）を追加する。

* **ハンドルID**: 
  - `self-out` (type: source) - エッジの開始点
  - `self-in` (type: target) - エッジの終了点
* **配置位置**: 
  - 両方ともノードの右側（Position.Right）
  - `self-out`: 上寄り（top: 35%）
  - `self-in`: 下寄り（top: 65%）
* **表示**: 
  - ハンドルは視覚的に非表示（opacity: 0）
  - ユーザーには見えないが、React Flowの接続システムで使用される
* **接続可能性**: 
  - `isConnectable: false` - MVPでは手動接続を許可しない

### 矢印（Marker）

自己参照リレーションのエッジにも、通常のリレーションと同様に矢印を表示する。

矢印の詳細は[frontend_er_rendering.md](./frontend_er_rendering.md)の「リレーションエッジ」セクションを参照。

* **配置**: エッジの終点（`self-in`ハンドル側）の接線方向に表示

### ラベル表示

MVP段階では、自己参照を示すシンボル（↺）を表示する。

* **表示内容**: ↺（回転矢印記号）
* **表示位置**: ループの外側の中央（最も外側に張り出した位置）
* **実装**: EdgeLabelRendererコンポーネントを使用
* **スタイル**:
  - フォントサイズ: 10px
  - 透明度: ハイライト時 1.0、通常時 0.6
  - pointer-events: none（クリックイベントを透過）

## データ設計

### エッジタイプの振り分け

`convertToReactFlowEdges`関数内で、自己参照リレーションを検出してエッジタイプを振り分ける。

```
if (edge.sourceEntityId === edge.targetEntityId) {
  type = 'selfRelationshipEdge'
  sourceHandle = 'self-out'
  targetHandle = 'self-in'
} else {
  type = 'relationshipEdge'
  // 通常のハンドル計算ロジック
}
```

### エッジデータ

自己参照リレーションのエッジデータは、通常のリレーションと同じ構造を持つ。

エッジデータの詳細は[frontend_er_rendering.md](./frontend_er_rendering.md)の「RelationshipEdgeViewModel → React Flow edges」セクションを参照。

## ホバーインタラクション

自己参照リレーションのホバーインタラクションは、以下の特性を持つ:

* **エッジへのホバー**:
  - そのエッジを強調表示
  - 接続先/接続元のエンティティは同一なので、ノード強調は1回だけ
  - `sourceColumnId`と`targetColumnId`の両方のカラムを強調（同一カラムの場合は1回）
  
* **カラムへのホバー**:
  - そのカラムが関与する自己参照エッジを強調
  - 反対側カラム（同一エンティティ内）も強調

ホバーインタラクションの詳細は[frontend_er_rendering.md](./frontend_er_rendering.md)の「ホバーインタラクション仕様」セクションを参照。

## React Flowコンポーネント設定

React Flowの`edgeTypes`に以下のエッジタイプを追加登録する:

* `selfRelationshipEdge`: SelfRelationshipEdgeコンポーネント（新規）

React Flowコンポーネント設定の詳細は[frontend_er_rendering.md](./frontend_er_rendering.md)の「システム構成」セクションを参照。

## 実装時の注意事項

* ハンドルの表示/非表示は`opacity`で制御する（`display: none`は使用しない）
  - React Flow公式トラブルシュートで`display: none`による接続エラーが報告されている
* SelfRelationshipEdgeコンポーネントは`BaseEdge`コンポーネントを使用してSVGパスを描画する
  - `BaseEdge`は不可視の当たり判定パスなども自動的に処理する
* EdgeLabelRendererは「SVG外にdivでラベルを出す」ための公式コンポーネント
  - ラベルの位置は`transform: translate()`で指定
* ハンドルを動的に増減/移動する場合は`useUpdateNodeInternals()`が必要
  - MVP段階ではハンドルは固定なので不要
* z-index制御、矢印の表示については[frontend_er_rendering.md](./frontend_er_rendering.md)を参照

## 将来的な拡張（MVP範囲外）

以下の機能はMVP範囲外とし、将来的に実装を検討する:

* 複数の自己参照リレーションのオフセット配置
  - 同一エンティティ内に複数の自己参照がある場合、`index/count`を付与して外側にオフセット
* 左右振り分け
  - 自己参照リレーションが多い場合、左右に振り分けて配置
* 役割名（role）の表示
  - ホバー時に`sourceColumnId → targetColumnId`の関係を小さく表示
* インタラクティブな接続
  - ユーザーが手動で自己参照リレーションを作成する機能
