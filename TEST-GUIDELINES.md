# ER Viewer テストコーディングガイドライン

## 概要

本ドキュメントは、ER Viewerプロジェクトのテストコードを記述する際の標準的なガイドラインです。テストの可読性、保守性、信頼性を確保するため、以下のルールに従ってテストを記述してください。

## 1. AAAパターンの厳守

すべてのテストケースは、**AAA（Arrange-Act-Assert）パターン**に従って記述します。各セクションはコメントで明確に区切り、論理的な流れを保ちます。

### 1.1 基本構造

```typescript
test('エンティティがクリックされると詳細が表示される', () => {
  // Arrange - テストの準備
  const infrastructure = new InfrastructureMock();
  const mockERData = createUserPostERData();
  const mockData: MockData = {
    networkResponses: {
      '/api/er-data': createNetworkResponse({ data: mockERData })
    }
  };
  infrastructure.setupMockData(mockData);
  const app = new ERViewerApplication(infrastructure);
  
  // Act - テスト対象の操作を実行
  app.handleEntityClick('users');
  
  // Assert - 結果を検証
  expect(infrastructure.dom.setAttribute).toHaveBeenCalledWith(
    'sidebar', 
    'data-visible', 
    'true'
  );
  expect(infrastructure.dom.setTextContent).toHaveBeenCalledWith(
    'current-table', 
    'users'
  );
});
```

### 1.2 各セクションの役割

- **Arrange**: テストに必要なオブジェクトの作成、モックの設定、初期状態の構築
- **Act**: テスト対象のメソッドを1つだけ呼び出す（複数の操作が必要な場合は別々のテストに分割）
- **Assert**: Infrastructure Mockの呼び出しを検証（状態ではなく振る舞いを検証）

## 2. 可読性優先の原則

### 2.1 DRY原則よりも可読性を重視

テストコードでは、プロダクションコードとは異なり、**DRY（Don't Repeat Yourself）原則よりも可読性を優先**します。

#### 良い例：リテラル値を直接使用
```typescript
test('キャンバスが正しく初期化される', () => {
  // Arrange
  const infrastructure = new InfrastructureMock();
  const app = new ERViewerApplication(infrastructure);
  
  // Act
  // （コンストラクタで初期化が実行される）
  
  // Assert
  const canvas = infrastructure.dom.getElementById('er-canvas') as unknown as MockElement;
  expect(canvas.getAttribute('width')).toBe('800');  // リテラル値を直接使用
  expect(canvas.getAttribute('height')).toBe('600'); // 定数化しない
});
```

#### 悪い例：過度な共通化
```typescript
// ❌ 避けるべきパターン
const DEFAULT_CANVAS_WIDTH = '800';
const DEFAULT_CANVAS_HEIGHT = '600';

test('キャンバスが正しく初期化される', () => {
  // ... 
  expect(canvas.getAttribute('width')).toBe(DEFAULT_CANVAS_WIDTH);
  expect(canvas.getAttribute('height')).toBe(DEFAULT_CANVAS_HEIGHT);
});
```

### 2.2 テストケースの独立性

各テストケースは完全に独立して読めるように記述します。他のテストやヘルパーメソッドを参照しなくても理解できるようにします。

```typescript
test('エンティティにpositionがない場合、自動的にクラスタリングされる', () => {
  // Arrange - すべての必要なデータをテスト内で定義
  const infrastructure = new InfrastructureMock();
  const mockERData = createERData({
    entities: [
      createEntity({ name: 'users', columns: [{ name: 'id', type: 'int', key: 'PRI' }] }),
      createEntity({ name: 'posts', columns: [{ name: 'id', type: 'int', key: 'PRI' }] }),
      createEntity({ name: 'comments', columns: [{ name: 'id', type: 'int', key: 'PRI' }] }),
    ],
    layout: {
      entities: {}, // positionを持たない
      rectangles: [],
      texts: [],
      layers: []
    }
  });
  
  // ... 以下省略
});
```

## 3. 制御構造の排除

### 3.1 if/for/switch文の使用禁止

テストコード内では、**if文、for文、switch文などの制御構造を使用しません**。これにより、テストの流れが直線的になり、理解しやすくなります。

#### 悪い例：制御構造を使用
```typescript
// ❌ 避けるべきパターン
test('複数のエンティティが正しく描画される', () => {
  const entities = ['users', 'posts', 'comments'];
  
  for (const entity of entities) {
    if (entity === 'users') {
      expect(getEntityPosition(entity)).toEqual({ x: 50, y: 50 });
    } else if (entity === 'posts') {
      expect(getEntityPosition(entity)).toEqual({ x: 300, y: 50 });
    }
  }
});
```

#### 良い例：明示的な検証
```typescript
// ✅ 推奨パターン
test('複数のエンティティが正しくクラスタリングされる', () => {
  // Arrange
  const infrastructure = new InfrastructureMock();
  const app = new ERViewerApplication(infrastructure) as any;
  // ... セットアップ
  
  // Act
  app.render();
  
  // Assert - 各エンティティを明示的に検証
  expect(app.state.clusteredPositions.get('users')).toEqual({ x: 50, y: 50 });
  expect(app.state.clusteredPositions.get('posts')).toEqual({ x: 300, y: 50 });
  expect(app.state.clusteredPositions.get('comments')).toEqual({ x: 50, y: 250 });
});
```

### 3.2 配列操作の代替手法

配列に対する検証が必要な場合は、個別の要素を明示的に検証します。

```typescript
test('リレーションシップが正しく描画される', () => {
  // Arrange & Act は省略
  
  // Assert - 配列の要素を個別に検証
  const dynamicLayer = infrastructure.dom.getElementById('dynamic-layer') as unknown as MockElement;
  expect(dynamicLayer.children.length).toBe(3);
  
  // 各要素を明示的に検証
  const relationshipGroup = dynamicLayer.children[0] as MockElement;
  expect(relationshipGroup.getAttribute('class')).toBe('relationships');
  
  const userEntity = dynamicLayer.children[1] as MockElement;
  expect(userEntity.getAttribute('data-table-name')).toBe('users');
  
  const postEntity = dynamicLayer.children[2] as MockElement;
  expect(postEntity.getAttribute('data-table-name')).toBe('posts');
});
```

## 4. Infrastructure Mock検証中心のテスト設計

### 4.1 状態検証よりも振る舞い検証

テストでは、アプリケーションの内部状態（`app.state`）の検証は最小限に留め、**Infrastructure Mockへの呼び出しを検証**することに重点を置きます。

#### 良い例：Mock呼び出しの検証
```typescript
test('サイドバーの表示/非表示切り替え', () => {
  // Arrange
  const infrastructure = new InfrastructureMock();
  const app = new ERViewerApplication(infrastructure);
  
  // Act
  app.toggleSidebar();
  
  // Assert - DOM操作の呼び出しを検証
  expect(infrastructure.dom.setAttribute).toHaveBeenCalledWith(
    'sidebar',
    'data-visible',
    'true'
  );
  expect(infrastructure.dom.setAttribute).toHaveBeenCalledTimes(1);
});
```

#### 避けるべき例：内部状態の検証
```typescript
// ❌ 内部状態の検証は避ける
test('サイドバーの状態管理', () => {
  // ...
  expect(app.state.sidebar.visible).toBe(true); // 内部状態の直接検証は避ける
});
```

### 4.2 Mock検証の詳細度

Infrastructure Mockの呼び出しを検証する際は、以下の点を確認します：

1. **メソッドが呼ばれたか**（`toHaveBeenCalled`）
2. **正しい引数で呼ばれたか**（`toHaveBeenCalledWith`）
3. **適切な回数呼ばれたか**（`toHaveBeenCalledTimes`）
4. **呼び出し順序が正しいか**（必要に応じて）

```typescript
test('エンティティ詳細表示の完全な動作検証', () => {
  // Arrange
  const infrastructure = new InfrastructureMock();
  const app = new ERViewerApplication(infrastructure);
  
  // Act
  app.showEntityDetails('users');
  
  // Assert - 複数の呼び出しを順番に検証
  const calls = infrastructure.dom.setAttribute.mock.calls;
  
  // サイドバーの表示
  expect(calls[0]).toEqual(['sidebar', 'data-visible', 'true']);
  
  // 選択状態の更新
  expect(calls[1]).toEqual(['entity-users', 'data-selected', 'true']);
  
  // 呼び出し回数の検証
  expect(infrastructure.dom.setAttribute).toHaveBeenCalledTimes(2);
});
```

## 5. 実践的なテストパターン

### 5.1 非同期処理のテスト

非同期処理をテストする場合は、`Promise`と`setTimeout`を使用して適切に待機します。

```typescript
test('初期データがロードされる', async () => {
  // Arrange
  const infrastructure = new InfrastructureMock();
  const mockERData = createUserPostERData();
  infrastructure.setupMockData({
    networkResponses: {
      '/api/er-data': createNetworkResponse({ data: mockERData })
    }
  });
  
  // Act
  const app = new ERViewerApplication(infrastructure);
  await new Promise((resolve) => setTimeout(resolve, 0)); // 非同期処理を待つ
  
  // Assert
  expect(infrastructure.network.fetch).toHaveBeenCalledWith('/api/er-data');
  expect(infrastructure.dom.createElement).toHaveBeenCalledWith('g');
});
```

### 5.2 エラーケースのテスト

エラーケースも同様にAAAパターンで記述し、Mock検証を中心に行います。

```typescript
test('ネットワークエラー時にエラーメッセージが表示される', async () => {
  // Arrange
  const infrastructure = new InfrastructureMock();
  infrastructure.setupMockData({
    networkResponses: {
      '/api/er-data': createErrorResponse('Network Error', 500)
    }
  });
  
  // Act
  const app = new ERViewerApplication(infrastructure);
  await new Promise((resolve) => setTimeout(resolve, 0));
  
  // Assert
  expect(infrastructure.dom.setTextContent).toHaveBeenCalledWith(
    'error-message',
    'データの読み込みに失敗しました: Network Error'
  );
  expect(infrastructure.dom.setAttribute).toHaveBeenCalledWith(
    'error-container',
    'data-visible',
    'true'
  );
});
```

## 6. アンチパターンとその改善

### 6.1 アンチパターン：過度なヘルパー関数

```typescript
// ❌ 避けるべきパターン
function setupAppWithData(data: ERData): ERViewerApplication {
  const infrastructure = new InfrastructureMock();
  infrastructure.setupMockData({
    networkResponses: { '/api/er-data': createNetworkResponse({ data }) }
  });
  return new ERViewerApplication(infrastructure);
}

test('テストケース', () => {
  const app = setupAppWithData(mockData); // テストの準備が隠蔽される
  // ...
});
```

### 6.2 改善例：明示的なセットアップ

```typescript
// ✅ 推奨パターン
test('テストケース', () => {
  // Arrange - すべての準備を明示的に記述
  const infrastructure = new InfrastructureMock();
  const mockERData = createUserPostERData();
  infrastructure.setupMockData({
    networkResponses: {
      '/api/er-data': createNetworkResponse({ data: mockERData })
    }
  });
  const app = new ERViewerApplication(infrastructure);
  
  // Act & Assert...
});
```

### 6.3 アンチパターン：複数の振る舞いを1つのテストで検証

```typescript
// ❌ 避けるべきパターン
test('エンティティの操作全般', () => {
  // 複数の操作と検証が混在
  app.selectEntity('users');
  expect(/*...*/);
  
  app.moveEntity('users', { x: 100, y: 100 });
  expect(/*...*/);
  
  app.deleteEntity('users');
  expect(/*...*/);
});
```

### 6.4 改善例：単一の振る舞いに焦点を当てる

```typescript
// ✅ 推奨パターン - それぞれ別のテストケースに分割
test('エンティティを選択すると選択状態になる', () => {
  // Arrange, Act, Assert for selecting entity
});

test('エンティティを移動すると新しい位置に表示される', () => {
  // Arrange, Act, Assert for moving entity
});

test('エンティティを削除するとDOMから削除される', () => {
  // Arrange, Act, Assert for deleting entity
});
```

## まとめ

このガイドラインに従うことで、以下の利点が得られます：

1. **高い可読性**: 各テストが独立して理解可能
2. **保守性の向上**: 変更の影響範囲が明確
3. **デバッグの容易さ**: 失敗時の原因特定が簡単
4. **一貫性**: チーム全体で統一されたテストスタイル

テストコードは「生きたドキュメント」です。実装の仕様を明確に示し、将来の開発者（自分自身を含む）への最良のガイドとなるよう、これらのルールに従って記述してください。