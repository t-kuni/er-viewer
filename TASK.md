# テストコード修正タスク一覧

## 修正が必要なテストファイルとルール違反箇所

### 1. data-management.test.ts

#### state検証違反（最優先修正）
- [ ] **行315-316**: `expect(app.state.drawingMode).toBe('rectangle');` → Mock検証に変更
- [ ] **行316-317**: `expect(app.state.isDrawing).toBe(false);` → Mock検証に変更  
- [ ] **行329-331**: `expect(app.state.drawingMode).toBe(null);` → Mock検証に変更
- [ ] **行369-375**: `expect(app.state.layoutData.rectangles).toHaveLength(1);` → Mock検証に変更

#### 制御構造・配列操作違反
- [ ] **行213**: `requests.find()` メソッドの使用 → 直接的なMock検証に変更
- [ ] **行302**: `requests.find()` メソッドの使用 → 直接的なMock検証に変更
- [ ] **行382**: `requests.find()` メソッドの使用 → 直接的なMock検証に変更
- [ ] **行484**: `requests.find()` メソッドの使用 → 直接的なMock検証に変更

#### AAAパターン違反
- [ ] **行94-99**: ActとAssertが混在（条件分岐処理） → 明確な分離

### 2. rendering.test.ts

#### 制御構造違反（大量）
- [ ] **行76-85**: forループを使用した配列操作 → 直接的なMock検証に変更
- [ ] **行197-216**: forループを使用した要素検索 → 直接的なMock検証に変更
- [ ] **行447-467**: forループと条件分岐の使用 → 直接的なMock検証に変更
- [ ] **行571-592**: forループを使用した要素検索 → 直接的なMock検証に変更
- [ ] **行722-743**: forループを使用した要素検索 → 直接的なMock検証に変更
- [ ] **行1002-1018**: forループを使用した配列操作 → 直接的なMock検証に変更

#### 配列操作違反
- [ ] **行91**: `allTexts.filter()` メソッドの使用 → 直接的なMock検証に変更
- [ ] **行1036-1049**: 数学的計算での配列要素アクセス → 直接的なMock検証に変更

### 3. ui-components.test.ts

#### state検証違反（最優先修正）
- [ ] **行315-317**: `expect(app.state.drawingMode).toBe('rectangle');` → Mock検証に変更
- [ ] **行329-331**: `expect(app.state.drawingMode).toBe(null);` → Mock検証に変更
- [ ] **行369-375**: `expect(app.state.layoutData.rectangles).toHaveLength(1);` → Mock検証に変更
- [ ] **行403-404**: `expect(app.state.layoutData.rectangles[0].color).toBe('#ff0000');` → Mock検証に変更
- [ ] **行438-444**: `expect(app.state.layoutData.rectangles[0]).toMatchObject({...});` → Mock検証に変更

### 4. user-interaction.test.ts

#### state検証違反（最優先修正）
- [ ] **行750-751**: `let state = app.getState();` および `expect(state.viewport.scale).toBe(1);` → Mock検証に変更
- [ ] **行772-775**: `state = app.getState();` および `expect(state.viewport.scale).toBeGreaterThan(1);` → Mock検証に変更
- [ ] **行1222-1231**: `expect(state.layoutData.texts).toHaveLength(1);` → Mock検証に変更

#### 制御構造違反
- [ ] **行887-899**: forループを使用（ズームアウトテスト） → 直接的なMock検証に変更
- [ ] **行905-917**: forループを使用（ズームインテスト） → 直接的なMock検証に変更

#### 配列操作違反
- [ ] **行447-457**: `createElementSpy.mock.calls.filter()` メソッドの使用 → 直接的なMock検証に変更

### 5. layer-drag-drop.test.ts

#### 制御構造・配列操作違反
- [ ] **行37-39**: `forEach`使用 → 直接的なMock検証に変更
- [ ] **行56-62**: `forEach`使用 → 直接的なMock検証に変更
- [ ] **行57**: `setAttributeCalls.find()` メソッドの使用 → 直接的なMock検証に変更
- [ ] **行180**: `dispatchEventSpy.mock.calls.find()` メソッドの使用 → 直接的なMock検証に変更

### 6. error-handling.test.ts

#### AAAパターン違反
- [ ] **行43-61**: テストメソッドをArrange部分で定義している → 適切な分離

## 修正の基本方針

### state検証 → Mock検証への変更例
```typescript
// 修正前（NG）
expect(app.state.drawingMode).toBe('rectangle');

// 修正後（OK）
expect(infrastructure.dom.setAttribute).toHaveBeenCalledWith(
  'drawing-mode-indicator',
  'data-mode', 
  'rectangle'
);
```

### 制御構造の排除例
```typescript
// 修正前（NG）
for (let i = 0; i < calls.length; i++) {
  if (calls[i][0] === 'target-id') {
    expect(calls[i][1]).toBe('expected-value');
  }
}

// 修正後（OK）
expect(infrastructure.dom.setAttribute).toHaveBeenCalledWith(
  'target-id',
  'attribute-name',
  'expected-value'
);
```

### 配列操作の排除例  
```typescript
// 修正前（NG）
const saveRequest = requests.find(req => req.url === '/api/layout');

// 修正後（OK）
expect(infrastructure.network.post).toHaveBeenCalledWith(
  '/api/layout',
  expect.any(Object)
);
```

## 修正優先度

1. **最優先**: state検証違反（全テストで17箇所）
2. **高優先**: 制御構造違反（全テストで20箇所以上）  
3. **中優先**: AAAパターン違反（2箇所）
4. **低優先**: 配列操作違反（複数箇所）

## 完了条件

- [ ] すべてのテストが`npm test`でパスする
- [ ] state検証が完全に排除されている
- [ ] 制御構造（for/if/forEach/map/filter/find）が排除されている
- [ ] AAAパターンが厳密に守られている
- [ ] Mock検証のみでテストが構成されている