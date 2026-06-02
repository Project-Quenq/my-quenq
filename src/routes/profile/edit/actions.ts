import { HTTPException } from "hono/http-exception";
import { requireProfile } from "../../../server/access.js";
import { scanAutomodSubmission } from "../../../server/db/automod.js";
import { defaultInterestNames, defaultInterests, type UserProfile } from "../../../models.js";
import { updateProfile, type ProfileUpdate } from "../../../server/db/users.js";
import { field, fileField } from "../../../server/forms.js";
import { deleteProfileImage, deleteProfileThemeSong, saveProfileImage, saveProfileThemeSong } from "../../../server/media/upload.js";
import { characterRangeLabel, limits, validUsername } from "../../../policy.js";
import { sanitizeSkinHtml, sanitizeUserText } from "../../../server/security/html.js";
import { normalizeSocialLinks, socialLinkPlatforms, type SocialLinks } from "../../../socialLinks.js";
import type { CurrentUser } from "../../../currentUser.js";
import { isProfileEditSectionName, type ProfileEditSectionName } from "../../../views/profile/edit/index.js";

type ProfileEditActionInput = { user: CurrentUser; form: Record<string, unknown> };
type ProfileEditAction = (input: ProfileEditActionInput) => void | Promise<void>;

const profileEditActions = {
  name: updateProfileName,
  profilePhoto: updateProfilePhoto,
  themeSong: updateThemeSong,
  bio: updateProfileBio,
  interests: updateProfileInterests,
  socialLinks: updateProfileSocialLinks,
  skin: updateProfileSkin
} satisfies Record<ProfileEditSectionName, ProfileEditAction>;

export async function applyProfileEditSection(user: CurrentUser, form: Record<string, unknown>, section: string) {
  const editSection = profileEditSection(section);
  if (!editSection) throw new HTTPException(400, { message: "Unknown profile edit section." });
  await profileEditActions[editSection]({ user, form });
}

export function updateProfileStatus(userId: number, form: Record<string, unknown>) {
  const status = {
    status: field(form, "status").slice(0, limits.shortText),
    currentVibe: field(form, "currentVibe").slice(0, limits.shortText)
  };
  updateScannedProfile(userId, { status }, status.status, status.currentVibe);
}

export function profileEditSection(section: string) {
  return isProfileEditSectionName(section) ? section : undefined;
}

export function profileWithSubmittedFields(profile: UserProfile, section: string, form: Record<string, unknown>) {
  switch (section) {
    case "name":
      return { ...profile, username: field(form, "username").slice(0, limits.usernameMax) };
    case "bio":
      return { ...profile, bioHtml: field(form, "bio").slice(0, limits.userText) };
    case "skin":
      return { ...profile, skinHtml: field(form, "skin").slice(0, limits.skinHtml) };
    case "interests":
      return { ...profile, interests: interestsFromForm(form) };
    case "socialLinks":
      return {
        ...profile,
        socialLinks: {
          ...profile.socialLinks,
          ...socialLinkFields(form)
        }
      };
    default:
      return profile;
  }
}

function updateProfileName({ user, form }: ProfileEditActionInput) {
  const username = field(form, "username").slice(0, limits.usernameMax);
  if (!validUsername(username)) throw new HTTPException(400, { message: `Display name must be ${characterRangeLabel(limits.usernameMin, limits.usernameMax)}.` });
  updateScannedProfile(user.id, { username }, username);
}

function updateProfileBio({ user, form }: ProfileEditActionInput) {
  const bioHtml = sanitizeUserText(field(form, "bio").slice(0, limits.userText));
  updateScannedProfile(user.id, { bioHtml }, bioHtml);
}

function updateProfileSkin({ user, form }: ProfileEditActionInput) {
  const skinHtml = sanitizeSkinHtml(field(form, "skin").slice(0, limits.skinHtml));
  updateScannedProfile(user.id, { skinHtml }, skinHtml);
}

function updateProfileInterests({ user, form }: ProfileEditActionInput) {
  const interests = interestsFromForm(form);
  updateScannedProfile(user.id, { interests }, ...Object.values(interests));
}

function updateProfileSocialLinks({ user, form }: ProfileEditActionInput) {
  const socialLinks = socialLinksFromForm(form);
  updateScannedProfile(user.id, { socialLinks }, ...Object.values(socialLinks));
}

async function updateProfilePhoto({ user, form }: ProfileEditActionInput) {
  await replaceProfileMedia({
    form,
    current: requireProfile(user.id).pfp,
    missingMessage: "Choose an image to upload.",
    remove: deleteProfileImage,
    save: saveProfileImage,
    update: (filename) => updateProfile(user.id, { pfp: filename })
  });
}

async function updateThemeSong({ user, form }: ProfileEditActionInput) {
  await replaceProfileMedia({
    form,
    current: requireProfile(user.id).themeSong,
    missingMessage: "Choose an audio file to upload.",
    remove: deleteProfileThemeSong,
    save: saveProfileThemeSong,
    update: (filename) => updateProfile(user.id, { themeSong: filename })
  });
}

function updateScannedProfile(userId: number, update: ProfileUpdate, ...parts: string[]) {
  const automod = scanAutomodSubmission("profile", ...parts);
  updateProfile(userId, update);
  automod.createReports({ subjectType: "user", subjectId: userId, authorId: userId });
}

async function replaceProfileMedia(input: {
  current: string;
  form: Record<string, unknown>;
  missingMessage: string;
  remove: (filename: string) => Promise<void>;
  save: (file: File) => Promise<string | undefined>;
  update: (filename: string) => void;
}) {
  const file = fileField(input.form, "file");
  if (!file || file.size === 0) throw new HTTPException(400, { message: input.missingMessage });
  const saved = await input.save(file);
  if (!saved) throw new HTTPException(400, { message: input.missingMessage });
  try {
    input.update(saved);
  } catch (error) {
    await input.remove(saved);
    throw error;
  }
  await input.remove(input.current);
}

function interestsFromForm(form: Record<string, unknown>) {
  const interests = { ...defaultInterests };
  for (const name of defaultInterestNames) {
    interests[name] = field(form, `interests_${name}`).slice(0, limits.interest);
  }
  return interests;
}

function socialLinksFromForm(form: Record<string, unknown>) {
  return normalizeSocialLinks(socialLinkFields(form));
}

function socialLinkFields(form: Record<string, unknown>): Partial<SocialLinks> {
  const links: Partial<SocialLinks> = {};
  for (const platform of socialLinkPlatforms) {
    links[platform.id] = field(form, `social_${platform.id}`).slice(0, limits.socialLinkUrl);
  }
  return links;
}
