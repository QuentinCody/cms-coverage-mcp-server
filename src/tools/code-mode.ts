import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { cmsCoverageCatalog } from "../spec/catalog";
import { createCmsCoverageApiFetch } from "../lib/api-adapter";

interface CodeModeEnv {
    CMS_COVERAGE_DATA_DO: DurableObjectNamespace;
    CODE_MODE_LOADER: WorkerLoader;
}

export function registerCodeMode(
    server: McpServer,
    env: CodeModeEnv,
): void {
    const apiFetch = createCmsCoverageApiFetch();

    const searchTool = createSearchTool({
        prefix: "cms_coverage",
        catalog: cmsCoverageCatalog,
    });
    searchTool.register(server as unknown as { tool: (...args: unknown[]) => void });

    const executeTool = createExecuteTool({
        prefix: "cms_coverage",
        catalog: cmsCoverageCatalog,
        apiFetch,
        doNamespace: env.CMS_COVERAGE_DATA_DO,
        loader: env.CODE_MODE_LOADER,
    });
    executeTool.register(server as unknown as { tool: (...args: unknown[]) => void });
}
