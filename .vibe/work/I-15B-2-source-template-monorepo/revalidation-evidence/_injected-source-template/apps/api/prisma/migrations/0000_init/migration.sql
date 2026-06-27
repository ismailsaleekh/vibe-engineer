-- Sample/demo/reference initial migration for the golden-records model (DL-16).
-- Represents the golden module only; no business-domain tables by default

CREATE TABLE "GoldenRecord" (
    "id"        TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "summary"   TEXT,
    "status"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoldenRecord_pkey" PRIMARY KEY ("id")
);
