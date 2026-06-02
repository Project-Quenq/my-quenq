import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { paths } from "../env.js";
import { database } from "../../policy.js";

mkdirSync(dirname(paths.db), { recursive: true });

export const sqlite = new Database(paths.db);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma(`busy_timeout = ${database.busyTimeoutMs}`);
