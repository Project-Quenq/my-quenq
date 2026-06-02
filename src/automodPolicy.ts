export const automodScopes = ["all", "profile", "blog", "post", "comment", "group", "skin", "message"] as const;
export type AutomodScope = (typeof automodScopes)[number];
const automodScopeSet = new Set<string>(automodScopes);

export const automodPatternTypes = ["keyword", "regex"] as const;
export type AutomodPatternType = (typeof automodPatternTypes)[number];
const automodPatternTypeSet = new Set<string>(automodPatternTypes);

export const automodActions = ["review", "reject"] as const;
export type AutomodAction = (typeof automodActions)[number];
const automodActionSet = new Set<string>(automodActions);

export const automodPatternMax = 5_000;
export const automodScanMax = 10_000;

export function isAutomodScope(value: string): value is AutomodScope {
  return automodScopeSet.has(value);
}

export function isAutomodPatternType(value: string): value is AutomodPatternType {
  return automodPatternTypeSet.has(value);
}

export function isAutomodAction(value: string): value is AutomodAction {
  return automodActionSet.has(value);
}
