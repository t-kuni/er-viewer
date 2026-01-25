# リバースエンジニアリング実行時のデータベース接続情報UI入力機能の検討

## リサーチ要件

以下について検討してほしい：

* リバースエンジニアリング実行時に接続先をUI上から入力できるようにする
* どういうUIが良いか？
* 一旦、サポートするのはMySQLのみ。将来的にはPostgreSQLも対応する
* 環境変数に以下の値が存在する場合はデフォルト値として扱う
  * 開発時は頻繁に実行するので、それを簡略化するための仕組み
  * `DB_HOST`
  * `DB_PORT`
  * `DB_USER`
  * `DB_PASSWORD`
  * `DB_NAME`
* リバースエンジニアリングが成功した場合は接続情報をViewModel内に保持する。次回実行時にUIにはこの値が設定されている（環境変数より優先される）
  * パスワードは状態に持たない方がいいかも

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

## 現在のリバースエンジニアリング機能の実装

### 処理フロー

1. ユーザーが画面上の「リバースエンジニア」ボタンを押下
2. フロントエンドが現在のViewModelを`POST /api/reverse-engineer`に送信
3. バックエンドがデータベースに接続してスキーマ情報を取得
4. エンティティとリレーションシップを抽出
5. デフォルトレイアウトでER図を構築
6. ViewModelのerDiagramを更新して返却
7. フロントエンドがcanvas上にER図をレンダリング

### フロントエンド実装

フロントエンドの実装は`public/src/commands/reverseEngineerCommand.ts`に存在する：

```typescript
export async function commandReverseEngineer(
  dispatch: Store['dispatch'],
  getState: Store['getState']
): Promise<void> {
  dispatch(actionSetLoading, true);
  
  try {
    // 現在のViewModelを取得
    const currentViewModel = getState() as ViewModel;
    
    // サーバーにViewModelを送信し、更新後のViewModelを取得
    const updatedViewModel = await DefaultService.apiReverseEngineer(currentViewModel);
    
    // エラーレスポンスのチェック
    if ('error' in updatedViewModel) {
      throw new Error(updatedViewModel.error);
    }
    
    // 更新後のViewModelをStoreに設定
    dispatch(actionSetViewModel, updatedViewModel);
  } catch (error) {
    console.error('Failed to reverse engineer:', error);
  } finally {
    dispatch(actionSetLoading, false);
  }
}
```

### バックエンド実装

#### Usecase

バックエンドのUsecaseは`lib/usecases/ReverseEngineerUsecase.ts`に実装されている：

```typescript
export function createReverseEngineerUsecase(deps: ReverseEngineerDeps) {
  return async (viewModel: ViewModel): Promise<ViewModel> => {
    const dbManager = deps.createDatabaseManager();
    try {
      await dbManager.connect();
      
      // データベースからER図を生成
      const erData = await dbManager.generateERData();
      
      await dbManager.disconnect();
      
      // EntityNodeViewModelのRecordを生成
      const nodes: Record<string, EntityNodeViewModel> = {};
      erData.entities.forEach((entity: Entity, index: number) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        
        nodes[entity.id] = {
          id: entity.id,
          name: entity.name,
          x: 50 + col * 300,
          y: 50 + row * 200,
          columns: entity.columns,
          ddl: entity.ddl,
        };
      });
      
      // RelationshipEdgeViewModelのRecordを生成
      const edges: Record<string, RelationshipEdgeViewModel> = {};
      erData.relationships.forEach((relationship: Relationship) => {
        edges[relationship.id] = {
          id: relationship.id,
          sourceEntityId: relationship.fromEntityId,
          sourceColumnId: relationship.fromColumnId,
          targetEntityId: relationship.toEntityId,
          targetColumnId: relationship.toColumnId,
          constraintName: relationship.constraintName,
        };
      });
      
      // ViewModelを更新して返却
      return {
        format: viewModel.format,
        version: viewModel.version,
        erDiagram: {
          ...viewModel.erDiagram,
          nodes,
          edges,
          loading: false,
        },
        ui: viewModel.ui,
        buildInfo: viewModel.buildInfo,
      };
    } catch (error) {
      await dbManager.disconnect();
      throw error;
    }
  };
}
```

#### データベース接続

データベース接続は`lib/database.ts`の`DatabaseManager`クラスで管理されている：

```typescript
class DatabaseManager {
  private connection: mysql.Connection | null;

  async connect(): Promise<void> {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'test',
    };

    this.connection = await mysql.createConnection(config);
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async generateERData(): Promise<ERData> {
    // データベースからエンティティとリレーションシップを取得
    // ...
  }
}
```

現在の接続情報は環境変数からのみ取得しており、ハードコードされたデフォルト値がフォールバックとして使用されている。

### API定義

APIは`scheme/main.tsp`で定義されている：

```typescript
@route("/api")
namespace API {
  // Reverse engineer database to generate ER diagram
  @post
  @route("/reverse-engineer")
  op reverseEngineer(@body viewModel: ViewModel): ViewModel | ErrorResponse;
}
```

現在は`ViewModel`のみを受け取り、接続情報は環境変数から取得している。

## ViewModelの構造

すべての型は`scheme/main.tsp`で定義されている。

### ViewModel（ルート型）

```typescript
model ViewModel {
  format: string; // データフォーマット識別子（固定値: "er-viewer"）
  version: int32; // データフォーマットのバージョン（現在は 1 固定）
  erDiagram: ERDiagramViewModel; // ER図の状態
  ui: GlobalUIState; // グローバルUI状態
  buildInfo: BuildInfoState; // ビルド情報のキャッシュ
}
```

### ERDiagramViewModel

```typescript
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;       // エンティティノード（テーブル）
  edges: Record<RelationshipEdgeViewModel>; // リレーションシップ（外部キー）
  rectangles: Record<Rectangle>;            // 矩形（グループ化・領域区別用）
  texts: Record<TextBox>;                   // テキスト（注釈・説明用）
  ui: ERDiagramUIState;                     // ER図のUI状態
  loading: boolean;                         // リバースエンジニア処理中フラグ
}
```

### GlobalUIState

```typescript
model GlobalUIState {
  selectedItem: LayerItemRef | null; // 選択中のアイテム
  showBuildInfoModal: boolean; // ビルド情報モーダル表示フラグ
  showLayerPanel: boolean; // レイヤーパネル表示フラグ
}
```

## 現在の環境変数の使用状況

バックエンドで使用されている環境変数：

- `DB_HOST`: データベースホスト（デフォルト: `localhost`）
- `DB_PORT`: データベースポート（デフォルト: `3306`）
- `DB_USER`: データベースユーザー（デフォルト: `root`）
- `DB_PASSWORD`: データベースパスワード（デフォルト: `password`）
- `DB_NAME`: データベース名（デフォルト: `test`）

これらは`DatabaseManager.connect()`メソッド内で使用されている。

## 検討してほしい内容

### 1. UIデザイン

接続情報を入力するためのUIをどのように設計すべきか？

#### 考慮すべき点

- **表示タイミング**: 
  - リバースエンジニアボタン押下時にモーダル/ダイアログを表示するか？
  - 常に画面上に表示しておくか？
  - 設定パネルとして表示するか？
- **入力フィールド**:
  - ホスト、ポート、ユーザー、パスワード、データベース名の5つのフィールド
  - パスワードフィールドは目隠し表示（type="password"）
  - デフォルト値の表示方法（環境変数やViewModel内の保存済み値）
- **データベースタイプの選択**:
  - 将来的にPostgreSQLも対応する予定だが、現時点ではMySQLのみ
  - 将来の拡張性を考慮して、データベースタイプの選択UIを用意すべきか？
  - 現時点では非表示にして、内部的にはMySQLのみサポートとするか？
- **接続テスト機能**:
  - 「接続テスト」ボタンで接続確認できるようにするか？
  - MVP段階では不要か？
- **保存機能**:
  - 接続情報をViewModelに保存する場合、保存ボタンが必要か？
  - リバースエンジニア実行時に自動で保存するか？

#### UI例の提示

以下のような選択肢が考えられるが、それぞれのメリット・デメリットを評価してほしい：

**パターン1: モーダルダイアログ**
- リバースエンジニアボタン押下時にモーダルを表示
- 接続情報を入力して「実行」ボタンで実行
- モーダル内に入力フォームと実行ボタンを配置

**パターン2: サイドパネル**
- 画面左右にサイドパネルとして常時表示
- 接続情報を入力して「リバースエンジニア」ボタンで実行
- レイヤーパネルのような折りたたみ可能なパネル

**パターン3: インライン展開**
- リバースエンジニアボタンの近くに展開/折りたたみ可能な入力エリア
- 接続情報を表示/非表示切り替え可能

**パターン4: 設定画面**
- 専用の設定画面/設定モーダルで接続情報を管理
- リバースエンジニアボタンは保存済みの接続情報を使用

どのパターンが適切か、または他に良いパターンがあるか提案してほしい。

### 2. データモデルの設計

接続情報をViewModelに保持する場合、どのようなデータ構造にすべきか？

#### 考慮すべき点

- **配置場所**: ViewModelのどこに接続情報を配置するか？
  - `ViewModel`のトップレベルに`databaseConnection`のようなフィールドを追加？
  - `GlobalUIState`に追加？
  - `ERDiagramViewModel`に追加？
  - 別の新しいフィールド（例: `settings`）を追加？
- **パスワードの扱い**:
  - パスワードをViewModelに保存するべきか？
  - セキュリティの観点からパスワードは保存しない方が良い可能性
  - パスワード以外の接続情報のみ保存する選択肢
  - 開発時の利便性とセキュリティのバランス
- **データベースタイプのフィールド**:
  - 将来のPostgreSQL対応を考慮して、`databaseType: "mysql" | "postgresql"`のようなフィールドを用意するか？
- **任意性**:
  - 接続情報が未設定の場合はどうするか？
  - すべてのフィールドをoptional（`| null`）にするか？
- **デフォルト値の優先順位**:
  - ViewModel内の値 > 環境変数 > ハードコードされたデフォルト値
  - この優先順位で良いか？

#### データ構造例

以下のような構造が考えられるが、メリット・デメリットを分析してほしい：

**パターン1: ViewModelのトップレベルに配置**

```typescript
model DatabaseConnection {
  host: string | null;
  port: int32 | null;
  user: string | null;
  password: string | null; // または除外
  database: string | null;
  type: "mysql" | "postgresql"; // 将来の拡張用
}

model ViewModel {
  format: string;
  version: int32;
  erDiagram: ERDiagramViewModel;
  ui: GlobalUIState;
  buildInfo: BuildInfoState;
  databaseConnection: DatabaseConnection | null; // 追加
}
```

**パターン2: GlobalUIStateに配置**

```typescript
model DatabaseConnection {
  host: string | null;
  port: int32 | null;
  user: string | null;
  // passwordは保存しない
  database: string | null;
}

model GlobalUIState {
  selectedItem: LayerItemRef | null;
  showBuildInfoModal: boolean;
  showLayerPanel: boolean;
  databaseConnection: DatabaseConnection | null; // 追加
}
```

**パターン3: 設定専用の新しいフィールド**

```typescript
model AppSettings {
  database: {
    host: string | null;
    port: int32 | null;
    user: string | null;
    database: string | null;
  } | null;
}

model ViewModel {
  format: string;
  version: int32;
  erDiagram: ERDiagramViewModel;
  ui: GlobalUIState;
  buildInfo: BuildInfoState;
  settings: AppSettings; // 追加
}
```

どのパターンが適切か、または他に良い構造があるか提案してほしい。

### 3. API設計

接続情報をフロントエンドからバックエンドに渡す方法をどうするか？

#### 考慮すべき点

- **API変更の方法**:
  - 現在の`POST /api/reverse-engineer`にパラメータを追加するか？
  - 新しいAPIエンドポイントを作成するか？
- **リクエストボディ**:
  - ViewModelに接続情報を含めて送信するか？
  - 接続情報を別途送信するか？
- **環境変数との関係**:
  - フロントエンドから送信された接続情報と環境変数のどちらを優先するか？
  - 接続情報が未指定の場合は環境変数を使用するか？

#### API設計例

以下のような選択肢が考えられるが、メリット・デメリットを評価してほしい：

**パターン1: ViewModelに接続情報を含める**

```typescript
// ViewModelに接続情報を追加
@post
@route("/reverse-engineer")
op reverseEngineer(@body viewModel: ViewModel): ViewModel | ErrorResponse;
```

- ViewModelに`databaseConnection`フィールドを追加
- バックエンドはViewModel内の接続情報を使用してデータベースに接続
- 接続情報が未設定の場合は環境変数を使用

**パターン2: 接続情報を別パラメータとして送信**

```typescript
model ReverseEngineerRequest {
  viewModel: ViewModel;
  databaseConnection: DatabaseConnection;
}

@post
@route("/reverse-engineer")
op reverseEngineer(@body request: ReverseEngineerRequest): ViewModel | ErrorResponse;
```

- リクエストボディに`viewModel`と`databaseConnection`を含める
- ViewModelとは独立して接続情報を管理

**パターン3: 新しいAPIエンドポイント**

```typescript
// 接続情報付きリバースエンジニア
@post
@route("/reverse-engineer-with-connection")
op reverseEngineerWithConnection(
  @body viewModel: ViewModel,
  @body connection: DatabaseConnection
): ViewModel | ErrorResponse;

// 既存のAPIは環境変数を使用
@post
@route("/reverse-engineer")
op reverseEngineer(@body viewModel: ViewModel): ViewModel | ErrorResponse;
```

- 接続情報を指定する場合と環境変数を使用する場合で別のエンドポイントを用意

どのパターンが適切か、または他に良い設計があるか提案してほしい。

### 4. パスワードの扱い

パスワードをViewModelに保存することのセキュリティリスクと対処法を検討してほしい。

#### 考慮すべき点

- **保存の必要性**:
  - MVPフェーズではパスワードを保存した方が開発効率が良い
  - しかし、セキュリティリスクがある
- **セキュリティリスク**:
  - ViewModelはJSON形式でファイルに保存される（インポート・エクスポート機能）
  - ブラウザのローカルストレージやファイルに平文パスワードが保存される
  - 誤って第三者にファイルを共有してしまうリスク
- **代替案**:
  - パスワードは保存せず、毎回入力を求める
  - パスワードのみブラウザのSessionStorageに一時保存
  - パスワードは環境変数のみから取得し、UI入力は受け付けない
- **MVP段階での許容範囲**:
  - 開発用途であればパスワード保存を許容するか？
  - セキュリティ警告を表示するか？

どのような方針が適切か、メリット・デメリットを示してほしい。

### 5. 実装への影響範囲

この機能を実装する場合の影響範囲を分析してほしい。

#### 考慮すべき点

- **フロントエンド**:
  - UI コンポーネントの追加（入力フォーム、モーダル、パネルなど）
  - コマンド関数の変更（`commandReverseEngineer`）
  - Action関数の追加（接続情報の更新など）
  - ViewModelの型定義の変更
- **バックエンド**:
  - Usecaseの変更（`ReverseEngineerUsecase`）
  - DatabaseManagerの変更（動的な接続情報の受け取り）
  - API定義の変更（`scheme/main.tsp`）
- **状態管理**:
  - ViewModelに接続情報フィールドを追加
  - 初期化処理の変更（デフォルト値の設定）
- **インポート・エクスポート**:
  - 接続情報が含まれるViewModelのインポート・エクスポート
  - パスワードを含む場合のセキュリティ警告

変更が必要なファイル・関数・型定義をリストアップし、実装工数を見積もってほしい。

### 6. UXの考慮

開発者がリバースエンジニアリングを頻繁に実行する際のUXを検討してほしい。

#### 考慮すべき点

- **頻繁な実行**:
  - 開発時は同じデータベースに対して何度もリバースエンジニアリングを実行する
  - 毎回接続情報を入力するのは煩雑
- **デフォルト値の活用**:
  - 環境変数のデフォルト値が設定されていれば、入力不要にする
  - 前回の接続情報が保存されていれば、それを使用する
- **ショートカット**:
  - 「前回と同じ接続情報で実行」ボタンを用意する
  - 接続情報の編集が必要な場合のみUIを表示する
- **エラーハンドリング**:
  - 接続失敗時のエラーメッセージ表示
  - 接続情報の再入力を促す

開発時の利便性を最大化するためのUX設計を提案してほしい。

### 7. 将来の拡張性

PostgreSQL対応など、将来の拡張を考慮した設計を検討してほしい。

#### 考慮すべき点

- **データベースタイプの管理**:
  - MySQLとPostgreSQLでは接続パラメータが異なる可能性
  - データベースタイプ選択UIの設計
- **ポートのデフォルト値**:
  - MySQL: 3306
  - PostgreSQL: 5432
  - データベースタイプに応じたデフォルト値の変更
- **接続文字列**:
  - PostgreSQLは接続文字列形式をサポート
  - 将来的に接続文字列入力をサポートするか？
- **追加パラメータ**:
  - SSL接続の設定
  - タイムアウトの設定
  - その他のデータベース固有の設定

現時点ではMySQLのみのサポートだが、将来の拡張を容易にする設計を提案してほしい。

### 8. 推奨案

最終的に、以下について推奨案を提示してほしい：

1. **UIデザイン**: どのUIパターンを推奨するか（モーダル、サイドパネル、など）
2. **データモデル**: ViewModelのどこに接続情報を配置するか
3. **API設計**: どのようにAPIを設計するか
4. **パスワードの扱い**: パスワードを保存するか、しないか
5. **優先順位**: デフォルト値の優先順位（ViewModel > 環境変数 > ハードコード）
6. **実装ステップ**: 段階的に実装する場合の順序

それぞれの推奨案について、理由と根拠を示してほしい。

## 期待する回答

以下について、具体的な見解と理由を提示してほしい：

1. **UIデザインの提案**
   - 推奨するUIパターン（モーダル、サイドパネル、など）
   - UI要素の配置とデザイン
   - UXフローの説明（画面遷移、ユーザー操作）

2. **データモデルの設計**
   - TypeSpecでの型定義（具体的なコード例）
   - ViewModelのどこに配置するか
   - パスワード保存の有無とその理由

3. **API設計**
   - 推奨するAPIの形式（リクエスト・レスポンスの構造）
   - TypeSpecでの定義（具体的なコード例）

4. **パスワード管理のベストプラクティス**
   - パスワードを保存する場合の対策
   - パスワードを保存しない場合の代替案
   - MVPフェーズでの推奨方針

5. **実装への影響範囲**
   - 変更が必要なファイル・関数のリスト
   - フロントエンド・バックエンドそれぞれの実装内容
   - 実装工数の見積もり

6. **UX設計**
   - 開発時の効率を最大化するUXフロー
   - デフォルト値の活用方法
   - エラーハンドリングの方針

7. **将来の拡張性**
   - PostgreSQL対応時の変更範囲
   - データベースタイプ選択UIの設計
   - その他の拡張ポイント

8. **実装の優先順位**
   - MVP段階で必須の機能
   - 後回しにできる機能
   - 段階的な実装の推奨ステップ

可能であれば、複数の実装案を比較し、それぞれのメリット・デメリットを示してほしい。
