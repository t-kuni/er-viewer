# タスク一覧

フェーズ3（フロントエンド更新）で発生した型エラーを修正するタスク一覧。

## 作業状況

**現在の状態**: 型生成の問題が発覚し、追加対応が必要

**完了したタスク**:
1. ✓ scheme/main.tspのenum型をalias型に変更
2. ✓ ReverseEngineeringHistoryEntry.typeフィールドをentryTypeに変更
3. ✓ reverse_engineering_history.mdのフィールド名を更新
4. ✓ 型生成の実行（`npm run generate`）
5. ✓ dataActions.tsのカラム変更検出ロジックを修正
6. ✓ dataActions.tsの履歴エントリ作成箇所を修正
7. ✓ clipboardActions.tsのnull使用箇所を修正
8. ✓ HistoryPanel.tsxのentry.type参照箇所を修正
9. ✓ HistoryPanel.tsxのformatColumnSnapshot関数を修正

**発覚した問題**:

openapi-typescript-codegenがTypeSpecのalias型をenum型として生成するため、文字列リテラルユニオン型として使用できない問題が発覚：

- `textAlign`などのalias型が`TextBox.textAlign`というenum型として生成される
- 文字列リテラル（例: `"left"`）をenum型のプロパティに直接割り当てられない
- `lib/generated/api-types.ts`（openapi-typescript生成）では正しく`"left" | "center" | "right"`として生成されている
- フロントエンドは`public/src/api/client`（openapi-typescript-codegen生成）を使用しているため、enum型になる

**必要な追加対応**:

以下のいずれかの対応が必要：

1. **フロントエンドで`lib/generated/api-types.ts`を使用する**（推奨）
   - `public/src/api/client`の代わりに`lib/generated/api-types.ts`から型をインポート
   - openapi-typescript-codegenの生成を停止
   - インポート文を全て書き換え

2. **フロントエンドコードをenum型に合わせて修正**
   - 文字列リテラル（`"left"`）をenum値（`TextBox.textAlign.LEFT`）に変更
   - 多数の箇所で修正が必要

3. **型生成プロセスにenum→文字列リテラルユニオン型変換の後処理を追加**
   - 生成された型定義を自動的に修正するスクリプトを作成

**次のステップ**:

どの対応を採用するか決定が必要です。

---

## 問題の概要（オリジナル）

TASK.mdフェーズ3実施中に以下の型エラーが発生：

1. **dataActions.ts**: Column型の削除されたフィールド（type、nullable、default、extra）を参照（276-300行目、491行目）
2. **clipboardActions.ts**: ClipboardDataでnullを使用（型定義ではundefined）（36, 47, 86, 97行目）
3. **layoutOptimizeCommand.ts, App.tsx**: TextAlignなどのenum型が文字列リテラルとして扱えない（複数箇所）
4. **dataActions.ts**: ReverseEngineeringHistoryEntry.typeフィールドの型不一致（491行目）

## 根本原因

- **問題1**: フェーズ1でColumn型を簡素化したが、履歴機能の変更検出ロジックが更新されていない
- **問題2**: TypeScriptのオプショナル型の扱い（nullではなくundefinedを使用）
- **問題3**: TypeSpecのenum型が文字列リテラルユニオン型として生成されていない
- **問題4**: typeフィールド名が予約語と衝突している可能性、またはTypeSpecの型生成の問題

## 修正方針

- scheme/main.tspのenum定義を文字列リテラルユニオン型（alias）に変更
- ReverseEngineeringHistoryEntry.typeフィールドをentryTypeに変更
- reverse_engineering_history.mdのフィールド名を更新
- フロントエンドコードを型定義に合わせて修正

---

## タスク一覧

### □ scheme/main.tspのenum型をalias型に変更

**ファイル**: `scheme/main.tsp`

**変更内容**:

以下のenum定義を文字列リテラルユニオン型（alias）に変更する：

1. TextAlign (78-82行目)
2. TextVerticalAlign (84-89行目)
3. TextAutoSizeMode (91-96行目)
4. TextOverflowMode (98-103行目)
5. LayerItemKind (212-217行目)
6. LayerPosition (224-227行目)
7. DatabaseType (394-397行目)

**変更前の例**:

```typescript
enum TextAlign {
  left,
  center,
  right,
}
```

**変更後の例**:

```typescript
alias TextAlign = "left" | "center" | "right";
```

**注意**: 
- 全てのenum定義をalias型に変更
- コメントは維持
- 生成される型が文字列リテラルユニオン型になることで、フロントエンドで直接文字列を使用可能になる

### □ ReverseEngineeringHistoryEntry.typeフィールドをentryTypeに変更

**ファイル**: `scheme/main.tsp`

**変更箇所**: 329-338行目

**変更内容**:

1. ReverseEngineeringType エイリアス型を追加（typeフィールドの型を明示）
2. ReverseEngineeringHistoryEntry.typeフィールドをentryTypeに変更

**変更前**:

```typescript
// Single history entry for reverse engineering
model ReverseEngineeringHistoryEntry {
  timestamp: int64; // Unix timestamp in milliseconds
  type: "initial" | "incremental";
  
  // Summary for UI display (used for both initial and incremental)
  summary?: ReverseEngineeringSummary;
  
  // Detailed changes (only for incremental, optional for initial)
  changes?: ReverseEngineeringChanges;
}
```

**変更後**:

```typescript
// Reverse engineering entry type
alias ReverseEngineeringType = "initial" | "incremental";

// Single history entry for reverse engineering
model ReverseEngineeringHistoryEntry {
  timestamp: int64; // Unix timestamp in milliseconds
  entryType: ReverseEngineeringType;
  
  // Summary for UI display (used for both initial and incremental)
  summary?: ReverseEngineeringSummary;
  
  // Detailed changes (only for incremental, optional for initial)
  changes?: ReverseEngineeringChanges;
}
```

**注意**: typeフィールド名をentryTypeに変更することで、TypeScriptの予約語との衝突を回避

### □ reverse_engineering_history.mdのフィールド名を更新

**ファイル**: `spec/reverse_engineering_history.md`

**変更箇所**: 60-64行目

**変更内容**:

ReverseEngineeringHistoryEntryの説明で、`type`フィールドを`entryType`に変更

**変更前**:

```markdown
**ReverseEngineeringHistoryEntry**
- `timestamp`: エントリのタイムスタンプ（Unix時間ミリ秒）
- `type`: `"initial"`（初回）または`"incremental"`（増分）
- `summary`: サマリー情報（追加・削除・変更の件数）
- `changes`: 変更詳細（増分リバースのみ）
```

**変更後**:

```markdown
**ReverseEngineeringHistoryEntry**
- `timestamp`: エントリのタイムスタンプ（Unix時間ミリ秒）
- `entryType`: `"initial"`（初回）または`"incremental"`（増分）
- `summary`: サマリー情報（追加・削除・変更の件数）
- `changes`: 変更詳細（増分リバースのみ）
```

**注意**: main.tspへの参照があるため、main.tspの変更と整合性を保つ

### □ 型生成の実行

**コマンド**: `npm run generate`

**理由**: scheme/main.tspの変更を反映し、TypeScript型定義を再生成する

**確認事項**: 
- lib/generated/api-types.ts が更新されること
- public/src/api/client/ 配下の型定義が更新されること
- 生成された型がalias型（文字列リテラルユニオン型）になっていること

### □ dataActions.tsのカラム変更検出ロジックを修正

**ファイル**: `public/src/actions/dataActions.ts`

**変更箇所**: 276-303行目

**変更内容**:

削除されたColumnフィールド（type、nullable、default、extra）への参照を削除し、ColumnSnapshot型（key、isForeignKey）のみを使用するように変更

**変更前**:

```typescript
const hasChanges = 
  existingCol.type !== newCol.type ||
  existingCol.nullable !== newCol.nullable ||
  existingCol.key !== newCol.key ||
  existingCol.default !== newCol.default ||
  existingCol.extra !== newCol.extra ||
  existingCol.isForeignKey !== newCol.isForeignKey;

if (hasChanges) {
  modifiedColumns.push({
    tableName: entity.name,
    columnName: newCol.name,
    before: {
      type: existingCol.type,
      nullable: existingCol.nullable,
      key: existingCol.key,
      default: existingCol.default,
      extra: existingCol.extra,
      isForeignKey: existingCol.isForeignKey,
    },
    after: {
      type: newCol.type,
      nullable: newCol.nullable,
      key: newCol.key,
      default: newCol.default,
      extra: newCol.extra,
      isForeignKey: newCol.isForeignKey,
    },
  });
}
```

**変更後**:

```typescript
const hasChanges = 
  existingCol.key !== newCol.key ||
  existingCol.isForeignKey !== newCol.isForeignKey;

if (hasChanges) {
  modifiedColumns.push({
    tableName: entity.name,
    columnName: newCol.name,
    before: {
      key: existingCol.key,
      isForeignKey: existingCol.isForeignKey,
    },
    after: {
      key: newCol.key,
      isForeignKey: newCol.isForeignKey,
    },
  });
}
```

**参照**: [spec/reverse_engineering_history.md](spec/reverse_engineering_history.md) の「差分検出の対象」セクション

### □ dataActions.tsの履歴エントリ作成箇所を修正

**ファイル**: `public/src/actions/dataActions.ts`

**変更箇所**: 489-492行目

**変更内容**: `type` → `entryType` に変更

**変更前**:

```typescript
const historyEntry: ReverseEngineeringHistoryEntry = {
  timestamp,
  type: isIncrementalMode ? 'incremental' : 'initial',
};
```

**変更後**:

```typescript
const historyEntry: ReverseEngineeringHistoryEntry = {
  timestamp,
  entryType: isIncrementalMode ? 'incremental' : 'initial',
};
```

### □ clipboardActions.tsのnull使用箇所を修正

**ファイル**: `public/src/actions/clipboardActions.ts`

**変更箇所1**: 30-51行目（clipboardData生成部分）

**変更内容**: `null` を省略する（undefinedはオプショナルフィールドなので省略可能）

**変更前**:

```typescript
if (selectedItem.kind === 'text') {
  const textBox = vm.erDiagram.texts[selectedItem.id];
  if (textBox) {
    clipboardData = {
      kind: 'text',
      textData: textBox,
      rectangleData: null,  // エラー
    };
  }
}

if (selectedItem.kind === 'rectangle') {
  const rectangle = vm.erDiagram.rectangles[selectedItem.id];
  if (rectangle) {
    clipboardData = {
      kind: 'rectangle',
      textData: null,  // エラー
      rectangleData: rectangle,
    };
  }
}
```

**変更後**:

```typescript
if (selectedItem.kind === 'text') {
  const textBox = vm.erDiagram.texts[selectedItem.id];
  if (textBox) {
    clipboardData = {
      kind: 'text',
      textData: textBox,
      // rectangleData は省略（undefinedになる）
    };
  }
}

if (selectedItem.kind === 'rectangle') {
  const rectangle = vm.erDiagram.rectangles[selectedItem.id];
  if (rectangle) {
    clipboardData = {
      kind: 'rectangle',
      // textData は省略（undefinedになる）
      rectangleData: rectangle,
    };
  }
}
```

**変更箇所2**: 85-106行目（ペースト処理）

**変更内容**: `!== null` を `!== undefined` に変更

**変更前**:

```typescript
if (clipboard.kind === 'text' && clipboard.textData !== null) {
  const newTextBox: TextBox = {
    ...clipboard.textData,
    id: newId,
    x: position.x,
    y: position.y,
  };
  nextVm = actionAddText(nextVm, newTextBox);
}

if (clipboard.kind === 'rectangle' && clipboard.rectangleData !== null) {
  const newRectangle: Rectangle = {
    ...clipboard.rectangleData,
    id: newId,
    x: position.x,
    y: position.y,
  };
  nextVm = actionAddRectangle(nextVm, newRectangle);
}
```

**変更後**:

```typescript
if (clipboard.kind === 'text' && clipboard.textData !== undefined) {
  const newTextBox: TextBox = {
    ...clipboard.textData,
    id: newId,
    x: position.x,
    y: position.y,
  };
  nextVm = actionAddText(nextVm, newTextBox);
}

if (clipboard.kind === 'rectangle' && clipboard.rectangleData !== undefined) {
  const newRectangle: Rectangle = {
    ...clipboard.rectangleData,
    id: newId,
    x: position.x,
    y: position.y,
  };
  nextVm = actionAddRectangle(nextVm, newRectangle);
}
```

### □ 履歴パネルコンポーネントのtype参照箇所を修正

**対象ファイル**: 履歴パネルコンポーネント（存在する場合）

**変更内容**: `entry.type` → `entry.entryType` に変更

**検索方法**: 
1. `grep -r "entry.type" public/src/components/` で検索
2. ReverseEngineeringHistoryEntryを使用している箇所を特定
3. `.type` を `.entryType` に置換

**注意**: 履歴パネルコンポーネントがまだ実装されていない場合、このタスクはスキップ

### □ その他のtype参照箇所を修正

**検索コマンド**: 
```bash
grep -r "\.type" public/src/ | grep -i "history\|reverse"
```

**変更内容**: ReverseEngineeringHistoryEntryのtypeフィールドを参照している箇所をすべてentryTypeに変更

**想定される箇所**:
- インポート/エクスポート処理
- 履歴表示UI
- 履歴のバリデーション処理

**注意**: 他のオブジェクトのtypeフィールド（例: DatabaseConnectionState.type）は変更不要

### □ 型チェックの実行

**コマンド**: `npm run typecheck`

**確認事項**: 
- バックエンド（lib/）の型エラーがないこと
- フロントエンド（public/src）の型エラーがないこと
- 特に以下のファイルでエラーがないことを確認：
  - public/src/actions/dataActions.ts
  - public/src/actions/clipboardActions.ts
  - public/src/commands/layoutOptimizeCommand.ts
  - public/src/components/App.tsx

### □ テストの実行

**コマンド**: `npm run test`

**対象**: すべてのテスト

**確認事項**: 
- MySQLのテスト（5テスト）が成功すること
- PostgreSQLのテスト（4テスト）が成功すること
- 合計9テストが全て成功すること

**注意**: フロントエンドのテストがある場合は、そちらも実行して確認

---

## 注意事項

### データ互換性

**enum → alias変更**:
- 生成されるTypeScript型の実体（文字列リテラル）は変更なし
- 既存の保存データとの互換性は維持される

**type → entryType変更**:
- 既存の保存データ（JSON）で`type`フィールドを持つ履歴エントリは読み込めなくなる
- MVPフェーズであり、後方互換性は考慮しない（プロジェクト方針通り）
- インポート時にエントリの型チェックを実施し、不正なエントリは無視する（既存仕様）

### 修正の実施順序

以下の順序で実施すること：

1. scheme/main.tspの修正（enum → alias、type → entryType）
2. reverse_engineering_history.mdの更新
3. 型生成の実行（`npm run generate`）
4. フロントエンドコードの修正（dataActions.ts、clipboardActions.ts、履歴関連）
5. 型チェック・テストの実行

### 検索パターン

修正漏れを防ぐため、以下のパターンで検索して全箇所を修正すること：

```bash
# 履歴エントリのtype参照箇所
grep -rn "\.type" public/src/ | grep -i "history\|reverse"

# null使用箇所（clipboardData関連）
grep -rn "null" public/src/actions/clipboardActions.ts

# Column型の削除されたフィールド参照
grep -rn "existingCol\.\(type\|nullable\|default\|extra\)" public/src/
grep -rn "newCol\.\(type\|nullable\|default\|extra\)" public/src/
```

## 関連仕様書

- [spec/multi_database_support.md](spec/multi_database_support.md) - Column型簡素化の背景
- [spec/reverse_engineering_history.md](spec/reverse_engineering_history.md) - 履歴機能の全体仕様
- [spec/incremental_reverse_engineering.md](spec/incremental_reverse_engineering.md) - 増分リバースの全体仕様
- [scheme/main.tsp](scheme/main.tsp) - 型定義
