import type {ApiFetchFn} from "@bio-mcp/shared/codemode/catalog";
import {cmsCoverageRead} from "./read";
import type {CoverageCredentials} from "./request";
export type {CoverageCredentials} from "./request";

export function createCmsCoverageApiFetch(env: CoverageCredentials = {}): ApiFetchFn {
  return async request => {
    const response = await cmsCoverageRead(request, env);
    const meta = response.data.meta as Record<string, unknown>;
    const completeness = {complete:false,returned:Array.isArray(response.data.data)?response.data.data.length:undefined,
      truncation:{reason:response.paginated && typeof meta.next_token === "string" && meta.next_token !== "" ? "page_limit" as const : "unknown" as const,
        detail:"One requested CMS response. Full document context, earlier pages and policy applicability are not established."}};
    return {status:response.status,completeness,upstreamTotal:null,data:{...response.data,_mcp:{
      source_url:response.provenance.source_url,retrieved_at:response.provenance.retrieved_at,
      request:response.request.params,path:response.request.path,provenance:response.provenance,
      page_complete:response.paginated && typeof meta.next_token === "string" ? meta.next_token === "" : null,
      continuation_provided:Object.prototype.hasOwnProperty.call(response.request.params,"next_token"),
      version_pinned:Object.prototype.hasOwnProperty.call(response.request.params,"ver") || Object.prototype.hasOwnProperty.call(response.request.params,"ncdver"),
      licensed:response.licensed,
      completeness,
    }}};
  };
}
