import { HTTPException } from "hono/http-exception";
import { sqlite } from "./client.js";
import { createReport } from "./moderation/index.js";
import {
  automodPatternMax,
  automodScanMax,
  isAutomodAction,
  isAutomodPatternType,
  isAutomodScope,
  type AutomodAction,
  type AutomodPatternType,
  type AutomodScope
} from "../../automodPolicy.js";
import { automodLiteralPattern, createAutomodScanText, type AutomodScanText } from "../moderation/automodNormalize.js";
import { limits, type ReportSubjectType } from "../../policy.js";
import { plainTextFromHtml, sanitizeUserText } from "../security/html.js";
import type { AutomodMatch, AutomodRule } from "../../models.js";

type AutomodRuleInput = {
  id?: number;
  name: string;
  pattern: string;
  patternType: AutomodPatternType;
  scope: AutomodScope;
  action: AutomodAction;
  enabled: boolean;
  actorId: number;
};

type AutomodReportTarget = {
  subjectType: ReportSubjectType;
  subjectId: number;
  authorId: number;
};

export type AutomodSubmissionScan = {
  text: string;
  createReports: (target: AutomodReportTarget) => void;
};

type CachedRulePatterns = {
  key: string;
  patterns: RegExp[];
};

const ruleColumns = `r.id, r.name, r.pattern, r.pattern_type AS patternType, r.scope, r.action,
  r.enabled, r.created_by AS createdBy, u.username AS createdByName,
  r.created_at AS createdAt, r.updated_at AS updatedAt`;
const rulePatternCache = new Map<number, CachedRulePatterns>();

export function listAutomodRules(limit = limits.exportRows) {
  return sqlite
    .prepare(
      `SELECT ${ruleColumns}
      FROM automod_rules r LEFT JOIN users u ON u.id = r.created_by
      ORDER BY r.enabled DESC, r.updated_at DESC, r.id DESC LIMIT ?`
    )
    .all(limit) as AutomodRule[];
}

export function getAutomodRule(ruleId: number) {
  return sqlite
    .prepare(
      `SELECT ${ruleColumns}
      FROM automod_rules r LEFT JOIN users u ON u.id = r.created_by
      WHERE r.id = ? LIMIT 1`
    )
    .get(ruleId) as AutomodRule | undefined;
}

export function saveAutomodRule(input: AutomodRuleInput) {
  const rule = { ...input, name: input.name.trim(), pattern: input.pattern.trim() };
  validateAutomodRule(rule);
  if (rule.id) {
    const info = sqlite
      .prepare(
        `UPDATE automod_rules
        SET name = ?, pattern = ?, pattern_type = ?, scope = ?, action = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      )
      .run(rule.name, rule.pattern, rule.patternType, rule.scope, rule.action, rule.enabled ? 1 : 0, rule.id);
    if (!info.changes && !automodRuleExists(rule.id)) throw new HTTPException(404, { message: "Automod rule not found." });
    return rule.id;
  }

  const info = sqlite
    .prepare(
      `INSERT INTO automod_rules (name, pattern, pattern_type, scope, action, enabled, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(rule.name, rule.pattern, rule.patternType, rule.scope, rule.action, rule.enabled ? 1 : 0, rule.actorId);
  return Number(info.lastInsertRowid);
}

export function setAutomodRuleEnabled(ruleId: number, enabled: boolean) {
  const info = sqlite.prepare("UPDATE automod_rules SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(enabled ? 1 : 0, ruleId);
  return info.changes > 0 || automodRuleExists(ruleId);
}

export function deleteAutomodRule(ruleId: number) {
  return sqlite.prepare("DELETE FROM automod_rules WHERE id = ?").run(ruleId).changes > 0;
}

function automodMatches(scope: AutomodScope, text: string) {
  const scanText = createAutomodScanText(normalizeScanText(text));
  if (!scanText.raw) return [];
  const rules = sqlite
    .prepare(
      `SELECT ${ruleColumns}
      FROM automod_rules r LEFT JOIN users u ON u.id = r.created_by
      WHERE (r.scope = 'all' OR r.scope = ?) AND r.enabled = 1
      ORDER BY r.id ASC`
    )
    .all(scope) as AutomodRule[];

  return rules.filter((rule) => ruleMatches(rule, scanText)).map((rule) => ({ rule })) satisfies AutomodMatch[];
}

function assertAutomodAllowed(scope: AutomodScope, text: string) {
  const reject = automodMatches(scope, text).find((match) => match.rule.action === "reject");
  if (reject) throw new HTTPException(400, { message: "This submission cannot be posted because it matches an automod rule." });
}

function createAutomodReports(input: {
  subjectType: ReportSubjectType;
  subjectId: number;
  authorId: number;
  scope: AutomodScope;
  text: string;
}) {
  const matches = automodMatches(input.scope, input.text).filter((match) => match.rule.action === "review");
  if (!matches.length) return;
  const names = matches.map((match) => match.rule.name).join(", ");
  const reason = sanitizeUserText(`Automod sent this ${input.subjectType} to review.\nRules: ${names}`);
  createReport(null, input.subjectType, input.subjectId, reason, input.authorId);
}

export function scanAutomodSubmission(scope: AutomodScope, ...parts: Array<string | null | undefined>): AutomodSubmissionScan {
  const text = automodText(...parts);
  assertAutomodAllowed(scope, text);
  return {
    text,
    createReports: (target: AutomodReportTarget) => createAutomodReports({ ...target, scope, text })
  };
}

function automodText(...parts: Array<string | null | undefined>) {
  return parts.map((part) => plainTextFromHtml(part ?? "")).filter(Boolean).join("\n");
}

export function requiredAutomodScope(value: string): AutomodScope {
  if (isAutomodScope(value)) return value;
  throw new HTTPException(400, { message: "Unknown automod scope." });
}

export function requiredAutomodPatternType(value: string): AutomodPatternType {
  if (isAutomodPatternType(value)) return value;
  throw new HTTPException(400, { message: "Unknown automod pattern type." });
}

export function requiredAutomodAction(value: string): AutomodAction {
  if (isAutomodAction(value)) return value;
  throw new HTTPException(400, { message: "Unknown automod action." });
}

function validateAutomodRule(input: AutomodRuleInput) {
  if (!input.name.trim()) throw new HTTPException(400, { message: "Rule name is required." });
  if (!input.pattern.trim()) throw new HTTPException(400, { message: "Rule pattern is required." });
  if (input.pattern.length > automodPatternMax) throw new HTTPException(400, { message: `Rule pattern must be ${automodPatternMax} characters or fewer.` });
  if (!isAutomodScope(input.scope)) throw new HTTPException(400, { message: "Unknown automod scope." });
  if (!isAutomodPatternType(input.patternType)) throw new HTTPException(400, { message: "Unknown automod pattern type." });
  if (!isAutomodAction(input.action)) throw new HTTPException(400, { message: "Unknown automod action." });
  if (input.patternType === "regex") compileRegex(input.pattern);
}

function automodRuleExists(ruleId: number) {
  return Boolean(sqlite.prepare("SELECT 1 FROM automod_rules WHERE id = ?").get(ruleId));
}

function ruleMatches(rule: AutomodRule, text: AutomodScanText) {
  return cachedRulePatterns(rule).some((pattern) => text.variants.some((variant) => pattern.test(variant)));
}

function cachedRulePatterns(rule: AutomodRule) {
  const key = `${rule.patternType}\0${rule.updatedAt}\0${rule.pattern}`;
  const cached = rulePatternCache.get(rule.id);
  if (cached?.key === key) return cached.patterns;

  const patterns = rule.patternType === "keyword"
    ? keywordTerms(rule.pattern).map((term) => compileRegex(automodLiteralPattern(term)))
    : [compileRegex(rule.pattern)];
  rulePatternCache.set(rule.id, { key, patterns });
  return patterns;
}

function compileRegex(pattern: string) {
  try {
    return new RegExp(pattern, "iu");
  } catch {
    throw new HTTPException(400, { message: "Regex pattern is invalid." });
  }
}

function keywordTerms(pattern: string) {
  return pattern.split(/\r?\n/).map((term) => term.trim()).filter(Boolean);
}

function normalizeScanText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, automodScanMax);
}
