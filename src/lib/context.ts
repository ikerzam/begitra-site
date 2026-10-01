// What a page reads besides its components: the copy of each language, the release history, the
// site's settings, and the facts of the release it describes.

import data, { type Installer } from "virtual:site-data";

import releasesJson from "../../releases.json";
import siteJson from "../../site.json";
import en from "../../strings/en.json";
import es from "../../strings/es.json";
import { formatDate } from "./format";
import { LANGUAGES, type Lang, type PageName } from "./site";

/** The copy of one language, as `strings/<lang>.json` holds it. */
export type Strings = typeof en;

/** A version's entry in `releases.json`, newest first. */
export interface Release {
  version: string;
  /** `YYYY-MM-DD`. */
  date: string;
  title: Record<Lang, string>;
  /** The hero's pill for an `x.y.0` release; its title stands in when it has none. */
  highlight?: Record<Lang, string>;
  notes: Record<Lang, string>;
}

export const strings: Record<Lang, Strings> = { en, es };
export const releases: Release[] = releasesJson;

/**
 * `site.json`: the site's address, the repository whose releases it describes, who publishes
 * Begitra, and where donations go (`null` hides every Donate link).
 */
export const site: { base: string; repository: string; publisher: string; donate: string | null } =
  siteJson;

/** The entry of `version` in `releases.json`; throws when the version has none. */
export function releaseOf(version: string): Release {
  const release = releases.find((entry) => entry.version === version);
  if (!release) {
    throw new Error(`releases.json has no entry for ${version}: add its date, title and notes`);
  }
  for (const lang of LANGUAGES) {
    if (!release.title[lang] || !release.notes[lang]) {
      throw new Error(`releases.json's ${version} needs a title and notes in "${lang}"`);
    }
  }
  return release;
}

/** Everything a page's markup needs, for one language and one page. */
export interface PageContext {
  lang: Lang;
  page: PageName;
  /** The copy of the page's language. */
  s: Strings;
  /** The locale dates and sizes are written in: `en-US`, `es-ES`. */
  locale: string;
  version: string;
  key: { key: string; id: string };
  release: Release;
  /** The release's date as the page's language writes it, and its year. */
  date: string;
  year: string;
  nsis: Installer;
  msi: Installer;
  /** The release and the two before it. */
  recent: Release[];
  /** Every release before this one. */
  older: Release[];
  /** Every release, newest first. */
  releases: Release[];
}

export function pageContext(lang: Lang, page: PageName): PageContext {
  const { facts } = data;
  const s = strings[lang];
  const release = releaseOf(facts.version);
  const index = releases.indexOf(release);
  const nsis = facts.installers.find((installer) => installer.kind === "nsis");
  const msi = facts.installers.find((installer) => installer.kind === "msi");
  if (!nsis || !msi) throw new Error("the site needs the NSIS and the MSI installers");
  return {
    lang,
    page,
    s,
    locale: s.dateLocale,
    version: facts.version,
    key: facts.key,
    release,
    date: formatDate(release.date, s.dateLocale),
    year: release.date.slice(0, 4),
    nsis,
    msi,
    recent: releases.slice(index, index + 3),
    older: releases.slice(index + 1),
    releases,
  };
}
