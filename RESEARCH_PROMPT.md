# React Flowでのリレーション線の動的な接続ポイント最適化のリサーチ

## リサーチ要件

リレーションの線の出所が上か下の２箇所しかなく、線が見づらい時がある。例えばリレーションでつながっているエンティティAとBがあるとして、Aが上、Bが下にある時、リレーションがAの上から出てBの下につながっていたりして無駄に長くなっていたりする。エンティティの上下２箇所ではなく、自由な箇所から生えていいので無駄に長くしないでほしい。更に、エンティティは移動できるので動的に生えるポイントを最適化してほしい。これを実現する方法

## プロジェクト概要

ER Diagram Viewerは、MySQLデータベースからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

### 技術スタック

- **バックエンド**: Node.js + Express + TypeScript + MySQL
- **フロントエンド**: TypeScript + Vite + React + React Flow
- **データベース**: MySQL 8
- **開発環境**: Docker Compose（DB用）+ npm run dev（アプリケーション用）
- **API定義**: TypeSpec

### 現状のフェーズ

- アプリケーションを丸ごと作り直そうとしているので不要なコードが残っているケースあり
- プロトタイピング段階でMVPを作成中
- 実現可能性を検証したいのでパフォーマンスやセキュリティは考慮しない
- 余計な機能も盛り込まない
- 後方互換も考慮しない
- 不要になったコードは捨てる

## 現在のフロントエンド実装状況

### 使用ライブラリ

- **React Flow**: ER図のレンダリングとインタラクティブ機能（ドラッグ&ドロップ、ズーム、パンなど）に使用
- React Flow公式サイト: https://reactflow.dev/

### ディレクトリ構造

```
/er-viewer/public/src/
├─ components/
│   ├─ App.tsx              （メインアプリケーション）
│   ├─ EntityNode.tsx       （エンティティノードコンポーネント）
│   ├─ RelationshipEdge.tsx （リレーションエッジコンポーネント）
│   └─ ERCanvas.tsx         （React Flowキャンバス）
├─ contexts/
│   └─ HoverContext.tsx     （ホバー状態管理）
└─ utils/
    ├─ viewModelConverter.ts （ViewModelへの変換）
    └─ reactFlowConverter.ts （React Flow形式への変換）
```

### EntityNode.tsx の現在の実装

EntityNodeコンポーネントは以下のように実装されている：

```typescript
import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import type { Column } from '../api/client'
import { useHover } from '../contexts/HoverContext'

interface EntityNodeData {
  id: string
  name: string
  columns: Column[]
  ddl: string
}

function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const { hoverState, setHoverEntity, setHoverColumn, clearHover } = useHover()
  
  const isHighlighted = hoverState.highlightedNodes.has(data.id)
  const isDimmed = hoverState.elementType !== null && !isHighlighted
  
  const handleColumnMouseEnter = (e: React.MouseEvent, columnName: string) => {
    e.stopPropagation()
    setHoverColumn(data.id, columnName)
  }
  
  const handleColumnMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearHover()
  }
  
  return (
    <div 
      style={{ 
        border: isHighlighted ? '3px solid #007bff' : '1px solid #333', 
        borderRadius: '4px', 
        background: 'white',
        minWidth: '200px',
        opacity: isDimmed ? 0.2 : 1,
        boxShadow: isHighlighted ? '0 4px 12px rgba(0, 123, 255, 0.4)' : 'none',
        zIndex: isHighlighted ? 1000 : 1,
        transition: 'all 0.2s ease-in-out',
      }}
      onMouseEnter={() => setHoverEntity(data.id)}
      onMouseLeave={clearHover}
    >
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
        {data.columns.map((col, index) => {
          const isColumnHighlighted = 
            hoverState.highlightedColumns.get(data.id)?.has(col.name) || false
          
          return (
            <div 
              key={index} 
              style={{ 
                padding: '4px',
                borderBottom: '1px solid #eee',
                fontSize: '12px',
                backgroundColor: isColumnHighlighted ? '#e3f2fd' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease-in-out',
              }}
              onMouseEnter={(e) => handleColumnMouseEnter(e, col.name)}
              onMouseLeave={handleColumnMouseLeave}
            >
              {col.key === 'PRI' && '🔑 '}
              {col.key === 'MUL' && '🔗 '}
              {col.name}
            </div>
          )
        })}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default EntityNode
```

**重要な点**:
- `<Handle type="target" position={Position.Top} />`: エンティティノードの上部に接続ポイントを配置
- `<Handle type="source" position={Position.Bottom} />`: エンティティノードの下部に接続ポイントを配置
- 現在は上下の2箇所のみが接続ポイントとして定義されている

### RelationshipEdge.tsx の現在の実装

RelationshipEdgeコンポーネントは以下のように実装されている：

```typescript
import React from 'react'
import { EdgeProps, getSmoothStepPath } from 'reactflow'
import { useHover } from '../contexts/HoverContext'

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
  const { hoverState, setHoverEdge, clearHover } = useHover()
  
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  
  const isHighlighted = hoverState.highlightedEdges.has(id)
  const isDimmed = hoverState.elementType !== null && !isHighlighted
  
  return (
    <g
      onMouseEnter={() => setHoverEdge(id)}
      onMouseLeave={clearHover}
      style={{ 
        cursor: 'pointer',
        zIndex: isHighlighted ? 999 : 0,
      }}
    >
      <path
        id={id}
        d={edgePath}
        style={{
          stroke: isHighlighted ? '#007bff' : '#333',
          strokeWidth: isHighlighted ? 4 : 2,
          fill: 'none',
          opacity: isDimmed ? 0.2 : 1,
          transition: 'all 0.2s ease-in-out',
        }}
      />
    </g>
  )
}

export default RelationshipEdge
```

**重要な点**:
- `getSmoothStepPath`: React Flowの組み込み関数でスムーズなステップパスを生成
- `sourceX, sourceY, targetX, targetY`: 接続元と接続先の座標
- `sourcePosition, targetPosition`: 接続元と接続先の位置（Position.Top, Position.Bottomなど）
- エッジのパスは`sourcePosition`と`targetPosition`に基づいて自動的に計算される

### データ構造

バックエンドAPIから取得されるER図データの構造（TypeSpecで定義）：

```typescript
// エンティティ（テーブル）
interface Entity {
  name: string;
  columns: Column[];
  ddl: string;
}

// カラム情報
interface Column {
  name: string;
  type: string;
  nullable: boolean;
  key: string; // 'PRI', 'MUL', ''など
  default: string | null;
  extra: string;
}

// リレーション（外部キー）
interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName: string;
}

// レイアウト情報（エンティティの配置）
interface EntityLayout {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

## 現在の問題点

### 問題の詳細

1. **接続ポイントが2箇所に固定されている**
   - EntityNodeコンポーネントで`Position.Top`と`Position.Bottom`のみが定義されている
   - 左右（`Position.Left`, `Position.Right`）からの接続ができない

2. **非効率な接続パスの発生**
   - エンティティAが上、エンティティBが下にある場合でも、Aの上から線が出てBの下につながることがある
   - 無駄に長い接続パスが生成される

3. **動的な最適化がない**
   - エンティティは移動可能だが、接続ポイントは固定のまま
   - エンティティの位置関係に応じて最適な接続ポイントが自動的に選ばれない

### 具体例

```
状況: エンティティAが上、エンティティBが下にある

現在の動作:
  ┌────────┐
  │   A    │ ← Aの上から線が出る
  └────┬───┘
       │
       │ （無駄に長い）
       │
       │
  ┌────┴───┐
  │   B    │ ← Bの下につながる
  └────────┘

期待する動作:
  ┌────────┐
  │   A    │
  └────┬───┘
       │ （最短）
  ┌────┴───┐
  │   B    │
  └────────┘
```

## 期待する回答

以下の観点から、React Flowでリレーション線の接続ポイントを動的に最適化する方法について提案してください：

### 1. 複数の接続ポイント（ハンドル）の配置

- **4方向のハンドル**: Top, Bottom, Left, Rightの4箇所にハンドルを配置する方法
  - React Flowの`Handle`コンポーネントを複数配置することで実現できるか
  - 各方向のハンドルに一意のIDを割り当てる必要があるか
  - カスタムスタイリングで見た目を調整する方法

- **複数ハンドルの課題**
  - 複数のハンドルが存在する場合、React Flowはどのハンドルを使用するか自動的に判断するか
  - 手動で使用するハンドルを指定する必要があるか

### 2. 動的なハンドル選択の実装

- **接続元と接続先の位置関係に基づいた最適化**
  - エンティティAとBの座標（x, y）から最適な接続方向を計算する方法
  - React Flowでエッジに使用するハンドルを動的に指定する方法
  - `sourceHandle`と`targetHandle`プロパティの使用方法

- **計算アルゴリズム**
  - 2つのノードの位置関係（相対位置）から最適な接続方向を決定するロジック
  - 例: AがBの左上にある場合、Aの右下から、Bの左上へ接続するなど
  - 最短距離または最も自然な見た目になる接続方向の選択基準

### 3. エンティティ移動時の動的更新

- **リアルタイムな再計算**
  - エンティティがドラッグ移動された時に、接続ポイントを再計算する方法
  - React Flowの`onNodesChange`や`onNodeDragStop`イベントの活用
  - 状態管理（React State）での最適な接続情報の保持方法

- **パフォーマンス**
  - 移動のたびに全エッジの接続ポイントを再計算するパフォーマンス影響
  - 最適化手法（メモ化、debounce、throttleなど）

### 4. React Flowの機能・API

- **カスタムエッジ**
  - `getSmoothStepPath`以外のパス生成関数（`getStraightPath`, `getBezierPath`など）
  - カスタムエッジコンポーネントでの完全制御の可能性

- **ハンドルの動的配置**
  - ハンドルの位置をプログラマティックに設定する方法
  - React Flowでサポートされているハンドル配置のオプション

- **エッジのカスタムデータ**
  - エッジに`sourceHandle`と`targetHandle`を指定する方法
  - エッジデータの動的更新方法

### 5. 実装例やベストプラクティス

- **コード例**
  - 4方向ハンドルを持つカスタムノードの実装例
  - 動的にハンドルを選択するロジックの実装例
  - エンティティ移動時の再計算ロジックの実装例

- **React Flowの公式ドキュメントやサンプル**
  - 類似の実装例があるか（複数ハンドル、動的接続など）
  - 関連するAPIドキュメントのリンク

### 6. 実装の複雑さとトレードオフ

- **実装難易度**: MVPフェーズに適したシンプルな実装方法
- **保守性**: 理解しやすく、後から修正しやすいコード
- **機能の拡張性**: 将来的な機能追加に対応しやすい設計

### 7. 代替アプローチ

- **React Flow以外の方法**
  - React Flowの制約により実現が困難な場合、他のライブラリや手法の検討
  - カスタムSVG描画による完全制御の可能性

- **段階的な実装**
  - まず4方向ハンドルのみを実装し、後から動的最適化を追加するアプローチ
  - 静的な接続ポイント選択（初期配置時のみ最適化）vs 動的な選択（移動時も再計算）

### 重視する点

- **React Flowとの互換性**: 現在使用しているReact Flowの機能を活用する
- **実装のシンプルさ**: MVPフェーズに適した、複雑すぎない実装
- **視覚的な改善**: 線が無駄に長くならず、見やすいER図を実現
- **動的な最適化**: エンティティ移動時に接続ポイントが自動的に最適化される

### 重視しない点

- **パフォーマンスの極端な最適化**: MVPフェーズでは過度な最適化は不要
- **完璧な最短経路**: 計算コストが高いアルゴリズムは不要、ある程度の改善で十分
- **セキュリティ**: プロトタイピング段階では考慮しない
- **後方互換性**: 考慮不要

現在のプロジェクト構成（React Flow使用、MVPフェーズ、プロトタイピング）を考慮した上で、シンプルで実装しやすく、視覚的に改善されたER図の接続線を実現できる方法を提案してください。
