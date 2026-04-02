import { RestStagingDO } from "@bio-mcp/shared/staging/rest-staging-do";
import type { SchemaHints } from "@bio-mcp/shared/staging/schema-inference";

export class CmsCoverageDataDO extends RestStagingDO {
    protected getSchemaHints(data: unknown): SchemaHints | undefined {
        if (!data || typeof data !== "object") return undefined;

        if (Array.isArray(data)) {
            const sample = data[0];
            if (sample && typeof sample === "object") {
                // NCD results
                if ("ncdId" in sample || "ncdVersion" in sample) {
                    return {
                        tableName: "coverage_documents",
                        indexes: ["ncdId", "title", "coverageStatus"],
                    };
                }
                // LCD results
                if ("lcdId" in sample || "contractorNumber" in sample) {
                    return {
                        tableName: "coverage_documents",
                        indexes: ["lcdId", "title", "coverageStatus", "contractorNumber"],
                    };
                }
                // NCA results
                if ("ncaId" in sample || "trackingSheet" in sample) {
                    return {
                        tableName: "coverage_analyses",
                        indexes: ["ncaId", "title"],
                    };
                }
                // Article results
                if ("articleId" in sample) {
                    return {
                        tableName: "articles",
                        indexes: ["articleId", "title"],
                    };
                }
                // Contractor results
                if ("contractorName" in sample && "jurisdictionNumber" in sample) {
                    return {
                        tableName: "contractors",
                        indexes: ["contractorName", "jurisdictionNumber", "state"],
                    };
                }
                // MEDCAC meetings
                if ("meetingDate" in sample && ("panelName" in sample || "meetingId" in sample)) {
                    return {
                        tableName: "medcac_meetings",
                        indexes: ["meetingDate", "panelName"],
                    };
                }
                // Technology Assessments
                if ("taId" in sample || "technologyAssessment" in sample) {
                    return {
                        tableName: "technology_assessments",
                        indexes: ["taId", "title"],
                    };
                }
                // SAD exclusion list
                if ("hcpcsCode" in sample && ("drugName" in sample || "exclusion" in sample)) {
                    return {
                        tableName: "sad_exclusions",
                        indexes: ["hcpcsCode", "drugName"],
                    };
                }
                // Generic coverage documents fallback
                if ("title" in sample && "coverageStatus" in sample) {
                    return {
                        tableName: "coverage_documents",
                        indexes: ["title", "coverageStatus"],
                    };
                }
            }
        }

        // Single document (detail endpoint)
        const obj = data as Record<string, unknown>;
        if (obj.ncdId || obj.lcdId || obj.articleId) {
            return {
                tableName: "coverage_document_detail",
                indexes: [],
            };
        }

        return undefined;
    }
}
