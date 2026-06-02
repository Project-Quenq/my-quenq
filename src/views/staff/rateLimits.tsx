import type { RateLimitSetting } from "../../models.js";
import { rateLimitActionLabel } from "../../rateLimitLabels.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput, FormActions, FormStack } from "../../ui/forms.js";
import { Icon } from "../../ui/icons.js";
import { Panel } from "../../ui/panels.js";

export function RateLimitsPanel(props: { csrf: string; raidActive: boolean; settings: RateLimitSetting[] }) {
  return (
    <Panel
      className="rate-limit-panel"
      title="Rate limits"
      headerAction={
        props.raidActive ? (
          <form method="post" action="/admin/rate-limits" class="inline-form">
            <CsrfInput csrf={props.csrf} />
            <input type="hidden" name="mode" value="raidOff" />
            <button class="button--danger" type="submit"><ActionLabel action="unlock">Disable raid mode</ActionLabel></button>
          </form>
        ) : (
          <form method="post" action="/admin/rate-limits" class="inline-form">
            <CsrfInput csrf={props.csrf} />
            <input type="hidden" name="mode" value="raid" />
            <button class="button--danger" type="submit"><ActionLabel action="report">Enable raid mode</ActionLabel></button>
          </form>
        )
      }
    >
      {props.raidActive ? (
        <p class="form-message form-message--error form-error raid-banner" role="alert">
          <Icon name="report" />
          <span>Raid mode is active. New signups and user actions are paused until an admin resets or edits these limits.</span>
        </p>
      ) : null}
      <FormStack action="/admin/rate-limits">
        <CsrfInput csrf={props.csrf} />
        <input type="hidden" name="mode" value="save" />
        <div class="rate-limit-table-wrap">
          <table class="listing-table rate-limit-table">
            <colgroup>
              <col class="rate-limit-table__action-column" />
              <col class="rate-limit-table__limit-column" />
              <col class="rate-limit-table__window-column" />
            </colgroup>
            <tbody>
              <tr><th>What this limits</th><th>Allowed actions</th><th>Window (seconds)</th></tr>
              {props.settings.map((setting) => (
                <tr>
                  <td class="rate-limit-action-cell">
                    <span class="rate-limit-action-name">{rateLimitActionLabel(setting.action)}</span>
                    <small>{setting.action}</small>
                  </td>
                  <td>
                    <span class="rate-limit-control">
                      <input type="number" name={`limit_${setting.action}`} min="0" step="1" required value={setting.limit} />
                    </span>
                  </td>
                  <td>
                    <span class="rate-limit-control">
                      <input type="number" name={`window_${setting.action}`} min="1" step="1" required value={setting.windowSeconds} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div class="rate-limit-note">Set allowed actions to 0 to block that action.</div>
        <FormActions className="rate-limit-actions">
          <button type="submit"><ActionLabel action="save">Save limits</ActionLabel></button>
        </FormActions>
      </FormStack>
      <form method="post" action="/admin/rate-limits" class="rate-limit-reset-form">
        <CsrfInput csrf={props.csrf} />
        <input type="hidden" name="mode" value="reset" />
        <button class="button--secondary" type="submit">Reset to defaults</button>
      </form>
    </Panel>
  );
}
