// The built site, from the sample facts: the files the server holds, what the pages link, and what
// the server's policy forbids (scripts, inline styles, assets without a hash in their name).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { build } from "astro";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist");
const read = (path: string) => readFileSync(join(dist, path), "utf8");
const readJson = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));

const facts = readJson("src/sample-release.json") as {
  version: string;
  key: { key: string; id: string };
  installers: { kind: string; name: string; sha256: string }[];
};
const site = readJson("site.json") as { base: string; repository: string; donate: string | null };
const releases = readJson("releases.json") as { version: string }[];
/** Where a release's files are: its GitHub release. */
const files = (version: string) =>
  `https://github.com/${site.repository}/releases/download/v${version}/`;
const pages = ["index.html", "download/index.html", "es/index.html", "es/download/index.html"];

beforeAll(async () => {
  delete process.env.BEGITRA_SITE_FACTS;
  await build({ root, logLevel: "error" });
}, 120_000);

describe("the built site", () => {
  it("is the four pages, the robots file, the sitemap, the licences and the favicon", () => {
    for (const path of [...pages, "robots.txt", "sitemap.xml", "licenses.txt", "favicon.ico"]) {
      expect(existsSync(join(dist, path)), path).toBe(true);
    }
    expect(readFileSync(join(dist, "favicon.ico"))).toEqual(
      readFileSync(join(root, "assets", "favicon.ico")),
    );
    expect(read("licenses.txt")).toContain("SIL Open Font License");
  });

  it("runs no script and has no inline style", () => {
    for (const path of pages) {
      const html = read(path);
      expect(html, path).not.toMatch(/<script/i);
      expect(html, path).not.toMatch(/<style/i);
      expect(html, path).not.toMatch(/\sstyle=/i);
    }
  });

  it("names every asset after its content's hash, and links only assets it holds", () => {
    const names = readdirSync(join(dist, "assets"));
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name).toMatch(/\.[A-Za-z0-9_-]{8}\.\w+$/);
    for (const path of pages) {
      for (const [, name] of read(path).matchAll(/\/assets\/([\w.-]+)/g)) {
        expect(names, `${path} links ${name}`).toContain(name);
      }
    }
  });

  it("downloads the version's installer from its GitHub release, in each language", () => {
    const nsis = facts.installers.find((installer) => installer.kind === "nsis");
    for (const path of ["index.html", "es/index.html"]) {
      expect(read(path)).toContain(`href="${files(facts.version)}${nsis?.name}"`);
    }
  });

  it("links each older version's two installers on its GitHub release", () => {
    const older = releases.slice(
      releases.findIndex((entry) => entry.version === facts.version) + 1,
    );
    expect(older.length).toBeGreaterThan(0);
    for (const path of ["download/index.html", "es/download/index.html"]) {
      const html = read(path);
      for (const { version } of older) {
        expect(html).toContain(`href="${files(version)}Begitra_${version}_x64-setup.exe"`);
        expect(html).toContain(`href="${files(version)}Begitra_${version}_x64_en-US.msi"`);
      }
    }
  });

  it("shows each installer's SHA-256 and signature, and the command that checks it", () => {
    for (const path of ["download/index.html", "es/download/index.html"]) {
      const html = read(path);
      for (const installer of facts.installers) {
        expect(html).toContain(installer.sha256);
        expect(html).toContain(`href="${files(facts.version)}${installer.name}.minisig"`);
      }
      expect(html).toContain(`-P ${facts.key.key}`);
      expect(html).toContain(facts.key.id);
    }
  });

  it("links both languages and x-default from every page", () => {
    for (const path of pages) {
      const html = read(path);
      expect(html).toMatch(/hreflang="en"/);
      expect(html).toMatch(/hreflang="es"/);
      expect(html).toMatch(/hreflang="x-default"/);
    }
  });

  it("shows a Donate link only when site.json names a donation page", () => {
    const { donate } = site;
    for (const path of pages) {
      if (donate) expect(read(path)).toContain(`href="${donate}"`);
      else expect(read(path)).not.toMatch(/class="[^"]*\bdonate\b/);
    }
  });

  it("lists the four pages in the sitemap, at the site's address", () => {
    const sitemap = read("sitemap.xml");
    for (const path of ["", "download/", "es/", "es/download/"]) {
      expect(sitemap).toContain(`<loc>${site.base}${path}</loc>`);
    }
    expect(read("robots.txt")).toContain(`Sitemap: ${site.base}sitemap.xml`);
    expect(read("index.html")).toMatch(
      new RegExp(`<meta property="og:image" content="${site.base}assets/og\\.[\\w-]+\\.png"`),
    );
  });
});
