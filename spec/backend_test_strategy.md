# バックエンドテスト戦略仕様

## 概要

Usecaseレイヤーのテスト実装における具体的な方針を定義する。テストフレームワークの選定、TypeScript統合、モック戦略、データベーステスト、テスト構造化、設定ファイルなどの実装方針を記載する。

## テストフレームワーク選定

### 推奨：Vitest

ESM前提のプロジェクト（`type: module`）において、以下の理由によりVitestを推奨する：

**Vitestを選ぶ理由**

- **ESM/TypeScriptを標準で扱う設計**：Viteの変換/解決を前提にしており、設定が薄くて済む
- **直列実行が素直**：`fileParallelism: false`でテストファイル並列を停止し、`maxWorkers=1`で直列実行可能
- **モックAPIがJest互換**：`vi.fn`, `vi.spyOn`などJestと似たAPIで学習コストが低い
- **Node要件との相性**：Vitest v4はNode 20+を要求、本プロジェクトの`@types/node` 24系と相性が良い

**Jestの位置付け**

- 既に依存が揃っており、移行コストを出したくない場合は継続も可能
- ただしESMは`experimental`扱いで、`--experimental-vm-modules`などの追加設定が必要
- ts-jestはJest 30系を許容しているため技術的には成立する

## TypeScript統合

### 推奨方針

- **テスト実行時のTS変換はVitestに任せる**：ts-jest/tsupを介さず、Vitestの標準機能を使用
- **型チェックは別コマンド**：既存の`npm run typecheck`を継続使用

### 型チェックの拡張（オプション）

テストコードも型チェック対象にしたい場合：

- `tsconfig.test.json`を追加
- `tsc -p tsconfig.test.json --noEmit`を実行するスクリプトを追加

## モック戦略

### 基本方針

依存性注入（DI）を前提とするため、**関数/オブジェクトの差し替えのみ**で実現する。外部モックライブラリは導入しない。

### Vitestでのモック実装

- **基本**：`vi.fn()`で差し替え
- **型安全性**：`vi.mocked()`を使用してTypeScriptに「これはモック」と伝える

### 副作用別のモック方針

#### ファイルシステム（fs）

- UsecaseがDIで`deps.fs.readFile`を受け取る設計
- テストでは`readFile: vi.fn()`で差し替え
- モジュール丸ごとのモックは不要

#### 環境変数・プロセス情報

- DIで`getEnv()`/`getProcessInfo()`関数を受け取る設計に寄せる
- DIで寄せられない箇所のみ、テスト内で退避・復元を行う

#### 日時（Date）

- **推奨**：`now(): Date`をDIで注入
- グローバルに依存する場合は、fake timersを使用（ただしDI推奨）

## データベーステスト

### 基本方針

- **実際のDBインスタンスを使用**：Docker Composeで起動したMySQL
- **参照専用**：init.sqlで準備されたデータを読むのみ、書き込みは行わない
- **テストデータ管理は不要**：各テストケースでのinsert/deleteは行わない

### DB接続の共通化

#### 接続確認

- `beforeAll`で`SELECT 1`または既知スキーマ読み取りを1回実行
- 接続失敗時はテストを中断

#### DatabaseManagerの初期化

以下のいずれかの方法を選択：

- 各テストで`new DatabaseManager()`を生成
- 共通ヘルパで1個作成して使い回し（参照のみなので安全）

### テスト用DBの扱い

- Docker Composeで起動したDBを使用
- init.sqlで投入されたテストデータを前提とする
- テスト実行中のデータ変更は行わない（参照のみ）

## テストの構造化

### ディレクトリ構成

```
tests/
└─ usecases/
    └─ <UsecaseName>.test.ts
```

### 命名規則

- **テストファイル**：`<UsecaseName>.test.ts`（Usecaseクラス/関数名に対応）
- **テストスイート**：`describe('<UsecaseName>')`
- **テストケース**：`it(...)`で観測できる振る舞い単位（成功/失敗/エッジケース等）

### テストパターン

**AAA（Arrange-Act-Assert）パターンを推奨**

- **Arrange**：テストデータとモックの準備
- **Act**：Usecaseの実行
- **Assert**：結果の検証

コメントを増やしすぎず、コードの構造で3段階を表現する。

### 可読性の方針

- テストコードは「仕様のドキュメント」として読めることを重視
- 1つのテストケースは1つの振る舞いを検証
- 複雑なセットアップは共通化するが、テスト内で何をしているか分かりやすくする

## 設定ファイル

### package.json scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### vitest.config.ts

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false, // 直列実行（maxWorkers=1）
  },
})
```

### TypeScript設定

既存の`tsconfig.server.json`を使用。テストコード専用の設定が必要になった場合は`tsconfig.test.json`を追加する。

## デバッグ方法

### VSCodeでのデバッグ

Nodeのデバッグ実行（`vitest run`）をlaunch.jsonに登録し、引数で対象ファイルを絞る方法を推奨。

具体的な設定例：

```json
{
  "type": "node",
  "request": "launch",
  "name": "Vitest Debug",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

## 実装時の注意事項

### Usecaseの依存性設計

- **Usecaseのdepsは小さい関数集合にする**：fs全体やprocess全体ではなく、Usecaseが使う最小限のみを注入
- **モックはvi.fnのみ**：外部モックライブラリを増やさない
- **DBは"生きていること"だけ共通で保証**：各テストはUsecaseの戻り値（または例外）に集中

### テストの独立性

- 各テストは他のテストに依存しない
- テスト実行順序に依存しない設計
- DBは参照のみなので、テスト間でのデータ競合は発生しない

### シンプルさの維持

- 必要最小限の設定で動作させる
- 過度な抽象化や共通化は避ける
- 変更しやすさを常に意識する

## 重視しないこと

本プロジェクトでは以下を実装しない：

- **CI/CD対応**：ローカル環境でのテスト実行のみを想定
- **テストカバレッジ**：カバレッジ計測やレポート生成は不要
- **並列実行の最適化**：直列実行で十分（速度より可読性を重視）
- **重厚なDBテストツール**：参照のみなので複雑なフィクスチャ管理やトランザクション制御は不要

## 関連仕様書

- [バックエンドUsecaseアーキテクチャ仕様](./backend_usecase_architecture.md) - Usecaseレイヤーの設計方針
