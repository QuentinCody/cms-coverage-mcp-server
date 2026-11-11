import type { McpServer } from "@bio-mcp/shared/mcp";
import { createSearchTool } from "@bio-mcp/shared/codemode/search-tool";
import { createExecuteTool } from "@bio-mcp/shared/codemode/execute-tool";
import { cmsCoverageCatalog } from "../spec/catalog";
import { createCmsCoverageApiFetch } from "../lib/api-adapter";
import { cmsCoverageResponse, CMS_COVERAGE_SOURCE } from "../lib/tool-result";

interface CodeModeEnv {
    CMS_COVERAGE_DATA_DO: DurableObjectNamespace;
    CODE_MODE_LOADER: WorkerLoader;
    CMS_COVERAGE_LICENSE_TOKEN?: string;
}

export function registerCodeMode(
    server: McpServer,
    env: CodeModeEnv,
): void {
    const apiFetch = createCmsCoverageApiFetch({ CMS_COVERAGE_LICENSE_TOKEN: env.CMS_COVERAGE_LICENSE_TOKEN });
    const registrar = { tool: (...args: unknown[]) => {
        const [name, ...rest] = args;
        // SAFETY: shared factories supply SDK registration arguments and handlers.
        const handler = rest.pop() as (input: unknown, extra: unknown) => ReturnType<typeof cmsCoverageResponse>;
        const register = server.tool.bind(server) as (...values: unknown[]) => void;
        for (const alias of [String(name), `mcp_${String(name)}`]) register(alias, ...rest,
            (input: unknown, extra: unknown) => cmsCoverageResponse(() => handler(input, extra), env, alias, extra, input));
    } };

    const searchTool = createSearchTool({
        prefix: "cms_coverage",
        catalog: cmsCoverageCatalog,
    });
    searchTool.register(registrar);

    const executeTool = createExecuteTool({
        prefix: "cms_coverage",
        // Verifiable provenance: cms_coverage_execute results carry a _meta.citation.
        source: CMS_COVERAGE_SOURCE,
        catalog: cmsCoverageCatalog,
        apiFetch,
        preserveApiErrors: true,
        maxInlineBytes: 30 * 1024,
        stagingThreshold: 30 * 1024,
        timeout: 90_000,
        doNamespace: env.CMS_COVERAGE_DATA_DO,
        loader: env.CODE_MODE_LOADER,
    });
    executeTool.register(registrar);
}
