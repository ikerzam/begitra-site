// The release site: the product page and the download page in English and Spanish, built as
// static files the release stages beside the installers. The server's policy allows only the
// site's own styles, fonts and images, so the build writes no inline style, no inline asset and no
// script, and keeps every asset under `assets/` with its content's hash in its name, which the
// server caches as immutable.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "astro/config";

const here = fileURLToPath(new URL(".", import.meta.url));

/**
 * The release the pages describe: `BEGITRA_SITE_FACTS` names the file a release writes; without
 * it, a fixed sample lets the pages be seen with `astro dev`.
 */
const factsPath = process.env.BEGITRA_SITE_FACTS || join(here, "src", "sample-release.json");
const facts = JSON.parse(readFileSync(factsPath, "utf8"));

/** The Lucide icons the pages draw inline. */
const ICONS = [
  "arrow-right",
  "chart-no-axes-column",
  "check",
  "check-check",
  "command",
  "download",
  "eye",
  "fold-vertical",
  "folder",
  "folder-git-2",
  "folders",
  "gauge",
  "git-branch",
  "git-commit-horizontal",
  "git-compare-arrows",
  "git-merge",
  "hard-drive",
  "heart",
  "minus",
  "notebook-pen",
  "package",
  "plus",
  "refresh-cw",
  "shield-alert",
  "shield-check",
  "sparkles",
  "trash",
];

function escapeAttribute(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Each icon's inner markup, from the `__iconData` nodes of `@lucide/vue`'s modules. */
function loadIcons(names) {
  const dir = join(here, "node_modules", "@lucide", "vue", "dist", "esm", "icons");
  return Object.fromEntries(
    names.map((name) => {
      const source = readFileSync(join(dir, `${name}.mjs`), "utf8");
      const elements = [...source.matchAll(/\[\s*"(\w+)",\s*\{([^}]*)\}\s*\]/g)].map(
        ([, tag, body]) => {
          const attributes = [...body.matchAll(/(\w+):\s*"([^"]*)"/g)]
            .filter(([, attribute]) => attribute !== "key")
            .map(([, attribute, value]) => ` ${attribute}="${escapeAttribute(value)}"`)
            .join("");
          return `<${tag}${attributes}/>`;
        },
      );
      if (elements.length === 0) throw new Error(`the icon ${name} has no elements`);
      return [name, elements.join("")];
    }),
  );
}

/** The notices the fonts' and the icons' licences ask to travel with them. */
function licenses() {
  const license = (...path) =>
    readFileSync(join(here, "node_modules", ...path, "LICENSE"), "utf8").trim();
  return [
    "Begitra's site serves these third-party works.",
    "",
    "Geist (the interface font), under the SIL Open Font License 1.1:",
    "",
    license("@fontsource-variable", "geist"),
    "",
    "Geist Mono (the code font), under the SIL Open Font License 1.1:",
    "",
    license("@fontsource-variable", "geist-mono"),
    "",
    "Lucide (the icons), under the ISC License:",
    "",
    license("@lucide", "vue"),
    "",
  ].join("\n");
}

/** What the pages read at build time, as the module `virtual:site-data`. */
function siteData() {
  const id = "virtual:site-data";
  const data = { facts, icons: loadIcons(ICONS), licenses: licenses() };
  return {
    name: "begitra-site-data",
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load: (resolved) =>
      resolved === `\0${id}` ? `export default ${JSON.stringify(data)};` : undefined,
  };
}

export default defineConfig({
  site: facts.base,
  output: "static",
  trailingSlash: "always",
  devToolbar: { enabled: false },
  build: {
    format: "directory",
    assets: "assets",
    inlineStylesheets: "never",
  },
  vite: {
    plugins: [siteData()],
    build: { assetsInlineLimit: 0 },
  },
});
