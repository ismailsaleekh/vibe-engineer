import { defineConfig } from "vitepress";

// VitePress site config for the vibe-engineer documentation site.
//
// Source of truth for the sidebar/nav below is the actual docs/ tree.
// The stale-doc witness (see docs/reference/index.md) checks that every
// doc path referenced here exists under docs/.
//
// NOTE: Do not run the vitepress CLI to "test" this file in this lane;
// the docs build is a separate, explicitly-owned closure (DL-21).

const base = "/";

export default defineConfig({
  title: "vibe-engineer",
  description:
    "A domain-neutral harness for moving agentic software work through durable artifacts, deterministic verification, and preserved context.",
  lang: "en-US",
  base,
  lastUpdated: true,
  cleanUrls: true,
  srcDir: ".",
  srcExclude: ["**/README.md", "decisions/**"],
  head: [["meta", { name: "theme-color", content: "#3c388e" }]],

  themeConfig: {
    siteTitle: "vibe-engineer",

    nav: [
      { text: "Guides", link: "/guides/getting-started/workflow" },
      { text: "Architecture", link: "/architecture/system-overview" },
      {
        text: "Reference",
        items: [
          { text: "Packages", link: "/reference/packages" },
          { text: "CLI", link: "/reference/cli" },
          { text: "Schemas", link: "/reference/schemas" },
          { text: "Standards", link: "/standards/" },
        ],
      },
      { text: "Standards", link: "/standards/" },
      {
        text: "Decisions",
        items: [{ text: "DL index (decisions/)", link: "/decisions/" }],
      },
    ],

    sidebar: {
      "/guides/": [
        {
          text: "Getting started",
          collapsed: false,
          items: [
            { text: "Workflow", link: "/guides/getting-started/workflow" },
            { text: "Repository status", link: "/guides/getting-started/repository-status" },
            { text: "Create a project", link: "/guides/getting-started/create-project" },
            { text: "Plan, build, ship", link: "/guides/getting-started/plan-build-ship" },
          ],
        },
        {
          text: "Schematics",
          collapsed: false,
          items: [{ text: "Add a schematic", link: "/guides/schematics/add-schematic" }],
        },
        {
          text: "Mechanical gates",
          collapsed: false,
          items: [{ text: "Add a gate", link: "/guides/mechanical-gates/add-gates" }],
        },
      ],

      "/architecture/": [
        {
          text: "Architecture",
          collapsed: false,
          items: [
            { text: "System overview", link: "/architecture/system-overview" },
            { text: "Architecture index", link: "/architecture/" },
            { text: "Artifact chain", link: "/architecture/artifact-chain" },
            { text: "Verification model", link: "/architecture/verification-model" },
            { text: "Context & memory", link: "/architecture/context-memory" },
            { text: "Mechanical gates", link: "/architecture/mechanical-gates" },
            { text: "Security & safety", link: "/architecture/security-architecture" },
          ],
        },
      ],

      "/reference/": [
        {
          text: "Reference",
          collapsed: false,
          items: [
            { text: "Index", link: "/reference/" },
            { text: "Package exports", link: "/reference/packages" },
            { text: "CLI", link: "/reference/cli" },
            { text: "Schemas", link: "/reference/schemas" },
          ],
        },
      ],

      "/standards/": [
        {
          text: "Standards",
          collapsed: false,
          items: [{ text: "Core standards catalog", link: "/standards/" }],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/ismailsaleekh/vibe-engineer" }],

    outline: { level: [2, 3], label: "On this page" },

    docFooter: {
      prev: "Previous",
      next: "Next",
    },

    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "Search docs", buttonAriaLabel: "Search" },
        },
      },
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Ismail",
    },
  },

  markdown: {
    lineNumbers: false,
    toc: { level: [2, 3] },
  },
});
