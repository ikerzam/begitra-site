#!/usr/bin/env node
// Deploys the site: the facts of a release, the pages built from them, every link to a release's
// file checked, then the built files copied to the server over SSH, the assets before the pages
// that name them. The server keeps what this never sends: `releases/`, the installers of the
// versions up to 0.6.5, and its redirect for `/latest.json`.
//
//   node scripts/deploy.mjs [--version <x.y.z>] [--facts <site-facts.json>]
//                           [--upload <user@host:/path>] [--identity <key file>]
//
// The facts are the `site-facts.json` of the latest release of the repository `site.json` names,
// or of `--version`'s, or the file `--facts` names. Without `--upload`, the pages are built and
// checked, and nothing leaves the machine.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "astro";

import {
  checkFacts,
  countFiles,
  destinationOf,
  factsUrl,
  missingFiles,
  releaseLinks,
  uploadOrder,
} from "./deploy-steps.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

function fail(message) {
  console.error(`deploy: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { version: null, facts: null, upload: null, identity: null };
  for (let at = 0; at < argv.length; at += 2) {
    const name = argv[at].startsWith("--") ? argv[at].slice(2) : "";
    if (!(name in options)) fail(`unknown argument ${argv[at]}`);
    if (argv[at + 1] === undefined) fail(`${argv[at]} needs a value`);
    options[name] = argv[at + 1];
  }
  if (options.version && options.facts) fail("--version and --facts name the facts twice");
  return options;
}

/** The facts' text: the file `--facts` names, or the release's `site-facts.json` on GitHub. */
async function readFacts(options, repository) {
  if (options.facts) return readFileSync(options.facts, "utf8");
  const url = factsUrl(repository, options.version);
  console.log(`facts: ${url}`);
  const response = await fetch(url);
  if (!response.ok) fail(`${url} answered ${response.status}`);
  return response.text();
}

/** Runs a command with its own argument list, never through a shell. */
function run(command, args, cwd) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    fail(`${command} ended with ${result.status ?? result.signal ?? result.error?.message}`);
  }
}

/**
 * Copies the build to the server: `assets/`, then each page's folder, then the root's files.
 * The local paths stay relative to `dist`, since an `scp` argument that starts with a drive letter
 * reads as a host.
 */
function upload(destination, identity) {
  const { host, remote } = destinationOf(destination);
  const key = identity ? ["-i", identity] : [];
  const { assets, folders, files } = uploadOrder(dist);
  run("scp", [...key, "-r", assets, `${host}:${remote}/`], dist);
  if (folders.length > 0) run("scp", [...key, "-r", ...folders, `${host}:${remote}/`], dist);
  run("scp", [...key, ...files, `${host}:${remote}/`], dist);
  console.log(`uploaded ${countFiles(dist)} files to ${host}:${remote}`);
}

const options = parseArgs(process.argv.slice(2));
try {
  if (options.upload) destinationOf(options.upload);
} catch (error) {
  fail(error.message);
}
const site = JSON.parse(readFileSync(join(root, "site.json"), "utf8"));

let facts;
try {
  facts = checkFacts(JSON.parse(await readFacts(options, site.repository)));
} catch (error) {
  fail(error.message);
}
console.log(`building the pages of ${facts.version}`);

const scratch = mkdtempSync(join(tmpdir(), "begitra-site-"));
let buildError = null;
try {
  const factsPath = join(scratch, "site-facts.json");
  writeFileSync(factsPath, JSON.stringify(facts));
  process.env.BEGITRA_SITE_FACTS = factsPath;
  await build({ root, logLevel: "warn" });
} catch (error) {
  buildError = error;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
if (buildError) fail(`the build failed: ${buildError.message}`);

const links = releaseLinks(dist, site.repository);
const missing = await missingFiles(links);
if (missing.length > 0) {
  fail(
    `the pages link files the releases lack, so nothing was uploaded:\n  ${missing.join("\n  ")}`,
  );
}
console.log(`the ${links.length} links to release files answer`);

if (options.upload) {
  try {
    upload(options.upload, options.identity);
  } catch (error) {
    fail(error.message);
  }
} else {
  console.log(`built ${facts.version} in ${dist}; not uploaded (no --upload)`);
}
