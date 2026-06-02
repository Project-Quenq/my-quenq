import type { UserProfile } from "../../models.js";
import {
  notificationPreferenceTypes,
  type NotificationPreferences,
  type NotificationPreferenceType
} from "../../notifications.js";
import { limits } from "../../policy.js";
import { supportedTimeZones, timeZoneOptionLabel } from "../../timeZones.js";
import type { CurrentUser } from "../../currentUser.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import { Panel } from "../../ui/panels.js";
import { Layout, PageFrame } from "../../shell/index.js";

export function SettingsPage(props: {
  user: CurrentUser;
  csrf: string;
  notificationPreferences: NotificationPreferences;
  profile: UserProfile;
  message?: string;
}) {
  return (
    <Layout title="Account settings" user={props.user}>
      <PageFrame title="Account settings">
        <FormError>{props.message}</FormError>
        <FormStack action="/settings">
          <CsrfInput csrf={props.csrf} />
          <BasicDetailsPanel user={props.user} />
          <TimeZonePanel user={props.user} />
          <PasswordPanel />
          <PrivacyPanel profile={props.profile} />
          <NotificationPreferencesPanel preferences={props.notificationPreferences} />
          <FormActions>
            <button type="submit"><ActionLabel action="save">Save all</ActionLabel></button>
          </FormActions>
        </FormStack>
        <SettingsLinks />
      </PageFrame>
    </Layout>
  );
}

const notificationPreferenceOptions: Array<{ label: string; type: NotificationPreferenceType }> = [
  { label: "Wall posts", type: notificationPreferenceTypes.wallPosts },
  { label: "Comments", type: notificationPreferenceTypes.comments },
  { label: "Props", type: notificationPreferenceTypes.props },
  { label: "Favorites", type: notificationPreferenceTypes.favorites },
  { label: "Friend accepts", type: notificationPreferenceTypes.friendAccepts }
];

function NotificationPreferencesPanel({ preferences }: { preferences: NotificationPreferences }) {
  return (
    <Panel title="Notifications">
      <div class="form-checks">
        {notificationPreferenceOptions.map((option) => (
          <label>
            <input
              type="checkbox"
              name={`notification_${option.type}`}
              checked={preferences[option.type]}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </Panel>
  );
}

function BasicDetailsPanel({ user }: { user: CurrentUser }) {
  return (
    <Panel title="Basic details">
      <div class="form-stack">
        <FormField label="Email address">
          <input type="email" name="email" autocomplete="email" value={user.email} required maxLength={limits.emailMax} />
        </FormField>
      </div>
    </Panel>
  );
}

function TimeZonePanel({ user }: { user: CurrentUser }) {
  return (
    <Panel title="Time zone">
      <FormField>
        <select name="time_zone" required aria-label="Time zone">
          {supportedTimeZones().map((timeZone) => (
            <option value={timeZone} selected={timeZone === user.timeZone}>{timeZoneOptionLabel(timeZone)}</option>
          ))}
        </select>
      </FormField>
    </Panel>
  );
}

function PasswordPanel() {
  return (
    <Panel title="Change password">
      <div class="form-stack">
        <FormField label="Old password">
          <input type="password" name="password-old" autocomplete="current-password" maxLength={limits.passwordMax} />
        </FormField>
        <FormField label="New password">
          <input type="password" name="password-new" autocomplete="new-password" minLength={limits.passwordMin} maxLength={limits.passwordMax} />
        </FormField>
        <FormField label="Confirm new password">
          <input type="password" name="password-confirm" autocomplete="new-password" minLength={limits.passwordMin} maxLength={limits.passwordMax} />
        </FormField>
      </div>
    </Panel>
  );
}

function PrivacyPanel({ profile }: { profile: UserProfile }) {
  return (
    <Panel title="Privacy">
      <div class="form-stack">
        <FormField label="Who can view your profile">
          <select name="profile_visibility" required>
            <option value="public" selected={!profile.private}>Everyone (public)</option>
            <option value="private" selected={profile.private}>Only friends (private)</option>
          </select>
        </FormField>
        <p>
          Private profiles are visible to you, friends, and staff. Blog entries also use their own privacy setting; groups and skins stay
          outside profile privacy.
        </p>
      </div>
    </Panel>
  );
}

function SettingsLinks() {
  return (
    <>
      <h4>More options</h4>
      <ul>
        <li><a href="/account/export.json">Export your account data</a></li>
        <li><a href="/account/delete">Delete account</a></li>
      </ul>
    </>
  );
}
