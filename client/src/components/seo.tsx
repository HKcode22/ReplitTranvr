// Lightweight per-page SEO helper. Wraps react-helmet-async so pages
// can declare their own <title>, <meta description>, canonical URL, and
// optional OG/Twitter overrides without having to import Helmet
// directly. Defaults fall back to the Travnr brand values defined in
// `client/index.html`.
//
// Why a wrapper instead of using <Helmet> directly:
//   * keeps a single source of truth for the canonical host,
//   * avoids each page reinventing the og: tag list,
//   * lets us swap libraries later (e.g. to react-helmet) without
//     touching every page.

import { Helmet } from "react-helmet-async";

const SITE_NAME = "Travnr";
const CANONICAL_HOST = "https://travnr.com";
const DEFAULT_OG_IMAGE = `${CANONICAL_HOST}/og-image.png`;

export interface SEOProps {
  /** Page title — will be suffixed with " · Travnr" automatically unless `titleIsAbsolute`. */
  title: string;
  /** Meta description shown in search results and link previews. */
  description?: string;
  /** Path portion of the canonical URL (e.g. "/privacy"). Combined with the canonical host. */
  path?: string;
  /** Override the default OG image (must be an absolute URL). */
  image?: string;
  /** Tell crawlers not to index this page (useful for auth, /admin, etc). */
  noindex?: boolean;
  /** When true, use `title` as-is instead of appending the brand suffix. */
  titleIsAbsolute?: boolean;
}

export default function SEO({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  titleIsAbsolute = false,
}: SEOProps) {
  const fullTitle = titleIsAbsolute ? title : `${title} · ${SITE_NAME}`;
  const canonical = path ? `${CANONICAL_HOST}${path.startsWith("/") ? path : `/${path}`}` : CANONICAL_HOST;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={canonical} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
