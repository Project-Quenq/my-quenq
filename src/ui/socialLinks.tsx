import type { SocialLinkPlatformConfig } from "../socialLinks.js";
import { Icon } from "./icons.js";

type SocialLinkIconPlatform = Pick<SocialLinkPlatformConfig, "icon">;
type SocialLinkLabelPlatform = Pick<SocialLinkPlatformConfig, "icon" | "label">;

export function SocialLinkIcon({ platform }: { platform: SocialLinkIconPlatform }) {
  if (platform.icon) {
    return <img class="social-link-icon" src={platform.icon.src} alt="" aria-hidden="true" width="16" height="16" loading="lazy" decoding="async" />;
  }

  return <Icon name="link" />;
}

export function SocialLinkLabel({ platform }: { platform: SocialLinkLabelPlatform }) {
  return (
    <span class="social-link-label">
      <SocialLinkIcon platform={platform} />
      <span>{platform.label}</span>
    </span>
  );
}
