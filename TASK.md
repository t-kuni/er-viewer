## stateレベル位置情報重複の根本修正 🔧

### 背景
現在のERViewerApplicationで位置情報が重複管理されている：

1. **stateレベルの重複**: 
   - `state.erData.entities[].position` - 既存エンティティに設定される
   - `state.layoutData.entities[entityName].position` - 同じ位置情報が別構造で保存
2. **ファイルレベルの重複**: 
   - `er-data.json`内の各エンティティに`position: { x: 50, y: 50 }`
   - `layout-data.json`の`entities`オブジェクト（現在は空）
3. **実装上の問題**: `getEntityPosition()`で`layoutData`を優先使用するため、`erData.entities[].position`は無駄

### 修正方針

#### 位置情報の単一管理への統一
- **Entity型**: `position`プロパティを削除
- **layoutData.entities**: 位置情報の唯一の管理場所
- **stateとファイル**: 位置情報重複の完全排除

### 修正タスク

#### Phase 1: TypeScript型定義修正
- [ ] **types/index.ts修正**
  - [ ] `Entity`インターフェースから`position?: Position`プロパティを削除
  - [ ] 型定義の整合性確認

#### Phase 2: フロントエンド修正（ERViewerApplication）
- [ ] **位置情報設定処理の修正**
  - [ ] `reverseEngineering()`メソッド内の`entity.position`設定処理を削除
  - [ ] 既存エンティティの位置情報は`layoutData.entities`のみで管理するよう修正
  - [ ] 新規エンティティの位置情報は`clusteredPositions`で管理し、最終的に`layoutData.entities`に反映

- [ ] **位置取得処理の確認**
  - [ ] `getEntityPosition()`メソッドが`layoutData.entities`のみを参照することを確認
  - [ ] `clusteredPositions`から`layoutData.entities`への反映処理の確認

- [ ] **位置更新処理の強化**
  - [ ] エンティティドラッグ時の`layoutData.entities`更新処理の確認・実装
  - [ ] `updateEntityPosition()`メソッドの実装（存在しない場合は新規作成）

#### Phase 3: バックエンド修正（lib/storage.js）
- [ ] **データ保存処理の修正**
  - [ ] `saveERData()`メソッド内でposition情報を除去する処理を追加
  - [ ] `mergeERDataWithLayout()`メソッドの修正（positionマージ処理を削除）

#### Phase 4: 既存データのクリーンアップ
- [ ] **ファイルデータの修正**
  - [ ] 既存の`./data/er-data.json`からposition情報を削除
  - [ ] `./data/layout-data.json`のentitiesオブジェクトに実際の位置情報を設定

#### Phase 5: テスト修正
- [ ] **テストコードの修正**
  - [ ] Entity型のposition削除に伴うテストデータの修正
  - [ ] 位置情報関連のテストケースの見直し・修正
  - [ ] `npm test`でエラーが出ないことを確認

#### Phase 6: 統合テスト
- [ ] **機能テスト**
  - [ ] リバースエンジニアリング機能のテスト
  - [ ] エンティティドラッグによる位置変更テスト
  - [ ] 保存・読み込み処理のテスト
  - [ ] 増分リバース時の位置情報保持テスト

- [ ] **品質確認**
  - [ ] `npm run typecheck`の実行・エラー修正
  - [ ] `npm test`の実行・エラー修正
  - [ ] データファイルの内容確認

### 具体的な修正内容

#### types/index.ts
```typescript
// 修正前
export interface Entity {
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  ddl: string;
  position?: Position;  // ←削除
}

// 修正後
export interface Entity {
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  ddl: string;
  // position プロパティ削除
}
```

#### ERViewerApplication修正箇所
```typescript
// reverseEngineering()メソッド内
erData.entities.forEach((entity) => {
  const existingLayout = currentLayout.entities[entity.name];
  if (currentEntities.has(entity.name) && existingLayout) {
    // entity.position = existingLayout.position; ←削除
    newLayoutData.entities[entity.name] = existingLayout;
  } else {
    // delete entity.position; ←不要（positionプロパティが存在しないため）
    this.state.clusteredPositions.set(entity.name, position);
  }
});
```

### 期待される結果

**修正後のer-data.json**:
```json
{
  "entities": [
    {
      "name": "users",
      "columns": [...],
      "foreignKeys": [...],
      "ddl": "..."
      // position プロパティなし
    }
  ]
}
```

**修正後のlayout-data.json**:
```json
{
  "entities": {
    "users": { "position": { "x": 120, "y": 80 } },
    "posts": { "position": { "x": 350, "y": 200 } }
  },
  "rectangles": [],
  "texts": [],
  "layers": [...]
}
```

### 完了条件
1. Entity型にpositionプロパティが存在しない
2. stateレベルで位置情報の重複がない
3. er-data.jsonにposition情報が含まれない
4. layout-data.jsonのentitiesに実際の位置情報が保存される
5. エンティティドラッグ操作が正常に動作する
6. 保存・読み込み処理が正常に動作する
7. 増分リバース時に位置情報が正しく保持される
8. 全テストがパスする
9. TypeScriptエラーがない

**優先度**: 高  
**推定工数**: 3-4時間  
**依存関係**: この修正は他の機能実装よりも優先して実施すべき

---

## 備考

このタスクリストは、SPEC.mdの要件と2025-07-03時点の実装状況を比較して作成しました。
各項目は動作確認後、実装されていれば✅に、未実装・不具合があれば修正作業を行ってください。

データファイル分割の不整合修正は、データの整合性とアプリケーションの安定性に関わる重要な修正です。