# タスク一覧: テキスト描画機能の拡張（垂直配置・背景色・自動選択・空テキスト削除）

## 概要

`spec/text_drawing_feature.md`の仕様更新に基づき、テキスト描画機能に以下の機能を追加する：
- テキストの垂直配置（上寄せ/中央/下寄せ）
- テキストの背景色設定（有効/無効、色、不透明度）
- 透明度の分離（文字の透明度と背景の透明度）
- テキスト追加時の自動選択
- ダブルクリックでの編集開始
- 空テキストの自動削除

**参照仕様書**:
- [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) - テキスト描画機能仕様（メイン）
- [scheme/main.tsp](./scheme/main.tsp) - 型定義

**背景情報**:
- 直前のコミット差分で`TextVerticalAlign` enumと`TextBox`モデルに新フィールド（`textVerticalAlign`, `backgroundColor`, `backgroundEnabled`, `backgroundOpacity`）が追加された
- 既存のテキスト機能は実装済みだが、新しい仕様に対応する必要がある

## 実装タスク

### 型定義の生成

- [ ] 型定義の再生成を実行
  ```bash
  cd /home/kuni/Documents/er-viewer
  npm run generate
  ```
  - `scheme/main.tsp`の変更を反映
  - `lib/generated/api-types.ts`と`public/src/api/client`の型が更新される

### アクション層の拡張

- [ ] `public/src/actions/textActions.ts`に`actionUpdateTextBackground`関数を追加
  - 引数: `(vm: ViewModel, textId: string, backgroundPatch: { backgroundColor?: string; backgroundEnabled?: boolean; backgroundOpacity?: number })`
  - 戻り値: `ViewModel`
  - 実装方針:
    - 既存の`actionUpdateTextStyle`と同様の実装パターンを踏襲
    - 変更がない場合は同一参照を返す
    - 部分更新に対応（指定されたプロパティのみ更新）
  - 参考: `actionUpdateTextStyle`（行227-280）、`actionUpdateTextShadow`（行357-413）

- [ ] `public/src/actions/textActions.ts`の`actionUpdateTextStyle`関数を修正
  - `stylePatch`の型に`textVerticalAlign?: components['schemas']['TextVerticalAlign']`を追加
  - `hasChanges`の判定に`textVerticalAlign`を追加
  - 更新処理に`textVerticalAlign`を追加

### テキストレンダリングの拡張

- [ ] `public/src/components/ERCanvas.tsx`の`renderTexts`関数を修正（行527-589）
  - 背景色のレンダリング対応:
    - 外側のコンテナに`backgroundColor`スタイルを追加
    - `text.backgroundEnabled`が`true`の場合のみ背景色を適用
    - HEXカラーをRGBAに変換して`backgroundOpacity`と組み合わせる（例: `rgba(255, 255, 255, ${text.backgroundOpacity})`）
  - 文字色の透明度対応:
    - 現在の`opacity`スタイルを削除
    - `color`スタイルでRGBAに変換して`text.opacity`を適用（例: `rgba(0, 0, 0, ${text.opacity})`）
  - 垂直配置の実装:
    - 外側のコンテナを`display: flex`に変更
    - 内側のテキストコンテナを`<div>`で追加
    - `alignItems`を使用して垂直配置を実装:
      - `top`: `flex-start`
      - `middle`: `center`
      - `bottom`: `flex-end`
  - シャドウの修正:
    - 現在の`boxShadow`を`textShadow`に変更（文字に影を付ける）
    - 内側のテキストコンテナに`textShadow`を適用
  - 実装方針:
    - 既存のスタイル計算を活かしつつ、新しいスタイルを追加
    - HEXカラーをRGBAに変換するヘルパー関数を実装（例: `hexToRgba(hex: string): { r: number; g: number; b: number }`）

- [ ] `public/src/components/ERCanvas.tsx`の編集UI（`<textarea>`）を修正（行698-744）
  - 背景色のスタイルを追加
  - 文字色の透明度を反映
  - 垂直配置に対応（編集UIでは上寄せ固定でも可）

### ダブルクリック編集の実装

- [ ] `public/src/components/ERCanvas.tsx`の`renderTexts`関数を修正
  - テキストの`<div>`に`onDoubleClick`イベントハンドラを追加
  - `onDoubleClick`で編集モード開始（`setEditingTextId`、`setEditingTextDraft`を設定）
  - 実装方針:
    - 既存の編集モード開始処理（F2キー）と同じロジックを使用
    - シングルクリックの選択処理と競合しないように`stopPropagation`を適切に使用

### テキスト追加時の自動選択

- [ ] `public/src/components/ERCanvas.tsx`の`handleAddText`関数を修正（行801-830）
  - `actionAddText`の後に`actionSelectItem`をdispatch
  - `actionSelectItem(newViewModel, { kind: 'text', id: newText.id })`を実行
  - デフォルト値に新しいフィールドを追加:
    - `content: "テキスト"`に変更
    - `textVerticalAlign: 'top'`を追加
    - `backgroundColor: "#FFFFFF"`を追加
    - `backgroundEnabled: false`を追加
    - `backgroundOpacity: 1.0`を追加

### 空テキストの自動削除

- [ ] `public/src/components/ERCanvas.tsx`内のメインコンポーネントに`useEffect`を追加
  - `selectedItem`を監視
  - 選択が変更された時、前回選択されていたテキストの`content`が空文字列（`""`）の場合、`actionRemoveText`をdispatch
  - 実装方針:
    - `useRef`で前回の`selectedItem`を保持
    - 選択が解除された時（`selectedItem`がnullまたは別のアイテムに変わった時）、前回のアイテムが`kind === 'text'`かつ`content === ""`なら削除
    - 無限ループを防ぐため、依存配列を適切に設定

### プロパティパネルの拡張

- [ ] `public/src/components/TextPropertyPanel.tsx`に垂直配置ボタンを追加
  - 水平配置ボタン（行240-266）と同様のトグルボタンを実装
  - ボタンのラベル: 「上」「中央」「下」
  - `handleTextVerticalAlignChange`ハンドラを実装
  - `actionUpdateTextStyle`で`textVerticalAlign`を更新

- [ ] `public/src/components/TextPropertyPanel.tsx`に背景色設定を追加
  - 背景色セクションを「文字色」セクション（行268-307）の後に追加
  - 実装内容:
    - 有効/無効トグル（`checkbox`）
    - 背景色（`ColorPickerWithPresets`コンポーネントを使用、矩形と同じ8色プリセット）
    - 背景の透明度（スライダー、0〜1）
  - ハンドラを実装:
    - `handleBackgroundEnabledChange`: `actionUpdateTextBackground`をdispatch
    - `handleBackgroundColorChange`: `actionUpdateTextBackground`をdispatch
    - `handleBackgroundOpacityChange`: `actionUpdateTextBackground`をdispatch

- [ ] `public/src/components/TextPropertyPanel.tsx`の「透明度」ラベルを修正
  - 行310-323の「透明度」ラベルを「文字の透明度」に変更
  - 仕様書に合わせて明確化

### テストの更新

- [ ] `public/tests/actions/textActions.test.ts`に`actionUpdateTextBackground`のテストを追加
  - 背景色プロパティが部分更新されることをテスト
  - 全ての背景色プロパティを更新できることをテスト
  - 変化がない場合は同一参照を返すことをテスト
  - 存在しないIDの場合は同一参照を返すことをテスト
  - 参考: `actionUpdateTextShadow`のテスト（行477-536）

- [ ] `public/tests/actions/textActions.test.ts`の`actionUpdateTextStyle`のテストを更新
  - `textVerticalAlign`プロパティの更新をテスト
  - 行376-396の「全てのスタイルプロパティを更新できる」テストに`textVerticalAlign: 'middle'`を追加

- [ ] `public/tests/actions/textActions.test.ts`のモックデータに新しいフィールドを追加
  - `createMockViewModel`関数（行22-78）のテキストデータに以下を追加:
    - `textVerticalAlign: 'top'`
    - `backgroundColor: '#FFFFFF'`
    - `backgroundEnabled: false`
    - `backgroundOpacity: 1.0`

### ビルド確認

- [ ] フロントエンドのビルドを実行
  ```bash
  cd /home/kuni/Documents/er-viewer/public
  npm run build
  ```
  - エラーが出ないことを確認する

### テストの実行

- [ ] テストの実行（ルートディレクトリから）
  ```bash
  cd /home/kuni/Documents/er-viewer
  npm run test
  ```
  - すべてのテストがpassすることを確認する

## 実装時の注意事項

### HEXカラーをRGBAに変換するヘルパー関数

`ERCanvas.tsx`内に以下のようなヘルパー関数を実装すると便利です：

```typescript
function hexToRgba(hex: string, alpha: number): string {
  // "#RRGGBB" 形式を想定
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

### テキストシャドウのCSS生成

現在の`boxShadow`は`text-shadow`形式に変更します。`text-shadow`は`box-shadow`と異なり、`spread`をサポートしていないため、`spread`は無視するか、実装から削除します。

```typescript
const textShadow = text.shadow.enabled
  ? `${text.shadow.offsetX}px ${text.shadow.offsetY}px ${text.shadow.blur}px rgba(${r}, ${g}, ${b}, ${text.shadow.opacity})`
  : 'none';
```

### 垂直配置の実装

外側のコンテナと内側のテキストコンテナを分離する必要があります：

```tsx
<div style={{ /* 外側のコンテナ: 位置・サイズ・背景色 */ }}>
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: text.textVerticalAlign === 'top' ? 'flex-start' : 
                     text.textVerticalAlign === 'middle' ? 'center' : 'flex-end',
    height: '100%',
    /* テキストスタイル（色、フォント、影など） */
  }}>
    {text.content}
  </div>
</div>
```

### 空テキストの自動削除の実装

`useEffect`と`useRef`を組み合わせて実装します：

```typescript
const prevSelectedItem = useRef<LayerItemRef | null>(null);

useEffect(() => {
  const prev = prevSelectedItem.current;
  
  // 前回選択されていたアイテムがテキストで、現在は別のアイテム（またはnull）が選択されている場合
  if (prev && prev.kind === 'text' && 
      (!selectedItem || selectedItem.kind !== prev.kind || selectedItem.id !== prev.id)) {
    const text = texts[prev.id];
    if (text && text.content === '') {
      dispatch(actionRemoveText, prev.id);
    }
  }
  
  prevSelectedItem.current = selectedItem;
}, [selectedItem, texts, dispatch]);
```

### ColorPickerWithPresetsコンポーネントの使用

背景色のカラーピッカーは既存の`ColorPickerWithPresets`コンポーネント（`public/src/components/ColorPickerWithPresets.tsx`）を使用します。矩形プロパティパネル（`RectanglePropertyPanel.tsx`）に同様の実装例があります。

## MVP範囲外（今回は実装しない）

以下は仕様書に記載されているが、今回のタスクでは実装しない機能です：

- Undo/Redo機能（空テキスト自動削除の誤操作対策）
- テキストの回転機能
- テキストのリッチテキスト対応（太字・斜体・リンク等）
- テキストの角丸設定（borderRadius）
- フォント選択機能（システムフォント固定）

## 懸念事項・確認事項

### 技術的懸念

- 背景色と垂直配置を追加することでレンダリングパフォーマンスへの影響（flexboxの使用）
  - 影響度は低いと予想されるが、大量のテキストを配置した場合の挙動を確認すること
- 空テキスト自動削除のタイミングで、ユーザーが意図せず削除してしまう可能性（Undo機能がないため）
  - 仕様上、デフォルト値が`"テキスト"`になったため、意図しない削除の可能性は低い
- `text-shadow`の`spread`サポートがないため、影の表現が制限される
  - 仕様書ではドロップシャドウとして記載されているが、実装上は`text-shadow`を使用

### 既存実装との整合性

- 現在の`ERCanvas.tsx`のテキストレンダリング（行527-589）は`boxShadow`を使用しているが、仕様書では`text-shadow`を使用すると記載されている
  - 今回の修正で`text-shadow`に統一する
- 既存のテストデータは旧フィールドのみ含んでいるため、新フィールドを追加する必要がある
