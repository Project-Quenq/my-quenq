import { raw } from "hono/html";
import type { CurrentUser } from "../../currentUser.js";
import { characterRangeLabel, limits } from "../../policy.js";
import { CsrfInput, FormActions, FormError, FormField, FormStack } from "../../ui/forms.js";
import { Layout, PageFrame } from "../../shell/index.js";
import { Panel } from "../../ui/panels.js";
import { trustedHtml } from "../../ui/html.js";

export function SignUpPage(props: { 
  user: CurrentUser | null; 
  csrf: string; 
  initialEmail?: string; 
  initialHandle?: string; 
  message?: string; 
  blocked?: boolean;
  blockedTimezones?: string[];
  captchaSvg: string;
}) {
  return (
    <Layout title="Sign up" user={props.user}>
      <div id="registration-gate" data-blocked={JSON.stringify(props.blockedTimezones || [])}>
        <PageFrame className="signup-page" title="Sign up">
          
          <div id="blocked-message" style="display: none; flex-direction: column; text-align: center; background: var(--color-danger-soft); border-color: var(--color-danger); color: var(--color-danger-text); padding: 20px; border-radius: var(--radius-panel);" class="welcome">
             <p style="margin: 0 0 10px 0;"><strong>Registration is not available in your region yet.</strong></p>
             <p style="margin: 0;">We are currently limiting signups to specific regions as we grow. Stay tuned! You can still access our Arcade and Apps without an account.</p>
          </div>

          <div id="signup-form-container" style="display: contents;">
            {props.blocked ? (
              <div class="welcome" style="flex-direction: column; text-align: center; background: var(--color-danger-soft); border-color: var(--color-danger); color: var(--color-danger-text); padding: 20px; border-radius: var(--radius-panel);">
                <p style="margin: 0 0 10px 0;"><strong>Registration is not available in your region yet.</strong></p>
                <p style="margin: 0;">We are currently limiting signups to specific regions as we grow. Stay tuned! You can still access our Arcade and Apps without an account.</p>
              </div>
            ) : (
              <>
                <Panel className="benefits-panel" title="Benefits">
                  <ul class="benefits-panel__list">
                    <li>Custom profiles and wall posts</li>
                    <li>Blogs and groups</li>
                    <li>No algorithmic feeds or AI slop</li>
                    <li>Classic retro games and apps</li>
                  </ul>
                </Panel>

                <FormError>{props.message}</FormError>

                <FormStack action="/signup" id="signup-form">
                  <CsrfInput csrf={props.csrf} />
                  <input type="hidden" name="time_zone" id="user-timezone" value="UTC" />
                  
                  <FormField label="Display name">
                    <input required placeholder="Display name" type="text" name="username" autocomplete="name" maxLength={limits.usernameMax} />
                  </FormField>

                  <FormField label="Handle" hint={`Your public profile URL will be /u/handle. Use ${characterRangeLabel(limits.handleMin, limits.handleMax)} with letters, numbers, and dashes.`}>
                    <input required placeholder="handle" type="text" name="handle" autocomplete="username" maxLength={limits.handleMax} value={props.initialHandle ?? ""} />
                  </FormField>

                  <FormField label="Email">
                    <input required placeholder="Email" type="email" name="email" autocomplete="email" maxLength={limits.emailMax} value={props.initialEmail ?? ""} />
                  </FormField>

                  <FormField label="Password">
                    <input required placeholder="Password" type="password" name="password" autocomplete="new-password" minLength={limits.passwordMin} maxLength={limits.passwordMax} />
                  </FormField>

                  <FormField label="Confirm password">
                    <input required placeholder="Confirm password" type="password" name="confirm" autocomplete="new-password" minLength={limits.passwordMin} maxLength={limits.passwordMax} />
                  </FormField>

                  <FormField label="Security Check" hint="Type the characters shown in the image above.">
                    <div style="display: flex; flex-direction: column; gap: 10px; align-items: flex-start;">
                      <div style="background: white; padding: 5px; border: 1px solid var(--color-brand-border); line-height: 0;" dangerouslySetInnerHTML={trustedHtml(props.captchaSvg)} />
                      <input required type="text" name="captcha" autocomplete="off" placeholder="Enter code" style="width: 150px;" />
                    </div>
                  </FormField>

                  <div class="form-checks signup-terms">
                    <label>
                      <input type="checkbox" name="terms" value="accepted" required />
                      <span>I'm 13+ and agree to the <a href="/terms">terms</a>, <a href="/privacy">privacy</a> and <a href="/rules">rules</a>.</span>
                    </label>
                  </div>

                  <FormActions>
                    <button type="submit">Sign up</button>
                  </FormActions>
                </FormStack>
              </>
            )}
          </div>
          <script src="/static/js/signup.js"></script>
        </PageFrame>
      </div>
    </Layout>
  );
}