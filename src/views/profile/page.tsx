import { Layout } from "../../shell/index.js";
import { profileImagePath, profilePath } from "../../paths.js";
import { defaultProfileImageNames } from "../../policy.js";
import { absoluteUrl } from "../../server/indexing/urls.js";
import { plainTextFromHtml } from "../../server/security/html.js";
import { seoText, type PageSeo } from "../../settings/seo.js";
import { skinBrowserThemeColorFromHtml } from "../../skins/colorPalette.js";
import { profileSkinFromHtml, profileSkinPageAttributes, ProfileSkinStyles } from "../../skins/rendering.js";
import { ProfileLayout } from "./layout.js";
import type { ProfilePageProps } from "./pageProps.js";

export function ProfilePage(props: ProfilePageProps) {
  const skin = profileSkinFromHtml(props.profile.skinHtml);
  return (
    <Layout
      title={`${props.profile.username}'s profile`}
      user={props.user}
      bodyAttributes={profileSkinPageAttributes(skin)}
      browserThemeColor={(branding) => skinBrowserThemeColorFromHtml(skin.styleHtml, branding.palette)}
      head={<ProfileSkinStyles skin={skin} />}
      seo={profileSeo(props)}
    >
      <ProfileLayout {...props} skin={skin} />
    </Layout>
  );
}

function profileSeo(props: ProfilePageProps): PageSeo {
  if (props.profile.private) return { noindex: true };

  const description = profileDescription(props);
  const url = absoluteUrl(profilePath(props.profile));
  const image = defaultProfileImageNames.has(props.profile.pfp) ? null : absoluteUrl(profileImagePath(props.profile.pfp));
  const sameAs = Object.values(props.profile.socialLinks).filter(Boolean);

  return {
    canonicalPath: profilePath(props.profile),
    description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: props.profile.username,
      alternateName: props.profile.handle,
      url,
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
      ...(sameAs.length ? { sameAs } : {})
    },
    title: `${props.profile.username}'s profile`,
    type: "profile"
  };
}

function profileDescription(props: ProfilePageProps) {
  return (
    seoText(plainTextFromHtml(props.profile.bioHtml), 180) ||
    seoText(props.profile.status.status || props.profile.status.currentVibe, 180) ||
    `${props.profile.username}'s public profile.`
  );
}
