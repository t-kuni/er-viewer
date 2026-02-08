# タスク一覧

## 概要

仕様書で用語を「リバースエンジニア」から「DBからリバース」に統一したため、フロントエンドの表示を仕様に合わせて修正する。

仕様書の参照:
- [spec/database_connection_settings.md](/home/kuni/.cursor/worktrees/er-viewer/fwq/spec/database_connection_settings.md)
- [spec/reverse_engineering.md](/home/kuni/.cursor/worktrees/er-viewer/fwq/spec/reverse_engineering.md)
- [spec/reverse_engineering_history.md](/home/kuni/.cursor/worktrees/er-viewer/fwq/spec/reverse_engineering_history.md)

## 実装タスク

### フロントエンドの修正

#### public/src/components/App.tsx の修正

- [x] 「リバースエンジニア」ボタンを動的ラベルに変更
  - 履歴の配列長が0または1の場合: 「DBからリバース」
  - 履歴の配列長が2以上の場合: 「DBから増分リバース」
  - 180行目のボタンラベルを動的に変更する
  - `erDiagram.history`の配列長を確認してラベルを決定する
  - 参考: [spec/reverse_engineering.md](/home/kuni/.cursor/worktrees/er-viewer/fwq/spec/reverse_engineering.md) の「UI要素」セクション

- [x] 「履歴」ボタンのラベルを「リバース履歴」に変更
  - 247行目のボタンラベルを変更する
  - 参考: [spec/reverse_engineering_history.md](/home/kuni/.cursor/worktrees/er-viewer/fwq/spec/reverse_engineering_history.md) の「配置とアクセス方法」セクション

- [x] ヘッダーボタンの配置順序を変更
  - 現在の順序: リバースエンジニア / 配置最適化 / レイヤー / エクスポート / インポート / 履歴 / ビルド情報
  - 新しい順序: DBからリバース（または DBから増分リバース） / リバース履歴 / 配置最適化 / レイヤー / エクスポート / インポート / ビルド情報
  - 「リバース履歴」ボタンを「DBからリバース」ボタンの右隣に配置する
  - 参考: [spec/reverse_engineering_history.md](/home/kuni/.cursor/worktrees/er-viewer/fwq/spec/reverse_engineering_history.md) の「配置とアクセス方法」セクション

#### public/src/components/HistoryPanel.tsx の修正

- [x] パネルタイトルを「リバース履歴」に変更
  - 281行目の `<h3>` タグ内のテキストを「リバースエンジニアリング履歴」から「リバース履歴」に変更
  - 参考: [spec/reverse_engineering_history.md](/home/kuni/.cursor/worktrees/er-viewer/fwq/spec/reverse_engineering_history.md) の「配置とアクセス方法」セクション

## ビルド確認

- [x] コード生成を実行する
  - `npm run generate` を実行

- [x] ビルドが成功することを確認
  - ビルドエラーがないことを確認
  - TypeScriptの型エラーがないことを確認

## テスト実行

- [x] テストを実行して、既存の機能が壊れていないことを確認
  - `npm run test` を実行
  - すべてのテストが成功することを確認
  - 特に `ReverseEngineerUsecase.test.ts` のテストに注目

## 備考

- コメント内の「リバースエンジニア」という表記は修正対象外（コードの動作に影響しないため）
- テストコード内の英語表記（reverse engineer）も修正対象外
- バックエンドのコードには「リバースエンジニア」という日本語表記がないため修正不要
