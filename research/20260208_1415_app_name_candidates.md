## 1. 既存の類似ツール・サービスの名称調査（重複回避のための参考）

* **DB同梱・GUI系（リバース／ER図生成・閲覧）**

  * **Oracle MySQL Workbench**（MySQLのリバースエンジニアリング/ER図）([mysql.com][1])
  * **DBeaver**（ERD/図の表示機能を提供）([dbeaver.io][2])
  * **DbSchema**（ER図・スキーマ設計/同期/ドキュメント化）([dbschema.com][3])
  * **SQLDBM**（オンラインDBモデリング/ERD）([SqlDBM - Cloud Data Modeling Workspace][4])

* **ドキュメント生成・スキーマ可視化寄り**

  * **SchemaSpy**（DBメタデータからHTMLドキュメント/図を生成）([schemaspy.readthedocs.io][5])

* **Web/オンラインER図・DB図作成（名前が近い領域）**

  * **dbdiagram.io / DrawSQL / QuickDBD / ERDPlus** など([trevor.io][6])
  * **diagrams.net（draw.io）**（ER図を含む汎用ダイアグラム）([app.diagrams.net][7])

* **“ER Viewer” そのものが既に存在**

  * **SI Object Browser ER Viewer**（名称衝突しやすい）([システムインテグレータ][8])

* **近年の“スキーマ可視化”系の新規名称例**

  * **Sqeema**（DBスキーマ可視化/デザイナを謳う新規系）([Sqeema][9])

---

## 2. ER図ビューアであることが伝わる名称パターン

### 選択肢A：ER / EntityRelationship を含む（直接的）

* 形：`XER` / `ERX` / `X ER` / `ER X` / `X ERD`
* 例の型：**「（独自語）ER」**、**「ER（独自語）」**
* ねらい：一目で用途が伝わる／ただし **「ER Viewer」系は既に存在** するため避けたい([システムインテグレータ][8])

### 選択肢B：Schema / Diagram / Model / DB を含む（間接的）

* 形：`SchemaX` / `XSchema` / `DiagramX` / `XDiagram`
* ねらい：DB可視化ツール群と同じ語彙で理解されやすい反面、競合領域で使われがちな単語（Schema/Diagram）が多い([trevor.io][6])

### 選択肢C：造語・比喩（独自性重視）

* 形：構造・関係性・閲覧を想起（例：*weave / lattice / map / lens* 相当）＋（ER/Schema等の補助語）
* ねらい：固有性を上げつつ、補助語で用途を補強（例：造語＋ER）

---

## 3. 簡潔性と覚えやすさ（1語 / 2語）

* **選択肢A：1語**

  * 方針：`（造語）+ ER` や `ER +（造語）` のように **見た目は1語のまま用途を埋め込む**
  * 期待：短い・入力しやすい・差別化しやすい

* **選択肢B：2語**

  * 方針：`（独自語） ER` / `Schema （独自語）` のように **可読性で意味を通す**
  * 期待：初見理解は上がるが、一般名詞寄りになるほど固有性が落ちやすい

---

## 4. 具体的な名称候補（推奨順・10個以上）

|  # | 名称                | 由来・意味                                 | パターン         | メリット                   | デメリット                       | 既存サービスとの重複チェック結果                                                             |
| -: | ----------------- | ------------------------------------- | ------------ | ---------------------- | --------------------------- | ---------------------------------------------------------------------------- |
|  1 | **RelavueER**     | *relation*＋*vue(view)*＋ER（“関係を眺めるER”） | 2-A / 3-1語   | 「見る」ニュアンスが強い／固有性を作りやすい | 綴りを聞き取りにくい可能性               | 検索上位が別語（reliever等）で、同名DB/ERツールは確認できず([英辞郎][10])                              |
|  2 | **SchavueER**     | *schema*＋*vue*＋ER（“スキーマを眺めるER”）       | 2-A+B / 3-1語 | Schema/Viewer要素が入る／短い  | 造語感が強い                      | 検索上位は無関係語（schavuit等）で、同名DB/ERツールは確認できず([Wiktionary][11])                     |
|  3 | **KeylineER**     | “Keyline（要線）”＋ER（直角ポリライン/配線の連想）       | 2-A / 3-1語   | リレーション線表現と相性が良い／短い     | “keyline”の意味が一般に伝わりにくい      | 検索上位は別分野の投稿で、同名DB/ERツールは確認できず([Facebook][12])                                |
|  4 | **SchemaNavi**    | Schema＋Navigation（スキーマをナビする）          | 2-B / 3-2語相当 | 役割が直感的／発音しやすい          | Schema系名称が多く埋もれやすい          | 検索上位が別のSchema系名称で、同名DB/ERツールは確認できず([azeemnow.com][13])                       |
|  5 | **RelatticeER**   | *relation*＋*lattice*＋ER（関係の格子）        | 2-A+C / 3-1語 | 関係構造の比喩が強い／固有性を作りやすい   | “lattice”が人を選ぶ              | 検索上位が別語（relativiser等）で、同名DB/ERツールは確認できず([コトバンク][14])                         |
|  6 | **DiagramHarbor** | 図を“停泊/保管”する港（harbor）                  | 2-B / 3-2語   | 「保存・持ち運び・集約」の印象を出せる    | “Harbor”は別分野で著名（コンテナレジストリ等） | 検索上位がHarbor（別分野）で、同名DB/ERツールは確認できず([GitHub][15])                             |
|  7 | **ERVisor**       | ER＋visor（覗き窓/閲覧）                      | 2-A / 3-1語   | viewer感が強い／短い          | “supervisor”誤記由来の用例が混じりやすい  | 検索上位は“Supervisor”系が中心で、同名DB/ERツールは確認できず([SVANTEK - Sound and Vibration][16]) |
|  8 | **ERWeave**       | ERを“織る”（関係性を編む）                       | 2-A+C / 3-1語 | 関係性の比喩として自然            | 既存のハンドル名等に使われ得る             | “erweave”は個人/ハンドル等が上位で、同名DB/ERツールは確認できず([SoundCloud][17])                    |
|  9 | **ERGlyph**       | ER＋glyph（記号で可視化する）                    | 2-A+C / 3-1語 | 可視化ツールの印象が強い           | “glyph”が抽象的                 | “erglyph”は別分野（NFT等）の用例が上位で、同名DB/ERツールは確認できず([ergoauctions.org][18])          |
| 10 | **ERVellum**      | ER＋vellum（写本/図面の紙の比喩）                 | 2-A+C / 3-1語 | “図面・設計図”の雰囲気が出る        | “Vellum”自体が既存アプリ名として有名      | 検索上位がVellum（別アプリ等）で、同名DB/ERツールは確認できず([vellum.pub][19])                       |
| 11 | **ERMosaic**      | ER＋mosaic（全体像を組む）                     | 2-A+C / 3-1語 | 可視化の比喩が分かりやすい          | “Mosaic”系サービスが多く、衝突リスクが上がる  | “ermosaic”の既存ドメイン/名称用例あり（別分野）([ermosaic.goldsupplier.com][20])               |
| 12 | **SchemaMint**    | Schema＋mint（生成/鋳造の比喩）                 | 2-B / 3-2語相当 | “生成・作成”の印象を出せる         | “Schema MINT”が別用途で既に使われる例あり | “Schema MINT”の用例が確認できる（別分野）([glutz.com][21])                                 |

[1]: https://www.mysql.com/products/workbench/design/?utm_source=chatgpt.com "MySQL Workbench: Visual Database Design"
[2]: https://dbeaver.io/2011/03/21/dbeaver-1-0-5/?utm_source=chatgpt.com "DBeaver 1.0.5"
[3]: https://dbschema.com/?srsltid=AfmBOoqY2Xr8nuPBR26N6DEdSLSei_eGpP19_sSCImfgGch1aZ6dDit_&utm_source=chatgpt.com "DbSchema: AI Database Design & Management Tool"
[4]: https://sqldbm.com/?utm_source=chatgpt.com "SqlDBM: Cloud Data Modeling Platform for Enterprise Teams"
[5]: https://schemaspy.readthedocs.io/en/v6.0.0/?utm_source=chatgpt.com "SchemaSpy 6.0.0 documentation"
[6]: https://trevor.io/blog/top-7-entity-relationship-diagram-tools?utm_source=chatgpt.com "Top 7 tools to create an Entity Relationship Diagram (ERD) ..."
[7]: https://app.diagrams.net/?utm_source=chatgpt.com "Untitled Diagram - Page-1"
[8]: https://products.sint.co.jp/ober/faq?utm_source=chatgpt.com "よくあるご質問（FAQ） | ER図作成ツール SI Object Browser ER"
[9]: https://www.sqeema.app/blog/introducing-sqeema-ai-powered-database-schema-visualizer-and-designer?utm_source=chatgpt.com "AI Powered Database Schema VIsualizer and Designer"
[10]: https://eow.alc.co.jp/search?q=reliever&utm_source=chatgpt.com "「reliever」の意味・使い方・表現・読み方"
[11]: https://en.wiktionary.org/wiki/schavuit?utm_source=chatgpt.com "schavuit - Wiktionary, the free dictionary"
[12]: https://www.facebook.com/Hagen.Landtechnik/videos/frisch-eingetroffen-ist-unser-deutz-fahr-5070d-keylineer-freut-sich-schon-auf-ei/6286852894679904/?utm_source=chatgpt.com "Frisch eingetroffen ist unser Deutz Fahr 5070D Keyline. Er ..."
[13]: https://azeemnow.com/2025/01/18/introducing-schemawiseai-the-ai-powered-solution-for-seamless-database-query-mapping/?utm_source=chatgpt.com "Introducing SchemaWiseAI: The AI-Powered Solution for ..."
[14]: https://kotobank.jp/frjaword/relativiser?utm_source=chatgpt.com "relativiser(フランス語)の日本語訳、読み方は"
[15]: https://github.com/goharbor/harbor/wiki/Architecture-Overview-of-Harbor?utm_source=chatgpt.com "Architecture Overview of Harbor · goharbor/harbor Wiki"
[16]: https://svantek.com/software/supervisor-software/?utm_source=chatgpt.com "Supervisor Software | Occupational Noise and Vibration"
[17]: https://soundcloud.com/erweave?utm_source=chatgpt.com "erweave"
[18]: https://ergoauctions.org/user/9f3Rnk46ajhPUmxuZ3Vo8XDNPnF6zBcwKkL1aGNMjrsiF8sxRKv?utm_source=chatgpt.com "erglyph's Profile"
[19]: https://vellum.pub/?utm_source=chatgpt.com "Vellum | Create Beautiful Books"
[20]: https://ermosaic.goldsupplier.com/?utm_source=chatgpt.com "Chinese supplier | Beijing 920 Co., Ltd."
[21]: https://glutz.com/de/it/download-center/category/26280?utm_source=chatgpt.com "Download Center | Glutz AG"
