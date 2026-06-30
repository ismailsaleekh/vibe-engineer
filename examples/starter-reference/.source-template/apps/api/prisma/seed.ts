// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
// Explicit sample/demo/reference seed rows for the golden-records model.
// Inserted by the local-only db:seed script (DL-16 local scripts).
import { PrismaClient } from "@prisma/client";

export const GOLDEN_RECORD_SEED_ROWS = [
  {
    id: "sample-1",
    title: "Sample golden record",
    summary: "Reference row (sample/demo).",
    status: "draft",
  },
] as const;

const prisma = new PrismaClient();

try {
  for (const row of GOLDEN_RECORD_SEED_ROWS) {
    await prisma.goldenRecord.upsert({
      where: { id: row.id },
      update: {
        title: row.title,
        summary: row.summary,
        status: row.status,
      },
      create: row,
    });
  }
} finally {
  await prisma.$disconnect();
}
