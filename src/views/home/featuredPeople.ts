import type { PersonCard } from "../../models.js";
import { limits } from "../../policy.js";

export function coolNewPeople(people: PersonCard[], admin: PersonCard | null = null) {
  // Filter out the admin from the general pool so we don't show duplicates
  const newest = people.filter((person) => !admin || person.id !== admin.id);
  
  return [
    ...(admin ? [admin] : []), 
    ...newest
  ].slice(0, limits.newestPeople);
}