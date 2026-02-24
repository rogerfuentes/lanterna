import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://rogerfuentes.github.io",
  base: "/lanterna",
  legacy: { collections: true },
  integrations: [
    starlight({
      title: "Lanterna",
      description:
        "CLI-first, cross-platform performance profiler for React Native and Expo apps",
      logo: {
        src: "./src/assets/logo.svg",
        replacesTitle: true,
      },
      social: {
        github: "https://github.com/rogerfuentes/lanterna",
      },
      customCss: ["./src/styles/custom.css"],
      editLink: {
        baseUrl:
          "https://github.com/rogerfuentes/lanterna/edit/main/docs/site/",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
          ],
        },
        {
          label: "CLI Reference",
          items: [
            { label: "Overview", slug: "cli/overview" },
            { label: "measure", slug: "cli/measure" },
            { label: "test", slug: "cli/test" },
            { label: "monitor", slug: "cli/monitor" },
          ],
        },
        {
          label: "Scoring Model",
          items: [
            { label: "How Scoring Works", slug: "scoring/how-it-works" },
            { label: "Metrics Reference", slug: "scoring/metrics" },
            { label: "Heuristics", slug: "scoring/heuristics" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Android Profiling", slug: "guides/android" },
            { label: "iOS Profiling", slug: "guides/ios" },
            { label: "CI/CD Integration", slug: "guides/ci-cd" },
            {
              label: "Baseline Comparison",
              slug: "guides/baseline-comparison",
            },
          ],
        },
        {
          label: "In-App Module",
          items: [
            { label: "Overview", slug: "in-app/overview" },
            { label: "LanternaProvider", slug: "in-app/provider" },
            { label: "Navigation Tracking", slug: "in-app/navigation" },
            {
              label: "Tier 3 Instrumentation",
              slug: "in-app/deep-instrumentation",
            },
            { label: "Expo DevTools Plugin", slug: "in-app/expo-devtools" },
          ],
        },
        {
          label: "Reports",
          items: [
            { label: "Report Formats", slug: "reports/formats" },
            { label: "HTML Report", slug: "reports/html" },
            { label: "JSON & Markdown", slug: "reports/json-markdown" },
            {
              label: "Perfetto & SpeedScope",
              slug: "reports/trace-formats",
            },
          ],
        },
        {
          label: "Architecture",
          items: [
            {
              label: "Three-Tier Model",
              slug: "architecture/three-tier-model",
            },
            { label: "Package Structure", slug: "architecture/packages" },
            { label: "Data Flow", slug: "architecture/data-flow" },
          ],
        },
      ],
    }),
  ],
});
