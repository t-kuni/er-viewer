## 1. データ構造の設計案

### 履歴情報の保持場所（推奨：Option B）

**推奨：Option B（`ERDiagramViewModel.history`）**

* **Option A（`ViewModel.history`）**

  * メリット: 参照しやすい。将来「複数ダイアグラム」概念が無いなら単純。
  * デメリット: “ER図そのもののデータ” なのにトップ直下が肥大化しやすい。将来ダイアグラムが複数になった場合に粒度が合わない。

* **Option B（`ERDiagramViewModel.history`）**

  * メリット: ER図データに強く紐づく（リバース結果＝ER図の変遷）。ER図をリセット/新規作成したときに履歴も自然にリセットできる。
  * デメリット: 履歴UIがグローバル配置の場合、selectorが少し深くなる程度。

* **Option C（`AppSettings.reverseEngineeringHistory`）**

  * デメリットが大きい: settingsは「ユーザー設定・接続設定」寄りで、ER図データの履歴を入れると責務が混ざる。インポート時に “設定だけ” 置換/維持したい要件が出ると破綻しやすい。

---

### 履歴情報のデータ構造（推奨：中間案＝“詳細だがフラット”）

「詳細構造例」ほどの深いネストは不要だが、UI表示と将来拡張のため **“変更種別ごとに配列を分け、modifiedは before/after を機械可読で持つ”** を推奨。

* **初回リバース**: `timestamp` + `type="initial"` +（任意で）件数サマリだけ
  ※要件上は timestamp のみで良いが、UIの一覧で意味が出やすいので「テーブル数・カラム数・リレーション数」を持たせるのが実用的（名前一覧は不要）。
* **増分リバース**: 追加/削除/変更の“対象一覧”を保持

  * テーブル: name
  * カラム: (tableName, columnName)
  * 変更カラム: (tableName, columnName, before, after)
  * リレーション: constraintName が取れるならそれを主キーに、取れないケースのため endpoints も保持

#### TypeSpecモデル案（MVP向け）

```tsp
model ReverseEngineeringHistoryEntry {
  timestamp: int64; // unix ms 推奨
  type: "initial" | "incremental";

  // UIの一覧に必要な最小サマリ（初回にも使える）
  summary?: ReverseEngineeringSummary;

  // incremental のときのみ基本的に入る（初回は省略でOK）
  changes?: ReverseEngineeringChanges;
}

model ReverseEngineeringSummary {
  addedTables: int32;
  removedTables: int32;
  addedColumns: int32;
  removedColumns: int32;
  modifiedColumns: int32;
  addedRelationships: int32;
  removedRelationships: int32;

  // 初回用（任意）
  totalTables?: int32;
  totalColumns?: int32;
  totalRelationships?: int32;
}

model ReverseEngineeringChanges {
  tables?: TableChanges;
  columns?: ColumnChanges;
  relationships?: RelationshipChanges;
}

model TableChanges {
  added?: string[];
  removed?: string[];
}

model ColumnChanges {
  added?: ColumnRef[];
  removed?: ColumnRef[];
  modified?: ColumnModification[];
}

model ColumnRef {
  tableName: string;
  columnName: string;
}

model ColumnSnapshot {
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  extra: string;
  isForeignKey: boolean;
}

model ColumnModification {
  tableName: string;
  columnName: string;
  before: ColumnSnapshot;
  after: ColumnSnapshot;
}

model RelationshipChanges {
  added?: RelationshipRef[];
  removed?: RelationshipRef[];
}

model RelationshipRef {
  constraintName?: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}
```

#### ViewModelへの追加（Option B）

```tsp
model ERDiagramViewModel {
  // ...
  history?: ReverseEngineeringHistoryEntry[];
}
```

---

## 2. 差分検出ロジックの実装方法

### 実装場所（推奨：検出ロジックは別純粋関数、呼び出しは `actionMergeERData`）

* **推奨構成**

  * `detectSchemaChanges(prevVm, nextErData) => { summary, changes }`（純粋関数）
  * `actionMergeERData` は

    1. 初回/増分判定
    2. 差分検出（増分のみ）
    3. 既存のマージ処理
    4. 履歴append
       をまとめて行う

理由: 検出ロジックの単体テストが書きやすく、`actionMergeERData` の巨大化を抑えられる。

---

### 差分検出アルゴリズム（テーブル/カラム/リレーション）

#### テーブル（エンティティ）

* **キー**: テーブル名（現状どおり）
* `prevTables = Set(prev.nodes[*].name)`
* `nextTables = Set(erData.tables[*].name)`（ERData側の実データ構造に合わせる）
* `addedTables = next - prev`
* `removedTables = prev - next`

#### カラム

* 対象は「マッチしたテーブル」だけ（削除されたテーブル内のカラム差分は、テーブル削除として十分）
* **キー**: カラム名（要件どおり）

  * `prevCols = Map(columnName -> ColumnSnapshot)`（prevの該当テーブル）
  * `nextCols = Map(columnName -> ColumnSnapshot)`（next）
* `addedColumns = nextKeys - prevKeys`
* `removedColumns = prevKeys - nextKeys`
* `modifiedColumns = intersectionKeys` のうち `snapshot` が不一致のもの

  * 比較対象: `type, nullable, key, default, extra, isForeignKey`

#### リレーション

* **第一キー候補**: `constraintName`（取れるなら最優先）
* **フォールバックキー**: `${fromTable}.${fromColumn}->${toTable}.${toColumn}`（＋必要なら逆向きも同一扱いにする）
* `prevRels = Map(relKey -> RelationshipRef)`
* `nextRels = Map(relKey -> RelationshipRef)`
* `addedRelationships = nextKeys - prevKeys`
* `removedRelationships = prevKeys - nextKeys`

---

### 初回/増分の区別

* 初回判定: 現状仕様に合わせて `prev.erDiagram.nodes` が空なら初回
* 初回は差分検出スキップでOK

  * 履歴は `type="initial"` とし、`summary.totalTables/totalColumns/totalRelationships` だけ埋める（任意）

---

### 複雑さとパフォーマンス

* Map/Setを使えば概ね **O(テーブル数 + カラム数 + リレーション数)**。
* MVP前提なら十分軽い。対策するとしたら

  * snapshot生成を必要なフィールドだけに限定（DDL等は入れない）
  * 変更が無い場合は履歴を追加しない（または “no changes” を追加しない）

---

## 3. UI設計案

### 配置（推奨：右サイドバー（折りたたみ可能）＋ヘッダーボタン）

* 右側は未実装なので **「履歴パネル」用に最適**。
* ヘッダーに「履歴」ボタンを追加し、`ui.showHistoryPanel` をトグル。
* ボタンの位置: **インポート/エクスポートの近く**が自然なので、
  `レイヤー / エクスポート / インポート / 履歴 / ビルド情報` を推奨。

### 表示内容（一覧＋各エントリ折りたたみ）

* 一覧（新しい順でも古い順でも可。要件は時系列蓄積なので表示は好みだが、見る用途的には新しい順が多い）

  * 日時
  * 初回/増分
  * サマリー（例: +tables/-tables/+cols/-cols/~cols/+rels/-rels）
* 詳細（折りたたみ内部）

  * 追加/削除テーブル名
  * 追加/削除カラム（table.column）
  * 変更カラム（table.column と before/after の差分をUI側で整形）
  * 追加/削除リレーション（constraintName or endpoints）

---

### 折りたたみUI（推奨：まず自前、必要ならRadixかReact Aria）

**MVPは自前で十分**（追加ライブラリ不要）。選択肢は2つ。

1. **HTMLの`<details><summary>`**

* 実装が最小、アクセシビリティも標準で担保しやすい
* デザイン制御はCSS工夫が必要

2. **React stateでアコーディオン**

* 1エントリごとに `expandedIds: Set<HistoryId>` を持つ（UI state）
* “同時に複数開く/一つだけ開く” を仕様で選べる

**ライブラリを入れるなら（2026時点での活動が確認しやすいもの）**

* `@radix-ui/react-accordion`（WAI-ARIAパターン準拠を明記、npmで継続更新が確認できる）([radix-ui.com][1])
* `@headlessui/react` の `Disclosure`（アコーディオン用途として公式に説明されている）([headlessui.com][2])
* React Aria / React Spectrum 側のAccordion/Disclosure（公式リリースで提供が確認できる）([react-spectrum.adobe.com][3])

#### インストール（必要な場合）

* Radix: `npm i @radix-ui/react-accordion` ([npmjs.com][4])
* Headless UI: `npm i @headlessui/react` ([headlessui.com][2])

---

## 4. インポート・エクスポートへの統合方法

### エクスポート

* Option B採用なら、現行の “ViewModelをJSON化” に自然に含まれる（`erDiagram.history`）。
* **全件エクスポートで良い**（MVP）

  * サイズ懸念が出たら、`history` を最大N件に丸めてから書き出す（ただし要件上、まずは不要）

### インポート

* 現状のインポートは “読み込んだViewModelをStoreに設定” なので、履歴も **置き換え** が自然。
* バリデーション

  * セキュリティは考慮しない前提でも、実装の安定性のために最低限

    * `history` が配列なら受理、無ければ `[]`
    * entryの `timestamp/type` の型チェック程度
  * 不正なら履歴だけ捨ててインポート継続、がMVP向けに扱いやすい

---

## 5. 実装計画

### 推奨順序（概ね提示どおりでOK、ただし“検出ロジックのテスト”を早めに）

1. **型定義（TypeSpec）**

   * `ReverseEngineeringHistoryEntry` 一式
   * `ERDiagramViewModel.history?: ...[]`
   * UIトグル用に `GlobalUIState.showHistoryPanel?: boolean`（既存の`showLayerPanel`に倣う）
2. **差分検出（純粋関数）＋ユニットテスト**

   * `detectSchemaChanges(prevVm, erData)` を追加
   * テーブル追加/削除、カラム追加/削除/変更、リレーション追加/削除のケースを最小セットでテスト
3. **Action統合**

   * `actionMergeERData` に

     * 初回なら initial entry を append
     * 増分なら `detectSchemaChanges` 結果を append（変更ゼロなら appendしない、も可）
   * 参照同一性（変更無しなら同一参照返却）を壊さないよう、history append時だけ新配列にする
4. **UI（右パネル＋アコーディオン）**

   * ヘッダーボタン追加（toggle）
   * パネル内で `history` を一覧表示し、各entryを折りたたみ
5. **インポート/エクスポート確認**

   * 既存処理で含まれることの確認
   * インポート補完処理で `history` が無い/壊れている時の扱いを追加

---

## 6. 他のプロジェクトでの事例

* **Flyway**: スキーマ変更の適用履歴をDB内の “schema history table” に保持し、いつ誰が適用したか・チェックサム・成功可否などを監査証跡として扱う、という位置づけ。([documentation.red-gate.com][5])
* **Liquibase**: 適用済みchangesetを `DATABASECHANGELOG` テーブルで追跡し、未適用だけを実行する仕組み。([docs.liquibase.com][6])
* **Prisma Migrate**: マイグレーション履歴（適用状況）を持つ前提で設計されており、履歴の概念が公式に説明されている。([Prisma][7])

この3系統に共通するのは「**差分そのもの（diff）ではなく、“変更の記録（いつ何が適用されたか）” を時系列で保持する**」点で、今回の “増分リバースの変更点を人が追える” という目的に近いです。

[1]: https://www.radix-ui.com/primitives/docs/components/accordion?utm_source=chatgpt.com "Accordion – Radix Primitives"
[2]: https://headlessui.com/react/disclosure?utm_source=chatgpt.com "Disclosure"
[3]: https://react-spectrum.adobe.com/v3/releases/2024-11-20.html?utm_source=chatgpt.com "November 20, 2024 Release - React Spectrum - Adobe"
[4]: https://npmjs.com/package/%40radix-ui/react-accordion?ref=pkgstats.com&utm_source=chatgpt.com "radix-ui/react-accordion"
[5]: https://documentation.red-gate.com/fd/flyway-schema-history-table-273973417.html?utm_source=chatgpt.com "Flyway schema history table"
[6]: https://docs.liquibase.com/pro/user-guide-4-33/what-is-the-databasechangelog-table?utm_source=chatgpt.com "Pro 4.33: What is the DATABASECHANGELOG table?"
[7]: https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/migration-histories?utm_source=chatgpt.com "About migration histories | Prisma Documentation"
