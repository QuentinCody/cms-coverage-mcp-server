import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
function unwrap(value: unknown): unknown {
  return record(value) && Array.isArray(value.content) && record(value.structuredContent) && "data" in value.structuredContent
    ? value.structuredContent.data : value;
}
function native(value: unknown): unknown {
  const data = unwrap(value);
  const provenance = record(data) && record(data._mcp) && record(data._mcp.provenance) ? data._mcp.provenance : {};
  if (typeof provenance.raw_json === "string") {
    try { return JSON.parse(provenance.raw_json.replace(/^\uFEFF/, "")); } catch { /* Preserve composed data via the base evidence path. */ }
  }
  return data;
}
function project(rows: unknown[]) {
  const reserved = ["_rowid", "mcp_source_index", "mcp_native_json"];
  const names = new Map(reserved.map(name => [name, name]));
  return rows.map((row, mcp_source_index) => {
    const result: Record<string, unknown> = { mcp_source_index, mcp_native_json: JSON.stringify(row) };
    for (const [name, value] of Object.entries(record(row) ? row : {})) {
      const lower = name.toLowerCase();
      if (value !== null && typeof value === "object" || reserved.includes(lower) || names.has(lower) && names.get(lower) !== name) continue;
      names.set(lower, name); result[name] = value;
    }
    return result;
  });
}

export class CmsCoverageDataDO extends RestStagingDO {
  protected getTabularData(value: unknown): unknown {
    const data = native(value);
    // Shared staging submits serialized evidence before materializing native rows.
    if (!record(data) && !Array.isArray(data)) return data;
    if (record(data) && typeof data.sql === "string" && Array.isArray(data.rows)) {
      return { query_rows: data.rows.map((row, row_index) => ({ row_index, native_json: JSON.stringify(row) })) };
    }
    if (record(data) && Array.isArray(data.data)) {
      const { data: rows, ...controls } = data;
      return { coverage_rows: project(rows), coverage_response: [{ response_index: 0, native_json: JSON.stringify(controls) }] };
    }
    return Array.isArray(data) ? { coverage_rows: project(data) } : data;
  }

  protected getSchemaHints(value: unknown): SchemaHints | undefined {
    const data = native(value);
    if (!record(data) && !Array.isArray(data)) return undefined;
    const rows = Array.isArray(data) ? data : record(data) && Array.isArray(data.data) ? data.data : [];
    const columnTypes: Record<string, string> = { mcp_native_json: "TEXT", native_json: "TEXT" };
    for (const row of rows) if (record(row)) for (const [name, item] of Object.entries(row)) if (typeof item === "string") columnTypes[name] = "TEXT";
    columnTypes.mcp_source_index = "INTEGER"; columnTypes.row_index = "INTEGER"; columnTypes.response_index = "INTEGER";
    return { columnTypes };
  }
}
