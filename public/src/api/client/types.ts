// Generated TypeScript types from OpenAPI specification

// Common error response model
export interface ErrorResponse {
  error: string;
}

// Database column model
export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  extra: string;
}

// Foreign key model
export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

// Entity (table) model
export interface Entity {
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  ddl: string;
}

// Relationship model
export interface Relationship {
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
  constraintName: string;
}

// ER Data model
export interface ERData {
  entities: Entity[];
  relationships: Relationship[];
}

// Layout models
export interface EntityLayout {
  x: number;
  y: number;
}

export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
}

export interface Text {
  id: string;
  x: number;
  y: number;
  content: string;
  fontSize: number;
  fill: string;
}

export interface LayoutData {
  entities: Record<string, EntityLayout>;
  rectangles: Rectangle[];
  texts: Text[];
}

// Combined data model
export interface AllData {
  erData: ERData | null;
  layoutData: LayoutData;
}

// DDL response model
export interface DDLResponse {
  ddl: string;
}

// Build info model
export interface BuildInfo {
  version: string;
  name: string;
  buildTime: string;
  buildDate: string;
  git: {
    commit: string;
    commitShort: string;
    branch: string;
  };
}

// Success response model
export interface SuccessResponse {
  success: boolean;
}
