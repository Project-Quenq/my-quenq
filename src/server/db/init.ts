import { initializeDatabase } from "./schema.js";
import { env } from "../env.js";

initializeDatabase();

console.log(`Initialized ${env.databasePath}`);
