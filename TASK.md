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

### 8.0 フロントエンドデグレ対策（最優先）
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

**Critical Priority**: 6 tasks (~30-40 hours) - **フロントエンドデグレ対策**
**High Priority Remaining**: 4 tasks (~20-26 hours)
**Medium Priority Remaining**: 16 tasks (~69-80 hours)  
**Low Priority Remaining**: 10 tasks (~50-65 hours)

**Core Functionality Status**: ✅ Complete (all essential features working)
**Enhancement Status**: ⚠️ Partial (user experience improvements needed)
**Production Readiness**: ⚠️ Needs Improvement (デグレ対策が必要)
**Architecture Status**: ⚠️ Needs Improvement (monolithic structure, maintainability concerns)

## Next Steps Recommendation

1. **Phase 1 (Critical Priority)**: デグレ対策 - テスト環境構築、エラーハンドリング改善、リントツール導入
2. **Phase 2 (High Priority)**: Enhanced hover effects + TypeScript導入
3. **Phase 3 (Medium Priority)**: Smart positioning, line routing, and state management
4. **Phase 4 (Architecture)**: API separation, component architecture, build pipeline