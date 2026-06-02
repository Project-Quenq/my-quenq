export function truncateText(input: string, max: number) {
  const limit = Math.max(0, Math.floor(max));
  if (input.length <= limit) return input;
  return limit <= 3 ? ".".repeat(limit) : `${input.slice(0, limit - 3)}...`;
}
