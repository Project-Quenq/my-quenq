export const likeEscapeClause = "ESCAPE '\\'";

export function containsLikePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}
