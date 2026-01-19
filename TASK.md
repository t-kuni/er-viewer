# タスク一覧: リレーション描画バグの修正

## バグの概要

リバースエンジニア実行後、リレーションの線が描画されない。

### 原因

`viewModelConverter.ts` の `buildERDiagramViewModel()` 関数で、`relationship.from` と `relationship.to`（テーブル名）を直接 `source` と `target` に設定しているため、エンティティIDへの変換が行われていない。React Flowはエッジの接続先をエンティティID（UUID）で識別するため、テーブル名では接続先ノードを見つけられず、線が描画されない。

### 対応方針

仕様書（`scheme/main.tsp`）を更新済み。以下の構造体にid(UUID)フィールドを追加し、RelationshipにfromId/toIdフィールドを追加した：
- Column
- ForeignKey  
- Relationship

バックエンドでこれらのIDを採番し、フロントエンドでfromId/toIdを使用することで、テーブル名からエンティティIDへの変換処理を不要にする。

---

## 実装タスク

### - [ ] コード生成の実行

TypeSpecから型定義とOpenAPIスキーマを生成する。

**コマンド:**
```bash
npm run generate
```

**理由:** 仕様書（`scheme/main.tsp`）を更新したため、型定義を再生成する必要がある。

---

### - [ ] `lib/database.ts` の修正

`DatabaseManager` クラスの以下のメソッドを修正する。

#### `getTableColumns()` メソッド

**変更内容:**
- 各Columnにid（UUID）を追加する
- `crypto.randomUUID()` を使用してIDを生成

**修正箇所:** 71-85行目

**修正前:**
```typescript
return (rows as any[]).map((row) => ({
  name: row.Field,
  type: row.Type,
  nullable: row.Null === 'YES',
  key: row.Key,
  default: row.Default,
  extra: row.Extra,
}));
```

**修正後:**
```typescript
return (rows as any[]).map((row) => ({
  id: crypto.randomUUID(),
  name: row.Field,
  type: row.Type,
  nullable: row.Null === 'YES',
  key: row.Key,
  default: row.Default,
  extra: row.Extra,
}));
```

#### `getForeignKeys()` メソッド

**変更内容:**
- 各ForeignKeyにid（UUID）を追加する
- `crypto.randomUUID()` を使用してIDを生成

**修正箇所:** 87-113行目

**修正前:**
```typescript
return (rows as any[]).map((row) => ({
  column: row.COLUMN_NAME,
  referencedTable: row.REFERENCED_TABLE_NAME,
  referencedColumn: row.REFERENCED_COLUMN_NAME,
  constraintName: row.CONSTRAINT_NAME,
}));
```

**修正後:**
```typescript
return (rows as any[]).map((row) => ({
  id: crypto.randomUUID(),
  column: row.COLUMN_NAME,
  referencedTable: row.REFERENCED_TABLE_NAME,
  referencedColumn: row.REFERENCED_COLUMN_NAME,
  constraintName: row.CONSTRAINT_NAME,
}));
```

#### `generateERData()` メソッド

**変更内容:**
1. テーブル名→エンティティIDのマップを作成する
2. Relationshipにid, fromId, toIdを設定する
3. 二段階処理に変更：先に全エンティティを生成してマップを作成し、その後リレーションシップを生成する

**修正箇所:** 124-156行目

**修正後の実装イメージ:**
```typescript
async generateERData(): Promise<ERData> {
  const tables = await this.getTables();
  const erData: ERData = {
    entities: [],
    relationships: [],
  };

  // テーブル名→エンティティIDのマップを作成
  const tableNameToIdMap = new Map<string, string>();

  // 第1段階: 全エンティティを生成してマップを構築
  for (const tableName of tables) {
    const columns = await this.getTableColumns(tableName);
    const foreignKeys = await this.getForeignKeys(tableName);
    const ddl = await this.getTableDDL(tableName);

    const entityId = crypto.randomUUID();
    tableNameToIdMap.set(tableName, entityId);

    erData.entities.push({
      id: entityId,
      name: tableName,
      columns: columns,
      foreignKeys: foreignKeys,
      ddl: ddl,
    });
  }

  // 第2段階: リレーションシップを生成（エンティティIDを参照可能）
  for (const entity of erData.entities) {
    const tableName = entity.name;
    for (const fk of entity.foreignKeys) {
      const fromId = tableNameToIdMap.get(tableName);
      const toId = tableNameToIdMap.get(fk.referencedTable);
      
      if (!fromId || !toId) {
        console.warn(`Entity ID not found for relationship: ${tableName} -> ${fk.referencedTable}`);
        continue;
      }

      erData.relationships.push({
        id: crypto.randomUUID(),
        from: tableName,
        fromId: fromId,
        fromColumn: fk.column,
        to: fk.referencedTable,
        toId: toId,
        toColumn: fk.referencedColumn,
        constraintName: fk.constraintName,
      });
    }
  }

  return erData;
}
```

**注意点:**
- `getTableColumns()` と `getForeignKeys()` が既にIDを付与するように修正されているため、ここでは追加のID付与は不要
- エンティティIDのマップを使ってfromId/toIdを設定することで、テーブル名とエンティティIDの対応関係を正しく保つ

---

### - [ ] `public/src/utils/viewModelConverter.ts` の修正

`buildERDiagramViewModel()` 関数のエッジ生成ロジックを修正する。

**変更内容:**
- `relationship.from`/`to`（テーブル名）の代わりに`relationship.fromId`/`toId`（エンティティID）を使用する
- エッジIDも`relationship.id`を使用する

**修正箇所:** 41-62行目

**修正前:**
```typescript
// RelationshipEdgeViewModelのRecord形式を構築
const edges: { [key: string]: RelationshipEdgeViewModel } = {};

for (const relationship of erData.relationships) {
  // エッジIDは一意になるよう、関係性の情報から生成
  const edgeId = `${relationship.from}_${relationship.fromColumn}_to_${relationship.to}_${relationship.toColumn}`;
  
  edges[edgeId] = {
    id: edgeId,
    source: relationship.from,
    target: relationship.to,
    fromColumn: relationship.fromColumn,
    toColumn: relationship.toColumn,
    constraintName: relationship.constraintName,
  };
}
```

**修正後:**
```typescript
// RelationshipEdgeViewModelのRecord形式を構築
const edges: { [key: string]: RelationshipEdgeViewModel } = {};

for (const relationship of erData.relationships) {
  edges[relationship.id] = {
    id: relationship.id,
    source: relationship.fromId,
    target: relationship.toId,
    fromColumn: relationship.fromColumn,
    toColumn: relationship.toColumn,
    constraintName: relationship.constraintName,
  };
}
```

**重要:** この修正により、React FlowがエッジのsourceとtargetをエンティティIDで正しく解決できるようになり、リレーションの線が描画される。

---

## テストタスク

### - [ ] `tests/usecases/ReverseEngineerUsecase.test.ts` の更新

既存のテストに新しいフィールドの検証を追加する。

**変更内容:**
- Column, ForeignKey, Relationshipのidフィールドが存在することを検証
- RelationshipのfromId, toIdフィールドが存在し、正しいエンティティIDを参照していることを検証

**修正箇所:** 25-72行目の `'ERDataとLayoutDataを返す（正常系）'` テスト

**追加する検証コード:**
```typescript
// Columnにidが存在することを確認
const firstColumn = usersTable!.columns[0];
expect(firstColumn.id).toBeDefined();
expect(typeof firstColumn.id).toBe('string');

// ForeignKeyにidが存在することを確認（もしFKがあれば）
if (usersTable!.foreignKeys.length > 0) {
  const firstFK = usersTable!.foreignKeys[0];
  expect(firstFK.id).toBeDefined();
  expect(typeof firstFK.id).toBe('string');
}

// Relationshipにid, fromId, toIdが存在することを確認
if (result.erData.relationships.length > 0) {
  const firstRelationship = result.erData.relationships[0];
  expect(firstRelationship.id).toBeDefined();
  expect(typeof firstRelationship.id).toBe('string');
  expect(firstRelationship.fromId).toBeDefined();
  expect(typeof firstRelationship.fromId).toBe('string');
  expect(firstRelationship.toId).toBeDefined();
  expect(typeof firstRelationship.toId).toBe('string');
  
  // fromId/toIdが実際のエンティティIDと一致することを確認
  const fromEntity = result.erData.entities.find(e => e.id === firstRelationship.fromId);
  expect(fromEntity).toBeDefined();
  expect(fromEntity!.name).toBe(firstRelationship.from);
  
  const toEntity = result.erData.entities.find(e => e.id === firstRelationship.toId);
  expect(toEntity).toBeDefined();
  expect(toEntity!.name).toBe(firstRelationship.to);
}
```

---

## 確認タスク

### - [ ] ビルドの確認

TypeScriptのコンパイルが成功することを確認する。

**コマンド:**
```bash
npm run build
```

**確認内容:**
- ビルドエラーが発生しないこと
- 型エラーが発生しないこと

---

### - [ ] テストの実行

すべてのテストが成功することを確認する。

**コマンド:**
```bash
npm run test
```

**確認内容:**
- 既存のテストが全て成功すること
- 新しく追加した検証が成功すること

---

## 指示者宛ての懸念事項（作業対象外）

なし。

---

## 事前修正提案

なし。

---

## 補足情報

### 仕様書

- [scheme/main.tsp](/home/kuni/Documents/er-viewer/scheme/main.tsp) - API型定義（更新済み）
- [spec/reverse_engineering.md](/home/kuni/Documents/er-viewer/spec/reverse_engineering.md) - リバースエンジニアリング仕様（必要に応じて参照）

### バグの技術的詳細

1. **問題の発生箇所:**
   - `public/src/utils/viewModelConverter.ts` の `buildERDiagramViewModel()` 関数

2. **問題の内容:**
   - `relationship.from` と `relationship.to` はテーブル名（例: "users", "posts"）
   - これを `source` と `target` に直接設定していた
   - React Flow の edge は `source`/`target` にノードのID（UUID）が必要
   - テーブル名とノードIDが一致しないため、React Flowがエッジの接続先を見つけられず、線が描画されなかった

3. **修正方針:**
   - バックエンドで Relationship に `fromId`/`toId` フィールドを追加し、エンティティIDを設定
   - フロントエンドで `relationship.fromId`/`toId` を使用することで、テーブル名→エンティティID変換処理を不要にする
   - より明示的で保守性の高い実装になる

4. **修正後の動作:**
   - React Flow が正しいエンティティIDでノードを接続
   - リレーションの線が正しく描画される
