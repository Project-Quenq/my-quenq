export function classNames(...classes: Array<string | false | null | undefined>) {
  const value = classes.filter(Boolean).join(" ");
  return value || undefined;
}
