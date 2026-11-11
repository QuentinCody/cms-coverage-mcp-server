import type {ApiEndpoint, ParamDef} from "@bio-mcp/shared/codemode/catalog";

const parameter = (name: string, description: string, required = false): ParamDef => ({name, type: "string", required, description});
const version = parameter("ver", "Document version; omission selects latest. Pin this across detail, codes and continuation requests.");
const paging = [parameter("page_size", "Local default 100; maximum 1000. Enables provider pagination."), parameter("next_token", "Opaque meta.next_token from the previous page; retain document ID, version and page size.")];
const articlePages = ["bill-codes", "code-table", "hcpc-code", "hcpc-modifier", "icd10-covered", "icd10-noncovered", "icd10-pcs-code", "revenue-code"];
const articleSections = ["related-documents", "related-ncd-documents", "related-source-icd9", "contractor", "hcpc-code-group", "hcpc-modifier-group", "icd10-covered-group", "icd10-noncovered-group", "icd10-pcs-code-group", "other-coding-group", "primary-jurisdiction", "response-comment", "revision-history", "sticky-note", "urls"];

function documentEndpoint(kind: "article" | "lcd", section = "", paginated = false): ApiEndpoint {
  return {
    method: "GET", path: `/v1/data/${kind}/${section}`,
    summary: section === "code-table" ? "Read a SAD article's Self-Administered Drug exclusion code table (licensed)" : `Read ${kind} ${section || "document detail"} (licensed)`,
    category: "local_coverage",
    queryParams: [parameter(`${kind}id`, `Internal ${kind} ID from the report; do not use the display prefix`, true), ...(section === "future-retire" ? [] : [version]), ...(paginated ? paging : [])],
    responseShape: "{meta: {status, notes, fields, children, next_token?}, data: [...native rows], _mcp: {request, retrieved_at, page_complete}}",
    usageHint: "Requires operator-provided CMS_COVERAGE_LICENSE_TOKEN. Preserve document/version, contractor/jurisdiction, group paragraphs and dates. Codes alone do not determine coverage. page_complete concerns pagination only, not policy applicability.",
  };
}

// Parameter sets checked against CMS Coverage API 1.6 OpenAPI on 2026-09-28.
export const documentEndpoints: ApiEndpoint[] = [
  documentEndpoint("article"), documentEndpoint("article", "future-retire"),
  ...articlePages.map(section => documentEndpoint("article", section, true)),
  ...articleSections.map(section => documentEndpoint("article", section)),
  documentEndpoint("lcd"),
  ...["related-documents", "related-ncd-documents", "contractor", "hcpc-code-group", "primary-jurisdiction", "revision-history"].map(section => documentEndpoint("lcd", section)),
  documentEndpoint("lcd", "hcpc-code", true),
  {method: "GET", path: "/v1/reports/local-coverage-sad-exclusion-list/", category: "local_coverage", summary: "Discover Self-Administered Drug exclusion list articles (licensed)", queryParams: [
    {...parameter("date_option", "current (default), effect or range"), enum: ["current", "effect", "range"]},
    parameter("start_date", "YYYYMMDD"), parameter("end_date", "YYYYMMDD"), parameter("hcpcs_code", "Comma-separated CPT/HCPCS codes"), parameter("keyword", "Drug keyword"),
  ]},
  {method: "GET", path: "/v1/metadata/local-data-schedule/", category: "reference", summary: "Discover local data snapshot capture and refresh dates; these are not policy effective dates"},
  {method: "GET", path: "/v1/metadata/update-period/", category: "reference", summary: "Discover local coverage update periods and their begin/end dates"},
  {method: "GET", path: "/v1/metadata/states/", category: "reference", summary: "Discover CMS internal state identifiers", queryParams: [parameter("state_id", "Internal state ID filter")]},
];

export function requiresLicense(path: string): boolean {
  return path.startsWith("/v1/data/article/") || path.startsWith("/v1/data/lcd/") || path === "/v1/reports/local-coverage-sad-exclusion-list/";
}
