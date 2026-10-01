/// <reference types="astro/client" />

/** What `astro.config.mjs` hands the pages at build time. */
declare module "virtual:site-data" {
  /** One installer of the release: its kind (`nsis`, `msi`), file name, size in bytes and SHA-256. */
  export interface Installer {
    kind: string;
    name: string;
    size: number;
    sha256: string;
  }

  /** The release the pages describe. */
  export interface Facts {
    version: string;
    /** The updater's public key as minisign takes it (`-P`), and its key id. */
    key: { key: string; id: string };
    installers: Installer[];
  }

  const data: {
    facts: Facts;
    /** Each Lucide icon's inner SVG markup, by name. */
    icons: Record<string, string>;
    /** The notices of the third-party works the site serves, as text. */
    licenses: string;
  };
  export default data;
}
