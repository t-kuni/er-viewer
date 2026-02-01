# パンスクロール操作機能 実装タスク

## 概要

スペースキー+ドラッグでER図キャンバス全体をパンスクロールできる機能を実装する。
スペースキー押下中は、エンティティやリレーションへのインタラクション（ホバー、ドラッグ）を無効化し、純粋なビューポート移動のみを実現する。

参照仕様書: [フロントエンドER図レンダリング仕様](/spec/frontend_er_rendering.md) の「パンスクロール操作仕様」セクション

## タスク

### ViewModelの型定義更新

- [ ] `scheme/main.tsp` を更新
  - `ERDiagramUIState` に `isPanMode: boolean` フィールドを追加
  - スペースキー押下状態をViewModelに含めるかどうか検討：
    - **推奨**: Reactコンポーネントのローカル状態で管理（ViewModelには含めない）
    - 理由: スペースキーの押下状態はUI一時的な状態であり、保存・復元する必要がない
  - 仕様書に「スペースキー押下状態: Reactコンポーネントのローカル状態で管理（ViewModelには含めない）」と記載されているため、**ViewModelへの追加は不要**
  - このタスクは**実施不要**

### ホバーアクションの更新

- [ ] `public/src/actions/hoverActions.ts` を更新
  - `actionHoverEntity`, `actionHoverEdge`, `actionHoverColumn` に以下を追加:
    - スペースキー押下中（`isPanMode`）はホバーイベントを無視する判定を追加
    - 既存の `isDraggingEntity` の判定と同様の実装パターン
  - ただし、スペースキー押下状態はViewModelに含めないため、**この判定は不要**
  - スペースキー押下中はコンポーネント側でホバーイベントのdispatchをスキップする実装とする
  - このタスクは**実施不要**（コンポーネント側で対応）

### ERCanvas コンポーネントの更新

- [ ] `public/src/components/ERCanvas.tsx` を更新
  - **スペースキー押下状態の管理**:
    - `useKeyPress('Space')` でスペースキーの押下状態を監視（React Flow提供）
    - スペース押下状態をローカルステート（`const spacePressed = useKeyPress('Space')`）で管理
    - **テキスト編集中のスペースキー無効化**:
      - `editingTextId !== null` の場合は `spacePressed` を `false` として扱う
      - 実装例: `const effectiveSpacePressed = spacePressed && editingTextId === null`
  - **React Flow設定の動的切り替え**:
    - `panOnDrag`: スペース押下状態に応じて動的に切り替え
      - スペース押下中: `true`（ドラッグでパン可能）
      - 通常時: `false`（ノードのドラッグを優先）
    - `nodesDraggable`: スペース押下状態に応じて動的に切り替え
      - スペース押下中: `false`（エンティティのドラッグを無効化）
      - 通常時: `true`（エンティティのドラッグを有効化）
  - **カーソル制御**:
    - ルート要素（`<div className={...}>`）に `style` を動的に適用
    - スペース押下中: `cursor: 'grab'`
    - スペース押下+ドラッグ中: `cursor: 'grabbing'`
    - ドラッグ中の判定: React Flowの `onMoveStart`/`onMoveEnd` イベントで検出
    - ローカルステート `isPanning` を追加して管理
  - **ホバー状態のクリア**:
    - スペースキー押下時（`useEffect` で `spacePressed` を監視）に `actionClearHover` をdispatch
  - **ホバーイベントの無効化**:
    - EntityNode、RelationshipEdge のホバーイベントハンドラーは変更不要
    - スペース押下中はパンモードになり、React Flowが自動的にノード/エッジへのマウスイベントを無視する
    - ただし、念のため EntityNode のホバーイベントをスキップする実装を検討（任意）
  - 仕様: [フロントエンドER図レンダリング仕様](/spec/frontend_er_rendering.md) の「パンスクロール操作仕様」セクション

### EntityNode コンポーネントの更新（任意）

- [ ] `public/src/components/EntityNode.tsx` を更新（任意タスク）
  - スペースキー押下状態を `useKeyPress('Space')` で取得
  - `onMouseEnter`/`onMouseLeave` 内でスペース押下状態をチェックし、押下中はActionをdispatchしない
  - ただし、React Flowの `panOnDrag=true` 時は自動的にノードへのイベントが抑制されるため、**この実装は任意**
  - パフォーマンステストを実施し、必要に応じて実装

### RelationshipEdge コンポーネントの更新（任意）

- [ ] `public/src/components/RelationshipEdge.tsx` を更新（任意タスク）
  - EntityNode と同様、スペースキー押下中のホバーイベントをスキップ
  - ただし、React Flowの `panOnDrag=true` 時は自動的にエッジへのイベントが抑制されるため、**この実装は任意**
  - パフォーマンステストを実施し、必要に応じて実装

### ビルド・テスト確認

- [ ] フロントエンドのビルド確認
  - `cd public && npm run build` を実行してビルド成功を確認

- [ ] フロントエンドのテスト実行
  - `npm run test` を実行してテストが通ることを確認（フロントエンドのテストはルートで実行）

## 実装時の注意事項

### ViewModelへの影響

- スペースキー押下状態はViewModelに含めない（仕様書で明記）
- Reactコンポーネントのローカル状態で管理
- `actionClearHover` のみをdispatchし、ViewModelのホバー状態をクリア

### テキスト編集中のスペースキー無効化

- テキスト編集中（`editingTextId !== null`）はスペースキーの押下を無視する
- `useKeyPress('Space')`の結果を`editingTextId`の状態でフィルタリング
- 実装例: `const effectiveSpacePressed = spacePressed && editingTextId === null`
- これにより、テキスト入力中のスペースキーが誤ってパンモードをトリガーしない

### React Flowの動作

- `panOnDrag` が `true` の場合、React Flowは自動的にノード/エッジへのドラッグイベントを無効化する
- `nodesDraggable` が `false` の場合、ノードのドラッグが無効化される
- この2つのプロパティを動的に切り替えることで、スペースキー押下中のパンモードを実現

### パフォーマンス

- スペースキー押下状態の変化時に `panOnDrag` と `nodesDraggable` が即座に反映される
- React Flowの内部最適化により、プロパティ変更時のオーバーヘッドは最小限
- ホバー状態のクリアは1回のActionディスパッチのみで実行される

### カーソル制御の実装

- `cursor: 'grab'` はスペースキー押下中に適用
- `cursor: 'grabbing'` はスペースキー押下+ドラッグ中（パン中）に適用
- ドラッグ中の判定: React Flowの `onMoveStart`/`onMoveEnd` イベントで検出
- ローカルステート `isPanning` を追加して管理

### エンティティドラッグ中にスペースキーが押された場合

- 仕様書に「エンティティドラッグ中にスペースキーが押された場合は無視する（特別な処理は不要）」と記載
- React Flowが自動的にドラッグとパンの優先順位を制御するため、特別な実装は不要

## 懸念事項（作業対象外）

### ブラウザのデフォルト動作

- スペースキーはブラウザのデフォルト動作（スクロール）を持つ
- React Flowは自動的に `preventDefault()` を呼び出すため、通常は問題ない
- ただし、一部のブラウザで意図しない動作が発生する可能性がある

### モバイル対応

- スペースキーはデスクトップのみの機能
- モバイルでは別のパンスクロール操作（2本指ドラッグ等）が必要
- MVP段階ではデスクトップのみをサポート

## 備考

- 型定義（`scheme/main.tsp`）の更新は不要（スペースキー押下状態はViewModelに含めない）
- 既存の `isDraggingEntity` と同様のパターンだが、ViewModelではなくローカル状態で管理
- テキスト編集中のスペースキー無効化を仕様書に追記済み
