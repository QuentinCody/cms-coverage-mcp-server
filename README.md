# CMS Coverage MCP Server

This is a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server. It lets MCP clients (Claude Desktop, Claude Code, Continue, etc.) query the upstream CMS Coverage API in natural language. It is one of 100+ servers in the [Bio MCP](../../README.md) monorepo.

## Connect

The server is deployed and ready at:

```
https://cms-coverage-mcp-server.quentincody.workers.dev/mcp
```

Add it to your MCP client (Claude Desktop → Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "cms-coverage": {
      "command": "npx",
      "args": ["mcp-remote", "https://cms-coverage-mcp-server.quentincody.workers.dev/mcp"]
    }
  }
}
```

For local development the server runs at `http://localhost:8872/mcp` (start it with `./scripts/dev-servers.sh cms-coverage`):

```json
{
  "mcpServers": {
    "cms-coverage-local": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8872/mcp"]
    }
  }
}
```

## Tools

- `cms_coverage_search` — discover available API operations (Code Mode catalog search)
- `cms_coverage_execute` — **Code Mode**: write JavaScript in a V8 isolate (`api.get()` / `searchSpec()`) instead of issuing tool calls one by one
- `cms_coverage_query_data` — run SQL over large responses auto-staged into a per-session SQLite database
- `cms_coverage_get_schema` — inspect the inferred schema of a staged dataset

Large responses (>30KB) are auto-staged into a queryable SQLite database; the tools return a `data_access_id` you can query with SQL.

Every tool returns both a human-readable `content` summary and a structured `structuredContent` payload.

## Development

```bash
./scripts/dev-servers.sh cms-coverage            # run locally (port 8872)
pnpm --filter cms-coverage-mcp-server run deploy   # deploy to Cloudflare Workers
```

See [`docs/adding-mcp-servers.md`](../../docs/adding-mcp-servers.md) and the root [README](../../README.md) for the full architecture (Code Mode, staging, portals).

---

*Auto-generated baseline README — refine with server-specific detail as needed.*

## CMS Coverage API 1.6 document and code reads

The catalog includes article detail and all 24 article sections, LCD detail with
selected code/context sections, SAD exclusion discovery, and snapshot/update-period
metadata. See the [provider OpenAPI](https://api.coverage.cms.gov/docs/v1/coverage-api.json)
and [release notes](https://api.coverage.cms.gov/docs/release_notes). The live specification
labels itself 1.6; the release notes inspected on 2026-09-28 end at 1.5 (June 17, 2025).

Public reports remain anonymous. Licensed reads require an operator-provided Worker
secret `CMS_COVERAGE_LICENSE_TOKEN`. Obtaining a token through CMS represents acceptance
of AMA/ADA/AHA terms; it expires after one hour. This server neither obtains nor refreshes
tokens, exposes the acceptance endpoint, or returns credentials to Code Mode. An operator
must accept the terms and provision/replace the short-lived token separately. Missing or
expired credentials return an explicit error. Authenticated validation remains pending.

Use internal IDs from reports and pin `ver` when comparing detail, contractor,
jurisdiction and code groups. Preserve group paragraphs: code presence alone is not a
coverage decision. Article `code-table` specifically contains SAD exclusions. Native
`meta` and `data` survive along with `_mcp` request/time context. Snapshot capture,
publication, version creation, effective and retirement dates remain distinct.

Code tables default to `page_size=100` (maximum 1000). Follow native `meta.next_token`
with the same ID/version/page size. Continuation requests require `ver`. `_mcp.page_complete`
is true only when a paginated response supplies an empty token, false for a nonempty
token, and null when completion is unknown; it is not a statement about policy applicability
or pages retrieved earlier. No automatic pagination or attachment fetching occurs.
Requests use fixed paths, a 50-second timeout and a 4 MiB response ceiling; larger reads
must be narrowed. Responses over 30 KiB stage. All four tools have `mcp_` aliases.

The deadline covers headers and every body read; cancellation cannot hold the result
open indefinitely. Reads make one attempt, reject redirects and partial HTTP responses,
and retain bounded native error evidence. Credential echoes, including JSON-escaped
echoes, cause an explicit error with sanitized evidence. No token refresh occurs.
Encoded request URLs are bounded at 32,000 characters; continuation tokens remain strings.

All eight aliases cite success and error results and stage the complete MCP envelope
above 30KiB, including text, metadata and SDK headroom. This also applies to SQL and
schema responses. Recover the full `payloads` evidence (and referenced `content_chunks`)
for source JSON and provenance. `_mcp.provenance` retains the exact sanitized source
text, original byte count/hash and a separate parsed-JSON hash. Raw text preserves numeric
tokens that JavaScript parsing may round; original-byte hashes precede any redaction.
These hashes identify evidence and do not independently authenticate the provider.

`coverage_rows` stores each native row in order using `mcp_source_index` and
`mcp_native_json`, plus safe scalar columns. Repeated codes in different groups or
versions remain separate. Exact strings, condition paragraphs, contractor/jurisdiction
data, nested fields, nulls and unknown fields survive in native JSON. `coverage_response`
preserves the original envelope controls, including `meta`, field lists, child sections
and continuation. Large SQL output restages into `query_rows` and full payload evidence.

`version_pinned` means the request supplied a version, not that an independent source
attested it. An empty next token completes only that pagination tail. Source and composed
results remain conservatively incomplete with respect to full document context, earlier
pages and policy applicability. A retrieved code or group does not establish coverage.

Local fixture tests cover authentication routing, token non-disclosure, pagination,
native response preservation, staging and dual registration. Live upstream and Worker
contract checks still need a network-capable environment and operator credentials.
October 6 acceptance exercises the actual MCP handlers and staging code with synthetic
provider responses, Node SQLite storage and a local JavaScript isolate substitute. It
does not qualify authenticated CMS data, policy applicability or an edited Workerd runtime.

<!-- license-and-data-terms:start -->
## License and data terms

The code in this repository is licensed under the Apache License 2.0 (see `LICENSE`).
If you use it in your work, please cite it (see `CITATION.cff`). Citation is requested, not required.

The license covers the code only. Data that this server returns comes from Medicare Coverage Database and stays under the terms of that source: CMS data plus AMA/ADA/AHA-licensed CPT, CDT, UB-04 content.
You are responsible for your use of the data under those terms.
<!-- license-and-data-terms:end -->
