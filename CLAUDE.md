# ER Diagram Viewer

## プロジェクト概要
RDBからER図をリバースエンジニアリングし、ブラウザ上で視覚的に表示・編集できるWebアプリケーション。

## 技術スタック
- **バックエンド**: Node.js + Express + MySQL2
- **フロントエンド**: Vanilla JavaScript (ES6 modules) + SVG
- **テスト**: Jest + jsdom + Testing Library
- **デプロイ**: Docker + Docker Compose

## 開発環境セットアップ
```bash
# サービス起動
docker compose up -d

# サービス状態確認
docker compose ps
```

## 利用可能なコマンド
```bash
# 開発
npm run dev                    # 開発サーバー起動

# テスト
npm test                       # 全テスト実行
```

## 開発フロー
1. **要件確認**: SPEC.mdの要件を満たすソフトウェアを開発
2. **タスク完了条件**: `npm test` が通ること
3. **動作確認**: ブラウザ（Playwright）を使用（curlは非推奨）
   - ブラウザテスト時は必ずブラウザを再起動
4. **差分確認**: `git add -A && GIT_PAGER=cat git diff HEAD`

## テスト戦略
- **テストコード配置**: `/tests/` ディレクトリ
- **テスト対象**: 要件を満たしているかを検証（実装詳細ではない）
- **テスト範囲**: 1テストケースで広範囲をカバー（リファクタリング耐性向上）
- **モック方針**: 副作用のみをピンポイントでモック化
- **使用技術**: Jest + jsdom（Playwrightは使わない）

## アーキテクチャ概要
```
/public/js/
├── app.js                    # エントリーポイント
├── core/er-viewer-core.js    # コアロジック
├── events/                   # イベント処理
├── ui/                       # UI管理
├── rendering/                # SVG描画
├── state/                    # 状態管理
├── annotations/              # 注釈機能
└── utils/                    # ユーティリティ

/lib/
├── database.js               # MySQL操作
├── storage.js                # データ永続化
└── logger.js                 # ログ管理
```

## 主要機能
- **リバースエンジニアリング**: MySQL→ER図変換
- **増分リバース**: 既存レイアウト保持での差分反映
- **インタラクティブ編集**: エンティティ配置、注釈追加
- **レイヤー管理**: ドラッグ&ドロップでの描画順序変更
- **データ永続化**: レイアウト・注釈データの保存

## 環境変数設定
- **DB接続**: 環境変数でMySQL接続情報を設定
- **データ保存**: docker-compose volumeで保存先を管理

## 制約・注意点
- **初期開発フェーズ**: 永続化層の後方互換は不要
- **対応DB**: 現在はMySQLのみ（将来的に拡張予定）