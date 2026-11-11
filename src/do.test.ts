/// <reference types="node" />
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("cloudflare:workers", () => ({ RpcTarget: class {}, DurableObject: class { constructor(public ctx: unknown, public env: unknown) {} } }));
import { CmsCoverageDataDO } from "./do";

const databases: DatabaseSync[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });
async function store(data: unknown) {
  const database = new DatabaseSync(":memory:"); databases.push(database);
  let ready: Promise<unknown> = Promise.resolve();
  const exec = (sql: string, ...args: SQLInputValue[]) => {
    const rows = database.prepare(sql).all(...args);
    return { toArray: () => rows, one: () => rows[0], [Symbol.iterator]: () => rows[Symbol.iterator]() };
  };
  const ctx = { blockConcurrencyWhile: (run: () => Promise<unknown>) => { ready = run(); return ready; },
    storage: { sql: { exec }, transactionSync: (run: () => unknown) => {
      database.exec("BEGIN"); try { const result = run(); database.exec("COMMIT"); return result; }
      catch (error) { database.exec("ROLLBACK"); throw error; }
    } } };
  // This test fixture implements only the Durable Object storage interfaces used here.
  const instance = new CmsCoverageDataDO(ctx as unknown as ConstructorParameters<typeof CmsCoverageDataDO>[0], {} as ConstructorParameters<typeof CmsCoverageDataDO>[1]);
  await ready;
  const result = await instance.fetch(new Request("https://fixture/process", { method: "POST", body: JSON.stringify({ data }) }));
  expect(await result.json()).toMatchObject({ success: true });
  return database;
}

const rows=[
 {article_id:"00123",article_version:4,hcpc_code_id:"J0000",hcpc_code_group:2,paragraph:"Synthetic condition A",eff_date:"01/01/2025",end_date:null,contractors:[{id:"0001",state:"NY"}],_rowid:7,mcp_native_json:"collision",ID:"001",id:"case collision"},
 {article_id:"00123",article_version:4,hcpc_code_id:"J0000",hcpc_code_group:3,paragraph:"Different synthetic condition B",eff_date:"01/01/2025",end_date:"12/31/2025",contractors:[]},
 null,{article_id:"00123",article_version:3,hcpc_code_id:"J0000",paragraph:null}
];
const meta={status:{id:200,message:"Synthetic"},next_token:"opaque+/=",notes:"not policy applicability",fields:["article_id"],children:["hcpc-code-group"]};
const packet={meta,data:rows,_mcp:{native:true},unknown:{keep:true}};
const source={...packet,_mcp:{provenance:{raw_json:JSON.stringify(packet)}}};
it("preserves duplicate codes under distinct groups, versions, conditions and native fields",async()=>{
 const db=await store(source);const found=db.prepare("SELECT * FROM coverage_rows ORDER BY mcp_source_index").all();
 expect(found.map(row=>JSON.parse(String(row.mcp_native_json)))).toEqual(rows);
 expect(found.map(row=>row.mcp_source_index)).toEqual([0,1,2,3]);
 expect(found[0].article_id).toBe("00123");expect(found[0].hcpc_code_group).toBe(2);expect(found[1].hcpc_code_group).toBe(3);
 expect(found[0].paragraph).toBe("Synthetic condition A");expect(found[1].paragraph).toBe("Different synthetic condition B");
 expect(JSON.parse(String(db.prepare("SELECT native_json FROM coverage_response").get()?.native_json))).toEqual({meta,_mcp:{native:true},unknown:{keep:true}});
});
it("retains metadata and continuation for an empty page",async()=>{
 const db=await store({meta,data:[]});
 expect(JSON.parse(String(db.prepare("SELECT native_json FROM coverage_response").get()?.native_json))).toEqual({meta});
});
it("unwraps composed tool responses and retains SQL rows with colliding IDs",async()=>{
 const db=await store({content:[],structuredContent:{data:source}});
 expect(db.prepare("SELECT count(*) AS n FROM coverage_rows").get()).toEqual({n:4});
 const sqlRows=[{_rowid:7,value:"001"},{_rowid:7,value:null}];
 const output=await store({content:[],structuredContent:{data:{sql:"SELECT * FROM coverage_rows",rows:sqlRows}}});
 expect(output.prepare("SELECT native_json FROM query_rows ORDER BY row_index").all().map(row=>JSON.parse(String(row.native_json)))).toEqual(sqlRows);
});
it("leaves serialized evidence on the shared payloads path",async()=>{
 const serialized=JSON.stringify(source);const db=await store(serialized);
 const decoded=JSON.parse(String(db.prepare("SELECT root_json FROM payloads WHERE id=1").get()?.root_json));
 expect(typeof decoded==="string"?JSON.parse(decoded):decoded).toEqual(source);
});
