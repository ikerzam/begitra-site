// The built URLs of the files the pages link: the build names each after its content's hash
// (`/assets/hero-700.Bo3RlhD0.avif`), which lets the server cache `assets/` as immutable.

import interfaceFont from "../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url";
import imagesJson from "../../images.json";

/** Each file of `assets/` but the favicon, which the site serves at its root. */
const urls = import.meta.glob<string>(["../../assets/*", "!../../assets/favicon.ico"], {
  query: "?url",
  import: "default",
  eager: true,
});

/** The URL of a file of `assets/`, by its name: `hero-700.avif`. */
export function asset(name: string): string {
  const url = urls[`../../assets/${name}`];
  if (url === undefined) throw new Error(`the site has no asset ${name}`);
  return url;
}

/** The interface font `site.css` declares, which the head preloads. */
export const fontUrl: string = interfaceFont;

/** A screenshot's size and the widths it is cut at, each a file `<name>-<width>.<avif|webp>`. */
export interface Image {
  width: number;
  height: number;
  widths: number[];
}

const images: Record<string, Image> = imagesJson;

/** A screenshot of `images.json`, by its name: `hero`, `review-narrow`. */
export function imageOf(name: string): Image {
  const image = images[name];
  if (!image) throw new Error(`the site has no image ${name}`);
  return image;
}
