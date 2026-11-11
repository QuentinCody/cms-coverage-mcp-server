import { fail } from "./errors";
import { buildCoverageRequest, type CoverageCredentials } from "./request";
import type {ApiFetchFn} from "@bio-mcp/shared/codemode/catalog";

/** One read-only API request; deadline covers headers and the complete body. */
export async function cmsCoverageRead(request: Parameters<ApiFetchFn>[0], env: CoverageCredentials = {}, opts?: {timeoutMs?: number; maxBytes?: number}) {
  const {url, token, paginated} = buildCoverageRequest(request, env);
  const init = {method:"GET",headers:{Accept:"application/json",...(token ? {Authorization:`Bearer ${token}`} : {})}};
  const context = {method:"GET",path:url.pathname,params:Object.fromEntries(url.searchParams)};
  const apiKey = env.CMS_COVERAGE_LICENSE_TOKEN?.trim();
  const sourceUrl = url.toString();
  const controller = new AbortController();
  const maxBytes = opts?.maxBytes ?? 4 * 1024 * 1024;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let response: Response | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("deadline")); }, opts?.timeoutMs ?? 50_000);
  });
  try {
    try {
      const pending = Promise.resolve(fetch(url, { ...init, redirect: "manual", signal: controller.signal })).then(value => {
        if (controller.signal.aborted) { void value.body?.cancel().catch(() => {}); throw new Error("deadline"); }
        return value;
      });
      response = await Promise.race([pending, expired]);
    } catch { fail("CMS Coverage request failed or timed out", 502); }
    if (Number(response.headers.get("content-length")) > maxBytes) fail("CMS Coverage response exceeds byte limit (default 4 MiB)", 502);
    reader = response.body?.getReader();
    const { size, chunks } = await readCoverageChunks(reader, expired, maxBytes);
    const { retryAfter, raw, provenance, original } = await decodeCoverageEvidence(size, chunks, apiKey, sourceUrl, context, response);
    return await decodeCoverageResponse(response, apiKey, retryAfter, raw, provenance, paginated, original, token, context);
  } finally {
    clearTimeout(timer);
    controller.abort();
    if (reader) void reader.cancel().catch(() => {});
    else if (response) void response.body?.cancel().catch(() => {});
  }
}

async function decodeCoverageResponse(response: Response, apiKey: string | undefined, retryAfter: string | null, raw: string, provenance: { source_url: string; request: { method: string; path: string; params: { [k: string]: string; }; }; retrieved_at: string; response_sha256: string; response_bytes: number; raw_json: string; redacted: boolean; }, paginated: boolean, original: string, token: string | undefined, context: { method: string; path: string; params: { [k: string]: string; }; }) {
  const evidence = {
    upstream_http_status: response.status, retry_after: apiKey ? retryAfter?.split(apiKey).join("[REDACTED]").split(encodeURIComponent(apiKey)).join("[REDACTED]") ?? null : retryAfter,
    text: raw, provenance
  };
  if (response.status !== 200 || response.headers.has("content-range")) {
    fail(`CMS Coverage HTTP ${response.status}`, response.status === 200 ? 502 : response.status, evidence);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw.replace(/^\uFEFF/, "")); }
  catch { fail("CMS Coverage returned invalid JSON", 502, evidence); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("Invalid CMS response envelope", 502, evidence);
  const data = parsed as Record<string, unknown>;
  if ("code" in data && "message" in data) fail("CMS returned an API error", 502, evidence);
  if (!Array.isArray(data.data) || !data.meta || typeof data.meta !== "object" || Array.isArray(data.meta)) fail("Missing CMS meta/data envelope", 502, evidence);
  const meta = data.meta as Record<string, unknown>;
  if (paginated && meta.next_token !== undefined && typeof meta.next_token !== "string") fail("Invalid CMS pagination token", 502, evidence);
  if (raw !== original) fail("CMS response unexpectedly contains a credential", 502, evidence);
  const redactedDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data)));
  return {
    status: response.status, data, paginated, licensed: Boolean(token), request: context, provenance: {
      ...provenance, api_version: null,
      redacted_json_sha256: Array.from(new Uint8Array(redactedDigest), b => b.toString(16).padStart(2, "0")).join("")
    }
  };
}

async function readCoverageChunks(reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>> | undefined, expired: Promise<never>, maxBytes: number) {
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (reader) {
      const { value, done } = await Promise.race([reader.read(), expired]); if (done) break;
      size += value.byteLength; if (size > maxBytes) fail("Response exceeds byte limit", 502);
      chunks.push(value);
    }
  } catch { fail("CMS Coverage response unreadable, timed out or exceeds byte limit (default 4 MiB)", 502); }
  return { size, chunks };
}

async function decodeCoverageEvidence(size: number, chunks: Uint8Array<ArrayBufferLike>[], apiKey: string | undefined, sourceUrl: string, context: { method: string; path: string; params: { [k: string]: string; }; }, response: Response) {
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let raw: string;
  try { raw = (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? "\uFEFF" : "") + new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes); }
  catch { fail("CMS Coverage returned invalid UTF-8", 502); }
  const original = raw;
  // Decode JSON string tokens before redaction so Unicode-escaped echoes cannot leak the key.
  if (apiKey) raw = raw.replace(/"(?:[^"\\]|\\.)*"/g, token => {
    try {
      const decoded = JSON.parse(token) as string;
      const safe = decoded.split(apiKey).join("[REDACTED]").split(encodeURIComponent(apiKey)).join("[REDACTED]");
      return safe === decoded ? token : JSON.stringify(safe);
    } catch { return token; }
  });
  if (apiKey) for (const value of new Set([apiKey, encodeURIComponent(apiKey), JSON.stringify(apiKey).slice(1, -1)])) raw = raw.split(value).join("[REDACTED]");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const provenance = {
    source_url: sourceUrl, request: context, retrieved_at: new Date().toISOString(),
    response_sha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join(""),
    response_bytes: size, raw_json: raw, redacted: raw !== original
  };
  const retryAfter = response.headers.get("retry-after");
  return { retryAfter, raw, provenance, original };
}
