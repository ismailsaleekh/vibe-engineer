// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
import type { ReactElement } from "react";
import { useGoldenRecords } from "@vibe-engineer-starter/api-client";

export function GoldenRecordsRoute(): ReactElement {
  const records = useGoldenRecords();
  return (
    <section aria-label="Golden records (sample/demo/reference)">
      {records.map((record) => (
        <article key={record.id}>{record.title}</article>
      ))}
    </section>
  );
}
