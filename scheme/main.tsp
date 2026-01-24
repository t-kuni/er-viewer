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

// ER Data model
model ERData {
  entities: Entity[];
  relationships: Relationship[];
}

// Layout models
model EntityLayoutItem {
  id: string; // UUID (エンティティIDと同じ)
  name: string;
  x: float64;
  y: float64;
}

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

model Text {
  id: string; // UUID
  x: float64;
  y: float64;
  content: string;
  fontSize: float64;
  fill: string;
}

model LayoutData {
  entities: Record<EntityLayoutItem>;
  rectangles: Record<Rectangle>;
  texts: Record<Text>;
}

// DDL response model
model DDLResponse {
  ddl: string;
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

// Success response model
model SuccessResponse {
  success: boolean;
}

// Reverse engineer response model
model ReverseEngineerResponse {
  erData: ERData;
  layoutData: LayoutData;
}

// ViewModel for ER diagram rendering
// These models represent the data structure used by the frontend to render the ER diagram

// Entity node view model (used by React Flow Node)
model EntityNodeViewModel {
  id: string; // UUID (エンティティID)
  name: string;
  x: float64;
  y: float64;
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
  ui: ERDiagramUIState;
  loading: boolean; // リバースエンジニア処理中フラグ
}

// Global UI state
model GlobalUIState {
  selectedItem: LayerItemRef | null; // 選択中のアイテム（矩形、テキスト、エンティティ）
  showBuildInfoModal: boolean; // ビルド情報モーダル表示フラグ
  showLayerPanel: boolean; // レイヤーパネル表示フラグ
}

// Build info cache state
model BuildInfoState {
  data: BuildInfo | null; // キャッシュされたビルド情報
  loading: boolean; // ビルド情報取得中フラグ
  error: string | null; // エラーメッセージ
}

// Root view model for the entire frontend application
model ViewModel {
  erDiagram: ERDiagramViewModel; // ER図の状態
  ui: GlobalUIState; // グローバルUI状態
  buildInfo: BuildInfoState; // ビルド情報のキャッシュ
}

// API Routes
@route("/api")
namespace API {
  
  // Get ER data
  @get
  @route("/er-data")
  op getERData(): ERData | ErrorResponse;

  // Reverse engineer database to generate ER data and default layout
  @post
  @route("/reverse-engineer")
  op reverseEngineer(): ReverseEngineerResponse | ErrorResponse;

  // Save layout data
  @post
  @route("/layout")
  op saveLayout(@body layoutData: LayoutData): SuccessResponse | ErrorResponse;

  // Get layout data
  @get
  @route("/layout")
  op getLayout(): LayoutData | ErrorResponse;

  // Get table DDL
  @get
  @route("/table/{tableName}/ddl")
  op getTableDDL(@path tableName: string): DDLResponse | ErrorResponse;

  // Get build information
  @get
  @route("/build-info")
  op getBuildInfo(): BuildInfo | ErrorResponse;
}
