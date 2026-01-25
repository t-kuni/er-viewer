# ER Diagram Viewerにおけるインポート・エクスポート機能の実装方針検討

## リサーチ要件

以下の仕様のインポート・エクスポート機能を検討してほしい：

* 画面上に「インポート」「エクスポート」ボタンを作成する
* 基本的にはViewModelをインポート・エクスポートできれば問題ないと思うが、UIの一時的な状態など不要な値も含まれている
* エクスポートはブラウザのダウンロードのような挙動になればいいかもしれない（ファイル選択モーダルは無くていいかも）
* 画面上にファイルをD&Dすればインポートになるようにもしたい
* 何かしらライブラリを導入した方がよいか？不要か？
* 過去に「永続化機能」を検討していたが「インポート・エクスポート機能」に一本化で良さそう

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

#### EntityNodeViewModel

```typescript
model EntityNodeViewModel {
  id: string; // UUID (エンティティID)
  name: string;
  x: float64;       // 表示位置X
  y: float64;       // 表示位置Y
  columns: Column[];
  ddl: string;
}
```

#### RelationshipEdgeViewModel

```typescript
model RelationshipEdgeViewModel {
  id: string; // UUID (リレーションシップID)
  sourceEntityId: string;   // エンティティID (UUID)
  sourceColumnId: string;   // カラムID (UUID)
  targetEntityId: string;   // エンティティID (UUID)
  targetColumnId: string;   // カラムID (UUID)
  constraintName: string;
}
```

#### Rectangle

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

#### Column

```typescript
model Column {
  id: string; // UUID
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  extra: string;
}
```

#### ERDiagramUIState（ER図のUI状態）

```typescript
model ERDiagramUIState {
  hover: HoverTarget | null;
  highlightedNodeIds: string[];    // Entity IDs (UUID)
  highlightedEdgeIds: string[];    // Edge IDs (UUID)
  highlightedColumnIds: string[];  // Column IDs (UUID)
  layerOrder: LayerOrder;          // レイヤー順序
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

#### BuildInfoState

```typescript
model BuildInfoState {
  data: BuildInfo | null; // キャッシュされたビルド情報
  loading: boolean;       // ビルド情報取得中フラグ
  error: string | null;   // エラーメッセージ
}
```

#### LayerOrder

```typescript
model LayerOrder {
  backgroundItems: LayerItemRef[]; // 背面アイテム（配列の後ろが前面寄り）
  foregroundItems: LayerItemRef[]; // 前面アイテム（配列の後ろが前面寄り）
}
```

#### LayerItemRef

```typescript
model LayerItemRef {
  kind: LayerItemKind; // "entity" | "relation" | "rectangle" | "text"
  id: string;          // UUID
}
```

### データの分類

ViewModelに含まれるデータは以下のように分類できる：

#### 永続化すべきデータ（エクスポート対象）

- `erDiagram.nodes`: エンティティノード（位置、カラム情報、DDL）
- `erDiagram.edges`: リレーションシップ（外部キー関係）
- `erDiagram.rectangles`: ユーザーが作成した矩形（グループ化用）
- `erDiagram.ui.layerOrder`: レイヤー順序（ユーザーが設定した表示順）

#### 一時的なUI状態（エクスポート不要）

- `erDiagram.ui.hover`: ホバー中の要素
- `erDiagram.ui.highlightedNodeIds`: ハイライト中のノード
- `erDiagram.ui.highlightedEdgeIds`: ハイライト中のエッジ
- `erDiagram.ui.highlightedColumnIds`: ハイライト中のカラム
- `erDiagram.loading`: ローディング状態フラグ
- `ui.selectedItem`: 選択中のアイテム
- `ui.showBuildInfoModal`: ビルド情報モーダル表示フラグ
- `ui.showLayerPanel`: レイヤーパネル表示フラグ
- `buildInfo`: ビルド情報のキャッシュ（アプリ起動時に取得されるため不要）

### 状態管理の仕組み

- **単一状態ツリー**: アプリケーション全体の状態を`ViewModel`で管理
- **純粋関数Action**: すべての状態更新は `action(viewModel, ...params) => newViewModel` の形式で実装
- **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）

Storeは`public/src/store/erDiagramStore.ts`に実装されている。

### 現在のデータ取得フロー

#### 1. 初期化（/api/init）

アプリケーション起動時に`/api/init`エンドポイントを呼び出し、初期状態のViewModelを取得する。

```typescript
// GetInitialViewModelUsecase.ts（バックエンド）
export function createGetInitialViewModelUsecase(deps: GetInitialViewModelDeps) {
  return async (): Promise<ViewModel> => {
    const buildInfo = await deps.readBuildInfo();
    
    return {
      erDiagram: {
        nodes: {},
        edges: {},
        rectangles: {},
        ui: {
          hover: null,
          highlightedNodeIds: [],
          highlightedEdgeIds: [],
          highlightedColumnIds: [],
          layerOrder: { backgroundItems: [], foregroundItems: [] },
        },
        loading: false,
      },
      ui: {
        selectedItem: null,
        showBuildInfoModal: false,
        showLayerPanel: false,
      },
      buildInfo: {
        data: buildInfo,
        loading: false,
        error: null,
      },
    };
  };
}
```

#### 2. リバースエンジニアリング（/api/reverse-engineer）

現在、`/api/reverse-engineer`エンドポイントはViewModelを受け取り、ViewModelを返す設計になっている。

```typescript
// ReverseEngineerUsecase.ts（バックエンド）
export function createReverseEngineerUsecase(deps: ReverseEngineerDeps) {
  return async (viewModel: ViewModel): Promise<ViewModel> => {
    const dbManager = deps.createDatabaseManager();
    try {
      await dbManager.connect();
      const erData = await dbManager.generateERData();
      const layoutData = dbManager.generateDefaultLayoutData(erData.entities);
      await dbManager.disconnect();
      
      // ViewModelを複製して、nodesとedgesを更新
      const updatedViewModel: ViewModel = {
        ...viewModel,
        erDiagram: {
          ...viewModel.erDiagram,
          nodes: {},
          edges: {},
        },
      };
      
      // ERDataをViewModelに変換
      for (const entity of erData.entities) {
        const layoutItem = layoutData.entities[entity.id];
        updatedViewModel.erDiagram.nodes[entity.id] = {
          id: entity.id,
          name: entity.name,
          x: layoutItem.x,
          y: layoutItem.y,
          columns: entity.columns,
          ddl: entity.ddl,
        };
      }
      
      for (const relationship of erData.relationships) {
        updatedViewModel.erDiagram.edges[relationship.id] = {
          id: relationship.id,
          sourceEntityId: relationship.fromEntityId,
          targetEntityId: relationship.toEntityId,
          sourceColumnId: relationship.fromColumnId,
          targetColumnId: relationship.toColumnId,
          constraintName: relationship.constraintName,
        };
      }
      
      return updatedViewModel;
    } catch (error) {
      await dbManager.disconnect();
      throw error;
    }
  };
}
```

フロントエンドでは以下のようにAPIを呼び出している：

```typescript
// reverseEngineerCommand.ts（フロントエンド）
export async function commandReverseEngineer(
  dispatch: Store['dispatch']
): Promise<void> {
  dispatch(actionSetLoading, true);
  
  try {
    const currentViewModel = store.getState();
    const updatedViewModel = await DefaultService.apiReverseEngineer(currentViewModel);
    
    // 更新されたViewModelをそのまま設定
    dispatch(actionSetData, updatedViewModel);
  } catch (error) {
    console.error('Failed to reverse engineer:', error);
  } finally {
    dispatch(actionSetLoading, false);
  }
}
```

### ID仕様

すべての`id`フィールドはUUID (Universally Unique Identifier)を使用している。

- UUIDは`crypto.randomUUID()`で生成
- 一度生成されたIDは保存され、増分更新時も維持される（永続性を持つ）

### 現在のAPIエンドポイント

```typescript
// scheme/main.tsp
@route("/api")
namespace API {
  
  // Get initial ViewModel
  // Returns the initial state of the application including build info
  @get
  @route("/init")
  op initialize(): ViewModel | ErrorResponse;

  // Reverse engineer database to generate ER diagram
  // Accepts current ViewModel and returns updated ViewModel with ER diagram data
  @post
  @route("/reverse-engineer")
  op reverseEngineer(@body viewModel: ViewModel): ViewModel | ErrorResponse;
}
```

## 検討してほしい内容

以下の観点から、インポート・エクスポート機能の実装方針を検討してほしい：

### 1. エクスポートするデータの形式

- ViewModelをそのままエクスポートするべきか？
- エクスポート用の型（ExportData）を定義すべきか？
- エクスポート用の型を定義する場合、どのフィールドを含めるべきか？
- JSON形式でよいか？他の形式（YAML、バイナリなど）も検討すべきか？

### 2. エクスポート機能の実装方針

- ブラウザの`download`属性を使った単純なダウンロードでよいか？
- ファイル名はどのように決定すべきか？（例: `er-diagram-{timestamp}.json`）
- ファイル選択モーダルは不要か？
- エクスポートボタンの配置場所はどこが適切か？
- エクスポートはクライアント側で完結させるか、サーバー側にエンドポイントを用意するか？

### 3. インポート機能の実装方針

- ドラッグ&ドロップの実装方法
  - ライブラリを使うべきか？ネイティブAPI（HTML5 Drag and Drop API）で十分か？
  - ドロップ領域はどこにすべきか？（全画面、特定のエリア）
- ファイル選択ダイアログも提供すべきか？
- インポートしたデータのバリデーション
  - 型チェックはどのように行うべきか？
  - 不正なデータを検出した場合の処理は？
- インポート時の既存データの扱い
  - 完全に上書きするか？
  - マージするか？（マージの場合、IDの競合をどう扱うか？）

### 4. ライブラリの必要性

以下のようなライブラリの導入を検討すべきか？

- ドラッグ&ドロップ用ライブラリ（例: react-dropzone）
- JSONスキーマバリデーション用ライブラリ（例: ajv, zod）
- ファイルダウンロード用ライブラリ（例: file-saver）

または、ネイティブAPIで十分か？

### 5. エクスポート用データ型の設計

エクスポート用の型を定義する場合、以下のような構造が考えられるが、適切か？

```typescript
model ExportData {
  version: string; // エクスポート形式のバージョン（将来の互換性のため）
  timestamp: int64; // エクスポート時刻
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>;
  layerOrder: LayerOrder;
}
```

または、他の設計があるか？

### 6. バージョン管理と互換性

- エクスポートデータに形式のバージョン情報を含めるべきか？
- 将来的にViewModelの型が変更された場合、過去のエクスポートデータとの互換性をどう保つべきか？
- マイグレーション機能は必要か？

### 7. エラーハンドリング

- インポート時のエラーをどのようにユーザーに伝えるべきか？
  - トーストメッセージ
  - モーダルダイアログ
  - インラインエラー表示
- エクスポート時のエラー（例: ブラウザがダウンロードをブロック）をどう扱うか？

### 8. UX上の考慮点

- エクスポート時に確認ダイアログは必要か？
- インポート時に確認ダイアログは必要か？（既存データが上書きされる警告）
- ドラッグ&ドロップ時の視覚的フィードバック（ドロップ可能領域のハイライトなど）
- インポート・エクスポートの進行状況表示は必要か？

### 9. セキュリティ上の考慮点

- インポートしたJSONファイルの内容をどこまで信頼すべきか？
- XSS攻撃のリスクはあるか？（例: エクスポートデータに悪意のあるスクリプトを含める）
- ファイルサイズの制限は必要か？

### 10. テスト戦略

- インポート・エクスポート機能のテストをどのように書くべきか？
  - Unit Test
  - Integration Test
  - E2E Test
- 不正なデータのテストケースをどう作るべきか？

### 11. 既存の類似機能との統合

- 「永続化機能」としてLocalStorageやIndexedDBへの保存も検討されていたとのことだが、インポート・エクスポート機能に一本化でよいか？
- インポート・エクスポート機能と自動保存機能を組み合わせる可能性はあるか？

### 12. 他のWebアプリケーションでの事例

- 類似のアプリケーション（図表作成ツール、ダイアグラムエディタなど）でのインポート・エクスポート機能の実装例
- ベストプラクティスや参考になる設計パターン

## 期待する回答

以下について、具体的な見解と理由を提示してほしい：

1. **エクスポートデータの形式**
   - ViewModelをそのまま使うべきか、ExportData型を定義すべきか
   - どのフィールドを含めるべきか（具体的な型定義）

2. **実装方針**
   - クライアント側で完結させるか、サーバー側にエンドポイントを用意するか
   - ドラッグ&ドロップの実装方法（ライブラリ vs ネイティブAPI）
   - ファイルダウンロードの実装方法

3. **ライブラリの必要性**
   - どのライブラリが有用か、またはネイティブAPIで十分か
   - 各ライブラリのメリット・デメリット

4. **エラーハンドリングとUX**
   - エラー表示の方法
   - 確認ダイアログの必要性
   - 視覚的フィードバック

5. **セキュリティとバリデーション**
   - インポートデータのバリデーション方法
   - セキュリティ上の注意点

6. **バージョン管理**
   - エクスポート形式のバージョン管理の必要性
   - 将来の互換性への対応

7. **他のアプリケーションでの事例**
   - 参考になる実装例やベストプラクティス

可能であれば、複数の実装案を比較し、それぞれのメリット・デメリットを示してほしい。
