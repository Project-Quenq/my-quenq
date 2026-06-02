import { raw } from "hono/html";
import type { BrandingSettings } from "../settings/branding.js";
import {
  defaultSocialImagePath,
  siteSeoDescription,
  siteSocialImageAlt,
  siteStructuredData,
  socialImageSize,
  type JsonLd,
  type PageSeo
} from "../settings/seo.js";
import type { SiteSettings } from "../settings/site.js";
import { headerChromeColor } from "../theme/colorPalette.js";
import { noindexHeader } from "../server/indexing/routes.js";
import { absoluteUrl } from "../server/indexing/urls.js";

export function SeoHead(props: {
  branding: BrandingSettings;
  documentTitle: string;
  pageTitle: string;
  seo?: PageSeo;
  settings: SiteSettings;
  themeColor?: string;
}) {
  const description = props.seo?.description || siteSeoDescription(props.settings);
  const imagePath = props.seo?.imagePath || defaultSocialImagePath;
  const imageUrl = absoluteUrl(imagePath);
  const canonicalUrl = props.seo?.canonicalPath ? absoluteUrl(props.seo.canonicalPath) : null;
  const title = props.seo?.title || props.documentTitle;
  const imageAlt = props.seo?.imageAlt || siteSocialImageAlt(props.settings);
  const themeColor = props.themeColor || headerChromeColor(props.branding.palette);
  const jsonLd = [
    ...siteStructuredData(props.settings, absoluteUrl("/"), absoluteUrl(defaultSocialImagePath)),
    ...jsonLdArray(props.seo?.jsonLd)
  ];

  return (
    <>
      <title>{props.documentTitle}</title>
      <meta name="description" content={description} />
      <meta name="theme-color" content={themeColor} />
      {props.seo?.noindex ? <meta name="robots" content={noindexHeader} /> : null}
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
      <meta property="og:site_name" content={props.settings.identity.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={props.seo?.type || "website"} />
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content={String(socialImageSize.width)} />
      <meta property="og:image:height" content={String(socialImageSize.height)} />
      <meta property="og:image:alt" content={imageAlt} />
      {props.seo?.publishedTime ? <meta property="article:published_time" content={props.seo.publishedTime} /> : null}
      {props.seo?.modifiedTime ? <meta property="article:modified_time" content={props.seo.modifiedTime} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={imageAlt} />
      {jsonLd.map((item) => (
        <script type="application/ld+json">{raw(jsonLdScriptContent(item))}</script>
      ))}
    </>
  );
}

function jsonLdArray(jsonLd: PageSeo["jsonLd"] | undefined): JsonLd[] {
  if (!jsonLd) return [];
  return Array.isArray(jsonLd) ? jsonLd : [jsonLd];
}

function jsonLdScriptContent(jsonLd: JsonLd) {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}
