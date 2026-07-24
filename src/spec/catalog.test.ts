import { describe, expect, it } from "vitest";
import { cmsCoverageCatalog } from "./catalog";

describe("cmsCoverageCatalog", () => {
	it("uses the current Coverage API origin and v1 routes", () => {
		expect(cmsCoverageCatalog.baseUrl).toBe("https://api.coverage.cms.gov");
		expect(cmsCoverageCatalog.version).toBe("1.6");
		expect(cmsCoverageCatalog.endpoints).toHaveLength(cmsCoverageCatalog.endpointCount);
		expect(cmsCoverageCatalog.endpoints.every(({ path }) => path.startsWith("/v1/"))).toBe(
			true,
		);
		expect(cmsCoverageCatalog.endpoints.some(({ path }) => path.startsWith("/search/"))).toBe(
			false,
		);
	});

	it("models the NCD detail route with the API's internal ncdid parameter", () => {
		const endpoint = cmsCoverageCatalog.endpoints.find(({ path }) => path === "/v1/data/ncd/");
		expect(endpoint).toBeDefined();
		expect(endpoint?.queryParams).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "ncdid", required: true }),
				expect.objectContaining({ name: "ncdver", required: false }),
			]),
		);
	});

	it("does not advertise licensed detail routes that the adapter cannot authenticate", () => {
		const paths = cmsCoverageCatalog.endpoints.map(({ path }) => path);
		expect(paths).not.toContain("/v1/data/lcd/");
		expect(paths).not.toContain("/v1/data/article/");
		expect(paths).not.toContain("/v1/reports/local-coverage-sad-exclusion-list/");
	});
});
