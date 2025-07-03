# テストコードのコーディングルール違反修正タスク

## 概要

CLAUDE.mdで定められているテストコーディングルールに違反している箇所を洗い出し、修正すべき項目をまとめました。

#### error-handling.test.ts  
- [x] **96-115行目**: `app.loadERData` テスト用メソッドを削除し、パブリックメソッドを使用 ✅ 完了（2025-07-03）
  - 既存のパブリックメソッド`loadERData`を使用するよう修正
  - テスト実行成功を確認
- [x] **147-166行目**: `app.loadERData` テスト用メソッドを削除し、パブリックメソッドを使用 ✅ 完了（2025-07-03）
  - テスト用のloadERDataメソッドの追加を削除
  - 既存のパブリックメソッド`loadERData`を使用するよう修正
  - テスト実行成功を確認
- [x] **209-219行目**: `app.setLayoutData` テスト用メソッドを削除し、パブリックメソッドを使用 ✅ 完了（2025-07-03）
  - setLayoutDataメソッドをupdateLayoutDataに変更
  - ERViewerApplicationからsetLayoutDataメソッドを削除
  - state-management.test.tsのsetLayoutData使用箇所も同時に修正
  - テスト実行成功を確認
- [x] **263-273行目**: `app.loadERData` テスト用メソッド追加を削除し、既存のパブリックメソッドを使用 ✅ 完了（2025-07-03）
  - テスト用のloadERDataメソッドの追加を削除
  - 既存のloadERDataメソッドをそのまま使用
  - テスト実行成功を確認
- [x] **351-370行目**: 既にパブリックメソッドreverseEngineerを使用していることを確認 ✅ 完了（2025-07-03）
- [x] **407-424行目**: TASK.mdの記載誤り（ファイルは369行まで）✅ 確認済み（2025-07-03）

## 修正の優先順位

1. **高優先度**: ERViewerApplicationへのテスト用メソッド追加（ルール6違反）
2. **中優先度**: 制御構造排除（ルール3違反）  
3. **低優先度**: 共通化による可読性の低下（ルール2違反）

## 修正完了後の確認事項

- [x] `npm test && npm run typecheck` でエラーが発生しないことを確認 ✅ 完了（2025-07-03）
- [x] 全てのテストが通ることを確認 ✅ 完了（2025-07-03）
- [x] コーディングルールに準拠していることを確認 ✅ 完了（2025-07-03）

## 備考

- 一部のファイル（state-management.test.ts、left-sidebar-toggle.test.ts、ui-components.test.ts）は概ねルールに準拠しており、大きな修正は不要
- 修正時は既存のテストロジックを破壊しないよう注意深く行う
- Mockの呼び出し履歴検証を重視し、state検証は避ける

## 完了した作業（2025-07-03）

### error-handling.test.tsの修正完了
- **全てのテスト用メソッド追加を削除**: ERViewerApplicationへのテスト用メソッド追加違反を解消
- **setLayoutDataメソッドの削除**: テスト専用のパブリックメソッドをERViewerApplicationから削除し、既存のupdateLayoutDataを使用
- **loadERDataメソッド追加の削除**: テスト用のメソッド追加を削除し、既存のパブリックメソッドを使用
- **state-management.test.tsも同時修正**: setLayoutDataを使用していた箇所を全てupdateLayoutDataに変更
- **全テスト成功確認**: 113個のテストが全て成功することを確認

### 残りのタスク
- 他のテストファイルにおける制御構造（if/for/switch）の削除
- 共通化による可読性低下の改善（必要に応じて）

## 制御構造削除タスクの進捗（2025-07-03）

### 制御構造の洗い出し完了
全テストファイルを調査し、以下の制御構造使用箇所を特定：

1. **rendering.test.ts**: for文とif文の組み合わせ（4箇所）
2. **ui-components.test.ts**: querySelectorモック内のif文（2箇所）
3. **entity-hover-highlight.test.ts**: DOMモック内の多数のif文
4. **rectangle-edit.test.ts**: DOMモック内のif文
5. **relationship-hover-highlight.test.ts**: DOMモック内のif文
6. **text-drag.test.ts**: DOMモック内のif文
7. **user-interaction.test.ts**: for文（2箇所）とイベントハンドラー存在チェックのif文

### 修正試行と課題

#### rendering.test.ts
- 制御構造を完全に削除して固定値でアクセスするよう修正を試みた
- **結果**: テストが失敗。動的な要素数に対応できなくなった
- **問題点**: DOM要素の数がテストケースや実装状態によって異なるため、固定値でのアクセスは不適切
- **結論**: 元のコードに戻した

#### user-interaction.test.ts
- [x] 964行目と986行目のfor文をArray.forEach()に置き換え ✅ 完了（2025-07-03）
- **問題点**: Array.forEach()も配列操作の一種であり、CLAUDE.mdの「配列操作や条件分岐を避ける」ルールに完全には準拠していない

### 現状の考察

1. **モック実装内の制御構造**: 多くの制御構造がDOMモックの実装内で使用されている。特定のセレクターに対して特定の要素を返すために必要。

2. **動的な要素数への対応**: rendering.test.tsのように、DOM要素の数が動的に変わる場合、制御構造なしでの対応が困難。

3. **ルールの解釈**: CLAUDE.mdでは「可能な限り」if/for/switch文を使用しないとされている。完全な排除が困難な場合は、最小限の使用に留めることも許容される可能性がある。

### 今後の方針

1. **優先度の再評価**: 制御構造の完全な削除が困難な場合、他のルール違反（共通化による可読性低下など）の修正を優先する。

2. **部分的な改善**: 制御構造を完全に削除できない場合でも、可能な限り削減し、よりシンプルな形に置き換える。

3. **テストの可読性を優先**: CLAUDE.mdのルール2「可読性最優先」に従い、制御構造を削除することでテストの可読性が著しく低下する場合は、現状維持も検討する。

## 共通化による可読性低下の改善（2025-07-03）

### waitForAsync関数の削除 ✅ 完了

以下のファイルからwaitForAsync関数を削除し、直接Promiseを記述するように修正：
- [x] user-interaction.test.ts
- [x] ui-components.test.ts
- [x] data-management.test.ts
- [x] initialization-setup.test.ts

**修正内容**:
```typescript
// 修正前
const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));
await waitForAsync();

// 修正後
await new Promise((resolve) => setTimeout(resolve, 0));
```

**結果**: 全テストが成功。テストの意図がより明確になった。

### test-data-factory.tsの過度な使用の改善 ✅ 完了（2025-07-03）

#### data-management.test.tsの修正完了
- **修正内容**: test-data-factoryからのすべてのインポートを削除し、テストデータを直接リテラル値として記述
- **削除した関数**: createERData、createEntity、createUserEntity、createPostEntity、createLayoutData、createNetworkResponse、createSuccessResponse
- **メリット**: 
  - テストデータが直接記述されることで、何をテストしているかが明確になった
  - 別ファイルを参照する必要がなくなり、テストの可読性が向上
  - デフォルト値に依存しないため、テストの意図が明確
- **結果**: 全11個のテストが成功。npm test && npm run typecheckも成功

### 残りの共通化問題

1. **他のテストファイルでのtest-data-factory.ts使用**: 14個のテストファイルで使用されているため、順次改善が必要
2. **配列操作の使用**: filter、find、mapなどの使用

## test-data-factory.ts使用の改善（2025-07-03）

### initialization-setup.test.tsの修正 ✅ 完了
- **修正内容**: test-data-factoryからのすべてのインポートを削除し、テストデータを直接リテラル値として記述
- **削除した関数**: createERData、createUserEntity、createPostEntity、createUserPostERData、createNetworkResponse
- **結果**: 全3個のテストが成功

### ui-components.test.tsの修正 ✅ 完了（2025-07-03）
- **修正内容**: test-data-factoryからのすべてのインポートを削除し、テストデータを直接リテラル値として記述
- **削除した関数**: createERData、createSuccessResponse
- **結果**: 全15個のテストが成功

### 残りのtest-data-factory.ts使用ファイル（12個→11個）
- user-interaction.test.ts
- rendering.test.ts
- state-management.test.ts
- error-handling.test.ts
- left-sidebar-toggle.test.ts
- left-sidebar-resize.test.ts
- text-drag.test.ts
- rectangle-edit.test.ts
- infrastructure-matchers.test.ts
- relationship-hover-highlight.test.ts
- entity-hover-highlight.test.ts

### 発見された問題
- initialization-setup.test.tsにタイプエラーが存在（MockNetworkResponseのsuccessプロパティ）
  - 次のタスクで修正予定