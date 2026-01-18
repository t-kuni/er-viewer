# フロントエンドER図レンダリング技術選定のリサーチ

## リサーチ要件

フロントでER図をレンダリングする必要がある。reactなどが必要か？canvasを使うのがよいか？なにかライブラリを使うのがよいか？

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite
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

## 現在のフロントエンド構成

### ディレクトリ構造

```
/er-viewer/public/
├─ src/
│   ├─ api/
│   │   ├─ client/          （TypeSpecから自動生成されたAPIクライアント）
│   │   └─ index.ts
│   ├─ components/          （現在未使用）
│   ├─ services/            （現在未使用）
│   └─ app.ts              （エントリーポイント）
├─ index.html
├─ style.css
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

### package.json（フロントエンド）

```json
{
  "name": "er-viewer-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### 現在の実装状況

- Vite + TypeScriptのみを使用（フレームワークなし）
- 純粋なDOM操作でUIを実装
- APIクライアントはTypeSpecから自動生成
- ER図レンダリング機能はまだ未実装（ビルド情報表示のみ実装済み）

## ER図レンダリングの機能要件

rearchitecture_overview.mdで定義されている機能要件：

### ER図表示・操作

- インタラクティブなER図表示
- エンティティのドラッグ&ドロップ配置
- ズーム・パン操作
- リレーション線の表示（直角ポリライン）

### ビジュアル表現

- ホバー時のハイライト表示
- プライマリキー・外部キーの視覚的区別
- カスタマイズ可能な色・サイズ

### インタラクティブ操作

- エンティティクリックでDDL表示
- サイドバーでの詳細情報表示

### 図形描画・注釈機能

- 矩形描画（エンティティのグループ化用）
- テキスト追加（補足情報記載用）

### データ構造

バックエンドAPIから取得されるER図データの構造（TypeSpecで定義）：

```typescript
// エンティティ（テーブル）
interface Entity {
  name: string;
  columns: Column[];
  ddl: string;
}

// カラム情報
interface Column {
  name: string;
  type: string;
  nullable: boolean;
  key: string; // 'PRI', 'MUL', ''など
  default: string | null;
  extra: string;
}

// リレーション（外部キー）
interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName: string;
}

// レイアウト情報（エンティティの配置）
interface EntityLayout {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 矩形（補助図形）
interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  label: string;
}

// テキスト（注釈）
interface Text {
  x: number;
  y: number;
  content: string;
  fontSize: number;
  fill: string;
}

// ER図データ全体
interface ERData {
  entities: Entity[];
  relationships: Relationship[];
}

// レイアウトデータ全体
interface LayoutData {
  entities: EntityLayout[];
  rectangles: Rectangle[];
  texts: Text[];
}
```

## データフロー

1. バックエンドAPIからER図データを取得（`GET /api/reverse-engineer`）
2. レイアウト情報を取得または初期レイアウトを生成
3. フロントエンドでER図をレンダリング
4. ユーザー操作（ドラッグ&ドロップ、図形追加など）でレイアウトを変更
5. レイアウト情報を保存（`POST /api/layouts`）

## 期待する回答

以下の観点から、フロントエンドでER図をレンダリングするための技術選定について提案してください：

### 1. レンダリング技術の選択

- **DOM操作 vs Canvas vs SVG**: それぞれのメリット・デメリット
  - パフォーマンス（多数のエンティティを扱う場合）
  - インタラクティブ性（ドラッグ&ドロップ、ホバーなど）
  - 実装の複雑さ
  - ズーム・パン操作の実装難易度
- **Canvas 2D vs WebGL**: Canvasを選択する場合、2DコンテキストとWebGLのどちらが適切か

### 2. UIフレームワークの必要性

- **React, Vue, Svelteなどのフレームワークは必要か**: 現在はVanilla TypeScriptを使用
  - フレームワークを使うメリット（状態管理、コンポーネント化など）
  - フレームワークなしで実装する場合の課題
  - MVPフェーズでの学習コスト
- **フレームワークが必要な場合、どれを選ぶべきか**
  - Viteとの相性
  - TypeScriptサポート
  - 学習コスト
  - バンドルサイズ

### 3. ER図専用ライブラリの検討

- **既存のER図ライブラリ**: 以下のようなライブラリは利用可能か
  - ダイアグラム描画ライブラリ（例: joint.js, gojs, reactflow, d3.jsなど）
  - ER図特化ライブラリ
  - グラフ描画ライブラリ
- **ライブラリを使うメリット・デメリット**
  - 機能の充実度（ドラッグ&ドロップ、ズーム、パンなど）
  - カスタマイズ性
  - ライセンス（商用利用の可否）
  - 学習コスト
  - バンドルサイズ
  - メンテナンス状況

### 4. ドラッグ&ドロップの実装

- **ネイティブAPI vs ライブラリ**: ドラッグ&ドロップ機能の実装方法
  - HTML5 Drag and Drop API
  - Pointer Events API
  - 専用ライブラリ（例: interact.js, dnd-kitなど）
- **Canvas上でのドラッグ&ドロップ実装の難易度**

### 5. ズーム・パン機能の実装

- **実装方法**: Canvas/SVGでのズーム・パン機能
  - 変換行列による実装
  - 専用ライブラリの利用
- **スムーズなユーザー体験**: マウスホイール、タッチジェスチャーへの対応

### 6. リレーション線の描画

- **直角ポリライン**: エンティティ間を結ぶ線を直角で描画
  - アルゴリズムの複雑さ
  - パフォーマンス
  - ライブラリでの実装可否

### 7. 実装の容易さとメンテナンス性

- **MVPフェーズでの実装スピード**: プロトタイピングに適した技術
- **コードの保守性**: シンプルで理解しやすいコード
- **機能追加の容易さ**: 後から機能を追加しやすい設計

### 8. パフォーマンス

- **多数のエンティティ**: 50-100個程度のエンティティとリレーションを扱う場合のパフォーマンス
- **リアルタイム更新**: ドラッグ中のスムーズな描画更新

### 9. 推奨される技術スタック

以下のようなパターンの提案：

- **パターンA**: Vanilla TypeScript + Canvas 2D + 専用ライブラリ
- **パターンB**: React + SVG + 専用ライブラリ
- **パターンC**: その他の組み合わせ

各パターンについて：
- メリット・デメリット
- 実装の複雑さ
- 学習コスト
- 実装期間の見積もり
- コード例の可能性

### 重視する点

- **MVPフェーズに適していること**: 実現可能性の検証が目的
- **実装のシンプルさ**: 複雑すぎない、理解しやすいコード
- **機能の実現可能性**: 必要な機能（ドラッグ&ドロップ、ズーム、パンなど）が実装できること
- **Viteとの相性**: 現在のビルド環境との統合

### 重視しない点

- **パフォーマンスの最適化**: MVPフェーズでは過度な最適化は不要
- **セキュリティ**: プロトタイピング段階では考慮しない
- **後方互換性**: 考慮不要
- **プロダクションレディ**: 商用利用レベルの品質は不要

現在のプロジェクト構成（Vite + Vanilla TypeScript、MVPフェーズ、プロトタイピング）を考慮した上で、シンプルで実装しやすく、必要な機能を実現できる技術スタックを提案してください。
