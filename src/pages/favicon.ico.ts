// The favicon at the site's root under its own name, where browsers look for it when a page does
// not say; the pages link it there too.

import { readFileSync } from "node:fs";

import type { APIRoute } from "astro";
import { root } from "astro:config/server";

export const GET: APIRoute = () =>
  new Response(new Uint8Array(readFileSync(new URL("assets/favicon.ico", root))), {
    headers: { "Content-Type": "image/x-icon" },
  });
