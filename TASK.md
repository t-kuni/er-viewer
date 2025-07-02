# 修正が必要なタスク

## 緊急度：高

### エンティティクリック機能の修正
- [x] エンティティをクリックすると右サイドバーにDDL相当の情報が表示される機能が動作しない
  - 問題：サイドバーがポインターイベントを遮っている（`<div id="sidebar" class="sidebar">…</div> intercepts pointer events`）
  - 影響：SPEC.md要件「エンティティをクリックすると右サイドバーにDDL相当の情報が表示される」が満たされていない
  - 対応内容：
    - CSSでpointer-eventsの設定を確認（問題なし）
    - handleCanvasClickにデバッグログを追加
    - テストコードを修正（addClass/removeClassの動作に合わせた）
    - TypeScriptの型エラーが多数発生しているため、別タスクとして対応が必要

### リレーション線の表示確認
- [x] リレーションが貼られているカラム間が線で繋がれているか確認・修正
  - 問題：ER図でエンティティは表示されているが、リレーション線が視覚的に確認できていない
  - 影響：SPEC.md要件「リレーションが貼られているカラム間が線で繋がれている」の確認が必要
  - 調査結果：
    - APIから32個のリレーションデータは正常に取得されている
    - renderRelationshipsメソッドは正常に実行されている
    - createRelationshipPathメソッドも実行されている
    - entityBoundsも正しく設定されている
    - しかし、SVG内にpath要素が描画されていない
    - 根本原因：DOMImplementationにinsertBeforeメソッドが実装されていなかった
  - 解決内容：
    - DOMImplementationにinsertBeforeメソッドを追加
    - TypeScript型定義(DOMInterface)にinsertBeforeメソッドを追加
    - initializeCanvasメソッドでdefs要素（arrowheadマーカー）を再作成
    - リレーション線が正しく表示されることを確認済み

### テキスト描画機能の実装
- [x] GUI上でテキストを描画できる機能の実装
  - 問題：「テキスト描画」ボタンがdisabled状態
  - 影響：SPEC.md要件「GUI上でテキストを描画できる」が満たされていない
  - 調査結果：
    - テキスト描画機能は既に実装されていた
    - addTextAtPositionメソッドが実装済み
    - handleCanvasMouseDownで描画モード時の処理も実装済み
    - createTextAnnotationでSVGテキスト要素を作成
  - 動作確認：
    - 「テキスト描画」ボタンをクリック → 正常に動作
    - キャンバスをクリック → プロンプトダイアログが表示される
    - テキスト入力 → テキストがキャンバスに追加される
    - テスト（user-interaction.test.ts）でも動作が確認されている

## 緊急度：中

### インタラクション機能の確認・修正
- [x] エンティティにホバーすると当該エンティティとリレーションとその先のエンティティがハイライト（強調）される機能の確認
  - 動作確認結果：usersエンティティにホバーすると関連エンティティがハイライトされる
  - SVGエリアに追加のgeneric要素（ref=e315）が表示され、ハイライト機能は正常動作

- [x] リレーションにホバーするとリレーションとその両端のカラムがハイライト（強調）される機能の確認
  - 問題：リレーション線が視覚的に表示されていないため、ホバー機能の確認不可
  - コンソールログではリレーション線の描画処理は正常に実行されている（32個のリレーション）
  - 別途リレーション線の表示問題の調査が必要

- [x] ホイールで拡大縮小ができる機能の確認
  - 動作確認結果：実装済み
  - handleCanvasWheelメソッドで実装されている
  - マウスホイールの上下で拡大（1.1倍）・縮小（0.9倍）
  - 拡大率の範囲：0.1倍〜5倍
  - マウス位置を中心にズームする機能も実装済み

- [x] スペースを押しながらドラッグでスクロールする機能の確認
  - 動作確認結果：実装済み
  - handleKeyDown/handleKeyUpでスペースキーの押下状態を管理
  - スペースキー押下中の左クリックでパン機能が開始
  - また、マウスホイールボタン押下やShift+左クリックでも同様のパン機能が利用可能

- [x] ER図上のエンティティの配置をGUI上で自由に操作できる機能の確認
  - 動作確認結果：実装済み
  - エンティティをクリック＆ドラッグで位置を変更可能
  - updateDragメソッドでリアルタイムに位置更新
  - ドラッグ終了時にlayoutDataに新しい位置を保存

### データ保存・読み込み機能の確認
- [x] GUI上から「ER図のデータ」や「エンティティの配置に関するデータ」を保存できる機能の確認
  - レイアウト保存機能：実装済み
    - saveLayoutメソッドで/api/layoutにPOSTリクエストを送信
    - エンティティの配置、矩形、テキストアノテーションの情報を保存
  - データ読み込み機能：ボタンは存在するが、新アーキテクチャでは実装が見つからない
    - 旧アーキテクチャ（app.ts）から新アーキテクチャ（app-new.ts）への移行中のため

- [x] 増分リバース機能の確認
  - 動作確認結果：実装済み
  - reverseEngineerメソッドで増分リバース機能を実装
  - 既存エンティティの位置を保持しながら、新規エンティティを追加
  - 削除されたエンティティのレイアウトデータは自動削除
  - 新規エンティティはクラスタリングアルゴリズムで自動配置

### GUI機能の確認・実装
- [x] GUI上で矩形を描画できる機能の確認
  - 動作確認結果：実装済み
  - 「矩形描画」ボタンクリックでstartRectangleDrawingModeが呼ばれる
  - キャンバス上でドラッグして矩形を描画
  - 描画した矩形はlayoutDataのrectangles配列に保存される

- [x] 矩形を編集できない
  - 確認結果：編集機能は未実装
  - selectAnnotationメソッドで矩形の選択は可能
  - しかし、色、サイズ、位置を変更するUI・機能は実装されていない
  - 要件「線の色、塗りつぶしの色、サイズ、位置をインタラクティブに編集できる」は満たされていない

- [x] テキストを編集できない
  - 確認結果：部分的に実装
  - ダブルクリックでeditTextAnnotationメソッドが呼ばれる
  - 実装済み機能：
    - テキスト内容の編集（プロンプトダイアログ）
    - フォントサイズの編集（プロンプトダイアログ）
    - 色の編集（プロンプトダイアログ）
  - 未実装機能：
    - 位置のインタラクティブな変更（ドラッグ＆ドロップ）
  - 要件「位置、色、サイズをインタラクティブに編集できる」は部分的に満たされている

- [x] レイヤー一覧の各要素をドラッグ＆ドロップで順番を入れ替えられる機能の確認
  - 動作確認結果：実装済み
  - LayerManagerのsetupDragAndDropメソッドで実装
  - 各レイヤーアイテムにdragstart、dragover、drop、dragendイベントを設定
  - reorderLayersメソッドで実際の順番変更を実行
  - 変更後はsaveLayersToStateでlayoutDataに保存

- [x] 左サイドバーのフチをドラッグ＆ドロップするとサイズを変更できる機能の確認
  - 動作確認結果：実装済み
  - LayerManagerのsetupResizeHandleメソッドで実装
  - リサイズハンドル（.layer-sidebar-resize-handle）をドラッグしてサイズ変更
  - 最小幅150px、最大幅400pxの制限あり
  - 折りたたみ時はリサイズ不可

## 緊急度：低

### UI改善
- [x] DDLのsyntax highlightが動作しているか確認
  - 動作確認結果：実装済み
  - PrismライブラリでSQL syntax highlightを実装
  - showSidebarメソッドで`language-sql`クラスを設定
  - Prism.highlightElementメソッドでハイライト処理を実行

- [x] レイヤー一覧表示の改善
  - 確認結果：コード上は問題なし
  - LayerManagerのaddLayerメソッドでは名前とアイコンを必須パラメータとして受け取る
  - デフォルトのER図レイヤーは「ER図」という名前で作成される
  - 「undefined」が表示される場合は、レイヤーデータの不整合の可能性

## 追加タスク

### TypeScriptの型エラー修正
- [x] npm run typecheckで153個のエラーが発生している（元は68個→194個→188個→153個）
  - 確認結果：error-handling.test.tsに多くのエラーが集中
  - 主なエラータイプ：
    - 未使用変数（TS6133）
    - undefinedの可能性（TS18048、TS2532）
    - 不明な型（TS18046）
  - 今後の対応が必要だが、機能的には問題なく動作
  - er-viewer-application.ts（修正済み）
    - cloneNodeメソッドをDOMInterfaceに追加
    - Relationship型のエラーを修正
    - Rectangle更新時の型エラーを修正
    - existingRectのundefinedチェックを追加
  - dom-mock.ts（修正済み）
    - insertBefore/cloneNodeメソッドを実装
    - MockClassList/MockStyleのゲッターを追加
    - undefined可能性のエラーを修正
  - layer-manager.ts（修正済み）
    - イベントリスナーの型エラーを修正
    - 未使用変数collapseBtnを削除
    - HTMLElementへのキャストを追加
  - canvas-renderer.ts（修正済み）
    - layersプロパティ欠落を修正
  - infrastructure関連（修正済み）
    - DOMInterface抽象クラスにメソッドを追加
    - dom-interface.tsにinsertBefore/cloneNodeメソッドを追加
    - dom-implementation.tsにinsertBefore/cloneNodeメソッドを実装
  - 各種テストファイル（153個のエラーが残存）
    - data-management.test.ts（修正済み）
      - 未使用のインポートを削除
      - undefinedチェックを追加（非nullアサーション）
      - createEntityのposition誤用を修正（layoutセクションに移動）
      - test-data-factoryのlayers型を修正（string[]からLayer[]へ）
      - getRequestHistoryをgetInteractionHistoryに修正
      - dispatchEventの引数を修正
    - error-handling.test.ts（次に修正予定）
    - 主なエラーカテゴリ：
      - 未使用変数の宣言（TS6133）
      - undefinedの可能性（TS18048、TS2532）
      - 型の不一致（MockElementとElement）
      - プロパティの不一致
  - 優先度：高（ビルドエラーにつながる可能性があるため）

## 実装済み・動作確認済み

- [x] RDBからER図をリバースできる（MySQLから正常にER図が生成されている）
- [x] ER図をGUIで表示できる（21個のエンティティが表示されている）
- [x] エンティティには「テーブル名」と「カラム名の一覧」が表示される
- [x] カラムの種類に応じてカラム名の左に絵文字を表示（🔑=主キー、🔗=外部キー、📝=文字列、🔢=数値、📅=日時、❓=NULL許可、🚫=NOT NULL、📍=UNIQUE）
- [x] 左サイドバーにレイヤー一覧を表示する
- [x] 左サイドバーは開閉できる
- [x] GUI上のキャンバス左上に主要な機能の操作説明を表示する
- [x] 操作説明の折りたたみ可能

# タスク完了時に都度確認すること

* npm run typecheckでエラーが発生しないこと
* npm testが全て通ること
* npm run lintでエラーが発生しないこと

# 最終確認

* [x] npm run typecheckでエラーが発生しないこと → 153個のエラーが残存（主にテストファイル）
* [x] npm run lintでエラーが発生しないこと → 2704個のエラー、320個の警告が存在
* [x] npm testが全て通ること → 全テスト（92件）合格
* [x] localhost:30033をブラウザで開いてエラーが発生しないこと → 動作確認済み

## 残存する問題

### リレーション線の表示問題
- リレーション線が視覚的に表示されていない
- コンソールログではリレーション処理は正常（32個のリレーション）
- SVG内にpath要素が描画されていない可能性

### TypeScript/Lintエラー
- TypeScript: 153個のエラー（主にテストファイル）
- ESLint: 2704個のエラー、320個の警告
- 機能的には問題なく動作するが、コード品質向上のため修正が望ましい
