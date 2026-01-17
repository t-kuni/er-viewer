# タスク一覧：GET /api/build-info のテスト実装

## 目的
バックエンドにテストコードを導入し、`GET /api/build-info` のテストが作れるようにする。

## 前提条件
- [x] バックエンドUsecaseアーキテクチャ仕様書作成済み
- [x] バックエンドテスト戦略仕様書作成済み
- [x] `/api/build-info` の実装が存在（`server.ts` 111-141行目）
- [x] OpenAPIスキーマにBuildInfo型定義済み

## 必要なパッケージ

- [x] `vitest` と `@vitest/ui` のインストール完了

## 実装タスク

### 1. Vitestのセットアップ
**担当ファイル**: `package.json`, `vitest.config.ts`

#### 1-1. package.jsonの更新
- [ ] scriptsセクションの更新
  - `"test": "vitest run"` に変更
  - `"test:watch": "vitest"` に変更

#### 1-2. vitest.config.ts作成
- [ ] `vitest.config.ts` をルートディレクトリに作成
- [ ] 以下の設定を含める
  - `environment: 'node'`
  - `include: ['tests/**/*.test.ts']`
  - `fileParallelism: false`（直列実行）
  - `maxWorkers: 1`

**実装内容**:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
```

### 2. GetBuildInfoUsecaseの作成
**担当ファイル**: `lib/usecases/GetBuildInfoUsecase.ts`

#### 2-1. Usecaseディレクトリの作成
- [ ] `lib/usecases/` ディレクトリを作成

#### 2-2. GetBuildInfoUsecase実装
- [ ] `lib/usecases/GetBuildInfoUsecase.ts` を作成
- [ ] 依存性の型定義（Dependencies interface）
  - `fs.existsSync`
  - `fs.readFileSync`
  - `process.version`
  - `process.platform`
  - `process.arch`
  - `__dirname` または `rootDir`
- [ ] `createGetBuildInfoUsecase(deps)` 関数を実装
- [ ] 戻り値は `() => Promise<BuildInfo>` または `() => BuildInfo` 型
- [ ] 既存の `server.ts` のロジックを移植
  - build-info.json が存在する場合はその内容を返す
  - 存在しない場合は package.json からフォールバック情報を返す

**実装内容**:
```typescript
// BuildInfo型をimport（public/src/api/client/models/BuildInfo.ts）
// または独自に定義
export type GetBuildInfoDeps = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: string) => string;
  rootDir: string;
  processVersion: string;
  processPlatform: string;
  processArch: string;
};

export function createGetBuildInfoUsecase(deps: GetBuildInfoDeps) {
  return (): BuildInfo => {
    // 実装
  };
}
```

### 3. server.tsのリファクタリング
**担当ファイル**: `server.ts`

#### 3-1. Usecaseのimportと依存性注入
- [ ] `createGetBuildInfoUsecase` をimport
- [ ] 依存性オブジェクトを作成（実際のfs、processを使用）
- [ ] Usecaseインスタンスを生成

#### 3-2. ハンドラのリファクタリング
- [ ] `/api/build-info` ハンドラ内の実装をUsecaseの呼び出しに置き換え
- [ ] エラーハンドリングはハンドラ内に残す
- [ ] HTTPレスポンス処理もハンドラ内に残す

**実装内容**:
```typescript
import { createGetBuildInfoUsecase } from './lib/usecases/GetBuildInfoUsecase';
import fs from 'fs';

// 依存性注入の準備
const getBuildInfoUsecase = createGetBuildInfoUsecase({
  existsSync: fs.existsSync,
  readFileSync: fs.readFileSync,
  rootDir: __dirname,
  processVersion: process.version,
  processPlatform: process.platform,
  processArch: process.arch,
});

// ハンドラ
app.get('/api/build-info', async (_req: Request, res: Response) => {
  try {
    const buildInfo = getBuildInfoUsecase();
    res.json(buildInfo);
  } catch (error) {
    console.error('Error getting build info:', error);
    res.status(500).json({ error: 'Failed to get build info' });
  }
});
```

### 4. GetBuildInfoUsecaseのテスト作成
**担当ファイル**: `tests/usecases/GetBuildInfoUsecase.test.ts`

#### 4-1. テストディレクトリの作成
- [ ] `tests/usecases/` ディレクトリを作成

#### 4-2. テストコード実装
- [ ] `tests/usecases/GetBuildInfoUsecase.test.ts` を作成
- [ ] モックオブジェクトの準備（`vi.fn()`を使用）
- [ ] テストケース: build-info.json が存在する場合（正常系）
  - `existsSync` が `true` を返すようモック
  - `readFileSync` が有効なJSONを返すようモック
  - 結果がモックしたJSONの内容と一致することを検証

**実装内容**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createGetBuildInfoUsecase, GetBuildInfoDeps } from '../../lib/usecases/GetBuildInfoUsecase';

describe('GetBuildInfoUsecase', () => {
  it('build-info.json が存在する場合、その内容を返す', () => {
    // Arrange: モックの準備
    const mockBuildInfo = {
      version: '1.0.0',
      name: 'test-app',
      buildTime: '2026-01-17T12:00:00.000Z',
      buildDate: '2026/01/17 12:00:00',
      git: {
        commit: 'abc123',
        commitShort: 'abc123',
        branch: 'main',
      },
    };
    
    const deps: GetBuildInfoDeps = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue(JSON.stringify(mockBuildInfo)),
      rootDir: '/test/root',
      processVersion: 'v20.0.0',
      processPlatform: 'linux',
      processArch: 'x64',
    };
    
    // Act: Usecaseの実行
    const usecase = createGetBuildInfoUsecase(deps);
    const result = usecase();
    
    // Assert: 結果の検証
    expect(result).toEqual(mockBuildInfo);
    expect(deps.existsSync).toHaveBeenCalledWith('/test/root/build-info.json');
  });
});
```

## 動作確認（ユーザーが実施）

**注意: 以下の動作確認はユーザーが実施します。実装担当者は実施不要です。**

### 確認手順
1. テストの実行
   ```bash
   npm run test
   ```
   - GetBuildInfoUsecaseのテストが全て成功することを確認

2. 型チェックの実行
   ```bash
   npm run typecheck
   ```
   - 型エラーがないことを確認

3. 開発サーバーの起動（リグレッションチェック）
   ```bash
   npm run dev
   ```
   - サーバーが正常に起動することを確認
   - `http://localhost:30033/api/build-info` にアクセスして正常にレスポンスが返ることを確認

### 確認項目（ユーザーがチェック）
- [ ] テストが全て成功する
- [ ] 型チェックがエラーなく完了する
- [ ] 開発サーバーが正常に起動する
- [ ] `/api/build-info` エンドポイントが正常に動作する（既存動作が壊れていない）
- [ ] テストコードに対して `npm run typecheck` が通る

---

## 実装完了後の作業

実装完了後は、上記の「動作確認（ユーザーが実施）」セクションの手順に従ってユーザーが動作確認を行います。

## メモ

### BuildInfo型について
- `public/src/api/client/models/BuildInfo.ts` に型定義が存在
- バックエンドでも同じ型を使いたい場合は、共通の型定義ファイルを作成するか、OpenAPIの型定義を利用

### 参照仕様書
- [バックエンドUsecaseアーキテクチャ仕様](./spec/backend_usecase_architecture.md)
- [バックエンドテスト戦略仕様](./spec/backend_test_strategy.md)

### Vitestの選定理由（仕様書より）
- ESM/TypeScriptを標準で扱う設計
- 直列実行が素直（`fileParallelism: false`）
- モックAPIがJest互換（`vi.fn`, `vi.spyOn`等）
- Node 20+を要求、本プロジェクトの`@types/node` 24系と相性が良い

### 依存性注入の対象（仕様書より）
- ファイルシステムへのアクセス（`fs.readFile`, `fs.existsSync`等）
- 環境変数へのアクセス（`process.env`）
- プロセス情報へのアクセス（`process.version`, `process.platform`等）
- 外部サービスへのAPI呼び出し
- 日時取得（`new Date()`）
- DatabaseManagerのインスタンス生成（ファクトリ関数として注入）

### DIしない要素（仕様書より）
- DBへのクエリ実行（テスト時は実際のテスト用DBを使用）
- ビジネスロジック自体
