// W-TYPE: real `tsc` consumer that imports the aggregate's PUBLIC typed surface
// from "@vibe-engineer/mechanical-gates/aggregate" (package self-reference via
// the `exports` map; resolves only from inside the package, which is why this
// file lives at packages/mechanical-gates/fixtures/p0/testing-boundary-aggregate/).
//
// This is the only witness that genuinely verifies the typed public-consumer seam
// I-20A consumes: the runtime .mjs consumers strip types and cannot catch a
// malformed declaration. With skipLibCheck:false + NodeNext, tsc compiles
// src/aggregate/index.d.ts — a missing "p0.testing-boundary" union member, a
// missing/mistyped testingBoundary? option, a bad import path, or a missing .js
// suffix under NodeNext turns the compile red (brittle-by-design).

import { runP0Aggregate, type P0AggregateOptions, type P0AggregateFamily } from "@vibe-engineer/mechanical-gates/aggregate";

const tb: P0AggregateFamily = "p0.testing-boundary";

const options: P0AggregateOptions = {
  families: ["p0.testing-boundary"],
  testingBoundary: { policyPath: "mechanical-testing-boundary.json" }
};

async function consume(projectRoot: string): Promise<void> {
  const result = await runP0Aggregate(projectRoot, options);
  if (!result.evidence.implementedFamilies.includes(tb)) {
    throw new Error("typed consumer: implementedFamilies must include p0.testing-boundary");
  }
}

void consume;
