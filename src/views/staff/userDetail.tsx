import type { UserProfile } from "../../models.js";
import { limits } from "../../policy.js";
import { userRoles } from "../../roles.js";
import type { CurrentUser } from "../../currentUser.js";
import { CsrfInput, FormActions, FormField, FormStack } from "../../ui/forms.js";
import { BackToPage } from "../../ui/links.js";
import { Layout, PageFrame } from "../../shell/index.js";

export function StaffUserDetailPage(props: { user: CurrentUser; csrf: string; target: UserProfile; protectedAdmin: boolean }) {
  return (
    <Layout title={`Modify user: ${props.target.username}`} user={props.user}>
      <PageFrame back={<BackToPage page="adminUsers" />} title={<>Modify user: {props.target.username}</>}>
        <p>Email: {props.target.email}</p>
        <p>Status: {props.target.bannedAt ? "banned" : props.target.verifiedAt ? "verified" : "unverified"}</p>
        {props.protectedAdmin ? (
          <p class="form-message form-message--info" role="status">This protected admin account cannot be modified.</p>
        ) : (
          <FormStack action={`/admin/users/${props.target.id}`}>
            <CsrfInput csrf={props.csrf} />
            <FormActions>
              {props.target.verifiedAt ? null : <button class="button--secondary" name="action" value="verify" type="submit">Manually verify account</button>}
              <button class={props.target.bannedAt ? "button--secondary" : "button--danger"} name="action" value={props.target.bannedAt ? "unban" : "ban"} type="submit">{props.target.bannedAt ? "Unban user" : "Ban user"}</button>
              <button class="button--secondary" name="action" value="reset" type="submit">Send password reset</button>
            </FormActions>
            <FormField label="Role">
              <select name="role">
                {userRoles.map((role) => <option value={role} selected={props.target.role === role}>{role}</option>)}
              </select>
            </FormField>
            <FormActions>
              <button name="action" value="role" type="submit">Set role</button>
            </FormActions>
            <FormField label="New password">
              <input type="password" name="password" placeholder="New password" minLength={limits.passwordMin} maxLength={limits.passwordMax} />
            </FormField>
            <FormActions>
              <button name="action" value="password" type="submit">Change password</button>
            </FormActions>
          </FormStack>
        )}
      </PageFrame>
    </Layout>
  );
}
