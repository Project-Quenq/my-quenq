import type { UserProfile } from "../../../models.js";
import type { CurrentUser } from "../../../currentUser.js";
import { FormError } from "../../../ui/forms.js";
import { BackLink } from "../../../ui/links.js";
import { ProfileImage } from "../../../ui/avatars.js";
import { profilePath } from "../../../paths.js";
import { skinColorPaletteEditorStylesheet } from "../../../skins/colorPaletteEditor.js";
import type { ColorPalette } from "../../../theme/colorPalette.js";
import { Layout, PageFrame } from "../../../shell/index.js";
import { ProfileForm } from "./form.js";
import { sectionError } from "./section.js";
import { ProfilePhotoForm } from "./photoForm.js";
import type { ProfileEditError } from "./types.js";

export function ProfileEditPage(props: {
  user: CurrentUser;
  csrf: string;
  profile: UserProfile;
  skinColorPaletteFallback: ColorPalette;
  error?: ProfileEditError;
  message?: string;
}) {
  const error = props.error ?? (props.message ? { message: props.message } : undefined);
  return (
    <Layout title="Edit profile" user={props.user} styles={[skinColorPaletteEditorStylesheet]}>
      <PageFrame back={<BackLink href={profilePath(props.profile)} label={props.profile.username} />} title="Edit profile">
        {!error?.section ? <FormError>{error?.message}</FormError> : null}
        <div class="profile-photo-editor">
          <ProfileImage alt="Current profile picture" filename={props.profile.pfp} variant="edit-preview" />
          <div class="profile-photo-editor__body">
            <ProfilePhotoForm csrf={props.csrf} error={sectionError(error, "profilePhoto")} />
          </div>
        </div>
        <ProfileForm csrf={props.csrf} profile={props.profile} skinColorPaletteFallback={props.skinColorPaletteFallback} error={error} />
      </PageFrame>
    </Layout>
  );
}
