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
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  extra: string;
}

// Foreign key model
model ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

// Entity (table) model
model Entity {
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  ddl: string;
}

// Relationship model
model Relationship {
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
  constraintName: string;
}

// ER Data model
model ERData {
  entities: Entity[];
  relationships: Relationship[];
}

// Layout models
model EntityLayout {
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
  entities: Record<EntityLayout>;
  rectangles: Rectangle[];
  texts: Text[];
}

// Combined data model
model AllData {
  erData: ERData | null;
  layoutData: LayoutData;
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

// API Routes
@route("/api")
namespace API {
  
  // Get ER data
  @get
  @route("/er-data")
  op getERData(): ERData | ErrorResponse;

  // Reverse engineer database to generate ER data
  @post
  @route("/reverse-engineer")
  op reverseEngineer(): ERData | ErrorResponse;

  // Save layout data
  @post
  @route("/layout")
  op saveLayout(@body layoutData: LayoutData): SuccessResponse | ErrorResponse;

  // Get layout data
  @get
  @route("/layout")
  op getLayout(): LayoutData | ErrorResponse;

  // Save all data (ER + layout)
  @post
  @route("/data/all")
  op saveAllData(@body allData: AllData): SuccessResponse | ErrorResponse;

  // Get all data (ER + layout)
  @get
  @route("/data/all")
  op getAllData(): AllData | ErrorResponse;

  // Get table DDL
  @get
  @route("/table/{tableName}/ddl")
  op getTableDDL(@path tableName: string): DDLResponse | ErrorResponse;

  // Get build information
  @get
  @route("/build-info")
  op getBuildInfo(): BuildInfo | ErrorResponse;
}
