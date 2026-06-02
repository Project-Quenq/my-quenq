import { HTTPException } from "hono/http-exception";
import { assertCsrf } from "./auth/session.js";
import { env } from "./env.js";
import { field, readForm } from "./forms.js";
import { isReportSubjectType, type RateLimitAction } from "../policy.js";
import { assertActionRateLimit } from "./rateLimit.js";
import { plainTextFromHtml, sanitizeBlogBody, sanitizeUserText } from "./security/html.js";
import type { AppContext } from "./context.js";

type LocalBackOptions = {
  avoid?: readonly string[];
  fragment?: string | null;
};

export function routeId(c: AppContext, name = "id") {
  const id = Number(c.req.param(name));
  if (!Number.isSafeInteger(id) || id < 1) throw new HTTPException(404, { message: "Not found." });
  return id;
}

export function formId(form: Record<string, unknown>, name = "id") {
  const id = Number(field(form, name));
  if (!Number.isSafeInteger(id) || id < 1) throw new HTTPException(400, { message: "Invalid id." });
  return id;
}

export function optionalFormId(form: Record<string, unknown>, name = "id") {
  return field(form, name) ? formId(form, name) : undefined;
}

export async function verifiedForm(c: AppContext) {
  const form = await readForm(c);
  assertCsrf(c, form.csrf);
  return form;
}

export async function verifiedActionForm(c: AppContext, action: RateLimitAction, publicFormSubject?: string | ((form: Record<string, unknown>) => string | undefined)) {
  const form = await verifiedForm(c);
  assertActionRateLimit(c, action, typeof publicFormSubject === "function" ? publicFormSubject(form) : publicFormSubject);
  return form;
}

export function formAction<TInput, TResult>(actions: Record<string, (input: TInput) => TResult>, name: string, message: string) {
  const action = actions[name];
  if (action) return action;
  throw new HTTPException(400, { message });
}

export function optionalId(value: string | undefined) {
  const id = Number(value ?? "0");
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export function queryText(c: AppContext, names: string | readonly string[], max: number) {
  for (const name of Array.isArray(names) ? names : [names]) {
    const value = c.req.query(name);
    if (value !== undefined) return value.trim().slice(0, max);
  }
  return "";
}

export function requiredField(form: Record<string, unknown>, name: string, max: number, message: string) {
  const value = field(form, name).slice(0, max);
  if (!value) throw new HTTPException(400, { message });
  return value;
}

export function requiredUserText(form: Record<string, unknown>, name: string, max: number, message: string) {
  const html = sanitizeUserText(field(form, name).slice(0, max));
  if (!plainTextFromHtml(html)) throw new HTTPException(400, { message });
  return html;
}

export function requiredBlogBody(form: Record<string, unknown>, name: string, max: number, message: string) {
  const html = sanitizeBlogBody(field(form, name).slice(0, max));
  if (!plainTextFromHtml(html)) throw new HTTPException(400, { message });
  return html;
}

export function badFormRequestMessage(error: unknown) {
  if (!(error instanceof HTTPException)) return undefined;
  if (error.getResponse().status !== 400) return undefined;
  return error.message || "The form could not be saved.";
}

export function optionalReportSubjectType(value: string | undefined) {
  return value && isReportSubjectType(value) ? value : undefined;
}

export function requiredReportSubjectType(value: string) {
  if (!isReportSubjectType(value)) throw new HTTPException(400, { message: "Unknown report subject." });
  return value;
}

export function statusTitle(status: number) {
  if (status === 400) return "Bad request";
  if (status === 403) return "Forbidden";
  if (status === 404) return "Not found";
  if (status === 413) return "Payload too large";
  if (status === 429) return "Too many requests";
  return status >= 500 ? "Server error" : "Request error";
}

export function localBack(c: AppContext, fallback: string, options: LocalBackOptions = {}) {
  const referer = c.req.header("Referer");
  if (!referer) return withFragment(fallback, options.fragment);
  if (referer.startsWith("/") && !referer.startsWith("//")) return safeLocalBackTarget(referer, fallback, options);
  try {
    const url = new URL(referer);
    const requestOrigin = new URL(c.req.url).origin;
    if (url.origin === env.baseOrigin || url.origin === requestOrigin) return safeLocalBackTarget(`${url.pathname}${url.search}${url.hash}`, fallback, options);
  } catch {
    return withFragment(fallback, options.fragment);
  }
  return withFragment(fallback, options.fragment);
}

export function withFragment(target: string, fragment?: string | null) {
  if (!fragment) return target;
  const id = fragment.replace(/^#/, "").trim();
  if (!id) return target;
  return `${target.replace(/#.*$/, "")}#${encodeURIComponent(id)}`;
}

function safeLocalBackTarget(target: string, fallback: string, options: LocalBackOptions) {
  const destination = avoidedLocalTarget(target, options.avoid) ? fallback : target;
  return withFragment(destination, options.fragment);
}

function avoidedLocalTarget(target: string, avoid: readonly string[] | undefined) {
  if (!avoid?.length) return false;
  const targetPath = localTargetPath(target);
  return avoid.some((path) => localTargetPath(path) === targetPath);
}

function localTargetPath(target: string) {
  try {
    return new URL(target, env.baseUrl).pathname;
  } catch {
    return target.split(/[?#]/, 1)[0];
  }
}
