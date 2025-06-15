# ER Diagram Viewer - Task Breakdown

Based on SPEC.md requirements and current implementation analysis.

## 1. Database Reverse Engineering (RDBからER図をリバース)

### 1.2 Initial Entity Clustering
- [ ] **Smart Positioning Algorithm** - Implement clustering for initial entity placement
  - Currently: All entities placed at (50,50)
  - Required: Intelligent positioning based on relationships
  - Priority: Medium
  - Estimate: 4-6 hours

### 1.3 Incremental Reverse Engineering
- [ ] **Improved New Entity Positioning** - Better default positioning for new entities
  - Currently: Fixed position (50,50)
  - Required: Left-top area clustering
  - Priority: Low
  - Estimate: 2-3 hours

## 2. GUI Display (ER図をGUIで表示)


### 2.2 Relationship Visualization
- [ ] **Smart Line Routing** - Avoid entity overlaps and improve visual clarity
  - Currently: Basic straight polylines
  - Required: Intelligent routing around entities
  - Priority: Medium
  - Estimate: 6-8 hours

### 2.4 Entity Display Enhancement
- [ ] **Column Icon Display** - Show icons for different column types for better visibility
  - Currently: Column names displayed without visual indicators
  - Required: Column type icons (PK, FK, etc.) displayed to the left of column names
  - Priority: Medium
  - Estimate: 3-4 hours
- [ ] **Dynamic Entity Width Adjustment** - Adjust entity width based on table and column name lengths
  - Currently: Fixed entity width
  - Required: Dynamic width calculation based on content
  - Priority: Medium
  - Estimate: 2-3 hours

### 2.3 Hover Effects
- [ ] **Enhanced Entity Hover Highlighting** - Stronger entity and relationship highlighting with column emphasis
  - Currently: Basic entity highlighting
  - Required: Entity hover highlights the entity, all its relationships, and connected entities + related columns
  - Additional: Temporary z-index boost for emphasized visibility
  - Priority: High
  - Estimate: 5-6 hours
- [ ] **Enhanced Relationship Hover Highlighting** - Stronger relationship and column highlighting
  - Currently: Basic relationship line highlighting
  - Required: Relationship hover highlights the line and both connected columns
  - Additional: Temporary z-index boost for emphasized visibility
  - Priority: High
  - Estimate: 4-5 hours

### 2.5 DDL Sidebar Enhancement
- [ ] **DDL Syntax Highlighting** - Add syntax highlighting to DDL display in right sidebar
  - Currently: Plain text DDL display
  - Required: SQL syntax highlighting for better readability
  - Priority: Medium
  - Estimate: 3-4 hours



## 3. Entity Positioning (エンティティの配置をGUI上で操作)


### 3.2 Advanced Positioning
- [ ] **Snap to Grid** - Optional grid snapping for precise alignment
  - Priority: Low
  - Estimate: 2-3 hours
- [ ] **Alignment Tools** - Align multiple entities
  - Priority: Low
  - Estimate: 4-5 hours

## 4. User Interface Controls (GUI上からトリガー)



## 5. Annotation Features (矩形・テキスト描画)

### 5.1 Rectangle Annotations
- [ ] **Rectangle Property Editing** - Edit line color, fill color, size, position interactively
  - Currently: Fixed styling
  - Required: Interactive color picker, size adjustment UI, and position editing
  - Priority: Medium
  - Estimate: 6-8 hours
- [ ] **Rectangle Repositioning** - Drag rectangles after creation
  - Currently: Fixed position after creation
  - Required: Drag and drop for repositioning
  - Priority: Medium
  - Estimate: 3-4 hours

### 5.2 Text Annotations
- [ ] **Text Property Editing** - Edit color, size interactively
  - Currently: Fixed styling
  - Required: Interactive property panel for text customization
  - Priority: Medium
  - Estimate: 5-6 hours
- [ ] **Text Repositioning** - Drag text after creation
  - Currently: Fixed position after creation
  - Required: Drag and drop for repositioning
  - Priority: Medium
  - Estimate: 2-3 hours

### 5.3 Annotation Management
- [ ] **Annotation Selection** - Select and modify annotations
  - Priority: Medium
  - Estimate: 4-5 hours

## 6. Docker Containerization (dockerコンテナとして提供)




## 7. Quality Improvements & Polish

### 7.1 User Experience
- [ ] **Loading Indicators** - Show progress during reverse engineering
  - Currently: Basic loading overlay
  - Required: Progress indicators and status messages
  - Priority: Low
  - Estimate: 2-3 hours
- [ ] **Error Messages** - Better error handling and user feedback
  - Currently: Basic alert() messages
  - Required: Toast notifications or status bar
  - Priority: Medium
  - Estimate: 3-4 hours

### 7.2 Performance Optimization
- [ ] **Large Schema Handling** - Optimize for databases with many tables
  - Currently: No optimization
  - Required: Virtualization or pagination for large schemas
  - Priority: Low
  - Estimate: 8-10 hours
- [ ] **Memory Management** - Optimize DOM manipulation and event handling
  - Priority: Low
  - Estimate: 4-5 hours

### 7.3 Accessibility & Compatibility
- [ ] **Keyboard Navigation** - Support keyboard-only operation
  - Priority: Low
  - Estimate: 6-8 hours
- [ ] **Mobile Optimization** - Improve touch interface support
  - Currently: Basic responsive design
  - Required: Touch gestures and mobile-specific UI
  - Priority: Low
  - Estimate: 8-10 hours

## 8. Architecture & Code Organization Improvements

### 8.0 Canvas・テストコードリファクタリング（緊急・最優先）

#### 8.0.1 Canvasアーキテクチャ問題修正
- [ ] **Canvas責任分離** - ERViewerCoreの単一責任原則違反を修正
  - Currently: ERViewerCoreが描画・イベント処理・状態管理を全て担当（er-viewer-core.js:1-400行）
  - Required: CanvasRenderer, EventController, StateManagerに分離
  - Benefit: バグ修正容易性、テスト可能性向上、保守性向上
  - Priority: Critical
  - Estimate: 12-16 hours

- [ ] **Canvas状態管理一元化** - グローバルDOM操作とstate分散問題を解決
  - Currently: Canvas状態がDOM全体に分散、複数箇所でdocument.getElementById
  - Required: CanvasStateクラスで状態一元管理、React/Vue風state管理導入
  - Benefit: 状態バグ削減、デバッグ容易性、予測可能な動作
  - Priority: Critical  
  - Estimate: 8-10 hours

- [ ] **座標変換システム統一** - screenToSVG()等の重複コード削減
  - Currently: 座標変換ロジックが複数ファイルに分散（svg-utils.js, mouse-handler.js等）
  - Required: CoordinateTransformクラスで座標変換を一元化
  - Benefit: 座標バグ削減、計算ロジック統一、テスト容易性
  - Priority: Critical
  - Estimate: 6-8 hours

- [ ] **イベント処理統一** - マウス・キーボード競合とイベントバブリング問題解決
  - Currently: mouse-handler.js, keyboard-handler.jsでイベント競合が頻発
  - Required: CanvasEventBusで統一イベント処理、競合制御機能
  - Benefit: イベントバグ削減、予測可能なユーザー操作、デバッグ改善
  - Priority: Critical
  - Estimate: 10-12 hours

#### 8.0.2 テストコード構造改善  
- [ ] **Canvas単体テスト環境構築** - DOM依存テストからユニットテスト分離
  - Currently: 全テストがdocument.body.innerHTML操作に依存、ES Module互換性問題
  - Required: Canvas各コンポーネントの独立したユニットテスト、モック化戦略見直し
  - Benefit: 高速テスト実行、問題特定容易性、CI/CD対応
  - Priority: Critical
  - Estimate: 8-10 hours

- [ ] **テスト戦略階層化** - 統合テスト偏重からテストピラミッド構築
  - Currently: 統合テストのみでバグ特定困難（entity-click-behavior.test.js等）
  - Required: Unit(60%) > Integration(30%) > E2E(10%)のテストピラミッド
  - Benefit: バグ早期発見、テスト実行時間短縮、デバッグ効率化
  - Priority: Critical
  - Estimate: 6-8 hours

- [ ] **Canvas Test Utilities作成** - テスト用モック・ヘルパー統一化
  - Currently: 各テストファイルで個別にDOM・API・イベントモック作成
  - Required: CanvasTestUtils, MockEventFactory, MockCanvasRendererで共通化
  - Benefit: テストコード重複削減、テスト品質向上、保守性改善
  - Priority: High
  - Estimate: 4-6 hours

#### 8.0.3 デバッグ・監視機能
- [ ] **Canvas状態可視化** - デバッグ用状態監視パネル実装
  - Currently: Console.logでのデバッグのみ、状態把握困難
  - Required: リアルタイム状態表示、イベントログ、座標情報表示
  - Benefit: バグ再現性向上、開発効率向上、問題解析時間短縮
  - Priority: High
  - Estimate: 6-8 hours

- [ ] **エラー境界実装** - Canvas処理でのエラー波及防止
  - Currently: Canvas内エラーでアプリ全体が停止
  - Required: Canvas処理をtry-catchで囲い、エラー時の安全な復旧機能
  - Benefit: 予期しないクラッシュ防止、ユーザー体験向上、安定性確保
  - Priority: High
  - Estimate: 4-6 hours

### 8.0.4 従来テスト環境の課題対応
- [ ] **テスト環境の構築** - Jest + Testing Library でユニットテスト環境を構築
  - Currently: テストが一切存在しない状態
  - Required: コアモジュール（er-viewer-core.js, app.js等）のユニットテスト作成
  - Benefit: デグレ防止、リファクタリング安全性向上
  - Priority: Critical
  - Estimate: 8-10 hours

- [ ] **エラーハンドリングの改善** - 非同期処理とAPI呼び出しのエラー処理強化
  - Currently: app.js:80-82, er-viewer-core.js:74-94でエラー処理不完全
  - Required: 適切なtry-catch、レスポンス検証、エラー状態管理
  - Benefit: 予期しないクラッシュ防止、ユーザー体験向上
  - Priority: Critical
  - Estimate: 4-6 hours

- [ ] **メモリリーク対策** - イベントリスナーとDOM参照の適切な管理
  - Currently: er-viewer-core.js:377-379でイベントリスナー削除漏れ
  - Required: イベントリスナーのクリーンアップ、WeakMap使用検討
  - Benefit: 長時間使用時のパフォーマンス維持
  - Priority: High
  - Estimate: 3-4 hours

- [ ] **TypeScript導入** - 段階的な型安全性の導入
  - Currently: 全てバニラJavaScript、型チェックなし
  - Required: tsconfig.json設定、主要モジュールから段階的移行
  - Benefit: ランタイムエラー削減、開発効率向上
  - Priority: High
  - Estimate: 12-16 hours

### 8.1 フロントエンドアーキテクチャの改善
- [ ] **script.jsの分割** - 1900行を超える単一ファイルをモジュール化
  - Currently: 全機能が1つのファイル（script.js: 1908行）
  - Required: 機能別モジュール分割（UI、イベント処理、データ管理、描画エンジン等）
  - Benefit: 保守性向上、テストしやすさ、開発効率改善
  - Priority: High
  - Estimate: 8-12 hours

- [ ] **状態管理の中央化** - グローバル変数の整理と状態管理パターンの導入
  - Currently: 複数のグローバル変数で状態を管理
  - Required: 中央集権的な状態管理（Store pattern等）
  - Priority: Medium
  - Estimate: 6-8 hours

- [ ] **コンポーネント化** - UIコンポーネントの再利用可能な設計
  - Currently: DOM操作が各所に散在
  - Required: 再利用可能なUIコンポーネント設計
  - Priority: Medium
  - Estimate: 10-12 hours

### 8.2 バックエンドアーキテクチャの改善
- [ ] **APIルーティングの分離** - server.jsからルート定義を分離
  - Currently: 全APIが1つのファイル（server.js: 250行）
  - Required: routes/ディレクトリでルート別ファイル分割
  - Priority: Medium
  - Estimate: 4-6 hours

- [ ] **ミドルウェアの整理** - 共通処理の中央化
  - Currently: エラーハンドリングが各APIで重複
  - Required: 共通エラーハンドリングミドルウェア
  - Priority: Low
  - Estimate: 3-4 hours

### 8.3 ディレクトリ構造の改善
- [ ] **フロントエンド構造の整理** - publicディレクトリの細分化
  - Currently: public/に全フロントエンドファイルが平置き
  - Required: public/js/, public/css/, public/components/ 等の構造化
  - Priority: Medium
  - Estimate: 2-3 hours

- [ ] **共通ユーティリティの整理** - 再利用可能な関数の整理
  - Currently: ユーティリティ関数が各ファイルに散在
  - Required: lib/utils.js 等での共通関数管理
  - Priority: Low
  - Estimate: 3-4 hours

### 8.4 設定管理の改善
- [ ] **設定ファイルの構造化** - 環境別設定の分離
  - Currently: .envファイルのみ
  - Required: config/ディレクトリでの環境別設定管理
  - Priority: Low
  - Estimate: 2-3 hours

### 8.5 テスト構造の導入
- [ ] **テストフレームワークの導入** - 自動テスト環境の構築
  - Currently: テストなし
  - Required: Jest等でのユニット・統合テスト環境
  - Priority: Medium
  - Estimate: 8-10 hours

- [ ] **E2Eテストの導入** - ブラウザテストの自動化
  - Currently: 手動テストのみ
  - Required: Playwright等でのE2Eテスト
  - Priority: Low
  - Estimate: 6-8 hours

### 8.6 開発ツールの改善（最優先）
- [ ] **Linter/Formatterの導入** - コード品質の自動化
  - Currently: コードスタイルの統一なし
  - Required: ESLint/Prettier等の導入、プリコミットフック設定
  - Benefit: コード品質担保、チーム開発での一貫性
  - Priority: Critical
  - Estimate: 2-3 hours

- [ ] **プリコミットフックの設定** - Husky + lint-staged でコード品質チェック自動化
  - Currently: コミット前のチェック機能なし
  - Required: Husky, lint-staged導入、Git hooks設定
  - Benefit: 問題のあるコードのコミット防止
  - Priority: Critical
  - Estimate: 1-2 hours

- [ ] **Build pipelineの改善** - モダンなビルドツールの導入
  - Currently: 単純なスクリプト実行
  - Required: Webpack/Vite等でのバンドル最適化
  - Priority: Medium
  - Estimate: 6-8 hours

## Summary

**Total Requirements**: 59 tasks (+17 architecture tasks)
**Completed**: 31 tasks (53%) - moved to TASK_DONE.md
**In Progress**: 0 tasks  
**Not Started**: 34 tasks (47%)

**Critical Priority**: 12 tasks (~80-100 hours) - **Canvas・テストコードリファクタリング（緊急）**
**High Priority Remaining**: 4 tasks (~20-26 hours)
**Medium Priority Remaining**: 16 tasks (~69-80 hours)  
**Low Priority Remaining**: 10 tasks (~50-65 hours)

**Core Functionality Status**: ✅ Complete (all essential features working)
**Enhancement Status**: ⚠️ Partial (user experience improvements needed)
**Production Readiness**: ⚠️ Needs Improvement (デグレ対策が必要)
**Architecture Status**: ⚠️ Needs Improvement (monolithic structure, maintainability concerns)

## Next Steps Recommendation

1. **Phase 1 (緊急・Critical Priority)**: Canvas・テストコードリファクタリング
   - Canvas責任分離・状態管理一元化・座標変換統一・イベント処理統一
   - Canvas単体テスト環境構築・テスト戦略階層化・Canvas Test Utilities作成
   - 推定: 80-100時間（3-4週間集中作業）

2. **Phase 2 (High Priority)**: デバッグ・監視・エラー境界 + TypeScript導入
   - Canvas状態可視化・エラー境界実装・TypeScript段階移行

3. **Phase 3 (Medium Priority)**: 従来課題対応 + Enhanced hover effects
   - テスト環境構築・エラーハンドリング改善・Smart positioning, line routing

4. **Phase 4 (Architecture)**: API separation, component architecture, build pipeline