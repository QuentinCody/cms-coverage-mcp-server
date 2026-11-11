import { expect, it } from "vitest";
import { buildCoverageRequest } from "./request";

const env={CMS_COVERAGE_LICENSE_TOKEN:"fixture"};
const request={method:"GET",path:"/v1/data/article/hcpc-code",params:{articleid:"123",ver:"4"}};
it.each([Number.NaN,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY])("rejects non-finite numeric identifiers: %s",value=>{
 expect(()=>buildCoverageRequest({...request,params:{...request.params,articleid:value}},env)).toThrow("numeric");
});
it("requires an opaque string continuation token",()=>{
 expect(()=>buildCoverageRequest({...request,params:{...request.params,next_token:123}},env)).toThrow("string");
});
it("bounds the encoded URL after multibyte percent encoding",()=>{
 expect(()=>buildCoverageRequest({method:"GET",path:"/v1/reports/local-coverage-sad-exclusion-list/",params:{keyword:"α".repeat(8192)}},env)).toThrow("32000");
});
it("preserves literal plus signs, version, leading zeros and page size during continuation",()=>{
 const result=buildCoverageRequest({...request,params:{articleid:"00123",ver:"04",page_size:25,next_token:"a+/="}},env);
 expect(result.url.searchParams.toString()).toBe("articleid=00123&ver=04&page_size=25&next_token=a%2B%2F%3D");
 expect(result.paginated).toBe(true);
});
