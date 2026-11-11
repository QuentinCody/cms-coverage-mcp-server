import { expect, it } from "vitest";
import { cmsCoverageCompleteness } from "./completeness";
import { cmsCoverageResponse } from "./tool-result";

it("preserves incomplete page coverage after comparison composes results", async () => {
  const completeness = {complete:false,returned:2,truncation:{reason:"page_limit" as const,detail:"first code page"}};
  const data = {pages:[{section:"codes",result:{count:2,results:[{id:1},{id:2}],_mcp:{completeness}}}]};
  expect(cmsCoverageCompleteness(data)).toEqual(completeness);
  const result = await cmsCoverageResponse(async()=>({content:[],structuredContent:{success:true,data}}),{},"cms_coverage_execute",{});
  expect(result.structuredContent?._meta).toMatchObject({completeness});
});

it("handles large arrays and cycles without a call-stack or argument-count overflow",()=>{
  const value:unknown[] = Array(150000).fill(0);value.push(value,{_mcp:{completeness:{complete:false,truncation:{reason:"unknown"}}}});
  expect(cmsCoverageCompleteness(value)).toMatchObject({complete:false});
  expect(cmsCoverageCompleteness({native:{count:0}})).toBeUndefined();
});

it("retains coverage from nested source handles after in-band SQL comparison",()=>{
  const completeness={complete:false,returned:24,truncation:{reason:"page_limit",detail:"first code page"}};
  expect(cmsCoverageCompleteness({pages:[{result:{__staged:true,data_access_id:"source",_staging:{completeness}}}]})).toEqual(completeness);
});
