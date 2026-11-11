import type {ApiFetchFn} from "@bio-mcp/shared/codemode/catalog";
import {cmsCoverageCatalog} from "../spec/catalog";
import {requiresLicense} from "../spec/documents";
import {fail} from "./errors";
export interface CoverageCredentials { CMS_COVERAGE_LICENSE_TOKEN?: string }
export function buildCoverageRequest(request: Parameters<ApiFetchFn>[0], env: CoverageCredentials = {}) {
    if (request.method !== "GET" || request.body !== undefined) fail("CMS Coverage supports GET reads without a body");
    const { paginated, url, endpoint } = prepareCoverageEndpoint(request);
    if (paginated) {
      const size = url.searchParams.get("page_size") ?? "100";
      if (!/^\d+$/.test(size) || Number(size) < 1 || Number(size) > 1000) fail("page_size must be 1–1000");
      url.searchParams.set("page_size", size);
      if (url.searchParams.has("next_token") && !url.searchParams.has("ver")) fail("Pin ver before continuing a document code table");
    }
    const token = requiresLicense(endpoint.path) ? env.CMS_COVERAGE_LICENSE_TOKEN?.trim() : undefined;
    if (requiresLicense(endpoint.path) && !token) fail("This CMS route requires CMS_COVERAGE_LICENSE_TOKEN from an operator who has accepted the provider license terms; tokens expire after one hour", 401);
    if (token && /[\r\n]/.test(token)) fail("Invalid CMS credential configuration", 401);
    if (url.href.length > 32_000) fail("CMS encoded URL exceeds 32000 characters");
    return {url, token, paginated};
}

function prepareCoverageEndpoint(request: { method: string; path: string; params?: Record<string, unknown>; body?: unknown; }) {
  const endpoint = cmsCoverageCatalog.endpoints.find(item => item.path === request.path);
  if (!endpoint) fail("Unsupported CMS path; license acceptance and arbitrary URLs are not exposed");
  const url = new URL(endpoint.path, cmsCoverageCatalog.baseUrl);
  const definitions = endpoint.queryParams ?? [];
  for (const [key, value] of Object.entries(request.params ?? {})) {
    if (value === undefined) continue;
    const definition = definitions.find(item => item.name === key);
    if (!definition) fail(`Unsupported CMS parameter: ${key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40)}`);
    if (typeof value === "number" && !Number.isFinite(value)) fail("Invalid CMS numeric parameter");
    if (key === "next_token" && typeof value !== "string") fail("CMS continuation token must be a string");
    if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim() || String(value).length > 8192 || Array.from(String(value)).some(char => char.charCodeAt(0) < 32)) fail("Invalid CMS query parameter");
    if (definition.enum && !definition.enum.includes(value)) fail(`Invalid ${key}`);
    url.searchParams.set(key, String(value));
  }
  for (const definition of definitions) if (definition.required && !url.searchParams.has(definition.name)) fail(`Missing ${definition.name}`);
  const paginated = definitions.some(item => item.name === "page_size");
  return { paginated, url, endpoint };
}
