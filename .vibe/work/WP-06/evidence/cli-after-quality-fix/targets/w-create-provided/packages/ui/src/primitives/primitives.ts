export interface BoxProps {
  readonly padding?: keyof typeof import("../tokens/tokens.js").spacingTokens;
}
export const primitiveNames = Object.freeze(["Box"] as const);
