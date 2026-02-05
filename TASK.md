# タスク一覧

## 概要

仕様書の更新により、透明度UIの表現方法が明確化されました。
内部的には「不透明度」(opacity: 0〜1)として保存するが、UIでは「透明度」(0%〜100%)として表示・入力する仕様に変更されました。
また、矩形のデフォルト不透明度が0.5から1.0（透明度0%、完全不透明）に変更されました。

## 参照するべき仕様書

- [spec/rectangle_drawing_feature.md](./spec/rectangle_drawing_feature.md) - 矩形描画機能の仕様（デフォルト値変更）
- [spec/rectangle_property_panel.md](./spec/rectangle_property_panel.md) - 矩形プロパティパネルの仕様（透明度UIの変換ロジック）
- [spec/text_drawing_feature.md](./spec/text_drawing_feature.md) - テキスト描画機能の仕様（文字・背景の透明度UIの変換ロジック）
- [scheme/main.tsp](./scheme/main.tsp) - 型定義（不透明度のコメント更新）

## 変更内容の詳細

### 透明度UIの変換ロジック

**内部値（不透明度）とUI値（透明度）の変換**:
- UI表示値: `透明度% = (1 - opacity) × 100`
- UI入力値から内部値への変換: `opacity = 1 - (透明度% / 100)`
- 意味: 0% = 完全不透明、100% = 完全透明

**変換が必要な箇所**:
- 矩形の透明度
- テキストの文字の透明度
- テキストの背景の透明度

**変換が不要な箇所**:
- ドロップシャドウの透明度（現状維持、不透明度として扱う）

### デフォルト値の変更

矩形作成時のデフォルト不透明度:
- 変更前: `opacity: 0.5`（透明度50%）
- 変更後: `opacity: 1.0`（透明度0%、完全不透明）

## 実装タスク

### - [ ] RectanglePropertyPanel.tsx の透明度UIを変換ロジックに対応

**ファイル**: `public/src/components/RectanglePropertyPanel.tsx`

**変更箇所**: 29-32行目（ハンドラ）、70-84行目（UI）

**変更内容**:

1. **透明度の表示値を変換**（73行目）:
   ```typescript
   // 変更前
   透明度: {Math.round(rectangle.opacity * 100)}%
   
   // 変更後
   透明度: {Math.round((1 - rectangle.opacity) * 100)}%
   ```

2. **スライダーの値を変換**（80行目）:
   ```typescript
   // 変更前
   value={rectangle.opacity}
   
   // 変更後
   value={1 - rectangle.opacity}
   ```

3. **ハンドラで入力値を変換**（29-32行目）:
   ```typescript
   // 変更前
   const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const opacity = parseFloat(e.target.value);
     dispatch(actionUpdateRectangleStyle, rectangleId, { opacity });
   };
   
   // 変更後
   const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const transparencyValue = parseFloat(e.target.value);
     const opacity = 1 - transparencyValue;
     dispatch(actionUpdateRectangleStyle, rectangleId, { opacity });
   };
   ```

### - [ ] TextPropertyPanel.tsx の文字の透明度UIを変換ロジックに対応

**ファイル**: `public/src/components/TextPropertyPanel.tsx`

**変更箇所**: 77-79行目（ハンドラ）、394-408行目（UI）

**変更内容**:

1. **文字の透明度の表示値を変換**（397行目）:
   ```typescript
   // 変更前
   文字の透明度: {Math.round(text.opacity * 100)}%
   
   // 変更後
   文字の透明度: {Math.round((1 - text.opacity) * 100)}%
   ```

2. **スライダーの値を変換**（404行目）:
   ```typescript
   // 変更前
   value={text.opacity}
   
   // 変更後
   value={1 - text.opacity}
   ```

3. **ハンドラで入力値を変換**（77-79行目）:
   ```typescript
   // 変更前
   const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const opacity = parseFloat(e.target.value);
     dispatch(actionUpdateTextStyle, textId, { opacity });
   };
   
   // 変更後
   const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const transparencyValue = parseFloat(e.target.value);
     const opacity = 1 - transparencyValue;
     dispatch(actionUpdateTextStyle, textId, { opacity });
   };
   ```

### - [ ] TextPropertyPanel.tsx の背景の透明度UIを変換ロジックに対応

**ファイル**: `public/src/components/TextPropertyPanel.tsx`

**変更箇所**: 72-75行目（ハンドラ）、429-443行目（UI）

**変更内容**:

1. **背景の透明度の表示値を変換**（432行目）:
   ```typescript
   // 変更前
   背景の透明度: {Math.round(text.backgroundOpacity * 100)}%
   
   // 変更後
   背景の透明度: {Math.round((1 - text.backgroundOpacity) * 100)}%
   ```

2. **スライダーの値を変換**（439行目）:
   ```typescript
   // 変更前
   value={text.backgroundOpacity}
   
   // 変更後
   value={1 - text.backgroundOpacity}
   ```

3. **ハンドラで入力値を変換**（72-75行目）:
   ```typescript
   // 変更前
   const handleBackgroundOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const backgroundOpacity = parseFloat(e.target.value);
     dispatch(actionUpdateTextBackground, textId, { backgroundOpacity });
   };
   
   // 変更後
   const handleBackgroundOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const transparencyValue = parseFloat(e.target.value);
     const backgroundOpacity = 1 - transparencyValue;
     dispatch(actionUpdateTextBackground, textId, { backgroundOpacity });
   };
   ```

### - [ ] ERCanvas.tsx の矩形デフォルト値を変更

**ファイル**: `public/src/components/ERCanvas.tsx`

**変更箇所**: 889行目

**変更内容**:

矩形作成時のデフォルト不透明度を変更:

```typescript
// 変更前（889行目）
opacity: 0.5,

// 変更後
opacity: 1.0,
```

### - [ ] コード生成を実行

**コマンド**: `npm run generate`

**説明**: `scheme/main.tsp`から型定義を生成します。

### - [ ] テストを実行

**コマンド**: `npm run test`

**説明**: 実装変更後にテストが通ることを確認します。

### - [ ] ビルド確認

**コマンド**: `npm run build` または適切なビルドコマンド

**説明**: 実装変更後にビルドエラーがないことを確認します。

## 注意事項

- ドロップシャドウの透明度（`textShadow.opacity`、`backgroundShadow.opacity`）は変換しないでください（現状維持、不透明度として扱う）
- スライダーの`min`と`max`は`0`と`1`のままでOKです（内部的に0〜1の範囲を扱うため）
- 表示値のみパーセント表記に変換します
- 型定義（`scheme/main.tsp`）は既に更新済みなので、変更不要です
- 仕様書は既に更新済みなので、変更不要です

## 懸念事項

特になし。仕様が明確に定義されており、変更範囲も限定的です。
