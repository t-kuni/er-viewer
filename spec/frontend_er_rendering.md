# フロントエンドER図レンダリング仕様

## 概要

本仕様書は、ER Diagram ViewerのフロントエンドにおけるER図レンダリング機能の技術選定と実装方針を定義する。
リサーチの結果、React + React Flow + elkjs の構成を採用し、MVPフェーズでの実現可能性検証を優先した設計とする。

[rearchitecture_overview.md](./rearchitecture_overview.md)で未定だったフロントエンドフレームワークの選定を本仕様で確定する。

## 技術スタック

### 採用技術

* **UIフレームワーク**: React
* **図エディタ基盤**: React Flow
* **自動レイアウト**: elkjs（任意・後付け可能）
* **ビルドツール**: Vite（既存）
* **言語**: TypeScript（既存）

### 選定理由

React Flowはノード・エッジベースの図エディタに必要な機能（ドラッグ、ズーム、パン、選択）を標準搭載しており、ER図表示とUI（サイドバー、DDL表示等）を統合しやすい。elkjsは初期レイアウト生成や自動整列機能を後から追加可能。

## システム構成

### コンポーネント構成

* **React Flowキャンバス**
  * ノード（エンティティ）: Custom Nodeでテーブルを表現
  * エッジ（リレーション）: Custom Edgeで外部キー関係を表現
  * 補助ノード: 矩形（グループ化用）、テキスト（注釈用）

* **React UI**
  * サイドバー: 選択中エンティティの詳細情報・DDL表示
  * ツールバー: 操作モード切替、補助図形追加ボタン等
  * 設定パネル: 表示オプション（任意）

### ノード設計

#### エンティティノード（Custom Node）

* **表示内容**
  * テーブル名（ヘッダー）
  * カラム一覧（スクロール可能）
  * PK/FKの視覚的区別（アイコンまたは色分け）

* **インタラクション**
  * ドラッグ: 位置移動（React Flow標準）
  * クリック: 選択状態の切替、サイドバー表示更新
  * ホバー: ハイライト表示

* **サイズ**
  * カラム数に応じて可変
  * width/heightをLayoutDataに保存

#### 補助ノード

* **矩形ノード**: エンティティのグループ化用
  * 背景色、枠線色、ラベルをカスタマイズ可能
  * ドラッグで位置移動

* **テキストノード**: 注釈用
  * テキスト内容、フォントサイズ、色をカスタマイズ可能
  * 簡易的な編集機能（ダブルクリックで編集モード等）

### エッジ設計

#### リレーションエッジ（Custom Edge）

* **表示形式**
  * 直角ポリライン（階段状）
  * React Flowの`smoothstep`エッジタイプを使用
  * MVPでは標準のルーティングを使用（エンティティの重複は許容）
  * 将来的に障害物回避ルーティングを追加可能

* **視覚表現**
  * 矢印: toTable側に表示
  * 選択/ホバー時のハイライト
  * 制約名のラベル表示（任意）

* **接続点**
  * ノードのポート（上下左右のいずれか）から接続
  * ポート位置はカラム位置に基づいて決定

## ERD要件への対応

[rearchitecture_overview.md](./rearchitecture_overview.md)で定義された機能要件への対応方針：

### ER図表示・操作

| 機能 | 実装方法 |
|------|----------|
| インタラクティブなER図表示 | React Flowのノード/エッジで実装 |
| エンティティのドラッグ&ドロップ配置 | React Flow標準機能（ドラッグ完了時にLayoutData更新） |
| ズーム・パン操作 | React Flow標準機能（ホイール/ドラッグ） |
| リレーション線の表示（直角ポリライン） | Custom Edgeで実装 |

### ビジュアル表現

| 機能 | 実装方法 |
|------|----------|
| ホバー時のハイライト表示 | ノード/エッジの状態（hovered）でCSS切替 |
| プライマリキー・外部キーの視覚的区別 | Column.key='PRI'等でアイコン/色分け |
| カスタマイズ可能な色・サイズ | ノードのスタイル属性で管理 |

### 情報表示機能

| 機能 | 実装方法 |
|------|----------|
| エンティティクリックでDDL表示 | Reactの状態管理で選択ノード追跡、サイドバーに表示 |
| サイドバーでの詳細情報表示 | 選択中Entityのcolumns/ddl等を表示 |

### 図形描画・注釈機能

| 機能 | 実装方法 |
|------|----------|
| 矩形描画（エンティティのグループ化用） | React Flowの「RectangleNode」として追加 |
| テキスト追加（補足情報記載用） | React Flowの「TextNode」として追加 |

## データ設計

### データフロー

1. バックエンドAPIから`ERData`を取得（entities/relationships）
2. バックエンドAPIから`LayoutData`を取得（なければ初期配置生成）
3. ERData + LayoutData → React Flowの nodes/edges に変換
4. ユーザー操作でnodes/edgesが更新される
5. 変更をLayoutDataに反映してバックエンドに保存

### データ型マッピング

#### ERData → React Flow nodes

```
Entity → Node {
  id: entity.id,  // UUID
  type: 'entityNode',  // Custom Node
  position: { x, y },  // LayoutDataから取得（entity.idで検索）
  data: {
    id: entity.id,
    name: entity.name,
    columns: entity.columns,
    ddl: entity.ddl
  }
}
```

#### Relationship → React Flow edges

```
Relationship → Edge {
  id: `${fromTable}_${fromColumn}_to_${toTable}_${toColumn}`,
  type: 'relationshipEdge',  // Custom Edge
  source: fromTable,
  target: toTable,
  data: {
    fromColumn,
    toColumn,
    constraintName
  }
}
```

#### 補助図形 → React Flow nodes

```
Rectangle → Node {
  id: rectangle.id,  // UUID
  type: 'rectangleNode',
  position: { x, y },
  data: { id: rectangle.id, width, height, fill, stroke }
}

Text → Node {
  id: text.id,  // UUID
  type: 'textNode',
  position: { x, y },
  data: { id: text.id, content, fontSize, fill }
}
```

### LayoutData 保存形式

既存のLayoutData型（TypeSpecで定義）に合わせる：

* `entities`: Record<EntityLayoutItem>（UUIDをキーとしたマップ）
  * 各EntityLayoutItemには`id`（UUID）、`name`（テーブル名）、`x`、`y`座標が含まれる
  * width/heightはノード自体のサイズであり、LayoutDataには保存しない
* `rectangles`: Record<Rectangle>（UUIDをキーとしたマップ）
  * 各Rectangleには id, x, y, width, height, fill, stroke が含まれる
* `texts`: Record<Text>（UUIDをキーとしたマップ）
  * 各Textには id, x, y, content, fontSize, fill が含まれる

React FlowのnodesからLayoutDataへの変換時：
* エンティティノード → entities（UUIDをキー、EntityLayoutItemを値とするRecord）
* 矩形ノード → rectangles（UUIDをキー、Rectangleを値とするRecord）
* テキストノード → texts（UUIDをキー、Textを値とするRecord）

全ての要素がUUIDをキーとするRecord型で統一されており、削除・更新が容易な設計となっている。

## 実装時の注意事項

* 状態管理は最小限に抑える（選択状態、編集モード等）
* 直角配線は単純なルーティング（L字/コ字）から開始し、障害物回避ルーティングは後回し
* ノードサイズはカラム数に応じて可変とし、エッジの接続点（ポート）位置の調整が必要
* Vanilla TypeScriptからReactへの移行時、不要なコードは削除

## 懸念事項・確認事項

### 技術的懸念

* Reactの学習コストとチームの習熟度
* 直角ポリラインのルーティングアルゴリズムの実装難易度
* 大規模ER図（100エンティティ超）でのパフォーマンス

### 確認が必要な項目

* 既存のVanilla TypeScriptコードの移行範囲
* 既存機能（ビルド情報表示等）のReact化の方針
