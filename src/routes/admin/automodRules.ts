import { HTTPException } from "hono/http-exception";
import {
  deleteAutomodRule,
  getAutomodRule,
  requiredAutomodAction,
  requiredAutomodPatternType,
  requiredAutomodScope,
  saveAutomodRule,
  setAutomodRuleEnabled
} from "../../server/db/automod.js";
import { field } from "../../server/forms.js";
import { formAction, formId, optionalId, requiredField } from "../../server/http.js";
import { automodPatternMax } from "../../automodPolicy.js";
import { limits } from "../../policy.js";
import type { CurrentUser } from "../../currentUser.js";

type AutomodActionInput = { actor: CurrentUser; form: Record<string, unknown> };
type AutomodActionResult = { action: string; ruleId: number; metadata?: Record<string, unknown> };
type AutomodRouteAction = (input: AutomodActionInput) => AutomodActionResult;
type AutomodRuleActionName = "save" | "enable" | "disable" | "delete";

const adminAutomodHandlers = {
  save: ({ actor, form }: AutomodActionInput) => {
    const id = optionalId(field(form, "id")) || undefined;
    const ruleId = saveAutomodRule({
      id,
      name: requiredField(form, "name", limits.shortText, "Rule name is required."),
      pattern: requiredField(form, "pattern", automodPatternMax, "Rule pattern is required."),
      patternType: requiredAutomodPatternType(field(form, "patternType")),
      scope: requiredAutomodScope(field(form, "scope")),
      action: requiredAutomodAction(field(form, "automodAction")),
      enabled: field(form, "enabled") === "1",
      actorId: actor.id
    });
    return { action: id ? "update" : "create", ruleId };
  },
  enable: ({ form }: AutomodActionInput) => {
    const ruleId = formId(form);
    if (!setAutomodRuleEnabled(ruleId, true)) throw new HTTPException(404, { message: "Automod rule not found." });
    return { action: "enable", ruleId };
  },
  disable: ({ form }: AutomodActionInput) => {
    const ruleId = formId(form);
    if (!setAutomodRuleEnabled(ruleId, false)) throw new HTTPException(404, { message: "Automod rule not found." });
    return { action: "disable", ruleId };
  },
  delete: ({ form }: AutomodActionInput) => {
    const ruleId = formId(form);
    const rule = getAutomodRule(ruleId);
    if (!deleteAutomodRule(ruleId)) throw new HTTPException(404, { message: "Automod rule not found." });
    return { action: "delete", ruleId, metadata: rule ? { subjectLabel: `Automod rule: ${rule.name}` } : undefined };
  }
} satisfies Record<AutomodRuleActionName, AutomodRouteAction>;

export function runAutomodAction(actor: CurrentUser, form: Record<string, unknown>): AutomodActionResult {
  return formAction(adminAutomodHandlers, field(form, "action"), "Unknown automod action.")({ actor, form });
}
