// The deploy's decisions, without a build or a server: where the facts are, which facts describe a
// release, which links the pages have to a release's files and which of those are missing, where
// an upload may go, and the order the files go up in.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkFacts,
  destinationOf,
  factsUrl,
  missingFiles,
  releaseLinks,
  uploadOrder,
} from "../scripts/deploy-steps.mjs";

const root = join(import.meta.dirname, "..");
const sample = JSON.parse(readFileSync(join(root, "src", "sample-release.json"), "utf8"));
const DOWNLOAD = "https://github.com/ikerzam/begitra/releases/download/";

const folders: string[] = [];

/** A folder holding the given files, each path relative to it. */
function tree(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "begitra-site-deploy-"));
  folders.push(dir);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

afterEach(() => {
  for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("the facts", () => {
  it("are the latest release's site-facts.json, or a version's", () => {
    expect(factsUrl("ikerzam/begitra")).toBe(
      "https://github.com/ikerzam/begitra/releases/latest/download/site-facts.json",
    );
    expect(factsUrl("ikerzam/begitra", "0.6.5")).toBe(`${DOWNLOAD}v0.6.5/site-facts.json`);
  });

  it("describe a release: a version, the updater's key, and both installers", () => {
    expect(checkFacts(sample)).toBe(sample);
    expect(() => checkFacts({ ...sample, version: "latest" })).toThrow("no version");
    expect(() => checkFacts({ ...sample, key: { key: "k", id: "short" } })).toThrow("key");
    expect(() => checkFacts({ ...sample, installers: sample.installers.slice(0, 1) })).toThrow(
      "no msi installer",
    );
    const unsafe = { ...sample.installers[0], name: "../Begitra setup.exe" };
    expect(() => checkFacts({ ...sample, installers: [unsafe, sample.installers[1]] })).toThrow(
      "no nsis installer",
    );
    expect(() => checkFacts(null)).toThrow("no version");
  });
});

describe("the pages' links to release files", () => {
  it("are every distinct link to a file of the repository's releases", () => {
    const dist = tree({
      "index.html": `<a href="${DOWNLOAD}v0.6.5/Begitra_0.6.5_x64-setup.exe">Download</a><a href="/download/">More</a>`,
      "download/index.html": `<a href="${DOWNLOAD}v0.6.5/Begitra_0.6.5_x64-setup.exe">exe</a><a href="${DOWNLOAD}v0.6.4/Begitra_0.6.4_x64_en-US.msi">msi</a><a href="https://github.com/someone/else/releases/download/v1/x.exe">other</a>`,
      "robots.txt": `${DOWNLOAD}v0.0.1/not-a-page.exe`,
    });
    expect(releaseLinks(dist, "ikerzam/begitra")).toEqual([
      `${DOWNLOAD}v0.6.4/Begitra_0.6.4_x64_en-US.msi`,
      `${DOWNLOAD}v0.6.5/Begitra_0.6.5_x64-setup.exe`,
    ]);
  });

  it("count as missing when GitHub does not redirect them to their storage", async () => {
    const asked: { link: string; init: RequestInit | undefined }[] = [];
    const answers: Record<string, number> = { a: 302, b: 404, c: 200 };
    const request = async (input: URL | RequestInfo, init?: RequestInit) => {
      const link = String(input);
      asked.push({ link, init });
      if (link === "d") throw new Error("offline");
      return new Response(null, { status: answers[link] ?? 500 });
    };
    expect(await missingFiles(["a", "b", "c", "d"], request)).toEqual(["b (404)", "d (offline)"]);
    expect(asked.every(({ init }) => init?.method === "HEAD" && init.redirect === "manual")).toBe(
      true,
    );
  });
});

describe("an upload", () => {
  it("goes to user@host and an absolute folder of plain characters", () => {
    expect(destinationOf("claude@187.124.132.54:/home/claude/begitra-releases/site/")).toEqual({
      host: "claude@187.124.132.54",
      remote: "/home/claude/begitra-releases/site",
    });
    for (const bad of [
      "host:/site",
      "claude@host:site",
      "claude@host:/my site",
      "claude@host:/a;b",
    ]) {
      expect(() => destinationOf(bad), bad).toThrow("--upload");
    }
  });

  it("sends the assets first, then the pages' folders, then the root's files", () => {
    const dist = tree({
      "assets/site.a1b2c3d4.css": "",
      "es/index.html": "",
      "download/index.html": "",
      "index.html": "",
      "robots.txt": "",
    });
    expect(uploadOrder(dist)).toEqual({
      assets: "assets",
      folders: ["download", "es"],
      files: ["index.html", "robots.txt"],
    });
  });

  it("never sends what the server keeps", () => {
    expect(() => uploadOrder(tree({ "assets/a.css": "", "releases/v1/x.exe": "" }))).toThrow(
      "releases",
    );
    expect(() => uploadOrder(tree({ "assets/a.css": "", "latest.json": "{}" }))).toThrow(
      "latest.json",
    );
    expect(() => uploadOrder(tree({ "index.html": "" }))).toThrow("no assets");
  });
});
