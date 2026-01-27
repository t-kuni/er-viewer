# タスク一覧: 逆引きインデックス実装によるホバーインタラクション最適化

## 概要

直前のコミットで更新された仕様書に基づき、`ERDiagramIndex`（逆引きインデックス）を実装することで、ホバーインタラクションのパフォーマンスを最適化する。

**仕様書の更新内容**:
- [scheme/main.tsp](/scheme/main.tsp): `ERDiagramIndex`型を追加
- [spec/frontend_er_rendering.md](/spec/frontend_er_rendering.md): 逆引きインデックスを使用した高速検索仕様を追加
- [spec/frontend_state_management.md](/spec/frontend_state_management.md): `actionHoverEntity`、`actionHoverEdge`、`actionHoverColumn`で逆引きインデックスを使用する仕様を追加
- [spec/viewmodel_based_api.md](/spec/viewmodel_based_api.md): バックエンドでインデックスを計算する仕様を追加
- [spec/import_export_feature.md](/spec/import_export_feature.md): インポート時にインデックスを再計算する仕様を追加

**パフォーマンス改善の目的**:
- 現在: O(全エッジ数) + O(全ノード数 × カラム数) の線形探索
- 改善後: O(1) または O(接続数) の高速検索
- 大規模ER図（100テーブル、500リレーション）で数百倍の高速化を実現

---

## フェーズ1: バックエンド実装（型生成・ビルド・テスト含む）

### バックエンド: 逆引きインデックス計算ユーティリティの実装

- [ ] **ファイル作成**: `/lib/utils/buildERDiagramIndex.ts`
  - `buildERDiagramIndex`関数を実装
  - **引数**: `nodes: Record<EntityNodeViewModel>`, `edges: Record<RelationshipEdgeViewModel>`
  - **戻り値**: `ERDiagramIndex`
  - **処理内容**:
    - `entityToEdges`: 各エンティティに接続されているエッジのリストを生成
      - `edges`を走査し、`sourceEntityId`と`targetEntityId`からマッピングを構築
    - `columnToEntity`: 各カラムが所属するエンティティを特定
      - `nodes`を走査し、各ノードの`columns`から`columnId → entityId`のマッピングを構築
    - `columnToEdges`: 各カラムに接続されているエッジのリストを生成
      - `edges`を走査し、`sourceColumnId`と`targetColumnId`からマッピングを構築
  - **型定義**: `lib/generated/api-types.ts`から`ERDiagramIndex`、`EntityNodeViewModel`、`RelationshipEdgeViewModel`をインポート

### バックエンド: GetInitialViewModelUsecaseの修正

- [ ] **ファイル修正**: `/lib/usecases/GetInitialViewModelUsecase.ts`
  - 空の`ERDiagramViewModel`を生成する際に、空のインデックスを追加
  - **修正内容**:
    ```typescript
    const erDiagram: ERDiagramViewModel = {
      nodes: {},
      edges: {},
      rectangles: {},
      texts: {},
      index: {  // 追加
        entityToEdges: {},
        columnToEntity: {},
        columnToEdges: {},
      },
      ui: erDiagramUIState,
      loading: false,
    };
    ```
  - **参考**: 仕様書 [spec/viewmodel_based_api.md](/spec/viewmodel_based_api.md) の「GET /api/init」セクション

### バックエンド: ReverseEngineerUsecaseの修正

- [ ] **ファイル修正**: `/lib/usecases/ReverseEngineerUsecase.ts`
  - `buildERDiagramIndex`をインポート
  - `nodes`と`edges`を生成した後、`buildERDiagramIndex`を呼び出して`index`を計算
  - **修正箇所**: ViewModelを返却する直前（現在は199行目付近）
  - **修正内容**:
    ```typescript
    // 逆引きインデックスを計算
    const index = buildERDiagramIndex(nodes, edges);
    
    // ViewModelを更新して返却
    return {
      format: viewModel.format,
      version: viewModel.version,
      erDiagram: {
        nodes,
        edges,
        rectangles: viewModel.erDiagram.rectangles,
        texts: viewModel.erDiagram.texts,
        index,  // 追加
        ui: { ... },
        loading: false,
      },
      ...
    };
    ```
  - **参考**: 仕様書 [spec/viewmodel_based_api.md](/spec/viewmodel_based_api.md) の「ReverseEngineerUsecase」セクション

### バックエンド: テストコード作成

- [ ] **ファイル作成**: `/tests/utils/buildERDiagramIndex.test.ts`
  - `buildERDiagramIndex`関数の単体テスト
  - **テストケース**:
    - 空のnodes/edgesで空のインデックスを返すこと
    - 1つのエンティティと1つのエッジで正しくインデックスを構築すること
    - 複数のエンティティと複数のエッジで正しくインデックスを構築すること
    - カラムが複数のエッジに接続されている場合、`columnToEdges`に複数のエッジIDが含まれること
    - エンティティが複数のエッジに接続されている場合、`entityToEdges`に複数のエッジIDが含まれること

- [ ] **ファイル修正**: `/tests/usecases/GetInitialViewModelUsecase.test.ts`
  - 空のインデックスが含まれていることを検証するアサーションを追加
  - **修正内容**: `expect(result.erDiagram.index).toEqual({ entityToEdges: {}, columnToEntity: {}, columnToEdges: {} })`

- [ ] **ファイル修正**: `/tests/usecases/ReverseEngineerUsecase.test.ts`
  - 計算されたインデックスが正しいことを検証するアサーションを追加
  - **修正内容**: 
    - `result.erDiagram.index.entityToEdges`が正しく構築されていることを確認
    - `result.erDiagram.index.columnToEntity`が正しく構築されていることを確認
    - `result.erDiagram.index.columnToEdges`が正しく構築されていることを確認

### バックエンド: ビルドとテストの確認

- [ ] **型生成の実行**: `npm run generate`
  - `lib/generated/api-types.ts`に`ERDiagramIndex`型が含まれることを確認（既に生成済み）

- [ ] **ビルド確認**: `npm run build` または TypeScriptコンパイル
  - エラーなくビルドできることを確認

- [ ] **テスト実行**: `npm run test`
  - 新規・修正したテストがすべてパスすることを確認

---

## フェーズ2: フロントエンド実装（ビルド・テスト含む）

### フロントエンド: ホバーアクションの修正

- [ ] **ファイル修正**: `/public/src/actions/hoverActions.ts`
  - `actionHoverEntity`を修正
    - **現在の実装**: `Object.entries(viewModel.erDiagram.edges)`で全エッジを線形探索（27-37行目）
    - **修正内容**: `viewModel.erDiagram.index.entityToEdges[entityId]`を使用して接続エッジを取得
    - **参考**: 仕様書 [spec/frontend_state_management.md](/spec/frontend_state_management.md) の「actionHoverEntity」セクション
    - **実装例**:
      ```typescript
      // インデックスから接続エッジIDのリストを取得
      const connectedEdgeIds = viewModel.erDiagram.index.entityToEdges[entityId] || [];
      
      // 各エッジIDからエッジを取得
      for (const edgeId of connectedEdgeIds) {
        const edge = viewModel.erDiagram.edges[edgeId];
        if (edge) {
          highlightedEdgeIds.add(edgeId);
          highlightedNodeIds.add(edge.sourceEntityId);
          highlightedNodeIds.add(edge.targetEntityId);
          highlightedColumnIds.add(edge.sourceColumnId);
          highlightedColumnIds.add(edge.targetColumnId);
        }
      }
      ```

  - `actionHoverColumn`を修正
    - **現在の実装**: `Object.entries(viewModel.erDiagram.nodes)`で全ノードを線形探索してカラムの所属エンティティを検索（122-128行目）、`Object.entries(viewModel.erDiagram.edges)`で全エッジを線形探索（136-146行目）
    - **修正内容**: 
      - `viewModel.erDiagram.index.columnToEntity[columnId]`で所属エンティティを取得
      - `viewModel.erDiagram.index.columnToEdges[columnId]`で接続エッジを取得
    - **参考**: 仕様書 [spec/frontend_state_management.md](/spec/frontend_state_management.md) の「actionHoverColumn」セクション
    - **実装例**:
      ```typescript
      // インデックスから所属エンティティを取得
      const ownerEntityId = viewModel.erDiagram.index.columnToEntity[columnId];
      
      if (!ownerEntityId) {
        console.warn(`Column owner not found: ${columnId}`);
        return viewModel;
      }
      
      highlightedNodeIds.add(ownerEntityId);
      
      // インデックスから接続エッジIDのリストを取得
      const connectedEdgeIds = viewModel.erDiagram.index.columnToEdges[columnId] || [];
      
      // 各エッジIDからエッジを取得
      for (const edgeId of connectedEdgeIds) {
        const edge = viewModel.erDiagram.edges[edgeId];
        if (edge) {
          highlightedEdgeIds.add(edgeId);
          highlightedNodeIds.add(edge.sourceEntityId);
          highlightedNodeIds.add(edge.targetEntityId);
          highlightedColumnIds.add(edge.sourceColumnId);
          highlightedColumnIds.add(edge.targetColumnId);
        }
      }
      ```

  - **注意**: `actionHoverEdge`は既にO(1)の検索を行っているため修正不要（仕様書で確認済み）

### フロントエンド: インポート機能の修正

- [ ] **ファイル作成**: `/public/src/utils/buildERDiagramIndex.ts`
  - バックエンドの`buildERDiagramIndex`と同じロジックをフロントエンド用に実装
  - **理由**: インポート時にフロントエンドでインデックスを再計算する必要があるため
  - **実装内容**: バックエンドの`/lib/utils/buildERDiagramIndex.ts`と同じロジック
  - **型定義**: `public/src/api/client`から`ERDiagramIndex`、`EntityNodeViewModel`、`RelationshipEdgeViewModel`をインポート

- [ ] **ファイル修正**: `/public/src/utils/importViewModel.ts`
  - `buildERDiagramIndex`をインポート
  - インポートしたViewModelの`nodes`と`edges`から`index`を再計算
  - **修正箇所**: `resolve(viewModel)`の直前（現在は106行目）
  - **修正内容**:
    ```typescript
    // インデックスを再計算
    const index = buildERDiagramIndex(
      importedViewModel.erDiagram?.nodes || {},
      importedViewModel.erDiagram?.edges || {}
    );
    
    // 一時UI状態とキャッシュを補完したViewModelを作成
    const viewModel: ViewModel = {
      format: importedViewModel.format,
      version: importedViewModel.version,
      erDiagram: {
        nodes: importedViewModel.erDiagram?.nodes || {},
        edges: importedViewModel.erDiagram?.edges || {},
        rectangles: importedViewModel.erDiagram?.rectangles || {},
        texts: importedViewModel.erDiagram?.texts || {},
        index,  // 追加
        ui: { ... },
        loading: false,
      },
      ...
    };
    ```
  - **参考**: 仕様書 [spec/import_export_feature.md](/spec/import_export_feature.md) の「インポート時の処理」セクション

- [ ] **ファイル修正**: `/public/src/utils/exportViewModel.ts`
  - エクスポート時にインデックスを保持するように修正（現在は保持されていない可能性があるため確認）
  - **修正内容**: 
    ```typescript
    const exportData: ViewModel = {
      format: viewModel.format,
      version: viewModel.version,
      erDiagram: {
        nodes: viewModel.erDiagram.nodes,
        edges: viewModel.erDiagram.edges,
        rectangles: viewModel.erDiagram.rectangles,
        texts: viewModel.erDiagram.texts,
        index: viewModel.erDiagram.index,  // 追加（インポート時に再計算されるが保持する）
        ui: { ... },
        loading: false,
      },
      ...
    };
    ```
  - **注意**: 仕様書によると、インデックスはファイルに含まれていても無視され、インポート時に常に再計算される

### フロントエンド: テストコード修正

- [ ] **ファイル修正**: `/public/tests/actions/hoverActions.test.ts`
  - テスト用の`createMockViewModel`に`index`フィールドを追加
  - **修正内容**: 
    ```typescript
    const createMockViewModel = (): ViewModel => ({
      erDiagram: {
        nodes: { ... },
        edges: { ... },
        rectangles: {},
        texts: {},
        index: {  // 追加
          entityToEdges: {
            'entity-1': ['edge-1'],
            'entity-2': ['edge-1'],
          },
          columnToEntity: {
            'col-1': 'entity-1',
            'col-2': 'entity-1',
            'col-3': 'entity-2',
            'col-4': 'entity-2',
          },
          columnToEdges: {
            'col-1': ['edge-1'],
            'col-4': ['edge-1'],
          },
        },
        ui: { ... },
        loading: false,
      },
      ...
    });
    ```
  - **既存のテストケースが引き続きパスすることを確認**

- [ ] **ファイル作成**: `/public/tests/utils/buildERDiagramIndex.test.ts`
  - フロントエンドの`buildERDiagramIndex`関数の単体テスト
  - **テストケース**: バックエンドのテストケースと同様

### フロントエンド: ビルドの確認

- [ ] **ビルド確認**: `cd public && npm run build`
  - エラーなくビルドできることを確認

- [ ] **テスト実行**: `cd public && npm run test`
  - 新規・修正したテストがすべてパスすることを確認

---

## 事前修正提案

なし。型定義は既に生成されており、実装に進むことができます。

---

## 指示者宛ての懸念事項（作業対象外）

### 仕様の矛盾・実現不可能な点

**確認した結果、仕様の矛盾や実現不可能な点はありませんでした。**

### 確認事項

1. **インデックスの一貫性**: インデックスは`nodes`/`edges`の変更時に必ず再計算する必要があります。今回の実装では以下のタイミングで再計算されます：
   - リバースエンジニア実行時（バックエンド）
   - インポート時（フロントエンド）
   - 将来的にエンティティ/エッジの追加・削除機能を実装する際は、その都度インデックスを再計算する必要があります

2. **パフォーマンステスト**: 実際に大規模ER図（100テーブル、500リレーション）でパフォーマンス改善を確認することを推奨します（MVPフェーズでは不要ですが、将来的に確認すると良いでしょう）

3. **既存テストへの影響**: ホバーアクションのテストは、インデックスが正しく構築されている前提で動作するため、モックデータの`index`フィールドを正確に設定する必要があります
