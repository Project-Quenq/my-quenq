export const siteSettingsTargetIds = {
  color: "color-theme",
  contact: "contact-legal",
  home: "home-page",
  identity: "site-identity",
  resetColor: "color-theme"
} as const;

export function siteSettingsTargetId(mode: string) {
  return isSiteSettingsTargetMode(mode) ? siteSettingsTargetIds[mode] : undefined;
}

function isSiteSettingsTargetMode(mode: string): mode is keyof typeof siteSettingsTargetIds {
  return Object.hasOwn(siteSettingsTargetIds, mode);
}
