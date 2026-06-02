import { defaultInterestNames, type UserProfile } from "../../../models.js";
import { limits, mediaAccept, uploadSizeLabel } from "../../../policy.js";
import { userTextFromHtml } from "../../../server/security/html.js";
import { socialLinkPlatforms } from "../../../socialLinks.js";
import { ActionLabel } from "../../../ui/actions.js";
import { CharacterLimitHint, FormActions, FormField } from "../../../ui/forms.js";
import { SocialLinkLabel } from "../../../ui/socialLinks.js";
import { ProfileSkinHtmlHint, ProfileSkinsPageLink } from "../../../skins/docs.js";
import { SkinColorPaletteEditor } from "../../../skins/colorPaletteEditor.js";
import type { ColorPalette } from "../../../theme/colorPalette.js";
import { ProfileEditSection, sectionError } from "./section.js";
import type { ProfileEditError } from "./types.js";

type ProfileFormProps = {
  csrf: string;
  error?: ProfileEditError;
  profile: UserProfile;
  skinColorPaletteFallback: ColorPalette;
};

export function ProfileForm({ csrf, error, profile, skinColorPaletteFallback }: ProfileFormProps) {
  return (
    <>
      <h2>Change name:</h2>
      <ProfileEditSection csrf={csrf} error={sectionError(error, "name")} section="name">
        <FormField>
          <input type="text" name="username" placeholder="Display name" value={profile.username} autocomplete="name" maxLength={limits.usernameMax} />
        </FormField>
        <FormActions hint={<CharacterLimitHint maxLength={limits.usernameMax} />}>
          <button type="submit"><ActionLabel action="save">Change name</ActionLabel></button>
        </FormActions>
      </ProfileEditSection>
      
      <h2>Theme song:</h2>
      <ProfileEditSection csrf={csrf} error={sectionError(error, "themeSong")} section="themeSong" multipart>
        <FormField label="Select theme song" hint={`Max file size: ${uploadSizeLabel} (mp3)`}>
          <input type="file" name="file" accept={mediaAccept.audio} />
        </FormField>
        <FormActions>
          <button type="submit"><ActionLabel action="upload">Upload theme song</ActionLabel></button>
        </FormActions>
      </ProfileEditSection>
      
      <h2>Bio:</h2>
      <ProfileEditSection csrf={csrf} error={sectionError(error, "bio")} section="bio">
        <FormField>
          <textarea placeholder="Bio" name="bio" maxLength={limits.userText}>{userTextFromHtml(profile.bioHtml)}</textarea>
        </FormField>
        <FormActions hint={<CharacterLimitHint maxLength={limits.userText} note="Line breaks and safe links" />}>
          <button type="submit"><ActionLabel action="save">Set</ActionLabel></button>
        </FormActions>
      </ProfileEditSection>
      
      <h2>Interests:</h2>
      <ProfileEditSection csrf={csrf} error={sectionError(error, "interests")} section="interests">
        {defaultInterestNames.map((name) => (
          <FormField label={name}>
            <input type="text" name={`interests_${name}`} value={profile.interests[name]} maxLength={limits.interest} />
          </FormField>
        ))}
        <FormActions>
          <button type="submit"><ActionLabel action="save">Set</ActionLabel></button>
        </FormActions>
      </ProfileEditSection>
      
      <h2>Social links:</h2>
      <ProfileEditSection csrf={csrf} error={sectionError(error, "socialLinks")} section="socialLinks">
        {socialLinkPlatforms.map((platform) => (
          <FormField label={<SocialLinkLabel platform={platform} />} hint={<SocialLinkHint platform={platform} />}>
            <input
              type="text"
              name={`social_${platform.id}`}
              placeholder={platform.placeholder}
              value={profile.socialLinks[platform.id]}
              maxLength={limits.socialLinkUrl}
              autocomplete="off"
            />
          </FormField>
        ))}
        <FormActions hint={<CharacterLimitHint maxLength={limits.socialLinkUrl} />}>
          <button type="submit"><ActionLabel action="save">Set</ActionLabel></button>
        </FormActions>
      </ProfileEditSection>
      
      <h2>Skin:</h2>
      <ProfileEditSection csrf={csrf} error={sectionError(error, "skin")} section="skin">
        <SkinColorPaletteEditor codeHtml={profile.skinHtml} fallback={skinColorPaletteFallback} />
        <FormField label={<SkinHtmlLabel />} hint={<ProfileSkinHtmlHint />}>
          <textarea rows={15} placeholder="Your code" name="skin" maxLength={limits.skinHtml}>{profile.skinHtml}</textarea>
        </FormField>
        <FormActions hint={<CharacterLimitHint maxLength={limits.skinHtml} />}>
          <button type="submit"><ActionLabel action="save">Set</ActionLabel></button>
        </FormActions>
      </ProfileEditSection>
    </>
  );
}

function SocialLinkHint({ platform }: { platform: (typeof socialLinkPlatforms)[number] }) {
  if (platform.id === "website") {
    return <>Enter your website address (e.g. {platform.placeholder}).</>;
  }
  return <>Enter your <strong>username</strong> only (e.g. {platform.placeholder}).</>;
}

function SkinHtmlLabel() {
  return (
    <>
      Skin HTML <span class="form-field__label-link"><ProfileSkinsPageLink /></span>
    </>
  );
}