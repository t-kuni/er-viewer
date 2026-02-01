# タスク一覧: 自己参照リレーションのレンダリング機能実装

## 概要

`spec/self_referencing_relation_rendering.md`の仕様に基づき、同一エンティティ内のリレーション（自己参照リレーション）を外周ループとして視覚的に表現する機能を実装する。

**参照仕様書**:
- [spec/self_referencing_relation_rendering.md](./spec/self_referencing_relation_rendering.md) - 自己参照リレーションのレンダリング仕様（メイン）
- [spec/frontend_er_rendering.md](./spec/frontend_er_rendering.md) - フロントエンドER図レンダリング仕様（ホバーインタラクション、エッジ設計など）
- [spec/frontend_state_management.md](./spec/frontend_state_management.md) - フロントエンド状態管理仕様

**背景リサーチ**:
- [research/20260201_1835_self_referencing_relation_ui.md](./research/20260201_1835_self_referencing_relation_ui.md)

## 実装タスク

### 自己参照リレーション用エッジコンポーネントの作成

- [ ] `public/src/components/SelfRelationshipEdge.tsx` を新規作成
  - React Flowの`EdgeProps`を受け取るコンポーネント
  - `BaseEdge`を使用してSVGパスを描画する（`BaseEdge`が不可視の当たり判定パスも自動処理）
  - **パス形状**: cubic-bezier曲線でC字/U字型の外周ループを生成
    - エンティティノードの右側に固定配置
    - ハンドル位置: `self-out`（top: 35%）と`self-in`（top: 65%）から接続
    - ループの張り出し幅は適切に調整（例: ノード幅の60%程度）
  - **ラベル表示**: `EdgeLabelRenderer`を使用してループの外側中央に↺シンボルを表示
    - フォントサイズ: 10px
    - 透明度: ハイライト時 1.0、通常時 0.6
    - `pointer-events: none`（クリックイベントを透過）
    - ラベル位置は`transform: translate()`で指定
  - **ハイライト対応**: 
    - `useViewModel`で`vm.erDiagram.ui.highlightedEdgeIds`を購読
    - ハイライト時は線の色を`#007bff`、太さを4pxに変更
    - 通常時は線の色を`#333`、太さを2pxに設定
  - **ホバーインタラクション**: 
    - `onMouseEnter`で`actionHoverEdge`をdispatch
    - `onMouseLeave`で`actionClearHover`をdispatch
  - **マーカー（矢印）**: 
    - React Flowの`MarkerType.ArrowClosed`を使用
    - エッジの終点（`self-in`ハンドル側）に自動配置される
  - **最適化**: `React.memo`でメモ化

### エンティティノードへの自己参照用ハンドル追加

- [ ] `public/src/components/EntityNode.tsx` を修正
  - 自己参照リレーション用のハンドルを追加
    - ハンドルID: `self-out` (type: source)、`self-in` (type: target)
    - 配置位置: 両方とも`Position.Right`
    - スタイル: `top: '35%'`（self-out）、`top: '65%'`（self-in）、`width: 8, height: 8, opacity: 0`
    - `isConnectable: false` - MVPでは手動接続を許可しない
  - 注意事項: `opacity: 0`で非表示にする（`display: none`は使用しない）
    - React Flow公式トラブルシュートで`display: none`による接続エラーが報告されている

### エッジ変換ロジックの修正

- [ ] `public/src/utils/reactFlowConverter.ts` の`convertToReactFlowEdges`関数を修正
  - 自己参照リレーションの判定ロジックを追加
    - 条件: `edge.sourceEntityId === edge.targetEntityId`
  - 自己参照リレーションの場合:
    - `type = 'selfRelationshipEdge'`
    - `sourceHandle = 'self-out'`
    - `targetHandle = 'self-in'`
  - 通常のリレーションの場合:
    - `type = 'relationshipEdge'`
    - 既存のハンドル計算ロジック（`computeOptimalHandles`）を使用
  - エッジデータ構造は既存と同じ（`sourceColumnId`, `targetColumnId`, `constraintName`）
  - zIndexの設定は既存ロジックと同じ（ハイライト時は100、通常時は-100）

### React Flow設定の更新

- [ ] `public/src/components/ERCanvas.tsx` を修正
  - `edgeTypes`定数に`selfRelationshipEdge`を追加
    - `import SelfRelationshipEdge from './SelfRelationshipEdge'`を追加
    - `edgeTypes`オブジェクトに`selfRelationshipEdge: SelfRelationshipEdge`を追加

### テストの作成

- [ ] `public/tests/utils/reactFlowConverter.test.ts` を新規作成
  - `convertToReactFlowEdges`関数のテスト
    - **通常のリレーションのテスト**: 
      - 異なるエンティティ間のエッジが`relationshipEdge`タイプになること
      - `computeOptimalHandles`が呼ばれること
    - **自己参照リレーションのテスト**:
      - `sourceEntityId === targetEntityId`の場合、`selfRelationshipEdge`タイプになること
      - `sourceHandle = 'self-out'`, `targetHandle = 'self-in'`が設定されること
      - エッジデータ（`sourceColumnId`, `targetColumnId`, `constraintName`）が正しく引き継がれること
    - **ハイライト状態のテスト**:
      - `highlightedEdgeIds`に含まれるエッジのzIndexが100になること
      - 含まれないエッジのzIndexが-100になること
    - **存在しないノードのテスト**:
      - sourceまたはtargetノードが存在しない場合、エッジが除外されること
  - テスト構造は既存の`public/tests/actions/*.test.ts`を参考にする

### ビルド確認

- [ ] 型生成とビルドの実行
  ```bash
  cd /home/kuni/Documents/er-viewer
  npm run generate
  cd public
  npm run build
  ```
  - エラーが出ないことを確認する

### テストの実行

- [ ] フロントエンドのテスト実行
  ```bash
  cd /home/kuni/Documents/er-viewer/public
  npm run test
  ```
  - すべてのテストがpassすることを確認する

## 実装時の注意事項

### cubic-bezier曲線の計算方法

SelfRelationshipEdgeコンポーネントで外周ループを描画する際、以下のような方法でcubic-bezier曲線のパスを生成する:

1. **制御点の計算**:
   - 開始点: `self-out`ハンドルの位置（`sourceX`, `sourceY`）
   - 終了点: `self-in`ハンドルの位置（`targetX`, `targetY`）
   - 制御点1: 開始点から右側に張り出す（例: `sourceX + offset`, `sourceY - offset/2`）
   - 制御点2: 終了点から右側に張り出す（例: `targetX + offset`, `targetY + offset/2`）
   - offsetはノード幅の60%程度が適切

2. **SVGパス生成**:
   - `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`

3. **`BaseEdge`の使用**:
   - React Flowの`BaseEdge`コンポーネントに`path`プロパティとしてSVGパス文字列を渡す
   - `BaseEdge`が不可視の当たり判定パスも自動的に処理する

### ホバーインタラクションについて

自己参照リレーションのホバーインタラクションは、既存のホバーアクション（`actionHoverEdge`, `actionClearHover`）をそのまま使用する。

**仕様上の特性** (spec/self_referencing_relation_rendering.mdより):
- エッジへのホバー: 接続先/接続元のエンティティは同一なので、ノード強調は1回だけ
- カラムへのホバー: 反対側カラム（同一エンティティ内）も強調

これらの挙動は既存のホバーアクションとインデックスで自動的に処理される（追加実装不要）。

### z-index制御について

自己参照リレーションのz-index制御は、通常のリレーションと同じロジックを使用する:
- ハイライト時: `zIndex: 100`（前面表示）
- 通常時: `zIndex: -100`（背後表示）

詳細は`spec/frontend_er_rendering.md`の「z-index制御」セクションを参照。

### 矢印（マーカー）について

矢印の表示はReact Flowの`markerEnd`プロパティで自動的に処理される。自己参照リレーションでも通常のリレーションと同様に`MarkerType.ArrowClosed`を使用する。

矢印の定義は`spec/frontend_er_rendering.md`の「リレーションエッジ」セクションに記載されている通り、SVG `<defs>`内で定義される。

## MVP範囲外（今回は実装しない）

以下の機能はMVP範囲外とし、将来的に実装を検討する（spec/self_referencing_relation_rendering.mdより）:

- 複数の自己参照リレーションのオフセット配置
- 左右振り分け
- 役割名（role）の表示
- インタラクティブな接続（ユーザーが手動で自己参照リレーションを作成する機能）
