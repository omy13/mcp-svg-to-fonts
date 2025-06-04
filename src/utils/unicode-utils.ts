import { ExistingIcon } from '../types/font';

export function getNextUnicodeValue(existingIcons: ExistingIcon[]): number {
  if (existingIcons.length === 0) {
    return 0xe000;
  }

  const unicodeCodes = existingIcons.map((icon) => icon.unicode.charCodeAt(0));
  const maxCode = Math.max(...unicodeCodes);
  return maxCode + 1;
}
