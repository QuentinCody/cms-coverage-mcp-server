import { documentEndpoints } from "./documents";
import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const cmsCoverageCatalog: ApiCatalog & { endpointCount: number } = {
	name: "CMS Medicare Coverage Database",
	baseUrl: "https://api.coverage.cms.gov",
	version: "1.6",
	auth: "Public reports; licensed detail requires operator-provided CMS_COVERAGE_LICENSE_TOKEN",
	endpointCount: 15 + documentEndpoints.length,
	notes:
		"- NCDs are national Medicare coverage policies; LCDs are regional (per MAC jurisdiction)\n" +
		"- Coverage applies to Medicare Part B (medical services, procedures, DME, injectable drugs)\n" +
		"- NOT for Part D (oral prescription drugs) -- those are in formulary databases\n" +
		"- Local article/final-LCD status: A (active), R (retired), F (future). Proposed-LCD status: C (in comment), E (comments ended), F (in notice), A (final issued)\n" +
		"- MACs (Medicare Administrative Contractors) administer Medicare in geographic regions (jurisdictions)\n" +
		"- SAD exclusion list: drugs that can ONLY be self-administered and are excluded from Part B coverage\n" +
		"- HCPCS codes are used to identify covered services and procedures\n" +
		"- NCA = National Coverage Analysis (the review process); NCD = National Coverage Determination (the result)\n" +
		"- CAL = Coverage Analysis Letter; MEDCAC = Medicare Evidence Development & Coverage Advisory Committee\n" +
		"- TA = Technology Assessment (evidence reviews that inform coverage decisions)\n" +
		"- Public routes need no credentials. Licensed detail and SAD reads require an operator-provided CMS_COVERAGE_LICENSE_TOKEN, valid one hour. The server never accepts license terms or fetches tokens automatically. Preserve native meta/data and document versions; version creation, effective dates, retirement and weekly refresh dates differ. Paginated tables default to 100 rows (max 1000); continue with meta.next_token until empty, retaining ID/version/page_size. Omitted ver means mutable latest. Article code-table is specifically SAD exclusions. Group paragraphs and jurisdiction are essential; code presence is not a coverage decision.",
    workflows: [
        {title: "Discover local coverage snapshot and update periods", keywords: ["snapshot", "refresh", "update", "dates"], description: "Capture data freshness separately from document effective dates. These public metadata reads require no license token.", code: `const snapshot = await api.get("/v1/metadata/local-data-schedule/");
const periods = await api.get("/v1/metadata/update-period/");
return {snapshot, periods};`},
        {title: "Read versioned article codes with policy context", keywords: ["article", "HCPCS", "version", "codes", "licensed"], description: "Replace illustrative internal ID and version with values discovered in reports. Keep code-group paragraphs and contractor context; one page is not necessarily the entire table. Requires operator license token.", code: `const params = {articleid: "123", ver: "4"};
const detail = await api.get("/v1/data/article/", params);
const groups = await api.get("/v1/data/article/hcpc-code-group", params);
const contractor = await api.get("/v1/data/article/contractor", params);
const codes = await api.get("/v1/data/article/hcpc-code", {...params, page_size: 100});
return {detail, groups, contractor, codes, complete: false};`},
    ],
	endpoints: [
        ...documentEndpoints,
		// --- National Coverage ---
		{
			method: "GET",
			path: "/v1/reports/national-coverage-ncd/",
			summary: "List National Coverage Determinations (NCDs)",
			category: "national_coverage",
		},
		{
			method: "GET",
			path: "/v1/data/ncd/",
			summary:
				"Get full details of a National Coverage Determination by internal document ID",
			category: "national_coverage",
			queryParams: [
				{
					name: "ncdid",
					type: "string",
					required: true,
					description:
						"Internal NCD document ID from the NCD report (e.g. 211 for display ID 220.6)",
				},
				{
					name: "ncdver",
					type: "string",
					required: false,
					description: "NCD version; omit for the latest version",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/reports/national-coverage-ncacal/",
			summary: "List National Coverage Analyses and Coverage Analysis Letters",
			category: "national_coverage",
			queryParams: [
				{
					name: "document_type",
					type: "string",
					required: false,
					description: "Case-sensitive document type filter (NCA or CAL)",
				},
				{
					name: "status",
					type: "string",
					required: false,
					description: "Document status filter",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/data/cal/",
			summary: "Get a Coverage Analysis Letter by internal document ID",
			category: "national_coverage",
			queryParams: [
				{
					name: "calid",
					type: "string",
					required: true,
					description: "Internal CAL document ID from the NCA/CAL report",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/reports/national-coverage-medcac-meetings/",
			summary:
				"List MEDCAC (Medicare Evidence Development & Coverage Advisory Committee) meetings",
			category: "national_coverage",
		},
		{
			method: "GET",
			path: "/v1/reports/national-coverage-technology-assessments/",
			summary: "List Technology Assessments (evidence reviews informing coverage decisions)",
			category: "national_coverage",
		},
		// --- Local Coverage ---
		{
			method: "GET",
			path: "/v1/reports/local-coverage-final-lcds/",
			summary: "List final Local Coverage Determinations (LCDs)",
			category: "local_coverage",
			queryParams: [
				{
					name: "contractor_id",
					type: "number",
					required: false,
					description: "Internal MAC contractor ID",
				},
				{
					name: "state_id",
					type: "string",
					required: false,
					description: "Internal CMS state ID",
				},
				{
					name: "status",
					type: "string",
					required: false,
					description: "Document status filter",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/data/nca/",
			summary: "Get a National Coverage Analysis by internal document ID",
			category: "national_coverage",
			queryParams: [
				{
					name: "ncaid",
					type: "string",
					required: true,
					description: "Internal NCA document ID from the NCA/CAL report",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/reports/local-coverage-proposed-lcds/",
			summary: "List proposed LCDs (draft local coverage policies open for comment)",
			category: "local_coverage",
			queryParams: [
				{
					name: "contractor_id",
					type: "number",
					required: false,
					description: "Internal MAC contractor ID",
				},
				{
					name: "state_id",
					type: "string",
					required: false,
					description: "Internal CMS state ID",
				},
				{
					name: "status",
					type: "string",
					required: false,
					description: "Document status filter",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/reports/local-coverage-articles/",
			summary: "List LCD-related billing and coding articles",
			category: "local_coverage",
			queryParams: [
				{
					name: "contractor_id",
					type: "number",
					required: false,
					description: "Internal MAC contractor ID",
				},
				{
					name: "state_id",
					type: "string",
					required: false,
					description: "Internal CMS state ID",
				},
				{
					name: "status",
					type: "string",
					required: false,
					description: "Document status filter",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/reports/national-coverage-medicare-coverage-documents/",
			summary: "List national Medicare Coverage Documents",
			category: "national_coverage",
		},
		// --- Reference ---
		{
			method: "GET",
			path: "/v1/data/contractor/",
			summary: "List or retrieve Medicare Administrative Contractors (MACs)",
			category: "reference",
			queryParams: [
				{
					name: "contractor_id",
					type: "number",
					required: false,
					description: "Internal contractor ID",
				},
				{
					name: "contractor_version",
					type: "number",
					required: false,
					description: "Contractor version",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/reports/whats-new/national/",
			summary: "Get recent national coverage changes (new and revised NCDs)",
			category: "reference",
			queryParams: [
				{
					name: "document_type",
					type: "string",
					required: false,
					description: "Case-sensitive document type filter",
				},
				{
					name: "timeframe",
					type: "number",
					required: false,
					description: "Number of recent days to include",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/reports/whats-new/local/",
			summary: "Get recent local coverage changes (new and revised LCDs)",
			category: "reference",
			queryParams: [
				{
					name: "contractor_id",
					type: "number",
					required: false,
					description: "Internal MAC contractor ID",
				},
				{
					name: "start_date",
					type: "string",
					required: false,
					description: "Start date in YYYYMMDD format",
				},
				{
					name: "end_date",
					type: "string",
					required: false,
					description: "End date in YYYYMMDD format",
				},
			],
		},
		{
			method: "GET",
			path: "/v1/reports/national-coverage-annual/",
			summary: "Get the annual national coverage report",
			category: "national_coverage",
		},
	],
};
