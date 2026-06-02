import { CsrfInput, FormError, FormStack } from "../../../ui/forms.js";
import type { ViewChild } from "../../../ui/types.js";
import type { ProfileEditError, ProfileEditSectionName } from "./types.js";

export function ProfileEditSection(props: {
  csrf: string;
  section: ProfileEditSectionName;
  children: ViewChild;
  error?: string;
  multipart?: boolean;
}) {
  return (
    <FormStack action="/account/profile" actionFragment={props.section} id={props.section} multipart={props.multipart}>
      <CsrfInput csrf={props.csrf} />
      <input type="hidden" name="section" value={props.section} />
      <FormError>{props.error}</FormError>
      {props.children}
    </FormStack>
  );
}

export function sectionError(error: ProfileEditError | undefined, section: ProfileEditSectionName) {
  return error?.section === section ? error.message : undefined;
}
