import { FontConfig, ExistingIcon } from '../types/font';
import * as path from 'path';

export function generateCSS(config: FontConfig, glyphs: any[], existingIcons?: ExistingIcon[]): string {
  const fontFace = `
@font-face {
    font-family: '${config.fontName}';
    src: url('./${config.fontName}.woff2') format('woff2'),
         url('./${config.fontName}.woff') format('woff'),
         url('./${config.fontName}.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}

.${config.cssPrefix} {
    font-family: '${config.fontName}';
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
    text-transform: none;
    line-height: 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
`;

  const allIcons = new Map<string, string>();

  if (existingIcons) {
    existingIcons.forEach((icon) => {
      const unicode = icon.unicode.charCodeAt(0).toString(16);
      allIcons.set(icon.name, unicode);
    });
  }

  glyphs.forEach((glyph) => {
    const iconName = path.basename(glyph.metadata.path, '.svg');
    const unicode = glyph.metadata.unicode[0].charCodeAt(0).toString(16);
    allIcons.set(iconName, unicode);
  });

  const iconClasses = Array.from(allIcons.entries())
    .map(([iconName, unicode]) => {
      return `.${config.cssPrefix}-${iconName}:before { content: "\\${unicode}"; }`;
    })
    .join('\n');

  return fontFace + '\n' + iconClasses;
}

export function generateTypeScript(config: FontConfig, glyphs: any[], existingIcons?: ExistingIcon[]): string {
  const allIconNames = new Set<string>();

  if (existingIcons) {
    existingIcons.forEach((icon) => allIconNames.add(icon.name));
  }

  glyphs.forEach((glyph) => {
    const iconName = path.basename(glyph.metadata.path, '.svg');
    allIconNames.add(iconName);
  });

  const iconNamesArray = Array.from(allIconNames).map((name) => `'${name}'`);

  return `
export type IconName = ${iconNamesArray.join(' | ')};

export const ICON_NAMES: IconName[] = [${iconNamesArray.join(', ')}];

export const ICON_PREFIX = '${config.cssPrefix}';

export function getIconClass(iconName: IconName): string {
    return \`\${ICON_PREFIX}-\${iconName}\`;
}
`;
}
