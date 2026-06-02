import { mediaAccept, uploadSizeLabel } from "../../../policy.js";
import { ActionLabel } from "../../../ui/actions.js";
import { FormActions, FormField } from "../../../ui/forms.js";
import { ProfileEditSection } from "./section.js";

export function ProfilePhotoForm({ csrf, error }: { csrf: string; error?: string }) {
  return (
    <ProfileEditSection csrf={csrf} error={error} section="profilePhoto" multipart>
      <FormField label="Profile picture" hint={`Max file size: ${uploadSizeLabel} (jpg/png/gif/webp)`}>
        <input type="file" name="file" accept={mediaAccept.image} />
      </FormField>
      <FormActions>
        <button type="submit"><ActionLabel action="upload">Upload image</ActionLabel></button>
      </FormActions>
    </ProfileEditSection>
  );
}
