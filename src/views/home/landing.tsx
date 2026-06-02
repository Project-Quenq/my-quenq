import type { GroupItem, PersonCard } from "../../models.js";
import type { SiteSettings } from "../../settings/site.js";
import { limits } from "../../policy.js";
import type { CurrentUser } from "../../currentUser.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import { CommunityBox } from "../../ui/groups.js";
import { Panel } from "../../ui/panels.js";
import { PeopleBox } from "../../ui/people.js";
import { Layout, SplitLayout, SplitPane } from "../../shell/index.js";
import { coolNewPeople } from "./featuredPeople.js";
import { AnnouncementBox, InfoCard, landingCards, SourceBox } from "./infoPanels.js";

export function LandingPage(props: {
  user: CurrentUser | null;
  csrf: string;
  settings: SiteSettings;
  admin: PersonCard | null;
  newest: PersonCard[];
  newestGroups: GroupItem[];
  message?: string;
  passwordResetAvailable?: boolean;
}) {
  const welcomeText = props.settings.home.welcomeText.trim();

  return (
    <Layout title={props.settings.identity.tagline} user={props.user} seo={{ canonicalPath: "/" }}>
      <SplitLayout variant="landing">
        <SplitPane area="main">
          <PeopleBox title="Cool new people" people={props.user ? props.newest : coolNewPeople(props.newest, props.admin)} singleLine />
          <CommunityBox title="Cool new communities" groups={props.user ? props.newestGroups : coolNewCommunities(props.newestGroups)} singleLine />
          <AnnouncementBox settings={props.settings} />
        </SplitPane>
        <SplitPane area="sidebar">
          {welcomeText ? (
            <div class="welcome">
              <p>{welcomeText}</p>
            </div>
          ) : null}
          <Panel className="auth-panel" title="Member login / sign up">
            <FormError>{props.message}</FormError>
            <FormStack action="/login">
              <CsrfInput csrf={props.csrf} />
              <FormField label="Email:">
                <input type="email" name="email" autocomplete="email" required maxLength={limits.emailMax} />
              </FormField>
              <FormField label="Password:">
                <input name="password" type="password" autocomplete="current-password" required maxLength={limits.passwordMax} />
              </FormField>
              <FormActions>
                <button type="submit">Log in</button>
                <a class="button button--secondary" href="/signup">Sign up</a>
              </FormActions>
            </FormStack>
            {props.passwordResetAvailable ? <a class="forgot" href="/reset">Forgot your password?</a> : null}
          </Panel>
          {/* <SourceBox /> */}
        </SplitPane>
      </SplitLayout>
      <div class="info-grid">
        {landingCards.map((info) => <InfoCard {...info} />)}
      </div>
    </Layout>
  );
}

function coolNewCommunities(groups: GroupItem[]) {
  return groups.slice(0, limits.newestCommunities).map((group) => ({ ...group, href: null }));
}
