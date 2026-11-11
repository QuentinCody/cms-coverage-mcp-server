import {afterEach, describe, expect, it, vi} from "vitest";
import {createCmsCoverageApiFetch} from "./api-adapter";
import {documentEndpoints, requiresLicense} from "../spec/documents";
const token = "synthetic-license-token";
const packet = {meta: {status: {id: 200, message: "Synthetic"}, notes: "fixture", next_token: ""}, data: [{article_id: 123, article_version: 4, hcpc_code_id: "J0000", hcpc_code_group: 2, paragraph: "Synthetic conditional wording", eff_date: "01/01/2025", end_date: null}]};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {"Content-Type": "application/json"}});
afterEach(() => vi.unstubAllGlobals());
const request = (params: Record<string, unknown> = {}) => ({method: "GET", path: "/v1/data/article/hcpc-code", params: {articleid: "123", ver: "4", ...params}});

describe("CMS licensed document reads", () => {
  it("retains native rows, metadata, versions and group/date context", async () => {
    const fetcher = vi.fn().mockResolvedValue(json(packet)); vi.stubGlobal("fetch", fetcher);
    const result = await createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})(request());
    expect(result.data).toMatchObject({...packet, _mcp: {page_complete: true, version_pinned: true, request: {articleid: "123", ver: "4", page_size: "100"}}});
    expect(fetcher.mock.calls[0][0].origin).toBe("https://api.coverage.cms.gov");
    expect(fetcher.mock.calls[0][1]).toMatchObject({redirect: "manual", headers: {Authorization: `Bearer ${token}`}});
    expect(JSON.stringify(result)).not.toContain(token);
  });
  it("retains opaque next tokens and marks a partial page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({...packet, meta: {...packet.meta, next_token: "opaque+/="}})));
    expect((await createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})(request())).data).toMatchObject({meta: {next_token: "opaque+/="}, _mcp: {page_complete: false}});
  });
  it("does not interpret absent pagination metadata as completion", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({meta: {}, data: []})));
    expect((await createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})(request())).data).toMatchObject({_mcp: {page_complete: null}});
  });
  it("encodes continuation tokens without changing the document version", async () => {
    const fetcher = vi.fn().mockResolvedValue(json(packet)); vi.stubGlobal("fetch", fetcher);
    await createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})(request({next_token: "a+/=", page_size: 25}));
    expect(fetcher.mock.calls[0][0].searchParams.get("next_token")).toBe("a+/=");
    expect(fetcher.mock.calls[0][0].searchParams.get("ver")).toBe("4");
  });
  it("keeps public metadata anonymous even with a configured license token", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({meta: {}, data: [{data_captured_through: "20260920", refreshed_on_date: "20260924"}]})); vi.stubGlobal("fetch", fetcher);
    await createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})({method: "GET", path: "/v1/metadata/local-data-schedule/"});
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });
  it.each(documentEndpoints.filter(e => requiresLicense(e.path)).map(e => [e.path, e.queryParams?.some(p => p.name === "lcdid") ? "lcdid" : "articleid"]))("requires operator credentials for %s", async (path, id) => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(createCmsCoverageApiFetch()({method: "GET", path, params: path.includes("/data/") ? {[id]: "123"} : {}})).rejects.toMatchObject({status: 401});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    {...request(), method: "POST"}, {...request(), body: {}}, {...request(), path: "https://evil.test/"},
    {...request(), path: "/v1/metadata/license-agreement/"}, {...request(), path: "/v1/data/../metadata/license-agreement/"},
    request({page_size: 1001}), request({page_size: 0}), request({page_size: "1.5"}), request({page_size: []}),
    request({next_token: "abc", ver: undefined}), request({articleid: undefined}), request({Authorization: "bad"}),
  ])("rejects unsupported or unsafe requests before network", async input => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})(input)).rejects.toMatchObject({status: 400});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([401, 403, 429, 500])("preserves HTTP %s without echoing credential-bearing errors", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({message: token}, status)));
    await expect(createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})(request())).rejects.toMatchObject({status});
  });
  it.each([[], {code: 400, message: "error"}, {data: []}, {meta: {}, data: {}}, {...packet, meta: {next_token: 123}}, {...packet, data: [{token}]}])("rejects malformed envelopes and credential echoes", async data => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(data)));
    await expect(createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})(request())).rejects.toMatchObject({status: 502});
  });
  it("bounds streamed bytes before parsing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x".repeat(4 * 1024 * 1024 + 1))));
    await expect(createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})(request())).rejects.toThrow("4 MiB");
  });
  it("does not retry a failed request or auto-refresh a token", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error(token)); vi.stubGlobal("fetch", fetcher);
    await expect(createCmsCoverageApiFetch({CMS_COVERAGE_LICENSE_TOKEN: token})(request())).rejects.toThrow("request failed");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
