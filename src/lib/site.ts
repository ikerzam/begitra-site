// The site's languages and pages, and the links between them. Links inside the site are
// root-absolute (`/es/download/`); the URLs other sites read (canonical, `hreflang`, Open Graph,
// the sitemap) are absolute, from the release's base URL.

import data from "virtual:site-data";

/** The site's languages; the first is served at the root and is `x-default`. */
export const LANGUAGES = ["en", "es"] as const;
export type Lang = (typeof LANGUAGES)[number];

const PAGE_PATHS = { product: "", download: "download/" } as const;
export type PageName = keyof typeof PAGE_PATHS;

/** The site's pages, in the order the sitemap lists them within a language. */
export const PAGES = Object.keys(PAGE_PATHS) as PageName[];

/** The path of a page in a language, relative to the site's root: `""`, `es/download/`. */
export function pagePath(lang: Lang, page: PageName): string {
  return `${lang === LANGUAGES[0] ? "" : `${lang}/`}${PAGE_PATHS[page]}`;
}

/** A link to a page, with an optional fragment: `/`, `/es/download/#files`. */
export function pageHref(lang: Lang, page: PageName, hash = ""): string {
  return `/${pagePath(lang, page)}${hash}`;
}

/** A page's absolute URL: `https://begitra.ikerzam.tech/es/download/`. */
export function pageUrl(lang: Lang, page: PageName): string {
  return new URL(pagePath(lang, page), data.facts.base).toString();
}

/** A link to a file of a release: `/releases/v0.6.5/Begitra_0.6.5_x64-setup.exe`. */
export function releaseHref(version: string, name: string): string {
  return `/releases/v${version}/${name}`;
}

/** Each language's `lang` parameter for `getStaticPaths`: none for the first, its code for the rest. */
export function languagePaths(): { params: { lang: string | undefined } }[] {
  return LANGUAGES.map((lang) => ({
    params: { lang: lang === LANGUAGES[0] ? undefined : lang },
  }));
}

/** The language a page's `lang` parameter names. */
export function langOf(param: string | undefined): Lang {
  const lang = LANGUAGES.find((candidate) => candidate === (param ?? LANGUAGES[0]));
  if (!lang) throw new Error(`the site has no language ${param}`);
  return lang;
}
