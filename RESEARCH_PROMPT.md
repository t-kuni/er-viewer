# リバースエンジニアリング履歴機能に関する技術調査

## リサーチ要件

以下の機能を実現するための技術調査を行いたい：

* 初回のリバースエンジニアまたは増分リバースエンジニアを行った履歴情報をViewModelに保持する
* UI上からその履歴情報を閲覧できる
    * 常に全量表示されている必要はなく、見たい時に折りたたみを解除して見れるようなUIが望ましい
* この情報はインポート、エクスポートの対象である
* 履歴に含まれる情報は以下を想定
    * いつリバースしたか
    * 追加されたテーブル、削除されたテーブル
    * 追加されたカラム、削除されたカラム、変更されたカラム
    * 追加されたリレーション、削除されたリレーション
    * 初回のリバース時は「いつリバースしたか」だけでいい。
    * 増分リバースをするたびに増えていく。
* この機能の目的：増分リバースした時に、どういう変更があったかを分かりやすくする

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite + React 18 + React Flow v12
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec
- **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）

### 現状のフェーズ

- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- AIが作業するため学習コストは考慮不要

## 現在の実装状況

### ViewModelの構造

アプリケーション全体の状態は`ViewModel`で管理され、純粋関数によるAction層で更新される。型定義の詳細は `scheme/main.tsp` に記載されている。

**ViewModelの構造**:
```typescript
model ViewModel {
  format: string; // "er-viewer"
  version: int32; // 1
  erDiagram: ERDiagramViewModel;
  ui: GlobalUIState;
  buildInfo: BuildInfoState;
  settings?: AppSettings;
}

model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>;
  texts: Record<TextBox>;
  index: ERDiagramIndex;
  ui: ERDiagramUIState;
  loading: boolean;
}

model EntityNodeViewModel {
  id: string; // UUID
  name: string;
  x: float64;
  y: float64;
  width: float64;
  height: float64;
  columns: Column[];
  ddl: string;
}

model Column {
  id: string; // UUID
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  extra: string;
  isForeignKey: boolean;
}

model RelationshipEdgeViewModel {
  id: string; // UUID
  sourceEntityId: string;
  sourceColumnId: string;
  targetEntityId: string;
  targetColumnId: string;
  constraintName: string;
}
```

### 状態管理

アプリケーション全体の状態は`ViewModel`で管理される。詳細は `spec/frontend_state_management.md` を参照。

**Action層パターン**:
- すべての状態更新は `action(viewModel, ...params) => newViewModel` の形式で実装
- Actionは純粋関数で、副作用を持たない
- 状態に変化がない場合は同一参照を返す（再レンダリング抑制）
- Actionのユニットテストで状態管理ロジックをカバー

**ストア**:
- 自前Store + React `useSyncExternalStore`（ライブラリ非依存）
- `useViewModel(selector, equalityFn)` で必要な部分だけ購読
- `useDispatch()` でdispatch関数を取得

### 増分リバースエンジニアリング機能

現在、増分リバースエンジニアリング機能が実装されている。詳細は `spec/incremental_reverse_engineering.md` を参照。

**増分リバースエンジニアリングの仕組み**:
1. ViewModelのerDiagram.nodesが空でない場合、増分リバース・エンジニアリングモードとなる
2. テーブル名でエンティティをマッチング
   - マッチした場合は既存のIDと座標を維持
   - マッチしない場合は新規エンティティとして扱う
3. カラムとリレーションシップは全件置き換え（最新情報で更新）
4. 新規エンティティは既存エンティティの右側・下側に配置
5. 削除されたエンティティはViewModelとレイヤー順序から削除
6. UI状態（highlightedNodeIds等）をクリア
7. 逆引きインデックスを再計算
8. `settings.lastDatabaseConnection`を更新

**実装場所**:
- `public/src/actions/dataActions.ts` - `actionMergeERData(viewModel, erData, connectionInfo)`
- `public/src/commands/reverseEngineerCommand.ts` - リバースエンジニアコマンド

**現在の差分反映内容**:
- エンティティ: マッチングにより既存のIDと座標を維持、新規エンティティは追加
- カラム: 全件置き換え（最新情報で更新）
- リレーションシップ: 全件置き換え（最新情報で更新）

### インポート・エクスポート機能

ViewModelをJSON形式でエクスポート・インポートする機能が実装されている。詳細は `spec/import_export_feature.md` を参照。

**エクスポート時の処理**:
- 現在の `ViewModel` を取得
- 一時UI状態とキャッシュを初期化した `ViewModel` を生成
- `ViewModel` を JSON 文字列にシリアライズしてダウンロード

**インポート時の処理**:
- ファイルを読み込み、JSON としてパース
- バリデーション（format, version）を実行
- パースした `ViewModel` をベースに、一時UI状態とキャッシュを補完
- `erDiagram.index` を `nodes` と `edges` から再計算
- 補完した `ViewModel` を Store に設定

**エクスポート・インポートの対象**:
- `erDiagram.nodes` - エンティティノード
- `erDiagram.edges` - リレーションシップエッジ
- `erDiagram.rectangles` - 矩形
- `erDiagram.texts` - テキストボックス
- `erDiagram.ui.layerOrder` - レイヤー順序
- `settings` - アプリケーション設定（データベース接続情報など）

### データベース接続設定

`AppSettings` 型でデータベース接続情報を保持している。詳細は `spec/database_connection_settings.md` を参照。

**AppSettings型**:
```typescript
model AppSettings {
  lastDatabaseConnection?: DatabaseConnectionState;
}

model DatabaseConnectionState {
  type: DatabaseType;
  host: string;
  port: int32;
  user: string;
  database: string;
}
```

**更新タイミング**:
- リバースエンジニア成功時に `settings.lastDatabaseConnection` を更新
- 増分リバースエンジニア時も同様に更新
- エクスポート・インポートの対象に含まれる

### UI実装

**ヘッダーのボタン配置順序（左から右）**:
1. レイヤーボタン
2. エクスポートボタン
3. インポートボタン
4. ビルド情報ボタン

**サイドパネル**:
- 左側: レイヤーパネル（`LayerPanel`）
  - レイヤーの表示/非表示切り替え
  - `ui.showLayerPanel` で制御
- 右側: （現在は未実装）

## 要求される機能の詳細

### 履歴情報の保持

リバースエンジニアリング実行のたびに、履歴情報を `ViewModel` に追加する。

**初回リバースエンジニアリング**:
- いつリバースしたか（タイムスタンプ）のみを記録

**増分リバースエンジニアリング**:
- いつリバースしたか（タイムスタンプ）
- 追加されたテーブル名のリスト
- 削除されたテーブル名のリスト
- 追加されたカラム（テーブル名とカラム名）のリスト
- 削除されたカラム（テーブル名とカラム名）のリスト
- 変更されたカラム（テーブル名とカラム名、変更内容）のリスト
- 追加されたリレーション（制約名または接続情報）のリスト
- 削除されたリレーション（制約名または接続情報）のリスト

**履歴の蓄積**:
- 履歴は配列形式で時系列順に蓄積される
- 最新の履歴が配列の最後に追加される

### ViewModelへの履歴情報の統合

履歴情報を `ViewModel` のどこに保持するべきか？

**Option A**: `ViewModel` 直下に `history` フィールドを追加
```typescript
model ViewModel {
  format: string;
  version: int32;
  erDiagram: ERDiagramViewModel;
  ui: GlobalUIState;
  buildInfo: BuildInfoState;
  settings?: AppSettings;
  history?: ReverseEngineeringHistory[]; // NEW
}
```

**Option B**: `ERDiagramViewModel` に `history` フィールドを追加
```typescript
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>;
  texts: Record<TextBox>;
  index: ERDiagramIndex;
  ui: ERDiagramUIState;
  loading: boolean;
  history?: ReverseEngineeringHistory[]; // NEW
}
```

**Option C**: `settings` に履歴を含める
```typescript
model AppSettings {
  lastDatabaseConnection?: DatabaseConnectionState;
  reverseEngineeringHistory?: ReverseEngineeringHistory[]; // NEW
}
```

どのOptionが最も適切か？それぞれのメリット・デメリットは？

### 履歴情報のデータ構造

履歴情報をどのようなデータ構造で表現するべきか？

**シンプルな構造の例**:
```typescript
model ReverseEngineeringHistory {
  timestamp: int64; // Unix timestamp
  type: "initial" | "incremental"; // 初回 or 増分
  addedTables?: string[]; // 追加されたテーブル名
  removedTables?: string[]; // 削除されたテーブル名
  addedColumns?: ColumnChange[]; // 追加されたカラム
  removedColumns?: ColumnChange[]; // 削除されたカラム
  modifiedColumns?: ColumnModification[]; // 変更されたカラム
  addedRelationships?: string[]; // 追加されたリレーション（制約名）
  removedRelationships?: string[]; // 削除されたリレーション（制約名）
}

model ColumnChange {
  tableName: string;
  columnName: string;
}

model ColumnModification {
  tableName: string;
  columnName: string;
  changes: string; // 変更内容の説明（例: "型変更: VARCHAR(100) → VARCHAR(255)"）
}
```

**詳細な構造の例**:
```typescript
model ReverseEngineeringHistory {
  timestamp: int64;
  type: "initial" | "incremental";
  changes: SchemaChanges;
}

model SchemaChanges {
  tables: TableChanges;
  columns: ColumnChanges;
  relationships: RelationshipChanges;
}

model TableChanges {
  added: TableInfo[];
  removed: TableInfo[];
}

model TableInfo {
  name: string;
}

model ColumnChanges {
  added: ColumnInfo[];
  removed: ColumnInfo[];
  modified: ColumnModificationInfo[];
}

model ColumnInfo {
  tableName: string;
  columnName: string;
}

model ColumnModificationInfo {
  tableName: string;
  columnName: string;
  oldType: string;
  newType: string;
  // その他の変更情報
}

model RelationshipChanges {
  added: RelationshipInfo[];
  removed: RelationshipInfo[];
}

model RelationshipInfo {
  constraintName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}
```

どのようなデータ構造が適切か？
- 初回リバース時にはテーブル数やカラム数だけを記録するべきか？
- 変更内容をどの程度詳細に記録するべきか？
- UIでの表示を考慮した場合、どのような情報が必要か？

### 差分検出のロジック

現在の `actionMergeERData` では、エンティティのマッチングは行われているが、差分の詳細情報は記録されていない。

**差分検出が必要な箇所**:
- 追加されたテーブル: ERDataに存在するが、既存ViewModelに存在しない
- 削除されたテーブル: 既存ViewModelに存在するが、ERDataに存在しない
- 追加されたカラム: マッチしたテーブル内で、新しいカラムが追加された
- 削除されたカラム: マッチしたテーブル内で、既存のカラムが削除された
- 変更されたカラム: マッチしたテーブル内で、カラムのtype、nullable、key、default、extraが変更された
- 追加されたリレーション: ERDataに存在するが、既存ViewModelに存在しない
- 削除されたリレーション: 既存ViewModelに存在するが、ERDataに存在しない

**差分検出の実装方法**:
- `actionMergeERData` 内で差分を検出して履歴情報を生成するべきか？
- 別のAction（例: `actionDetectSchemaChanges`）として分離するべきか？
- 差分検出ロジックの複雑さはどの程度か？
- パフォーマンスへの影響はあるか？

### UI設計

履歴情報をUI上で表示する方法について検討する。

**表示場所の候補**:
- ヘッダーに「履歴」ボタンを追加し、モーダルで表示
- 右サイドバーに履歴パネルを追加（折りたたみ可能）
- 左サイドバー（レイヤーパネル）に履歴タブを追加
- ER図キャンバスの下部に履歴パネルを追加

**表示内容**:
- 履歴一覧（時系列順）
- 各履歴エントリー:
  - タイムスタンプ（日時）
  - リバースタイプ（初回 or 増分）
  - 変更内容のサマリー（例: "+3テーブル, -1テーブル, +5カラム"）
  - 詳細情報（折りたたみ可能）:
    - 追加されたテーブル名のリスト
    - 削除されたテーブル名のリスト
    - 追加されたカラムのリスト
    - 削除されたカラムのリスト
    - 変更されたカラムのリスト
    - 追加されたリレーションのリスト
    - 削除されたリレーションのリスト

**折りたたみUI**:
- 履歴一覧は常に表示されているが、各エントリーの詳細は折りたたまれている
- クリックで詳細を展開・折りたたみ
- アコーディオン形式のUIが適しているか？
- React向けの折りたたみUIライブラリは必要か？
  - 素のHTML+CSSで実装可能か？
  - React向けのアコーディオンコンポーネントライブラリはあるか？

**UI配置の最適解**:
- ヘッダーボタンの追加位置（現在: レイヤー、エクスポート、インポート、ビルド情報）
- パネル形式の場合、左右どちらに配置するべきか？
- モーダル形式とパネル形式、どちらが使いやすいか？

### インポート・エクスポートへの統合

履歴情報をエクスポート・インポートの対象に含める。

**エクスポート時**:
- 履歴情報を含めた `ViewModel` を JSON 形式でエクスポート
- 履歴情報のサイズが大きくなる可能性があるか？
- 最大N件の履歴のみエクスポートするべきか？

**インポート時**:
- 履歴情報を含む `ViewModel` をインポート
- 履歴情報のバリデーションが必要か？
- インポートした履歴と既存の履歴をマージするべきか、それとも置き換えるべきか？

### 実装の段階的アプローチ

実装を段階的に進める場合、どのような順序が適切か？

**フェーズ1: データ構造と差分検出**
- `ViewModel` に履歴情報を追加
- `actionMergeERData` で差分を検出し、履歴情報を生成
- 履歴情報をViewModelに追加するActionを実装

**フェーズ2: UI表示**
- 履歴表示UIを実装（モーダルまたはパネル）
- 履歴一覧と詳細情報の表示
- 折りたたみ機能の実装

**フェーズ3: インポート・エクスポート統合**
- エクスポート時に履歴情報を含める
- インポート時に履歴情報を復元

このような段階的アプローチで問題ないか？より効率的な順序はあるか？

## 検討してほしいこと

### 1. データ構造の設計

**履歴情報の保持場所**:
- `ViewModel` 直下、`ERDiagramViewModel` 内、`AppSettings` 内のどこに保持するべきか？
- それぞれのメリット・デメリット

**履歴情報のデータ構造**:
- 初回リバース時にどのような情報を記録するべきか？
- 増分リバース時にどのような情報を記録するべきか？
- カラム変更の詳細をどこまで記録するべきか？
- データ構造はシンプルな形式と詳細な形式のどちらが適切か？

### 2. 差分検出のロジック

**差分検出の実装方法**:
- `actionMergeERData` 内で差分検出を行うべきか、別のActionとして分離するべきか？
- テーブル、カラム、リレーションの差分検出ロジックの複雑さはどの程度か？
- カラムのマッチングはカラム名で行うべきか、それとも他の方法があるか？
- カラムの変更検出（type、nullable、key等の変更）はどのように実装するべきか？
- パフォーマンスへの影響はあるか？

**初回リバースと増分リバースの区別**:
- 初回リバース時は差分検出をスキップするべきか？
- 初回リバース時にはテーブル数やカラム数などのサマリー情報のみ記録するべきか？

### 3. UI設計

**表示場所**:
- モーダル、右サイドバー、左サイドバー、下部パネルのどれが最も適切か？
- 既存のレイヤーパネルとの関係をどう考えるべきか？

**表示内容**:
- 履歴一覧にどのような情報を表示するべきか？
- 各履歴エントリーにどのような詳細情報を表示するべきか？
- 変更内容のサマリーはどのように表示するべきか？

**折りたたみUI**:
- React向けのアコーディオンコンポーネントライブラリは必要か？
- 必要な場合、どのライブラリが適切か？（React 18対応、軽量、2026年時点で活発にメンテナンスされている）
- 素のHTML+CSSで十分実装可能か？

**UIの配置順序**:
- ヘッダーに履歴ボタンを追加する場合、どの位置に配置するべきか？
- パネル形式の場合、左右どちらに配置するべきか？

### 4. インポート・エクスポートへの統合

**エクスポート時の処理**:
- 履歴情報をすべてエクスポートするべきか、それとも最大N件に制限するべきか？
- 履歴情報のサイズが大きくなる可能性はあるか？

**インポート時の処理**:
- 履歴情報のバリデーションは必要か？
- インポートした履歴と既存の履歴をどう扱うべきか？（マージ or 置き換え）

### 5. 実装計画

**段階的な実装の推奨順序**:
- データ構造定義 → 差分検出 → UI表示 → インポート・エクスポート統合という順序で問題ないか？
- より効率的な順序はあるか？

**実装時の注意点**:
- TypeSpecでの型定義の追加方法
- Actionのテスト方法
- UIコンポーネントの実装時の注意点

### 6. 他のプロジェクトでの事例

**類似機能の実装例**:
- データベーススキーマ管理ツールで履歴管理機能はどのように実装されているか？
- マイグレーションツールの履歴表示UIはどのようなデザインか？
- React向けのアコーディオン/折りたたみUIのベストプラクティスは？

## 期待する回答

以下について、具体的な見解と実装案を提示してほしい：

### 1. データ構造の設計案

- 履歴情報を保持する最適な場所（`ViewModel`、`ERDiagramViewModel`、`AppSettings`のいずれか）
- 履歴情報のデータ構造の推奨形式（TypeSpecのモデル定義）
- 初回リバースと増分リバースで記録する情報の違い
- カラム変更の詳細度（type、nullable、keyなどの変更を個別に記録するか、まとめて記録するか）

### 2. 差分検出ロジックの実装方法

- 差分検出の実装場所（`actionMergeERData` 内 or 別Action）
- テーブル、カラム、リレーションの差分検出アルゴリズム
- カラムのマッチング方法（カラム名ベースのマッチング）
- カラム変更の検出方法（type、nullable、key、default、extraの比較）
- パフォーマンスへの影響と対策

### 3. UI設計案

- 履歴表示UIの最適な配置場所とレイアウト
- 履歴一覧と詳細情報の表示内容
- 折りたたみUIの実装方法（ライブラリ使用 or 自前実装）
- React向けのアコーディオンライブラリの推奨（必要な場合）
  - ライブラリ名とメジャーバージョン
  - インストール方法と基本的な使い方
- ヘッダーボタンの追加位置（パネル形式でない場合）

### 4. インポート・エクスポートへの統合方法

- エクスポート時の履歴情報の扱い（全件 or 制限）
- インポート時の履歴情報の扱い（マージ or 置き換え）
- バリデーションの必要性と方法

### 5. 実装計画

- 段階的な実装の推奨順序
- 各フェーズで実装すべき具体的な内容
- 実装時の注意点（TypeSpec、Action、UIコンポーネント）

### 6. 他のプロジェクトでの事例

- データベーススキーマ管理ツールやマイグレーションツールでの履歴管理機能の実装例
- React向けの履歴表示UIのベストプラクティス
- 折りたたみUIの実装パターン

## 参考情報

### 関連仕様書

- `spec/frontend_state_management.md`: フロントエンド状態管理仕様（状態設計、Action層、パフォーマンス最適化）
- `spec/viewmodel_based_api.md`: ViewModelベースAPI仕様（ViewModelの構造）
- `spec/incremental_reverse_engineering.md`: 増分リバース・エンジニアリング機能仕様（現在の増分更新の仕組み）
- `spec/import_export_feature.md`: インポート・エクスポート機能仕様（エクスポート・インポートの処理）
- `spec/database_connection_settings.md`: データベース接続設定仕様（`AppSettings`の構造）

### TypeSpecスキーマ

- `scheme/main.tsp`: アプリケーション全体の型定義（330行）

### 実装ファイル

- `public/src/actions/dataActions.ts`: データ更新Action（`actionMergeERData`を含む）
- `public/src/commands/reverseEngineerCommand.ts`: リバースエンジニアコマンド
- `public/src/store/erDiagramStore.ts`: 状態管理ストア
- `public/src/components/App.tsx`: アプリケーションのルートコンポーネント
- `public/src/components/LayerPanel.tsx`: レイヤーパネルコンポーネント

### 使用しているライブラリ

- React 18
- React Flow v12（`@xyflow/react`）
- TypeScript
- Vite
- TypeSpec（API型定義）
- react-dropzone（インポート機能で使用）

## 補足

- 本プロジェクトはMVPフェーズであり、完璧な解決策よりも実用的な解決策を優先する
- パフォーマンスは重要だが、セキュリティや後方互換性は考慮不要
- 実装の学習コストは問題ない（AIが実装するため）
- ユーザーが増分リバースエンジニアを実行した際に、どのような変更があったかを簡単に確認できる状態を実現したい
