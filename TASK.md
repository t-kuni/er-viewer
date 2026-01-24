# タスク一覧

矩形プロパティパネル機能の実装タスク一覧。
仕様書: [spec/rectangle_property_panel.md](./spec/rectangle_property_panel.md)

## 前提条件

- react-colorfulは既にインストール済み（package.jsonで確認済み）
- rectangleActions.tsは既に実装済み（actionUpdateRectangleStyle、actionRemoveRectangle等）
- RectangleNodeコンポーネントは既に実装済み

## 実装タスク

### □ ColorPickerWithPresetsコンポーネントの実装

**ファイル**: `public/src/components/ColorPickerWithPresets.tsx`（新規作成）

**概要**: カラーピッカーとプリセット色ボタンを含む再利用可能なコンポーネントを実装する。

**インターフェース**:
```typescript
interface ColorPickerWithPresetsProps {
  value: string; // HEX形式の色
  onChange: (color: string) => void;
  label: string;
}
```

**実装内容**:
- react-colorfulの`HexColorPicker`と`HexColorInput`を使用
- ラベル表示
- カラーピッカー（HexColorPicker）
- HEX値入力フィールド（HexColorInput）
- プリセット色ボタンを横2列 × 縦4行でグリッド表示
  - 青: `#E3F2FD`
  - シアン: `#E0F7FA`
  - ティール: `#E0F2F1`
  - 緑: `#E8F5E9`
  - 黄: `#FFFDE7`
  - オレンジ: `#FFF3E0`
  - ピンク: `#FCE4EC`
  - グレー: `#F5F5F5`
- プリセットボタンのスタイル:
  - サイズ: 32px × 32px
  - ボーダー: 1px solid #ccc
  - カーソル: pointer

**注意事項**:
- カラーピッカーのローカルステートは持たず、propsで完全に制御する（Controlled Component）
- プリセット色ボタンクリック時はonChangeを即座に呼び出す

---

### □ RectanglePropertyPanelコンポーネントの実装

**ファイル**: `public/src/components/RectanglePropertyPanel.tsx`（新規作成）

**概要**: 矩形選択時に右サイドバーに表示するプロパティパネルを実装する。

**インターフェース**:
```typescript
interface RectanglePropertyPanelProps {
  rectangleId: string;
}
```

**実装内容**:
- `useERViewModel`で選択された矩形データを取得（`vm.rectangles[rectangleId]`）
- `useERDispatch`でdispatch関数を取得
- 矩形が存在しない場合はnullを返す
- プロパティ編集UIを順番にレンダリング:
  1. **背景色（fill）**: ColorPickerWithPresetsを使用、onChange時に`actionUpdateRectangleStyle`をdispatch
  2. **枠線色（stroke）**: ColorPickerWithPresetsを使用、onChange時に`actionUpdateRectangleStyle`をdispatch
  3. **透明度（opacity）**: `<input type="range">`（min=0, max=1, step=0.01）+ パーセント表示、onChange時に`actionUpdateRectangleStyle`をdispatch
  4. **枠線幅（strokeWidth）**: `<input type="number">`（min=0, step=1）+ px表示、onChange時に`actionUpdateRectangleStyle`をdispatch
  5. **削除ボタン**: 赤背景（`#dc3545`）、白文字、onClick時に`actionRemoveRectangle`をdispatch

**スタイル**:
- 各プロパティグループ間にマージンを設定（0.5rem〜1rem）
- ラベルは太字で表示
- 透明度スライダーは幅100%
- 削除ボタンは幅100%、パディング0.75rem

**注意事項**:
- すべてのonChangeイベントで即座にActionをdispatchする（リアルタイム更新）
- 透明度は0〜1の数値で管理し、表示時のみパーセント表示に変換（例: 0.5 → 50%）
- 枠線幅は数値型で管理し、表示時にpx単位を追加

---

### □ App.tsxのレイアウト変更

**ファイル**: `public/src/components/App.tsx`

**概要**: 右サイドバーを追加し、矩形選択時にプロパティパネルを表示する。

**変更内容**:
- mainタグのスタイルを変更:
  - `display: 'flex'`
  - `height: 'calc(100vh - 70px)'`（ヘッダー分を引く）
- mainタグの中身を以下の構成に変更:
  1. ERCanvasエリア（左側）:
     - `flex: 1`（残りのスペースを占有）
     - `position: 'relative'`
  2. 右サイドバー（条件付きレンダリング）:
     - 矩形が1つだけ選択されている場合のみ表示
     - `width: '300px'`
     - `background: '#ffffff'`
     - `borderLeft: '1px solid #ddd'`
     - `padding: '1rem'`
     - `overflowY: 'auto'`
     - 中身: `<RectanglePropertyPanel rectangleId={selectedRectangleId} />`
     - 複数選択時は「複数選択中（一括編集は未対応）」メッセージを表示
- 選択状態管理のためのローカルステート追加:
  - `const [selectedRectangleId, setSelectedRectangleId] = useState<string | null>(null)`
- ERCanvasコンポーネントにpropsを追加:
  - `onSelectionChange: (rectangleId: string | null) => void`
  - `selectedRectangleId`をsetSelectedRectangleIdで更新

**注意事項**:
- ERCanvasの高さをApp側で管理しているため、ERCanvas側の高さ指定を削除または調整する必要がある場合あり
- RectanglePropertyPanelコンポーネントをimport

---

### □ ERCanvasでの選択状態管理実装

**ファイル**: `public/src/components/ERCanvas.tsx`

**概要**: React Flowの`onSelectionChange`イベントで矩形の選択状態を監視し、親コンポーネント（App）に通知する。

**変更内容**:
- props追加:
  ```typescript
  interface ERCanvasProps {
    onSelectionChange?: (rectangleId: string | null) => void;
  }
  ```
- `onSelectionChange`ハンドラの実装（ERCanvasInnerまたはERCanvas内）:
  - React Flowの`onSelectionChange`プロパティを使用
  - `nodes`配列から`type === 'rectangleNode'`のノードだけを抽出
  - 選択された矩形が1つの場合: `onSelectionChange?.(selectedNode.id)`を呼び出す
  - 選択された矩形が0個または2個以上の場合: `onSelectionChange?.(null)`を呼び出す
  - エンティティノードのみが選択されている場合も: `onSelectionChange?.(null)`を呼び出す

**注意事項**:
- `useCallback`でハンドラを安定化させる
- onSelectionChangeがoptionalなので、呼び出し前に存在チェックを行う

---

### □ Deleteキー対応の実装

**ファイル**: `public/src/components/ERCanvas.tsx`

**概要**: DeleteキーまたはBackspaceキーで矩形を削除できるようにする。

**変更内容**:
- `onNodesDelete`ハンドラの追加（ERCanvasInner内）:
  ```typescript
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        if (node.type === 'rectangleNode') {
          dispatch(actionRemoveRectangle, node.id);
        }
      });
    },
    [dispatch]
  );
  ```
- ReactFlowコンポーネントに`onNodesDelete={onNodesDelete}`を追加

**注意事項**:
- エンティティノードの削除は対象外（仕様に含まれていない）
- 矩形ノードのみを削除対象とする

---

## テストタスク

### □ rectangleActionsのテスト実装

**ファイル**: `public/tests/actions/rectangleActions.test.ts`

**概要**: rectangleActionsは既に実装済みだが、actionUpdateRectangleStyleとactionRemoveRectangleのテストが不足している場合は追加する。

**確認事項**:
- 既存のテストファイルを確認し、不足しているテストケースがあれば追加
- すべてのActionが正しく動作することを確認

---

## ビルド・テスト確認タスク

### □ コード生成の実行

**コマンド**: `npm run generate`

**概要**: TypeSpecから型定義を生成し、最新の型がフロントエンドとバックエンドに反映されることを確認する。

**注意事項**:
- 今回の変更ではTypeSpecの変更はないため、型定義に変化はないはず
- 念のため実行して確認

---

### □ ビルドの確認

**コマンド**: `cd public && npm run build`

**概要**: フロントエンドのビルドが成功することを確認する。

**確認ポイント**:
- TypeScriptのコンパイルエラーがないこと
- ビルドが正常に完了すること

---

### □ テストの実行

**コマンド**: `npm run test`

**概要**: すべてのテストが成功することを確認する。

**確認ポイント**:
- 新規追加したテストが成功すること
- 既存のテストに影響がないこと

---

## 実装しないこと（仕様書で明示的に除外されている項目）

- サイドバーの開閉アニメーション（MVPでは実装しない）
- レスポンシブ対応（MVPでは固定幅）
- デバウンス処理（パフォーマンス問題が発生した場合のみ将来検討）
- 一括編集機能（複数矩形選択時の編集は未対応）
- カラーピッカーのアコーディオン開閉（デフォルトで常時表示）
- カスタムプリセット色の保存機能（将来的な拡張）
- ColorPickerWithPresetsのテスト（指示者の判断により不要）
- RectanglePropertyPanelのテスト（指示者の判断により不要）

---

## 懸念事項（作業対象外）

**注意**: 以下の懸念事項は実装後に指示者が確認します。

### UI/UX関連

- カラーピッカーのサイズや配置が右サイドバー（300px幅）に収まるか
  - react-colorfulのデフォルトサイズ（約200px）で問題ないか
  - 必要に応じてCSSでサイズ調整

- プロパティパネル内のスクロール挙動
  - カラーピッカー2つ + その他のUIを縦に配置した際、300px幅のサイドバー内で快適にスクロールできるか

### 技術的懸念

- React FlowのonSelectionChangeイベントの動作
  - ドキュメント上は期待通りの動作をするはずだが、実装時に確認が必要
  - 複数選択やエンティティと矩形の混在選択時の挙動を確認

- react-colorfulのReact 19互換性
  - package.jsonでReact 19を使用しているが、react-colorfulがサポートしているか
  - 実装時にエラーが発生する可能性あり

---

## 事前修正提案

特になし。現在の実装状況で矩形プロパティパネル機能を追加できる準備が整っている。
