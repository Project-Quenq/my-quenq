import type { AppContext } from "./context.js";

export async function readForm(c: AppContext) {
  return c.req.parseBody({ all: false });
}

export function field(form: Record<string, unknown>, name: string, fallback = "") {
  const value = form[name];
  return typeof value === "string" ? value.trim() : fallback;
}

export function fileField(form: Record<string, unknown>, name: string) {
  const value = form[name];
  return value instanceof File ? value : undefined;
}
