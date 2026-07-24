import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const cmsCoverageCatalog: ApiCatalog = {
	name: "CMS Medicare Coverage Database",
	baseUrl: "https://api.coverage.cms.gov",
	version: "1.6",
	auth: "none",
	endpointCount: 15,
	notes:
		"- NCDs are national Medicare coverage policies; LCDs are regional (per MAC jurisdiction)\n" +
		"- Coverage applies to Medicare Part B (medical services, procedures, DME, injectable drugs)\n" +
		"- NOT for Part D (oral prescription drugs) -- those are in formulary databases\n" +
		"- coverageStatus values: active (current), future (approved but not yet effective), retired (historical)\n" +
		"- MACs (Medicare Administrative Contractors) administer Medicare in geographic regions (jurisdictions)\n" +
		"- SAD exclusion list: drugs that can ONLY be self-administered and are excluded from Part B coverage\n" +
		"- HCPCS codes are used to identify covered services and procedures\n" +
		"- NCA = National Coverage Analysis (the review process); NCD = National Coverage Determination (the result)\n" +
		"- CAL = Coverage Analysis Letter; MEDCAC = Medicare Evidence Development & Coverage Advisory Committee\n" +
		"- TA = Technology Assessment (evidence reviews that inform coverage decisions)\n" +
		"- API keys are not required. Detailed LCD/article and SAD endpoints require a short-lived license-agreement token, so this catalog advertises only their public report endpoints.",
	endpoints: [
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
					type: "number",
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
					type: "number",
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
					type: "number",
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
