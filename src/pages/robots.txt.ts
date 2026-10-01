// Every crawler may read every page, and the sitemap lists them.

import type { APIRoute } from "astro";

import { siteUrl } from "../lib/site";

export const GET: APIRoute = () => {
  const sitemap = siteUrl("sitemap.xml");
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
