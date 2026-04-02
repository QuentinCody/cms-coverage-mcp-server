import type { ApiCatalog } from "@bio-mcp/shared/codemode/catalog";

export const cmsCoverageCatalog: ApiCatalog = {
    name: "CMS Medicare Coverage Database",
    baseUrl: "https://www.cms.gov/medicare-coverage-database/rest/api/v1",
    version: "1.0",
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
        "- TA = Technology Assessment (evidence reviews that inform coverage decisions)",
    endpoints: [
        // --- National Coverage ---
        {
            method: "GET",
            path: "/search/ncd",
            summary: "Search National Coverage Determinations (NCDs) by keyword, ID, or coverage status",
            category: "national_coverage",
            queryParams: [
                { name: "searchText", type: "string", required: false, description: "Search keywords (e.g. 'lung cancer screening', 'PET scan')" },
                { name: "ncdId", type: "string", required: false, description: "Specific NCD ID (e.g. '220.6')" },
                { name: "ncdVersion", type: "string", required: false, description: "NCD version number" },
                { name: "coverageStatus", type: "string", required: false, description: "Filter by status", enum: ["active", "future", "retired"] },
            ],
        },
        {
            method: "GET",
            path: "/ncd/{ncdId}",
            summary: "Get full details of a National Coverage Determination by ID",
            category: "national_coverage",
            pathParams: [
                { name: "ncdId", type: "string", required: true, description: "NCD ID (e.g. '220.6')" },
            ],
        },
        {
            method: "GET",
            path: "/search/nca",
            summary: "Search National Coverage Analyses (the review process that leads to NCDs)",
            category: "national_coverage",
            queryParams: [
                { name: "searchText", type: "string", required: false, description: "Search keywords" },
                { name: "coverageStatus", type: "string", required: false, description: "Filter by status", enum: ["active", "future", "retired"] },
            ],
        },
        {
            method: "GET",
            path: "/search/cal",
            summary: "Search Coverage Analysis Letters (CALs)",
            category: "national_coverage",
            queryParams: [
                { name: "searchText", type: "string", required: false, description: "Search keywords" },
            ],
        },
        {
            method: "GET",
            path: "/search/medcac",
            summary: "Search MEDCAC (Medicare Evidence Development & Coverage Advisory Committee) meetings",
            category: "national_coverage",
            queryParams: [
                { name: "searchText", type: "string", required: false, description: "Search keywords" },
            ],
        },
        {
            method: "GET",
            path: "/search/ta",
            summary: "Search Technology Assessments (evidence reviews informing coverage decisions)",
            category: "national_coverage",
            queryParams: [
                { name: "searchText", type: "string", required: false, description: "Search keywords" },
            ],
        },
        // --- Local Coverage ---
        {
            method: "GET",
            path: "/search/lcd",
            summary: "Search Local Coverage Determinations (LCDs) by keyword, ID, contractor, or state",
            category: "local_coverage",
            queryParams: [
                { name: "searchText", type: "string", required: false, description: "Search keywords (e.g. 'molecular testing', 'DME wheelchair')" },
                { name: "lcdId", type: "string", required: false, description: "Specific LCD ID" },
                { name: "contractorNumber", type: "string", required: false, description: "MAC contractor number" },
                { name: "state", type: "string", required: false, description: "Two-letter state code (e.g. 'CA', 'TX')" },
                { name: "coverageStatus", type: "string", required: false, description: "Filter by status", enum: ["active", "future", "retired"] },
            ],
        },
        {
            method: "GET",
            path: "/lcd/{lcdId}",
            summary: "Get full details of a Local Coverage Determination by ID",
            category: "local_coverage",
            pathParams: [
                { name: "lcdId", type: "string", required: true, description: "LCD ID" },
            ],
        },
        {
            method: "GET",
            path: "/search/proposed-lcd",
            summary: "Search Proposed LCDs (draft local coverage policies open for comment)",
            category: "local_coverage",
            queryParams: [
                { name: "searchText", type: "string", required: false, description: "Search keywords" },
                { name: "state", type: "string", required: false, description: "Two-letter state code" },
            ],
        },
        {
            method: "GET",
            path: "/search/article",
            summary: "Search LCD-related billing and coding articles",
            category: "local_coverage",
            queryParams: [
                { name: "searchText", type: "string", required: false, description: "Search keywords (e.g. 'billing', HCPCS code)" },
                { name: "contractorNumber", type: "string", required: false, description: "MAC contractor number" },
                { name: "state", type: "string", required: false, description: "Two-letter state code" },
            ],
        },
        {
            method: "GET",
            path: "/article/{articleId}",
            summary: "Get full details of an LCD-related billing article by ID",
            category: "local_coverage",
            pathParams: [
                { name: "articleId", type: "string", required: true, description: "Article ID" },
            ],
        },
        // --- Reference ---
        {
            method: "GET",
            path: "/contractors",
            summary: "List Medicare Administrative Contractors (MACs) by state or jurisdiction",
            category: "reference",
            queryParams: [
                { name: "state", type: "string", required: false, description: "Two-letter state code (e.g. 'CA', 'NY')" },
                { name: "jurisdictionNumber", type: "string", required: false, description: "MAC jurisdiction number" },
            ],
        },
        {
            method: "GET",
            path: "/whats-new/national",
            summary: "Get recent national coverage changes (new and revised NCDs)",
            category: "reference",
        },
        {
            method: "GET",
            path: "/whats-new/local",
            summary: "Get recent local coverage changes (new and revised LCDs)",
            category: "reference",
        },
        {
            method: "GET",
            path: "/sad-exclusion-list",
            summary: "Get the Self-Administered Drug (SAD) Exclusion List -- drugs excluded from Part B coverage",
            category: "reference",
            queryParams: [
                { name: "hcpcsCode", type: "string", required: false, description: "Filter by HCPCS code" },
            ],
        },
    ],
};
