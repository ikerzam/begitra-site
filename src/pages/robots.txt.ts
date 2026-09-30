// Every crawler may read every page, and the sitemap lists them.

import type { APIRoute } from "astro";
import data from "virtual:site-data";

export const GET: APIRoute = () => {
  const sitemap = new URL("sitemap.xml", data.facts.base).toString();
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
