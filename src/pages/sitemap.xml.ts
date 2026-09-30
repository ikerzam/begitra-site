// Every page in every language, each last changed on the release's date.

import type { APIRoute } from "astro";
import data from "virtual:site-data";

import { releaseOf } from "../lib/context";
import { LANGUAGES, PAGES, pageUrl } from "../lib/site";

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const GET: APIRoute = () => {
  const lastmod = escapeXml(releaseOf(data.facts.version).date);
  const urls = LANGUAGES.flatMap((lang) => PAGES.map((page) => pageUrl(lang, page)));
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc><lastmod>${lastmod}</lastmod></url>`),
    "</urlset>",
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
