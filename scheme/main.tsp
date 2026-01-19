import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service({
  title: "ER Viewer API",
})
namespace ERViewerAPI;

// Common error response model
@error
model ErrorResponse {
  error: string;
}

// Database column model
model Column {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  extra: string;
}

// Foreign key model
model ForeignKey {
  id: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

// Entity (table) model
model Entity {
  id: string;
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  ddl: string;
}

// Relationship model
model Relationship {
  id: string;
  from: string;
  fromId: string;
  fromColumn: string;
  to: string;
  toId: string;
  toColumn: string;
  constraintName: string;
}

// ER Data model
model ERData {
  entities: Entity[];
  relationships: Relationship[];
}

// Layout models
model EntityLayoutItem {
  id: string;
  name: string;
  x: float64;
  y: float64;
}

model Rectangle {
  id: string;
  x: float64;
  y: float64;
  width: float64;
  height: float64;
  fill: string;
  stroke: string;
}

model Text {
  id: string;
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
  id: string;
  name: string;
  x: float64;
  y: float64;
  columns: Column[];
  ddl: string;
}

// Relationship edge view model (used by React Flow Edge)
model RelationshipEdgeViewModel {
  id: string;
  source: string; // entity id
  target: string; // entity id
  fromColumn: string;
  toColumn: string;
  constraintName: string;
}

// Complete ER diagram view model
model ERDiagramViewModel {
  nodes: Record<EntityNodeViewModel>;
  edges: Record<RelationshipEdgeViewModel>;
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
