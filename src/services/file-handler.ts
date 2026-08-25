import { glob } from 'glob';
import fs from 'fs-extra';
import { ExistingIcon } from '../types/font.js';
import * as path from 'path';

/** Matches `.prefix-icon-name:before { content: "\\e001"; }` — prefix is a single word, icon name may contain hyphens. */
const ICON_CSS_REGEX = /\.(\w+)-([\w-]+):before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"/g;

export async function findSvgFiles(directory: string): Promise<string[]> {
  try {
    const svgPattern = path.join(directory, '**/*.svg');
    const files = await glob(svgPattern);
    return files;
  } catch (error) {
    throw new Error(`Error finding SVG files: ${error}`);
  }
}

export async function parseExistingFont(cssPath: string): Promise<ExistingIcon[]> {
  try {
    const cssContent = await fs.readFile(cssPath, 'utf8');
    const icons: ExistingIcon[] = [];

    let match: RegExpExecArray | null;
    const regex = new RegExp(ICON_CSS_REGEX.source, 'g');

    while ((match = regex.exec(cssContent)) !== null) {
      const [, , iconName, unicode] = match;
      icons.push({
        name: iconName,
        unicode: String.fromCharCode(parseInt(unicode, 16)),
      });
    }

    return icons;
  } catch (error) {
    throw new Error(`Error parsing existing font: ${error}`);
  }
}
