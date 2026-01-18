# タスク一覧：仕様書更新に伴う実装

## 目的
scheme/main.tspの更新と新規仕様書（frontend_er_rendering.md、reverse_engineering.md）に基づき、以下を実装する：
1. APIスキーマの更新（Entity/EntityLayoutItem/LayoutData/ReverseEngineerResponse）
2. バックエンドのリバースエンジニア機能の拡張（デフォルトLayoutData生成）
3. フロントエンドのReact + React Flow導入とER図レンダリング機能の実装

## 前提条件
- [x] scheme/main.tspの更新完了
- [x] spec/frontend_er_rendering.mdの作成完了
- [x] spec/reverse_engineering.mdの作成完了
- [x] spec/rearchitecture_overview.mdの更新完了

## 実装タスク

---

## フェーズ1: APIスキーマの更新と型定義の生成

### 1-1. TypeSpecから型定義を生成
**担当ファイル**: `scheme/openapi.yaml`, `lib/generated/api-types.ts`, `public/src/api/client/models/`

#### タスク内容
- [ ] `npm run generate` を実行してTypeSpecから型定義を生成
- [ ] 以下の型定義が正しく生成されていることを確認：
  - `Entity`に`id: string`フィールドが追加されている
  - `EntityLayout`が`EntityLayoutItem`に変更され、`id`と`name`フィールドが含まれている
  - `LayoutData`の`rectangles`と`texts`が`Record<string, Rectangle>`と`Record<string, Text>`に変更されている
  - `ReverseEngineerResponse`型が新規追加されている
  - `/api/reverse-engineer`のレスポンス型が`ReverseEngineerResponse`に変更されている

#### 確認方法
```bash
npm run generate
git diff lib/generated/api-types.ts public/src/api/client/models/
```

---

## フェーズ2: バックエンド実装

### 2-1. DatabaseManagerの拡張
**担当ファイル**: `lib/database.ts`

#### タスク内容
- [ ] `generateERData()`メソッドを修正
  - 各Entityに一意のUUID（`id`フィールド）を生成して追加
  - UUIDの生成には`crypto.randomUUID()`を使用
- [ ] `generateDefaultLayoutData(entities: Entity[])`メソッドを新規作成
  - 引数：Entityの配列
  - 戻り値：`LayoutData`型
  - グリッドレイアウトで各エンティティの座標を計算
    - 横方向の間隔: 300px
    - 縦方向の間隔: 200px
    - 1行あたりのエンティティ数: 4
    - 開始X座標: 50px
    - 開始Y座標: 50px
  - `entities`をRecord<string, EntityLayoutItem>に変換（UUIDをキーとする）
  - `rectangles`と`texts`は空のRecord（`{}`）で返す

#### 実装例
```typescript
async generateERData(): Promise<ERData> {
  // 既存の実装に加えて、各エンティティにidを追加
  erData.entities.push({
    id: crypto.randomUUID(), // UUID生成
    name: tableName,
    columns: columns,
    foreignKeys: foreignKeys,
    ddl: ddl,
  });
  // ...
}

generateDefaultLayoutData(entities: EntityInfo[]): LayoutData {
  const layoutEntities: Record<string, EntityLayoutItem> = {};
  
  entities.forEach((entity, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    layoutEntities[entity.id] = {
      id: entity.id,
      name: entity.name,
      x: 50 + col * 300,
      y: 50 + row * 200,
    };
  });
  
  return {
    entities: layoutEntities,
    rectangles: {},
    texts: {},
  };
}
```

### 2-2. ReverseEngineerUsecaseの作成
**担当ファイル**: `lib/usecases/ReverseEngineerUsecase.ts`（新規作成）

#### タスク内容
- [ ] `lib/usecases/ReverseEngineerUsecase.ts`を作成
- [ ] 依存性の型定義（Dependencies interface）
  - `DatabaseManager`のインスタンス（ファクトリ関数として注入）
- [ ] `createReverseEngineerUsecase(deps)`関数を実装
- [ ] 戻り値は`() => Promise<ReverseEngineerResponse>`型
- [ ] 処理フロー：
  1. DatabaseManagerに接続
  2. ERDataを生成
  3. ERDataからデフォルトLayoutDataを生成
  4. ReverseEngineerResponse（erData + layoutData）を返却
  5. DatabaseManagerから切断

#### 実装例
```typescript
import type { ERData, LayoutData } from '../generated/api-types';
import type DatabaseManager from '../database';

export interface ReverseEngineerResponse {
  erData: ERData;
  layoutData: LayoutData;
}

export type ReverseEngineerDeps = {
  createDatabaseManager: () => DatabaseManager;
};

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

### 2-3. server.tsの修正
**担当ファイル**: `server.ts`

#### タスク内容
- [ ] `ReverseEngineerUsecase`をimport
- [ ] Usecaseインスタンスを生成（依存性注入）
- [ ] `/api/reverse-engineer`ハンドラを修正
  - Usecaseを呼び出し、ReverseEngineerResponseを返す
- [ ] `/api/layout`のGETハンドラを修正
  - `rectangles`と`texts`を空のRecordに変更（`{}` instead of `[]`）

#### 実装例
```typescript
import { createReverseEngineerUsecase } from './lib/usecases/ReverseEngineerUsecase';

// Usecaseの準備
const reverseEngineerUsecase = createReverseEngineerUsecase({
  createDatabaseManager: () => new DatabaseManager(),
});

// ハンドラ
app.post('/api/reverse-engineer', async (_req: Request, res: Response) => {
  try {
    const response = await reverseEngineerUsecase();
    res.json(response);
  } catch (error) {
    console.error('Error during reverse engineering:', error);
    res.status(500).json({ error: 'Failed to reverse engineer database' });
  }
});

app.get('/api/layout', async (_req: Request, res: Response) => {
  try {
    res.json({
      entities: {},
      rectangles: {}, // 配列から空のRecordに変更
      texts: {},       // 配列から空のRecordに変更
    });
  } catch (error) {
    console.error('Error loading layout data:', error);
    res.status(500).json({ error: 'Failed to load layout data' });
  }
});
```

---

## フェーズ3: テストコードの作成

### 3-1. ReverseEngineerUsecaseのテスト（正常系のみ）
**担当ファイル**: `tests/usecases/ReverseEngineerUsecase.test.ts`（新規作成）

#### タスク内容
- [ ] `tests/usecases/ReverseEngineerUsecase.test.ts`を作成
- [ ] モックDatabaseManagerを作成
- [ ] テストケース: Usecaseが正常にERDataとLayoutDataを返すことを確認（正常系1パターンのみ）

**重要な注意事項**:
- **Docker関連のコマンドは実行しない**
- DBは`docker compose up -d`ですでに起動済み
- Docker停止・再起動などは行わない
- Docker関連で問題が発生した場合は、タスクの遂行を終了してユーザーに報告する

#### 実装例
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createReverseEngineerUsecase } from '../../lib/usecases/ReverseEngineerUsecase';

describe('ReverseEngineerUsecase', () => {
  it('ERDataとLayoutDataを返す（正常系）', async () => {
    const mockERData = {
      entities: [{ id: 'uuid-1', name: 'users', columns: [], foreignKeys: [], ddl: '' }],
      relationships: [],
    };
    const mockLayoutData = {
      entities: { 'uuid-1': { id: 'uuid-1', name: 'users', x: 50, y: 50 } },
      rectangles: {},
      texts: {},
    };
    
    const mockDbManager = {
      connect: vi.fn(),
      generateERData: vi.fn().mockResolvedValue(mockERData),
      generateDefaultLayoutData: vi.fn().mockReturnValue(mockLayoutData),
      disconnect: vi.fn(),
    };
    
    const usecase = createReverseEngineerUsecase({
      createDatabaseManager: () => mockDbManager as any,
    });
    
    const result = await usecase();
    
    expect(result).toEqual({
      erData: mockERData,
      layoutData: mockLayoutData,
    });
    expect(mockDbManager.connect).toHaveBeenCalled();
    expect(mockDbManager.disconnect).toHaveBeenCalled();
  });
});
```

---

## フェーズ4: フロントエンド実装（React + React Flow導入）

### 4-1. React + React Flowのパッケージインストール
**担当ファイル**: `public/package.json`

#### タスク内容
- [ ] `public/`ディレクトリで以下のパッケージをインストール
  ```bash
  cd public
  npm install react react-dom reactflow
  npm install -D @types/react @types/react-dom
  ```
- [ ] `vite.config.ts`にReactプラグインを追加
  ```bash
  npm install -D @vitejs/plugin-react
  ```

#### 実装例（vite.config.ts）
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
})
```

### 4-2. Reactアプリケーションの基本構成
**担当ファイル**: `public/src/main.tsx`（新規作成）、`public/index.html`

#### タスク内容
- [ ] `public/src/app.ts`を`public/src/main.tsx`にリネーム
- [ ] Reactのエントリーポイントとして`main.tsx`を実装
- [ ] `public/index.html`のscriptタグを`app.ts`から`main.tsx`に変更

#### 実装例（main.tsx）
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

#### 実装例（index.html）
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ER Diagram Viewer</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### 4-3. Appコンポーネントの実装
**担当ファイル**: `public/src/components/App.tsx`（新規作成）

#### タスク内容
- [ ] `public/src/components/App.tsx`を作成
- [ ] ビルド情報ボタンとモーダル機能を実装（既存のapp.tsから移植）
- [ ] リバースエンジニアボタンを追加
- [ ] ER図キャンバスコンポーネント（ERCanvas）を配置

#### 実装例
```typescript
import React, { useState } from 'react'
import ERCanvas from './ERCanvas'
import BuildInfoModal from './BuildInfoModal'

function App() {
  const [showBuildInfo, setShowBuildInfo] = useState(false)
  
  return (
    <div className="app">
      <header>
        <h1>ER Diagram Viewer</h1>
        <button onClick={() => setShowBuildInfo(true)}>ビルド情報</button>
      </header>
      <main>
        <ERCanvas />
      </main>
      {showBuildInfo && (
        <BuildInfoModal onClose={() => setShowBuildInfo(false)} />
      )}
    </div>
  )
}

export default App
```

### 4-4. BuildInfoModalコンポーネントの実装
**担当ファイル**: `public/src/components/BuildInfoModal.tsx`（新規作成）

#### タスク内容
- [ ] `public/src/components/BuildInfoModal.tsx`を作成
- [ ] 既存のapp.tsのビルド情報表示ロジックをReactコンポーネント化

### 4-5. ERCanvasコンポーネントの実装
**担当ファイル**: `public/src/components/ERCanvas.tsx`（新規作成）

#### タスク内容
- [ ] `public/src/components/ERCanvas.tsx`を作成
- [ ] React Flowの基本セットアップ
  - `ReactFlow`コンポーネントを配置
  - `nodes`と`edges`の状態管理
  - `nodeTypes`と`edgeTypes`を定義
- [ ] 「リバースエンジニア」ボタンを配置
- [ ] ボタンクリックで`POST /api/reverse-engineer`を呼び出し
- [ ] レスポンスから`erData`と`layoutData`を取得
- [ ] ERData/LayoutDataをReact FlowのnodesとedgesにマッピングしてReact Flowを更新

#### 実装例
```typescript
import React, { useState, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { DefaultService } from '../api/client'
import EntityNode from './EntityNode'
import RelationshipEdge from './RelationshipEdge'

const nodeTypes = {
  entityNode: EntityNode,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
}

function ERCanvas() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )
  
  const handleReverseEngineer = async () => {
    try {
      const response = await DefaultService.apiReverseEngineer()
      
      // ERDataとLayoutDataをReact Flowのnodesとedgesにマッピング
      const newNodes: Node[] = response.erData.entities.map((entity) => {
        const layout = response.layoutData.entities[entity.id]
        return {
          id: entity.id,
          type: 'entityNode',
          position: { x: layout.x, y: layout.y },
          data: {
            id: entity.id,
            name: entity.name,
            columns: entity.columns,
            ddl: entity.ddl,
          },
        }
      })
      
      const newEdges: Edge[] = response.erData.relationships.map((rel, index) => ({
        id: `${rel.from}_${rel.fromColumn}_to_${rel.to}_${rel.toColumn}_${index}`,
        type: 'relationshipEdge',
        source: response.erData.entities.find(e => e.name === rel.from)?.id || '',
        target: response.erData.entities.find(e => e.name === rel.to)?.id || '',
        data: {
          fromColumn: rel.fromColumn,
          toColumn: rel.toColumn,
          constraintName: rel.constraintName,
        },
      }))
      
      setNodes(newNodes)
      setEdges(newEdges)
    } catch (error) {
      console.error('リバースエンジニアに失敗しました:', error)
      alert('リバースエンジニアに失敗しました')
    }
  }
  
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        <button onClick={handleReverseEngineer}>リバースエンジニア</button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}

export default ERCanvas
```

### 4-6. EntityNodeコンポーネントの実装
**担当ファイル**: `public/src/components/EntityNode.tsx`（新規作成）

#### タスク内容
- [ ] `public/src/components/EntityNode.tsx`を作成
- [ ] テーブル形式でエンティティを表示
  - ヘッダー：テーブル名
  - ボディ：カラム一覧（スクロール可能）
  - PK/FKの視覚的区別（アイコンまたは色分け）

#### 実装例
```typescript
import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface EntityNodeData {
  id: string
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    key: string
    default: string | null
    extra: string
  }>
  ddl: string
}

function EntityNode({ data }: NodeProps<EntityNodeData>) {
  return (
    <div style={{ 
      border: '1px solid #333', 
      borderRadius: '4px', 
      background: 'white',
      minWidth: '200px',
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ 
        background: '#333', 
        color: 'white', 
        padding: '8px',
        fontWeight: 'bold',
      }}>
        {data.name}
      </div>
      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        padding: '4px',
      }}>
        {data.columns.map((col, index) => (
          <div key={index} style={{ 
            padding: '4px',
            borderBottom: '1px solid #eee',
            fontSize: '12px',
          }}>
            {col.key === 'PRI' && '🔑 '}
            {col.key === 'MUL' && '🔗 '}
            {col.name}: {col.type}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default EntityNode
```

### 4-7. RelationshipEdgeコンポーネントの実装
**担当ファイル**: `public/src/components/RelationshipEdge.tsx`（新規作成）

#### タスク内容
- [ ] `public/src/components/RelationshipEdge.tsx`を作成
- [ ] React Flowの`smoothstep`エッジタイプを使用
- [ ] 制約名のラベル表示（任意）

#### 実装例
```typescript
import React from 'react'
import { EdgeProps, getSmoothStepPath } from 'reactflow'

function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  
  return (
    <>
      <path
        id={id}
        d={edgePath}
        style={{
          stroke: '#333',
          strokeWidth: 2,
        }}
        markerEnd="url(#arrow)"
      />
      {data?.constraintName && (
        <text>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {data.constraintName}
          </textPath>
        </text>
      )}
    </>
  )
}

export default RelationshipEdge
```

---

## フェーズ5: ビルドとテストの確認

### 5-1. 型チェック
**コマンド**: `npm run typecheck`

#### タスク内容
- [ ] バックエンドとフロントエンドの型チェックを実行
- [ ] エラーがないことを確認

### 5-2. テスト実行
**コマンド**: `npm run test`

#### タスク内容
- [ ] 全てのテストを実行
- [ ] ReverseEngineerUsecaseのテストが成功することを確認

### 5-3. ビルド確認
**コマンド**: `npm run build`

#### タスク内容
- [ ] バックエンドとフロントエンドのビルドを実行
- [ ] エラーなくビルドが完了することを確認

---

## 動作確認（ユーザーが実施）

**注意: 以下の動作確認はユーザーが実施します。実装担当者は実施不要です。**

### 確認手順
1. 開発サーバーの起動
   ```bash
   npm run dev
   ```
   - サーバーが正常に起動することを確認

2. ブラウザで動作確認
   - `http://localhost:30033/` にアクセス
   - 「リバースエンジニア」ボタンをクリック
   - ER図が表示されることを確認
   - エンティティがグリッドレイアウトで配置されることを確認
   - エンティティをドラッグして移動できることを確認
   - ズーム・パン操作ができることを確認
   - ビルド情報ボタンが正常に動作することを確認

3. APIレスポンスの確認
   - ブラウザの開発者ツールで`POST /api/reverse-engineer`のレスポンスを確認
   - `erData`と`layoutData`が含まれていることを確認
   - `Entity`に`id`フィールドが含まれていることを確認
   - `layoutData.entities`がRecord型（オブジェクト）であることを確認
   - `layoutData.rectangles`と`layoutData.texts`が空のRecord（`{}`）であることを確認

### 確認項目（ユーザーがチェック）
- [ ] 型チェックがエラーなく完了する
- [ ] テストが全て成功する
- [ ] ビルドがエラーなく完了する
- [ ] 開発サーバーが正常に起動する
- [ ] 「リバースエンジニア」ボタンが動作する
- [ ] ER図が表示される
- [ ] エンティティがグリッドレイアウトで配置される
- [ ] エンティティをドラッグして移動できる
- [ ] ズーム・パン操作ができる
- [ ] ビルド情報ボタンが正常に動作する
- [ ] APIレスポンスが仕様通りの型になっている

---

## 実装完了後の作業

実装完了後は、上記の「動作確認（ユーザーが実施）」セクションの手順に従ってユーザーが動作確認を行います。

## メモ

### テスト要件の調整
- DatabaseManager用のテスト（database.test.ts）は不要
- ReverseEngineerUsecaseのテストは正常系1パターンのみ実装
- テスト実行時は既存のDocker環境を使用（Docker操作は行わない）

### 仕様書の変更内容まとめ
1. **scheme/main.tsp**
   - `Entity`に`id: string`を追加
   - `EntityLayout`を`EntityLayoutItem`に名前変更し、`id`と`name`を追加
   - `LayoutData`の`rectangles`と`texts`を配列からRecordに変更
   - `ReverseEngineerResponse`モデルを新規追加
   - `/api/reverse-engineer`のレスポンス型を`ReverseEngineerResponse`に変更

2. **spec/frontend_er_rendering.md**（新規作成）
   - React + React Flow + elkjsの技術選定
   - ER図レンダリングの詳細仕様

3. **spec/reverse_engineering.md**（新規作成）
   - リバースエンジニアリング機能の仕様
   - デフォルトLayoutDataの生成ルール（グリッドレイアウト）

### 参照仕様書
- [spec/frontend_er_rendering.md](/spec/frontend_er_rendering.md)
- [spec/reverse_engineering.md](/spec/reverse_engineering.md)
- [spec/rearchitecture_overview.md](/spec/rearchitecture_overview.md)
- [spec/backend_usecase_architecture.md](/spec/backend_usecase_architecture.md)

### 依存関係の注意事項
- React + React Flowの導入により、フロントエンドの実装方針が大きく変わります
- 既存のVanilla TypeScriptコード（app.ts）はReactコンポーネントに移行します
- componentsディレクトリは現在空なので、新規作成から始めます
- UUIDの生成には`crypto.randomUUID()`を使用（Node.js 14.17.0以降で利用可能）

### Docker関連の重要な注意事項
- **Docker関連のコマンド（docker compose down、docker restart等）は一切実行しない**
- DBは`docker compose up -d`ですでに起動済みである前提
- テストでDB接続が必要な場合も、起動済みのDBを使用する
- Docker関連で問題が発生した場合は、タスクの遂行を終了してユーザーに報告する

### 懸念事項
- Reactの学習コストとチームの習熟度（MVPフェーズでは最小限の機能で実装）
- 直角ポリラインのルーティングアルゴリズム（MVPではReact Flowの標準ルーティングを使用）
- 大規模ER図でのパフォーマンス（MVPフェーズでは検証しない）
