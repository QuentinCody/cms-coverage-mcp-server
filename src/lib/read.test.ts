import { afterEach, expect, it, vi } from "vitest";
import { cmsCoverageRead } from "./read";

const request = {method:"GET",path:"/v1/data/article/hcpc-code",params:{articleid:"123",ver:"4"}};
const env = {CMS_COVERAGE_LICENSE_TOKEN:"fixture/token"};
afterEach(() => {vi.unstubAllGlobals();vi.useRealTimers();});

it("keeps exact source JSON separate from parsed rows and request/version context",async()=>{
 const raw='\uFEFF{ "meta":{"status":{"id":200}}, "data":[{"article_id":"00123","big":9007199254740993,"paragraph":"α😀"}],"_mcp":{"native":true} }\r\n';
 vi.stubGlobal("fetch",vi.fn(async()=>new Response(raw)));
 const result=await cmsCoverageRead(request,env);
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
 expect(result.provenance).toMatchObject({raw_json:raw,response_bytes:new TextEncoder().encode(raw).byteLength,response_sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join(""),redacted:false,api_version:null});
 expect(result.data).toEqual(JSON.parse(raw.slice(1)));
 expect(result.request).toEqual({method:"GET",path:request.path,params:{...request.params,page_size:"100"}});
});

it.each([200,206,302,401,403,429,503])("retains native error evidence without token leakage or retries (HTTP %i)",async status=>{
 const raw='{ "code":429,"message":"fixture/token fixture%2Ftoken \\u0066ixture/token" }';
 const fetcher=vi.fn(async()=>new Response(raw,{status,headers:{"retry-after":"60"}}));vi.stubGlobal("fetch",fetcher);
 await expect(cmsCoverageRead(request,env)).rejects.toMatchObject({status:status===200?502:status,data:{upstream_http_status:status,retry_after:"60",text:'{ "code":429,"message":"[REDACTED] [REDACTED] [REDACTED]" }',provenance:{redacted:true}}});
 expect(fetcher).toHaveBeenCalledTimes(1);
});

it("rejects a credential echo on a successful envelope while retaining sanitized evidence",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response('{"meta":{},"data":[{"note":"\\u0066ixture/token"}]}')));
 await expect(cmsCoverageRead(request,env)).rejects.toMatchObject({status:502,data:{text:'{"meta":{},"data":[{"note":"[REDACTED]"}]}'}});
});

it("rejects content-range on HTTP 200",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response('{"meta":{},"data":[]}',{headers:{"content-range":"bytes 0-10/999"}})));
 await expect(cmsCoverageRead(request,env)).rejects.toMatchObject({status:502,data:{upstream_http_status:200}});
});

it("redacts credential echoes in retry metadata",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response('{"code":429,"message":"synthetic"}',{status:429,headers:{"retry-after":"fixture/token fixture%2Ftoken"}})));
 await expect(cmsCoverageRead(request,env)).rejects.toMatchObject({data:{retry_after:"[REDACTED] [REDACTED]"}});
});

it.each(["headers","body","cancel"])("terminates stalled %s operations",async phase=>{
 vi.useFakeTimers();const never=()=>new Promise<never>(()=>{});const cancel=vi.fn(never);
 vi.stubGlobal("fetch",vi.fn(phase==="headers"?never:async()=>new Response(new ReadableStream({start(controller){if(phase==="cancel")controller.enqueue(new Uint8Array(11));},cancel}))));
 const check=expect(cmsCoverageRead(request,env,{timeoutMs:20,maxBytes:10})).rejects.toMatchObject({status:502});
 await vi.advanceTimersByTimeAsync(21);await check;
 if(phase!=="headers")expect(cancel).toHaveBeenCalledTimes(1);
});

it("rejects advertised oversize without waiting for body or cancellation",async()=>{
 const cancel=vi.fn(()=>new Promise<void>(()=>{}));
 vi.stubGlobal("fetch",vi.fn(async()=>new Response(new ReadableStream({cancel}),{headers:{"content-length":"5000000"}})));
 await expect(cmsCoverageRead(request,env)).rejects.toThrow("4 MiB");expect(cancel).toHaveBeenCalledTimes(1);
});

it("rejects invalid UTF-8 instead of altering policy text",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response(new Uint8Array([0xff]))));
 await expect(cmsCoverageRead(request,env)).rejects.toThrow("invalid UTF-8");
});

it("preserves malformed native JSON as bounded error evidence",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>new Response('{"meta":{},"data":[')));
 await expect(cmsCoverageRead(request,env)).rejects.toMatchObject({status:502,data:{text:'{"meta":{},"data":['}});
});
