import { sqlite } from "./client.js";
import type { PersonCard } from "../../models.js";

const personCardColumns = "u.id, u.username, p.handle, p.pfp";

export function personCardRows(tail: string, ...params: unknown[]) {
  return sqlite.prepare(`SELECT ${personCardColumns} ${tail}`).all(...params) as PersonCard[];
}
