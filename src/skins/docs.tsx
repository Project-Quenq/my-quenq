const profileSkinDocsUrl = "https://github.com/Project-Quenq/my-quenq/blob/main/docs/skins.md";
const profileSkinsUrl = "/skins";
const profileSkinHtmlHintText = "Use supported skin variables and data-skin selectors.";

export function ProfileSkinDocsLink() {
  return <a href={profileSkinDocsUrl} target="_blank" rel="noopener noreferrer">Skin docs</a>;
}

export function ProfileSkinsPageLink() {
  return <a href={profileSkinsUrl}>View more skins</a>;
}

export function ProfileSkinHtmlHint() {
  return (
    <>
      {profileSkinHtmlHintText} <ProfileSkinDocsLink />
    </>
  );
}
