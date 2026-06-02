import type { AutomodRule, AutomodScope } from "../../models.js";
import { automodActions, automodPatternMax, automodPatternTypes, automodScopes } from "../../automodPolicy.js";
import { limits } from "../../policy.js";
import { ActionLabel } from "../../ui/actions.js";
import { CsrfInput, FormActions, FormField, FormStack } from "../../ui/forms.js";
import { Panel } from "../../ui/panels.js";
import { LocalizedTime } from "../../ui/time.js";

export function AutomodPanel(props: { csrf: string; openRuleId?: number; rules: AutomodRule[] }) {
  return (
    <Panel title="Automod rules">
      <section class="automod-section" id="automod-new">
        <h4>Add rule</h4>
        <AutomodRuleForm csrf={props.csrf} />
      </section>
      <section id="automod-rules" class="automod-rule-list">
        {props.rules.length
          ? props.rules.map((rule) => <AutomodRuleDetails csrf={props.csrf} open={props.openRuleId === rule.id} rule={rule} />)
          : <p><i>No automod rules yet.</i></p>}
      </section>
    </Panel>
  );
}

function AutomodRuleDetails(props: { csrf: string; open?: boolean; rule: AutomodRule }) {
  const rule = props.rule;
  return (
    <details class="automod-rule" id={`automod-rule-${rule.id}`} open={props.open ? true : undefined}>
      <summary class="automod-rule__summary">
        <b>{rule.name}</b>
        <span class="automod-rule__meta">{rule.patternType} | {rule.scope} | {automodActionLabel(rule.action)} | {rule.enabled ? "enabled" : "disabled"}</span>
      </summary>
      <AutomodRuleForm csrf={props.csrf} rule={rule} />
      <FormStack action="/admin/automod" className="inline-actions">
        <CsrfInput csrf={props.csrf} />
        <input type="hidden" name="id" value={rule.id} />
        <button class="button--secondary" name="action" value={rule.enabled ? "disable" : "enable"} type="submit">{rule.enabled ? "Disable" : "Enable"}</button>
        <button class="button--danger" name="action" value="delete" type="submit">Delete</button>
      </FormStack>
      <p><small>Updated <LocalizedTime value={rule.updatedAt} />{rule.createdByName ? <> by {rule.createdByName}</> : null}</small></p>
    </details>
  );
}

function AutomodRuleForm(props: { csrf: string; rule?: AutomodRule }) {
  const rule = props.rule;
  return (
    <FormStack action="/admin/automod">
      <CsrfInput csrf={props.csrf} />
      <input type="hidden" name="action" value="save" />
      {rule ? <input type="hidden" name="id" value={rule.id} /> : null}
      <FormField label="Name">
        <input type="text" name="name" required maxLength={limits.shortText} value={rule?.name ?? ""} />
      </FormField>
      <FormField label="Pattern">
        <textarea name="pattern" required maxLength={automodPatternMax} rows={rule?.pattern.includes("\n") ? 6 : 2}>{rule?.pattern ?? ""}</textarea>
      </FormField>
      <FormField label="Pattern type">
        <select name="patternType">
          {automodPatternTypes.map((patternType) => <option value={patternType} selected={(rule?.patternType ?? "keyword") === patternType}>{patternType}</option>)}
        </select>
      </FormField>
      <FormField label="Scope">
        <AutomodScopeSelect selected={rule?.scope ?? "all"} />
      </FormField>
      <FormField label="Action">
        <select name="automodAction">
          {automodActions.map((action) => <option value={action} selected={(rule?.action ?? "reject") === action}>{automodActionLabel(action)}</option>)}
        </select>
      </FormField>
      <FormField>
        <span><input type="checkbox" name="enabled" value="1" checked={(rule?.enabled ?? 1) === 1} /> Enabled</span>
      </FormField>
      <FormActions>
        <button type="submit"><ActionLabel action="save">{rule ? "Save rule" : "Add rule"}</ActionLabel></button>
      </FormActions>
    </FormStack>
  );
}

function AutomodScopeSelect(props: { selected: AutomodScope }) {
  return (
    <select name="scope">
      {automodScopes.map((scope) => <option value={scope} selected={props.selected === scope}>{scope}</option>)}
    </select>
  );
}

function automodActionLabel(action: AutomodRule["action"]) {
  return action === "reject" ? "Reject submission" : "Report for review";
}
