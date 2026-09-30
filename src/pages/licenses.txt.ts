// The notices the fonts' and the icons' licences ask to travel with them, which the footer links.

import type { APIRoute } from "astro";
import data from "virtual:site-data";

export const GET: APIRoute = () =>
  new Response(data.licenses, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
