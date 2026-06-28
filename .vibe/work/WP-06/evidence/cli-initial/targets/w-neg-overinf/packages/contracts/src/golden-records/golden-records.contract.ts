// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const goldenRecordStatusSchema = z.enum(["draft", "active", "archived"]);

export const goldenRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  status: goldenRecordStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const goldenRecordsContract = c.router({
  list: { method: "GET", path: "/api/golden-records", responses: { 200: z.array(goldenRecordSchema) } },
});
