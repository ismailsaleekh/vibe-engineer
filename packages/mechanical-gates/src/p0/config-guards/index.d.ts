import type { P0ValidatorResult } from "../boundaries/index.d.ts";

export function validateStrictConfig(
  projectRoot: string,
  options?: { tsconfigPath?: string; packageJsonPath?: string },
): Promise<P0ValidatorResult>;
