// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
import type { GoldenRecord } from "@vibe-engineer-starter/domain";

// Sample/demo/reference service. In the reference starter it returns an empty
// list; the persistence join (PostgreSQL + Prisma) is owned by I-16 and is
// pending-live here. No business domain is encoded.
export class GoldenRecordsService {
  public list(): readonly GoldenRecord[] {
    return [];
  }
}
