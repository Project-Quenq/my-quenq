import type { PersonCard } from "../../models.js";
import { limits } from "../../policy.js";
import type { PeopleBoxPerson } from "../../ui/people.js";

// Intentional landing-page easter egg, not seed or demo data.
const tomFromMyspace = {
  id: -1,
  username: "Tom",
  handle: "tom",
  pfp: "tom.webp",
  href: null,
  imageSrc: "/static/media/tom.webp"
} satisfies PeopleBoxPerson;

export function coolNewPeople(people: PersonCard[], admin: PersonCard | null = null) {
  const newest = people.filter((person) => person.handle !== tomFromMyspace.handle && (!admin || person.id !== admin.id));
  return [tomFromMyspace, ...(admin ? [admin] : []), ...newest].slice(0, limits.newestPeople);
}
