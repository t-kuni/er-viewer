# バックエンドインタフェースにおけるViewModelベースAPI設計の実現可能性検討

## リサーチ要件

以下の方針について、現実的にアリか？無理があるか？を検討してほしい：

* バックエンドのインタフェースについて、リクエスト・レスポンスを共にフロントのViewModelとし、バックエンドでViewModelを編集して編集後のViewModelを返却、フロントではそのViewModelをまるごと差し替える。という方針は現実的にアリか？無理があるか？検討してほしい

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

## 現在のアーキテクチャ

### 状態管理の基本方針

フロントエンドでは以下の設計原則に基づいた状態管理を採用している：

- **単一状態ツリー**: アプリケーション全体の状態を`ViewModel`で管理
- **純粋関数Action**: すべての状態更新は `action(viewModel, ...params) => newViewModel` の形式で実装
- **状態管理**: 自前Store + React `useSyncExternalStore`（ライブラリ非依存）

### ViewModelの型定義

`scheme/main.tsp`で定義されている。以下は主要な型：

#### ViewModel（アプリケーション全体のルート型）

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
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>; // 矩形（グループ化・領域区別用）
  ui: ERDiagramUIState;
  loading: boolean; // リバースエンジニア処理中フラグ
}
```

#### EntityNodeViewModel

```typescript
model EntityNodeViewModel {
  id: string; // UUID (エンティティID)
  name: string;
  x: float64;
  y: float64;
  columns: Column[];
  ddl: string;
}
```

#### RelationshipEdgeViewModel

```typescript
model RelationshipEdgeViewModel {
  id: string; // UUID (リレーションシップID)
  sourceEntityId: string; // エンティティID (UUID)
  sourceColumnId: string; // カラムID (UUID)
  targetEntityId: string; // エンティティID (UUID)
  targetColumnId: string; // カラムID (UUID)
  constraintName: string;
}
```

#### ERDiagramUIState

```typescript
model ERDiagramUIState {
  hover: HoverTarget | null;
  highlightedNodeIds: string[]; // Entity IDs (UUID)
  highlightedEdgeIds: string[]; // Edge IDs (UUID)
  highlightedColumnIds: string[]; // Column IDs (UUID)
  layerOrder: LayerOrder; // レイヤー順序
}
```

#### GlobalUIState

```typescript
model GlobalUIState {
  selectedItem: LayerItemRef | null; // 選択中のアイテム（矩形、テキスト、エンティティ）
  showBuildInfoModal: boolean; // ビルド情報モーダル表示フラグ
  showLayerPanel: boolean; // レイヤーパネル表示フラグ
}
```

#### BuildInfoState

```typescript
model BuildInfoState {
  data: BuildInfo | null; // キャッシュされたビルド情報
  loading: boolean; // ビルド情報取得中フラグ
  error: string | null; // エラーメッセージ
}
```

### 現在のデータフロー（リバースエンジニアリングの例）

現状のAPIとデータフローは以下の通り：

#### 1. APIレスポンス

バックエンドAPIは以下の形式でレスポンスを返す：

```typescript
model ReverseEngineerResponse {
  erData: ERData;
  layoutData: LayoutData;
}

model ERData {
  entities: Entity[];
  relationships: Relationship[];
}

model LayoutData {
  entities: Record<EntityLayoutItem>;
  rectangles: Record<Rectangle>;
  texts: Record<Text>;
}
```

#### 2. フロントエンドでの変換

フロントエンドでは、APIレスポンスを受け取った後、`buildERDiagramViewModel`関数でViewModelに変換する：

```typescript
export function buildERDiagramViewModel(
  erData: ERData,
  layoutData: LayoutData
): ERDiagramViewModel {
  // EntityNodeViewModelのRecord形式を構築
  const nodes: { [key: string]: EntityNodeViewModel } = {};
  
  for (const entity of erData.entities) {
    const layoutItem = layoutData.entities[entity.id];
    
    nodes[entity.id] = {
      id: entity.id,
      name: entity.name,
      x: layoutItem.x,
      y: layoutItem.y,
      columns: entity.columns,
      ddl: entity.ddl,
    };
  }
  
  // RelationshipEdgeViewModelのRecord形式を構築
  const edges: { [key: string]: RelationshipEdgeViewModel } = {};
  
  for (const relationship of erData.relationships) {
    edges[relationship.id] = {
      id: relationship.id,
      sourceEntityId: relationship.fromEntityId,
      targetEntityId: relationship.toEntityId,
      sourceColumnId: relationship.fromColumnId,
      targetColumnId: relationship.toColumnId,
      constraintName: relationship.constraintName,
    };
  }
  
  return {
    nodes,
    edges,
    rectangles: {},
    ui: {
      hover: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      highlightedColumnIds: [],
      layerOrder: { backgroundItems: [], foregroundItems: [] },
    },
    loading: false,
  };
}
```

#### 3. Command層での処理

```typescript
export async function commandReverseEngineer(
  dispatch: Store['dispatch']
): Promise<void> {
  dispatch(actionSetLoading, true);
  
  try {
    const response = await DefaultService.apiReverseEngineer();
    
    // ReverseEngineerResponseからERDiagramViewModelを構築
    const erDiagram = buildERDiagramViewModel(
      response.erData,
      response.layoutData
    );
    
    // データをStoreに設定
    dispatch(actionSetData, erDiagram);
  } catch (error) {
    console.error('Failed to reverse engineer:', error);
  } finally {
    dispatch(actionSetLoading, false);
  }
}
```

### バックエンドの責務（現状）

バックエンドはUsecaseレイヤーでビジネスロジックを実装している：

```typescript
export function createReverseEngineerUsecase(deps: ReverseEngineerDeps) {
  return async (): Promise<ReverseEngineerResponse> => {
    const dbManager = deps.createDatabaseManager();
    try {
      await dbManager.connect();
      const erData = await dbManager.generateERData();
      const layoutData = dbManager.generateDefaultLayoutData(erData.entities);
      await dbManager.disconnect();
      
      return {
        erData,
        layoutData,
      };
    } catch (error) {
      await dbManager.disconnect();
      throw error;
    }
  };
}
```

### 現在の責務分担

#### バックエンド

- DBアクセスしてER図データ（ERData）を取得
- レイアウト情報（LayoutData）を生成または取得
- ERDataとLayoutDataを返す
- ビジネスロジック（リバースエンジニアリング）の実行

#### フロントエンド

- APIレスポンス（ERData + LayoutData）を受け取る
- ViewModelに変換する（`buildERDiagramViewModel`）
- ViewModelをStoreで管理
- UI状態（hover、highlight、選択状態など）を管理
- Actionで状態更新を行う

## 検討してほしい新しい方針

上記の現状のアーキテクチャに対して、以下の方針への変更を検討している：

### 新しいデータフロー案

1. **フロント → バック**: フロントから現在のViewModelをリクエストボディで送信
2. **バック**: ViewModelを受け取り、必要な編集（例: DBから取得したデータでnodesとedgesを更新）を行う
3. **バック → フロント**: 編集後のViewModelをそのまま返却
4. **フロント**: 受け取ったViewModelをそのままStoreに設定（変換処理なし）

### 具体的な例（リバースエンジニアリングの場合）

#### 現状

```
フロント: commandReverseEngineer()
  ↓
API: POST /api/reverse-engineer
  ↓ レスポンス: { erData, layoutData }
  ↓
フロント: buildERDiagramViewModel(erData, layoutData) でViewModelに変換
  ↓
Store: actionSetData(viewModel)
```

#### 新しい方針案

```
フロント: Store.getState() で現在のViewModelを取得
  ↓
API: POST /api/reverse-engineer { viewModel: currentViewModel }
  ↓ バックエンドでViewModelを編集（nodesとedgesを更新）
  ↓ レスポンス: { viewModel: updatedViewModel }
  ↓
Store: actionSetData(updatedViewModel) そのまま設定
```

### 新しい方針のメリット（想定）

- フロントでの変換処理が不要になる
- バックエンドがViewModelの形式を理解し、直接編集できる
- データの整合性が取りやすい（ViewModelの形式が統一される）

### 新しい方針の懸念点（想定）

- バックエンドがフロントの状態管理の詳細（ViewModel）を知る必要がある
- UI状態（hover、highlight等）をバックエンドに送信することになる（不要な情報の送信）
- ViewModelが大きくなった場合のパフォーマンス影響
- バックエンドとフロントの責務が曖昧になる可能性
- TypeSpecでの型定義の複雑化

## 検討すべき観点

以下の観点から、新しい方針（ViewModelベースAPI）の実現可能性と妥当性を検討してほしい：

### 1. アーキテクチャ上の妥当性

- バックエンドがフロントのViewModelを扱うことは一般的か？
- 責務分離の観点から問題はないか？
- ViewModelがフロント固有の情報（UI状態）を含むことをどう考えるべきか？

### 2. パフォーマンス

- ViewModelをリクエスト・レスポンスで送受信することのオーバーヘッド
- 特に大規模なER図（100テーブル以上など）での影響
- 不要な情報（UI状態）の送信がもたらす影響

### 3. 保守性・拡張性

- ViewModelの変更がバックエンドに与える影響
- 新しいUI状態の追加時の対応
- TypeSpecでの型定義の管理

### 4. 実装の複雑さ

- 現状のアーキテクチャと比較した実装の複雑さ
- コンバーター処理の有無による影響
- テストの書きやすさ

### 5. 代替案の検討

- 現状のまま（ERData + LayoutData）で進めるべきか？
- 部分的にViewModelを使う（例: 特定のAPIのみ）ことは有効か？
- より良い設計があるか？

### 6. 他のWebアプリケーションでの事例

- 類似のアーキテクチャを採用している事例はあるか？
- GraphQLなど他のアプローチとの比較
- BFF（Backend For Frontend）パターンとの関連

## 既存の技術的制約

- **TypeSpec**: 型定義は`scheme/main.tsp`で一元管理し、`npm run generate`で生成
- **状態管理**: 自前Store + React `useSyncExternalStore`
- **Usecaseレイヤー**: バックエンドのビジネスロジックはUsecaseで実装
- **Action層**: フロントの状態更新は純粋関数Actionで実装

## 期待する回答

以下について、具体的な見解と理由を提示してほしい：

1. **新しい方針（ViewModelベースAPI）は現実的に実現可能か？**
   - 可能な場合、どのような点に注意すべきか？
   - 不可能または推奨されない場合、その理由は？

2. **現状のアーキテクチャと比較したメリット・デメリット**
   - パフォーマンス、保守性、拡張性の観点から

3. **推奨されるアプローチ**
   - 新しい方針を採用すべきか？
   - 現状のままでいくべきか？
   - 第三の選択肢はあるか？

4. **実装上の具体的な懸念点と対策**
   - 採用する場合の注意点や回避すべき問題

5. **他のWebアプリケーションでの類似事例**
   - 参考になる設計パターンや実装例

可能であれば、複数の選択肢を比較し、それぞれのメリット・デメリットを示してほしい。
