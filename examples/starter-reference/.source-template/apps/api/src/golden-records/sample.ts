// @sample @demo @reference — golden-records module (DL-16 / DL-20A)
// This file is explicitly labeled sample/demo/reference. It demonstrates the
// starter architecture seam; it does NOT define a business domain.

export type GoldenRecordStatus = "draft" | "active" | "archived";

export interface GoldenRecord {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly status: GoldenRecordStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function classifyGoldenRecordStatus(status: GoldenRecordStatus): "sample-demo-reference" {
  switch (status) {
    case "draft":
    case "active":
    case "archived":
      return "sample-demo-reference";
  }
}
