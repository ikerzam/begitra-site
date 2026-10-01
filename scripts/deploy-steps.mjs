// The parts of a deploy that decide what reaches the server: where a release's facts are, whether
// they describe a release, which of the built pages' links point at a release's files, whether
// those files exist, and where the files go. Used by scripts/deploy.mjs and tested in
// test/deploy.test.ts.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";

/** The address of a release's `site-facts.json`: the latest release's, or the version's. */
export function factsUrl(repository, version) {
  const release = version ? `download/v${version}` : "latest/download";
  return `https://github.com/${repository}/releases/${release}/site-facts.json`;
}

/**
 * The facts of a release, as its `site-facts.json` holds them; throws when they do not describe
 * one: a version, the updater's key and its id, and an NSIS and an MSI installer with a name, a
 * size and a SHA-256.
 */
export function checkFacts(facts) {
  const fail = (what) => {
    throw new Error(`the facts are not a release's: ${what}`);
  };
  if (typeof facts?.version !== "string" || !/^\d+\.\d+\.\d+$/.test(facts.version)) {
    fail("no version");
  }
  if (typeof facts.key?.key !== "string" || !/^[0-9A-F]{16}$/.test(facts.key?.id ?? "")) {
    fail("no updater key");
  }
  for (const kind of ["nsis", "msi"]) {
    const installer = facts.installers?.find((entry) => entry.kind === kind);
    if (
      !installer ||
      !/^[A-Za-z0-9._-]+$/.test(installer.name ?? "") ||
      !Number.isInteger(installer.size) ||
      !/^[0-9a-f]{64}$/.test(installer.sha256 ?? "")
    ) {
      fail(`no ${kind} installer`);
    }
  }
  return facts;
}

/** Every file under `dir`, as paths relative to it with forward slashes. */
function filesUnder(dir) {
  return readdirSync(dir, { recursive: true })
    .map((path) => String(path))
    .filter((path) => statSync(join(dir, path)).isFile())
    .map((path) => path.split(sep).join("/"));
}

/** The links of the built pages under `dist` that point at a file of `repository`'s releases. */
export function releaseLinks(dist, repository) {
  const prefix = `https://github.com/${repository}/releases/download/`;
  const links = new Set();
  for (const path of filesUnder(dist).filter((name) => name.endsWith(".html"))) {
    for (const [, href] of readFileSync(join(dist, path), "utf8").matchAll(/href="([^"]+)"/g)) {
      if (href.startsWith(prefix)) links.add(href);
    }
  }
  return [...links].sort();
}

/**
 * The links among `links` whose file is missing. GitHub answers a release's file with a redirect
 * to its storage, and a missing one with a 404; the storage's signed address is not asked, since
 * it may refuse a `HEAD`.
 */
export async function missingFiles(links, request = fetch) {
  const answers = await Promise.all(
    links.map(async (link) => {
      try {
        const response = await request(link, { method: "HEAD", redirect: "manual" });
        return response.status >= 200 && response.status < 400
          ? null
          : `${link} (${response.status})`;
      } catch (error) {
        return `${link} (${error.message})`;
      }
    }),
  );
  return answers.filter((answer) => answer !== null);
}

/**
 * Where an upload goes: `user@host` and the absolute folder on the server. The folder reaches a
 * shell on the server, so it may hold letters, digits and `. _ / -` only.
 */
export function destinationOf(destination) {
  const match = /^([^@:\s]+@[^:\s]+):(\/[A-Za-z0-9._/-]*)$/.exec(destination);
  if (!match) {
    throw new Error(
      "--upload takes user@host:/absolute/path, with letters, digits and . _ / - in the path",
    );
  }
  return { host: match[1], remote: match[2].replace(/\/+$/, "") };
}

/**
 * The built site's files in the order they go up: `assets/` first, since a page names its assets;
 * then each page's folder; then the files at the root. The server's own `releases/` and
 * `latest.json` are never among them.
 */
export function uploadOrder(dist) {
  const entries = readdirSync(dist, { withFileTypes: true });
  const names = entries.map((entry) => entry.name);
  for (const kept of ["releases", "latest.json"]) {
    if (names.includes(kept)) throw new Error(`the build holds ${kept}, which the server keeps`);
  }
  if (!names.includes("assets")) throw new Error("the build has no assets folder");
  const folders = entries
    .filter((entry) => entry.isDirectory() && entry.name !== "assets")
    .map((entry) => entry.name)
    .sort();
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  return { assets: "assets", folders, files };
}

/** How many files the build holds, for the summary. */
export function countFiles(dist) {
  return filesUnder(dist).length;
}
