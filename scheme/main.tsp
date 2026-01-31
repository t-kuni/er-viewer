import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service({
  title: "ER Viewer API",
})
namespace ERViewerAPI;

/**
 * ID仕様に関する基本方針
 * 
 * - すべての `id` フィールドはUUID (Universally Unique Identifier) を使用
 * - UUIDは crypto.randomUUID() で生成
 * - 一度生成されたIDは保存され、増分更新時も維持される（永続性を持つ）
 */

// Common error response model
@error
model ErrorResponse {
  error: string;
}

// Database column model
model Column {
  id: string; // UUID
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  extra: string;
}

// Foreign key model
model ForeignKey {
  id: string; // UUID
  columnId: string; // カラムID (UUID)
  referencedTableId: string; // 参照先エンティティID (UUID)
  referencedColumnId: string; // 参照先カラムID (UUID)
  constraintName: string;
}

// Entity (table) model
model Entity {
  id: string; // UUID
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  ddl: string;
}

// Relationship model
model Relationship {
  id: string; // UUID
  fromEntityId: string; // エンティティID (UUID)
  fromColumnId: string; // カラムID (UUID)
  toEntityId: string; // エンティティID (UUID)
  toColumnId: string; // カラムID (UUID)
  constraintName: string;
}

// Rectangle model (for grouping and annotations)
model Rectangle {
  id: string; // UUID
  x: float64;
  y: float64;
  width: float64;
  height: float64;
  fill: string;   // 背景色（例: "#E3F2FD"）
  stroke: string; // 枠線色（例: "#90CAF9"）
  strokeWidth: float64; // 枠線幅（px）
  opacity: float64;     // 透明度（0〜1）
}

// Text alignment options
enum TextAlign {
  left,
  center,
  right,
}

// Text auto-size behavior
enum TextAutoSizeMode {
  manual,      // ユーザーのwidth/heightを維持
  fitContent,  // 内容に合わせて width/height を両方更新
  fitWidth,    // width固定で、高さだけ内容に合わせて更新（折り返し前提）
}

// Text overflow handling
enum TextOverflowMode {
  clip,    // はみ出しは隠す
  scroll,  // スクロール（表示側だけ）
}

// Drop shadow effect
model DropShadow {
  enabled: boolean;
  offsetX: float64;
  offsetY: float64;
  blur: float64;
  spread: float64;
  color: string;    // "#RRGGBB"
  opacity: float64; // 0..1
}

// Text box model (for annotations and labels)
model TextBox {
  id: string;    // UUID
  x: float64;
  y: float64;
  width: float64;
  height: float64;

  content: string;      // "\n" を含むプレーンテキスト
  fontSize: float64;    // px
  lineHeight: float64;  // px
  textAlign: TextAlign;

  textColor: string;    // 文字色（例: "#000000"）
  opacity: float64;     // テキスト全体の不透明度（0..1）

  paddingX: float64;
  paddingY: float64;

  wrap: boolean;                 // true: 折り返し（幅制約あり）
  overflow: TextOverflowMode;    // 表示のはみ出し

  autoSizeMode: TextAutoSizeMode;
  shadow: DropShadow;
}

// Build info model
model BuildInfo {
  version: string;
  name: string;
  buildTime: string;
  buildTimestamp: int64;
  buildDate: string;
  git: {
    commit: string;
    commitShort: string;
    branch: string;
    tag: string | null;
  };
  nodeVersion: string;
  platform: string;
  arch: string;
}

// Internal implementation models (used by lib/database.ts)
// These models are not used in API endpoints but are needed for internal data processing

// ER Data model (used by DatabaseManager.generateERData())
model ERData {
  entities: Entity[];
  relationships: Relationship[];
}

// Layout models (used by DatabaseManager.generateDefaultLayoutData())
model EntityLayoutItem {
  id: string; // UUID (エンティティIDと同じ)
  name: string;
  x: float64;
  y: float64;
}

model LayoutData {
  entities: Record<EntityLayoutItem>;
  rectangles: Record<Rectangle>;
  texts: Record<TextBox>;
}

// ViewModel for ER diagram rendering
// These models represent the data structure used by the frontend to render the ER diagram

// Entity node view model (used by React Flow Node)
model EntityNodeViewModel {
  id: string; // UUID (エンティティID)
  name: string;
  x: float64;
  y: float64;
  width: float64;  // レンダリング後の実寸幅（px）、初期値: 0
  height: float64; // レンダリング後の実寸高さ（px）、初期値: 0
  columns: Column[];
  ddl: string;
}

// Relationship edge view model (used by React Flow Edge)
model RelationshipEdgeViewModel {
  id: string; // UUID (リレーションシップID)
  sourceEntityId: string; // エンティティID (UUID)
  sourceColumnId: string; // カラムID (UUID)
  targetEntityId: string; // エンティティID (UUID)
  targetColumnId: string; // カラムID (UUID)
  constraintName: string;
}

// Hover target for UI state
model HoverTarget {
  type: "entity" | "edge" | "column";
  id: string; // UUID: entity/edge/column すべてこのIDで識別
}

// Layer management
enum LayerItemKind {
  entity,    // エンティティ（ER図レイヤー固定、編集不可）
  relation,  // リレーション（ER図レイヤー固定、編集不可）
  rectangle, // 矩形（前面・背面に配置可能）
  text,      // テキスト（前面・背面に配置可能）
}

model LayerItemRef {
  kind: LayerItemKind;
  id: string; // UUID
}

enum LayerPosition {
  background, // 背面（ER図より下）
  foreground, // 前面（ER図より上）
}

model LayerOrder {
  backgroundItems: LayerItemRef[]; // 背面アイテム（配列の後ろが前面寄り）
  foregroundItems: LayerItemRef[]; // 前面アイテム（配列の後ろが前面寄り）
}

// UI state for ER diagram
model ERDiagramUIState {
  hover: HoverTarget | null;
  highlightedNodeIds: string[]; // Entity IDs (UUID)
  highlightedEdgeIds: string[]; // Edge IDs (UUID)
  highlightedColumnIds: string[]; // Column IDs (UUID)
  layerOrder: LayerOrder; // レイヤー順序
}

// Complete ER diagram view model
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>; // 矩形（グループ化・領域区別用）
  texts: Record<TextBox>; // テキスト（注釈・説明用）
  ui: ERDiagramUIState;
  loading: boolean; // リバースエンジニア処理中フラグ
}

// Layout optimization state
model LayoutOptimizationState {
  isRunning: boolean;         // 実行中フラグ
  progress: float64;          // 進捗（0〜100）
  currentStage: string | null; // 現在の処理段階名
}

// Global UI state
model GlobalUIState {
  selectedItem: LayerItemRef | null; // 選択中のアイテム（矩形、テキスト、エンティティ）
  showBuildInfoModal: boolean; // ビルド情報モーダル表示フラグ
  showLayerPanel: boolean; // レイヤーパネル表示フラグ
  showDatabaseConnectionModal: boolean; // データベース接続設定モーダル表示フラグ
  layoutOptimization: LayoutOptimizationState; // 配置最適化の状態
}

// Build info cache state
model BuildInfoState {
  data: BuildInfo | null; // キャッシュされたビルド情報
  loading: boolean; // ビルド情報取得中フラグ
  error: string | null; // エラーメッセージ
}

// Database connection settings

// Database type enum
enum DatabaseType {
  mysql,
  postgresql, // 将来対応用
}

// Database connection state (password不含)
model DatabaseConnectionState {
  type: DatabaseType;
  host: string;
  port: int32;
  user: string;
  database: string;
}

// Application settings
model AppSettings {
  lastDatabaseConnection?: DatabaseConnectionState; // リバースエンジニア成功時に更新
}

// Root view model for the entire frontend application
model ViewModel {
  format: string; // データフォーマット識別子（固定値: "er-viewer"）
  version: int32; // データフォーマットのバージョン（現在は 1 固定）
  erDiagram: ERDiagramViewModel; // ER図の状態
  ui: GlobalUIState; // グローバルUI状態
  buildInfo: BuildInfoState; // ビルド情報のキャッシュ
  settings?: AppSettings; // アプリケーション設定
}

// Reverse engineer request
model ReverseEngineerRequest {
  viewModel: ViewModel;
  password?: string; // データベース接続用パスワード
}

// API Routes
@route("/api")
namespace API {
  
  // Get initial ViewModel
  // Returns the initial state of the application including build info
  @get
  @route("/init")
  op initialize(): ViewModel | ErrorResponse;

  // Reverse engineer database to generate ER diagram
  // Accepts current ViewModel and password, returns updated ViewModel with ER diagram data
  @post
  @route("/reverse-engineer")
  op reverseEngineer(@body request: ReverseEngineerRequest): ViewModel | ErrorResponse;
}
