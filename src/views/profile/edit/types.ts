const profileEditSectionNames = ["name", "profilePhoto", "themeSong", "bio", "interests", "socialLinks", "skin"] as const;
export type ProfileEditSectionName = (typeof profileEditSectionNames)[number];

const profileEditSectionSet = new Set<string>(profileEditSectionNames);

export function isProfileEditSectionName(section: string): section is ProfileEditSectionName {
  return profileEditSectionSet.has(section);
}

export type ProfileEditError = {
  message: string;
  section?: ProfileEditSectionName;
};
