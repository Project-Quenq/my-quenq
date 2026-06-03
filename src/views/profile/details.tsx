import { defaultInterestNames, type UserProfile } from "../../models.js";
import { hasSocialLinks, socialLinkPlatforms, type SocialLinkPlatformConfig } from "../../socialLinks.js";
import { Panel } from "../../ui/panels.js";
import { SocialLinkIcon } from "../../ui/socialLinks.js";
import { profileSkinPart } from "../../skins/rendering.js";

export function ProfileSocialLinks({ profile }: { profile: UserProfile }) {
  if (!hasSocialLinks(profile.socialLinks)) return null;

  return (
    <Panel className="profile__links profile-card" dataAttributes={profileSkinPart("links")} title={`${profile.username}'s links`}>
      <table class="details-table">
        <tbody>
          {socialLinkPlatforms.map((platform) => {
            const value = profile.socialLinks[platform.id];
            if (!value) return null;

            const config = platform as SocialLinkPlatformConfig;
            
            const href = config.baseUrl ? `${config.baseUrl}${value}` : value;
            const displayValue = platform.id === "website" 
              ? value.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") 
              : `@${value}`;

            return (
              <tr>
                <td>
                  <p style="display: flex; align-items: center; gap: 8px;">
                    <SocialLinkIcon platform={config} />
                    <span>{platform.label}</span>
                  </p>
                </td>
                <td>
                  <p>
                    <a href={href} target="_blank" rel="me nofollow noopener noreferrer">
                      {displayValue}
                    </a>
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

export function ProfileInterests({ profile }: { profile: UserProfile }) {
  const interests = defaultInterestNames
    .map((name) => ({ name, value: profile.interests[name] }))
    .filter((interest) => interest.value.trim());
  if (!interests.length) return null;

  return (
    <Panel className="profile__interests profile-card" dataAttributes={profileSkinPart("interests")} title={`${profile.username}'s interests`}>
      <table class="details-table">
        <tbody>
          {interests.map(({ name, value }) => (
            <tr>
              <td><p>{name}</p></td>
              <td><p>{value}</p></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}