// @sample @demo @reference — UI-verification configuration (I-17A / DL-13 / DL-16).
//
// The single source of truth for the web UI-verification matrix + specialist
// config. DL-13 locks: viewport/device matrix, state profiles, deterministic
// specialist set (overlap/clipping, spacing/alignment, responsive-layout,
// truncation, color/contrast, accessibility, visual-regression), each emitting
// structured evidence; subjective/LLM review advisory only; baselines governed.
//
// This config is consumed by the Playwright projects (viewport matrix) and by
// each specialist spec. The structural validator (run-structural-validate.mjs)
// verifies it is well-formed in-license (shape-green).

export interface ViewportProfile {
  id: string;
  width: number;
  height: number;
  device: string | null;
}

export interface StateProfile {
  id: string;
  route: string;
  /** Prepended hash fragment to reach the state in the served app. */
  hash: string;
  description: string;
}

export interface SpecialistConfig {
  /** Matches evidence-packet.schema.json `specialist` enum. */
  id:
    | "overlap-clipping"
    | "spacing-alignment"
    | "responsive-layout"
    | "truncation"
    | "color-contrast"
    | "accessibility"
    | "visual-regression";
  /** Issue class this specialist owns (DL-13 §10.2 specialist model). */
  issueClass: string;
  /** Deterministic rules; each emits a structured result (blocking when failed). */
  rules: Array<{ rule_id: string; description: string; blocking: boolean }>;
}

export interface UiVerificationConfig {
  appTarget: "golden-web";
  /** DL-13 §"Baseline storage..." — v1 first run is a first-baseline proposal. */
  baselineMode: "first-baseline-proposal" | "enforce";
  visualRegression: {
    comparator: "pixelmatch";
    threshold: number;
    normalize: string[];
  };
  viewports: ViewportProfile[];
  states: StateProfile[];
  specialists: SpecialistConfig[];
}

export const UI_VERIFICATION_CONFIG: UiVerificationConfig = {
  appTarget: "golden-web",
  // First real run PROPOSES baselines (DL-13: initial baseline creation is an
  // explicit proposal, never an automatic pass). Enforced mode begins once the
  // proposal is approved.
  baselineMode: "first-baseline-proposal",
  visualRegression: {
    comparator: "pixelmatch",
    threshold: 0.0,
    // Declared volatile inputs only (DL-13 normalization policy).
    normalize: ["timestamp", "random-id", "animation-frame"]
  },
  // DL-13 v1 default web viewport matrix.
  viewports: [
    { id: "compact", width: 390, height: 844, device: "Pixel 5" },
    { id: "small", width: 360, height: 640, device: null },
    { id: "tablet", width: 768, height: 1024, device: "iPad 11" },
    { id: "desktop", width: 1280, height: 720, device: "Desktop" },
    { id: "wide", width: 1440, height: 900, device: "Desktop HD" }
  ],
  states: [
    {
      id: "default",
      route: "/",
      hash: "#/",
      description: "Home route default state."
    },
    {
      id: "golden-records-default",
      route: "/golden-records",
      hash: "#/golden-records",
      description: "Golden-records route: classified record rendered via the shared client."
    },
    {
      id: "golden-records-error",
      route: "/golden-records",
      hash: "#/golden-records",
      description: "Golden-records route failure state (provider-invalid response)."
    },
    {
      id: "system-status",
      route: "/system-status",
      hash: "#/system-status",
      description: "System-status route default state."
    }
  ],
  specialists: [
    {
      id: "overlap-clipping",
      issueClass: "overlap",
      rules: [
        { rule_id: "no-unintended-overlap", description: "Declared non-overlapping elements must not intersect.", blocking: true },
        { rule_id: "no-content-clipping", description: "Visible content must not be clipped by overflow without affordance.", blocking: true }
      ]
    },
    {
      id: "spacing-alignment",
      issueClass: "alignment",
      rules: [
        { rule_id: "card-padding-present", description: "Golden-record card has non-zero padding.", blocking: true }
      ]
    },
    {
      id: "responsive-layout",
      issueClass: "responsive layout",
      rules: [
        { rule_id: "no-viewport-overflow", description: "Document width must not exceed the viewport width.", blocking: true },
        { rule_id: "essential-elements-present", description: "Required elements remain present across every viewport.", blocking: true }
      ]
    },
    {
      id: "truncation",
      issueClass: "truncation",
      rules: [
        { rule_id: "no-unintended-truncation", description: "Text must not be silently truncated without an allowed rule.", blocking: true }
      ]
    },
    {
      id: "color-contrast",
      issueClass: "color/contrast",
      rules: [
        { rule_id: "wcag-aa-foreground", description: "Foreground/background contrast meets WCAG AA (>= 4.5:1 for body text).", blocking: true }
      ]
    },
    {
      id: "accessibility",
      issueClass: "accessibility",
      rules: [
        { rule_id: "axe-no-blocking-violations", description: "axe-core reports no violations at blocking severity.", blocking: true },
        { rule_id: "interactive-controls-named", description: "Interactive controls expose an accessible name.", blocking: true }
      ]
    },
    {
      id: "visual-regression",
      issueClass: "visual regression",
      rules: [
        { rule_id: "baseline-present-or-proposal", description: "Baseline exists OR run is in first-baseline-proposal mode.", blocking: true },
        { rule_id: "diff-within-threshold", description: "Pixel diff against the approved baseline is within threshold.", blocking: true }
      ]
    }
  ]
};
