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

// UI state for ER diagram
model ERDiagramUIState {
  hover: HoverTarget | null;
  highlightedNodeIds: string[]; // Entity IDs (UUID)
  highlightedEdgeIds: string[]; // Edge IDs (UUID)
  highlightedColumnIds: string[]; // Column IDs (UUID)
}

// Complete ER diagram view model
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
  rectangles: Record<Rectangle>; // 矩形（グループ化・領域区別用）
  ui: ERDiagramUIState;
  loading: boolean;
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
