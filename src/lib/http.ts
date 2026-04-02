import { restFetch } from "@bio-mcp/shared/http/rest-fetch";
import type { RestFetchOptions } from "@bio-mcp/shared/http/rest-fetch";

const CMS_COVERAGE_BASE = "https://api.coverage.cms.gov";

export interface CmsCoverageFetchOptions extends Omit<RestFetchOptions, "retryOn"> {
    baseUrl?: string;
}

/**
 * Fetch from the CMS Medicare Coverage Database API.
 */
export async function cmsCoverageFetch(
    path: string,
    params?: Record<string, unknown>,
    opts?: CmsCoverageFetchOptions,
): Promise<Response> {
    const baseUrl = opts?.baseUrl ?? CMS_COVERAGE_BASE;
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...(opts?.headers ?? {}),
    };

    return restFetch(baseUrl, path, params, {
        ...opts,
        headers,
        retryOn: [429, 500, 502, 503],
        retries: opts?.retries ?? 3,
        timeout: opts?.timeout ?? 30_000,
        userAgent: "cms-coverage-mcp-server/1.0 (bio-mcp)",
    });
}
