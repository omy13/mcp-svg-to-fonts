/** Font and icon names end up in file paths, CSS selectors and generated TypeScript, so only these characters are allowed. */
export const SAFE_NAME_REGEX = /^[A-Za-z0-9_-]+$/;

/** CSS prefixes cannot contain hyphens: existing fonts are parsed back with `.prefix-icon-name:before`. */
export const SAFE_PREFIX_REGEX = /^[A-Za-z0-9_]+$/;

export function toSafeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function findUnsafeNames(names: string[]): string[] {
  return names.filter((name) => !SAFE_NAME_REGEX.test(name));
}
