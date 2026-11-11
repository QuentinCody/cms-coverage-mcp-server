import {afterEach, expect, it, vi} from "vitest";
import {McpServer} from "@bio-mcp/shared/mcp";
import {createApiProxyTool} from "@bio-mcp/shared/tools/api-proxy";
import {registerCodeMode} from "./code-mode";
import {registerGetSchema} from "./get-schema";
import {registerQueryData} from "./query-data";
import {cmsCoverageCatalog} from "../spec/catalog";
import {createCmsCoverageApiFetch} from "../lib/api-adapter";
const json = (data: unknown) => new Response(JSON.stringify(data), {headers: {"Content-Type": "application/json"}});
afterEach(() => vi.unstubAllGlobals());
it("registers all tools under both aliases and retains both response fields", async () => {
  const server = new McpServer({name: "fixture", version: "1"});
  registerCodeMode(server, {CODE_MODE_LOADER: {get: () => ({})}} as unknown as Parameters<typeof registerCodeMode>[1]);
  registerGetSchema(server, {}); registerQueryData(server, {});
  const tools = (server as unknown as {_registeredTools: Record<string, {handler: (args: unknown, extra: unknown) => Promise<unknown>}>})._registeredTools;
  for (const suffix of ["search", "execute", "query_data", "get_schema"]) {
    expect(tools[`cms_coverage_${suffix}`]).toBeDefined(); expect(tools[`mcp_cms_coverage_${suffix}`]).toBeDefined();
  }
  expect(await tools.cms_coverage_search.handler({query: "article", max_results: 5}, {})).toMatchObject({content: expect.any(Array), structuredContent: {success: true}});
  expect(await tools.mcp_cms_coverage_query_data.handler({data_access_id: "fixture", sql: "SELECT 1"}, {})).toMatchObject({isError: true, content: expect.any(Array), structuredContent: expect.any(Object)});
});
it("stages entire native code rows, metadata and continuation context", async () => {
  const rows = Array.from({length: 100}, (_, i) => ({article_id: 123, article_version: 4, hcpc_code_id: `J${i}`, hcpc_code_group: 2, long_description: "Synthetic α ".repeat(70)}));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({meta: {next_token: "continue", notes: "synthetic"}, data: rows})));
  const stored: unknown[] = [];
  const namespace = {idFromName: (name: string) => name, get: () => ({fetch: async (request: Request) => {
    if (new URL(request.url).pathname === "/process") { stored.push((await request.json() as {data: unknown}).data); return json({success: true, tables_created: ["data"], total_rows: 100, input_rows: 100, table_row_counts: {data: 100}}); }
    return json({success: true, schema: {tables: {data: {columns: [{name: "article_id"}]}}}});
  }})} as unknown as DurableObjectNamespace;
  const proxy = createApiProxyTool({apiFetch: createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: "synthetic-token"}), catalog: cmsCoverageCatalog, doNamespace: namespace, stagingPrefix: "cms_coverage", maxInlineBytes: 30 * 1024});
  const result = await proxy.handler({method: "GET", path: "/v1/data/article/hcpc-code", params: {articleid: "123", ver: "4"}}, {sql: () => []});
  expect(result).toMatchObject({__staged: true, data_access_id: expect.any(String), _staging: {completeness: {complete: false, truncation: {reason: "page_limit"}}}});
  expect(JSON.parse(stored[0] as string)).toMatchObject({data: rows, meta: {next_token: "continue"}, _mcp: {page_complete: false, request: {articleid: "123", ver: "4", page_size: "100"}}});
  expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThan(100000);
  expect(JSON.stringify(stored)).not.toContain("synthetic-token");
});
it("returns explicit API error when a licensed request has no token", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const proxy = createApiProxyTool({apiFetch: createCmsCoverageApiFetch(), catalog: cmsCoverageCatalog, stagingPrefix: "cms_coverage"});
  expect(await proxy.handler({method: "GET", path: "/v1/data/article/", params: {articleid: "123"}}, {sql: () => []})).toMatchObject({__api_error: true, incomplete: true, status: 401});
  expect(fetcher).not.toHaveBeenCalled();
});
